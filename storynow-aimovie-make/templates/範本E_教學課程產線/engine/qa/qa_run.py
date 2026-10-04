#!/usr/bin/env python3
"""成片品檢：對已渲染的單節 mp4 與整集 mp4 做逐項檢查，產出報告。

  py qa\\qa_run.py <標籤> <節...> [--sec-dir 05_輸出_節] [--ep EP1=1-1,1-2,...] [--ep-dir 06_輸出_集]

例：
  py qa\\qa_run.py before 1-1 1-2 1-3 1-4 1-5 1-6 1-7 1-8 1-9 1-10 1-11 1-12 1-13 1-14 ^
      --ep EP1=1-1,1-2,1-3,1-4,1-5,1-6,1-7 --ep EP2=1-8,1-9,1-10,1-11,1-12,1-13,1-14

報告輸出到 11_品檢\\<標籤>\\：report.json（全部數據）、各節的證據圖。
版面檢查另由 qa_layout.mjs 產生 layout_<節>.json，本程式會一併讀入。

七類檢查（代號對應報告）：
  C 字幕   C1 句尾標點  C2 換頁閃爍  C3 同頁抖動  C4 字數／語速／停留  C5 唸法文字殘留  C6 字幕與稿子一致
  S 同步   S1 項目型場景有沒有對旁白  S2 講完後仍循環  S3 cue 查無  S4 項目先於旁白出現
  P 唸法   P1 不在詞典的英數詞  P2 實際送進 TTS 的唸法  P3 寫法不一致
  A 聲音   A1 響度  A2 峰值  A3 中段無聲  A4 聲畫長度
  V 畫面   V1 規格  V2 黑畫面  V3 靜止  V4 檔案新舊
  L 版面   （qa_layout.mjs）超出畫面、文字重疊、闖進字幕區、安全區、字級下限、溢出
  E 整集   E1 長度  E2 各節響度落差  E3 接縫
"""
from __future__ import annotations
import argparse, json, math, re, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
from subtitles import original_sentences          # noqa: E402
from cues import scene_timeline, resolve, collect_cues, item_texts   # noqa: E402
from tts import to_speech                         # noqa: E402
from final_qa import jumps                        # noqa: E402

FPS = 30
DATA = ENGINE / "remotion" / "src" / "data"
LEX = json.loads((ROOT / "00_規範" / "發音規範.json").read_text(encoding="utf-8"))

# ── 門檻（集中在這裡，改標準只改這裡） ───────────────────────────
TH = {
    # 字幕依 Netflix 繁體中文字幕規範（Chinese (Traditional) Timed Text Style Guide）
    "cap_max_chars": 16,        # 每行 16 字（需要時可放寬到 18）
    "cap_hard_chars": 18,
    "cap_max_cps": 9.0,         # 成人節目每秒 ≤9 字
    "cap_min_sec": 5 / 6,       # 每頁最短 5/6 秒
    "cap_max_sec": 7.0,         # 每頁最長 7 秒
    "jitter_px": 2,             # 同一頁字幕位置變動容許值（原尺寸像素）
    "lufs": (-17.0, -15.0),     # 整集整合響度（口語教學內容 -16 LUFS ±1）；單節只看一致性
    "true_peak": -1.0,          # dBTP 上限
    "silence_db": -45, "silence_sec": 1.5,
    "black_sec": 0.3,
    "max_still": 4.0,
    "ep_minutes": (28.0, 33.0),
    "ep_lufs_spread": 2.0,
    "sync_late": 1.0,           # 項目亮起比旁白晚超過幾秒算不同步
}
TRAIL_PUNCT = "。，、；：？！…—．,.;:?!"
ITEM_KEYS = ("cards", "layers", "nodes", "steps", "pills", "sideNotes", "cueWords", "options", "recap")


def sh(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe(p: Path) -> dict:
    r = sh(["ffprobe", "-v", "error", "-show_entries",
            "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
            "-of", "json", str(p)])
    return json.loads(r.stdout or "{}")


# ══ C 字幕 ═══════════════════════════════════════════════════════
def caption_pages(caps: list[dict]) -> list[dict]:
    """重現 Subtitles.tsx 的排程：每句一頁，顯示到下一頁開始；from 與長度各自四捨五入。"""
    pages = []
    for i, c in enumerate(caps):
        nxt = caps[i + 1] if i + 1 < len(caps) else None
        a = c["startMs"] / 1000 * FPS
        b = nxt["startMs"] / 1000 * FPS if nxt else a + 2.6 * FPS
        f0 = round(a)
        f1 = round(b)
        pages.append({"i": i, "text": c["text"], "f0": f0, "f1": f1,
                      "startMs": c["startMs"], "endMs": c["endMs"]})
    return pages


def band_scan(mp4: Path, y0=930, h=90, scale=2):
    """逐格掃描字幕帶，回傳每格白字的 bbox（原尺寸座標）與像素數。"""
    w, hh = 1920 // scale, h // scale
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                          f"crop=1920:{h}:0:{y0},scale={w}:{hh}:flags=area,format=gray",
                          "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    out, fsz = [], w * hh
    while True:
        buf = p.stdout.read(fsz * 300)
        if not buf:
            break
        arr = np.frombuffer(buf, np.uint8)
        arr = arr[: len(arr) // fsz * fsz].reshape(-1, hh, w)
        for fr in arr:
            m = fr > 190
            n = int(m.sum())
            if n < 12:
                out.append(None)
                continue
            xs = np.nonzero(m.any(0))[0]
            ys = np.nonzero(m.any(1))[0]
            out.append((int(xs[0]) * scale, int(xs[-1]) * scale,
                        int(ys[0]) * scale + y0, int(ys[-1]) * scale + y0, n))
    p.wait()
    return out


def check_captions(sid: str, data: dict, mp4: Path | None, scan) -> dict:
    caps = data["captions"]
    pages = caption_pages(caps)
    res: dict = {}

    trail = [c["text"] for c in caps if c["text"] and c["text"][-1] in TRAIL_PUNCT]
    inner = [c["text"] for c in caps if re.search(r"[。，、；：？！…—]", c["text"])]
    res["C1"] = {"count": len(trail), "inner": len(inner), "total": len(caps), "examples": trail[:6]}

    # C2 換頁閃爍：在成片上量。相鄰兩頁接縫前後各 2 格內，只要有一格字幕帶是空的就算一次閃爍
    gaps = []
    if scan is not None:
        for a_, b_ in zip(pages, pages[1:]):
            f = b_["f0"]
            blank = [k for k in range(f - 2, f + 2) if 0 <= k < len(scan) and scan[k] is None]
            if blank:
                gaps.append({"at": round(f / FPS, 2), "frames": len(blank), "between": [a_["text"], b_["text"]]})
    res["C2"] = {"count": len(gaps) if scan is not None else None, "examples": gaps[:5]}

    # C3 同頁抖動：一頁顯示期間（去掉頭尾各 2 格）bbox 是否變動
    jit = []
    if scan is not None:
        for pg in pages:
            seg = [scan[f] for f in range(pg["f0"] + 2, min(pg["f1"] - 2, len(scan))) if scan[f]]
            if len(seg) < 3:
                continue
            xs0 = [s[0] for s in seg]; xs1 = [s[1] for s in seg]
            ys0 = [s[2] for s in seg]; ys1 = [s[3] for s in seg]
            dx = max(max(xs0) - min(xs0), max(xs1) - min(xs1))
            dy = max(max(ys0) - min(ys0), max(ys1) - min(ys1))
            if max(dx, dy) > TH["jitter_px"]:
                jit.append({"at": round(pg["f0"] / FPS, 2), "dx": dx, "dy": dy, "text": pg["text"]})
        # 換頁時字幕中心水平位移（每句寬度不同、底板伸縮造成的跳動感）
        centers = []
        for pg in pages:
            mid = (pg["f0"] + pg["f1"]) // 2
            if mid < len(scan) and scan[mid]:
                s = scan[mid]
                centers.append(((s[0] + s[1]) / 2, s[1] - s[0], s[2], s[3]))
        tops = Counter(c[2] for c in centers)
        res["C3"] = {"count": len(jit), "examples": jit[:5],
                     "line_top_values": dict(tops.most_common(5)),
                     "width_range": [min((c[1] for c in centers), default=0),
                                     max((c[1] for c in centers), default=0)]}
    else:
        res["C3"] = {"count": None}

    # C4 字數／語速／停留
    long_, fast, short, slow = [], [], [], []
    for pg in pages:
        txt = re.sub(r"\s", "", pg["text"])
        sec = (pg["f1"] - pg["f0"]) / FPS
        n = len(re.sub(rf"[{re.escape(TRAIL_PUNCT)}「」『』（）()]", "", txt))
        if n > TH["cap_hard_chars"]:
            long_.append(f"{n}字｜{txt}")
        if sec > TH["cap_max_sec"]:
            slow.append(f"{sec:.1f}秒｜{txt}")
        if sec > 0 and n / sec > TH["cap_max_cps"]:
            fast.append(f"{n / sec:.1f}字/秒｜{txt}")
        if sec < TH["cap_min_sec"]:
            short.append(f"{sec:.2f}秒｜{txt}")
    over16 = sum(1 for pg in pages if len(re.sub(rf"[{re.escape(TRAIL_PUNCT)}「」『』（）()\s　]", "", pg["text"])) > TH["cap_max_chars"])
    res["C4"] = {"long": len(long_), "fast": len(fast), "short": len(short), "toolong": len(slow), "over16": over16,
                 "examples": (long_[:3] + fast[:3] + short[:3] + slow[:3])}

    # C7 斷句不佳：一頁以虛詞或收尾符號開頭、或引號被拆到兩頁（「我／的IP」）
    # 長引號超過一頁時在引號內的標點處換頁是可接受的；只有「沒有標點卻切在引號中間」才算
    orig_flat = "".join("".join(v["lines"]) for v in original_sentences(sid).values())
    PUN = "，、：；。？！…—"
    badcut, pos = [], 0
    for c in caps:
        body = c["text"].replace("　", "")
        core = re.sub(r"\s", "", body)
        k = orig_flat.find(core[:4], pos) if core else -1
        if k >= 0:
            pos = k
        bad = c["text"][:1] in "的了嗎呢吧啊著過」』）"
        if not bad and (body.count("「") != body.count("」") or body.count("『") != body.count("』")) and k >= 0:
            # 找出這一頁在原文的結尾位置，看下一個字是不是標點
            i = k
            for ch in core:
                i = orig_flat.find(ch, i) + 1
            nxt = orig_flat[i:i + 1]
            bad = body.count("「") > body.count("」") and nxt not in PUN
        if bad:
            badcut.append(c["text"])
    res["C7"] = {"count": len(badcut), "examples": badcut[:6]}

    # C5 唸法文字殘留：單字母以空白隔開（D N S）、IP 被轉成中文數字
    # 只算原稿裡沒有的：原稿本來就寫「十二點五MB」不算外漏
    orig_all = "".join("".join(v["lines"]) for v in original_sentences(sid).values())
    spoken = []
    for c in caps:
        for m in re.finditer(r"(?<![A-Za-z])[A-Za-z] [A-Za-z](?: [A-Za-z])+|[零一二三四五六七八九]點[零一二三四五六七八九]+", c["text"]):
            if m.group(0).replace(" ", "") not in orig_all.replace(" ", "") or " " in m.group(0):
                spoken.append(c["text"])
                break
    res["C5"] = {"count": len(spoken), "examples": spoken[:6]}

    # C6 字幕串起來要等於稿子旁白（去標點、空白後比對）
    orig = original_sentences(sid)
    flat = lambda s: re.sub(rf"[\s{re.escape(TRAIL_PUNCT)}「」『』（）()*]", "", s)
    want = flat("".join("".join(v["lines"]) for v in orig.values()))
    got = flat("".join(c["text"] for c in caps))
    res["C6"] = {"match": want == got, "script_chars": len(want), "caption_chars": len(got)}
    if want != got:
        i = next((k for k in range(min(len(want), len(got))) if want[k] != got[k]), min(len(want), len(got)))
        res["C6"]["first_diff"] = {"script": want[max(0, i - 8): i + 12], "caption": got[max(0, i - 8): i + 12]}
    return res


# ══ S 同步 ═══════════════════════════════════════════════════════
def items_of(props: dict) -> tuple[str, list]:
    for k in ITEM_KEYS:
        v = props.get(k)
        if isinstance(v, list) and v:
            return k, v
    return "", []


def check_sync(sid: str, data: dict) -> dict:
    from build_data import parse_srt
    orig = original_sentences(sid)
    rows = []
    for sc in data["scenes"]:
        # 畫面文字裡的零寬空白（詞邊界）是建置最後才加的；重算 cue 時要拿掉，才跟建置時一致
        sc = json.loads(json.dumps(sc, ensure_ascii=False).replace("\u200b", ""))
        props = sc.get("props", {})
        key, items = items_of(props)
        # 與建置門檻同一個定義：測驗卡（選項跟題目一起出現）、結語卡（逐句另外對時）不算項目型場景
        if not items or not item_texts(sc):
            continue
        plan = props.get("focusPlan") or []
        row = {"scene": sc["id"], "type": sc["type"], "items": len(items), "dur": sc["durSec"],
               "start": sc["startSec"], "driven": bool(plan), "static": bool(props.get("staticItems")),
               "cues": 0, "content_pts": 0,
               "loop_pts": 0, "repeat_pts": 0, "late": [], "misses": []}
        cues = collect_cues(props)
        row["cues"] = sum(1 for c in cues if c)
        if plan:
            srt = parse_srt(ROOT / "02_語音" / sid / f"{sc['id']}.srt", 0)
            opt = orig.get(sc["id"])
            if opt and srt:
                lines = next((v for v in (opt["lines"], opt["parts"], opt["sents"]) if len(v) == len(srt)),
                             opt["sents"])
                tl = scene_timeline(srt, lines)
                times, ms = resolve({**sc}, tl)
                row["misses"] = ms
                times = times or []
                row["content_pts"] = len(times)
                # 講完最後一項之後又亮回前面的點 = 循環
                if times:
                    t_last = max(times)
                    seen_max = -1
                    for t, i in plan:
                        if t > t_last + 0.05 and i <= seen_max and i != len(items) - 1:
                            row["loop_pts"] += 1
                        seen_max = max(seen_max, i)
                    for i, t in enumerate(times):
                        lit = next((pt for pt, pi in plan if pi == i), None)
                        if lit is not None and lit - t > TH["sync_late"]:
                            row["late"].append(f"第{i + 1}項 晚 {lit - t:.1f}s")
                row["repeat_pts"] = max(0, len(plan) - len(times) - row["loop_pts"])
                # 逐項核對：物件第一次亮起的秒數、當下旁白正在唸哪一句
                texts = [t.replace("\u200b", "") for t in (item_texts(sc) or [str(x) for x in items])]
                for i, tx in enumerate(texts):
                    at = next((pt for pt, pi in plan if pi == i), None)
                    if at is None:
                        continue
                    said = next((x for x, a, b in tl if a <= at < b), "（句與句之間）")
                    src = "cue" if i < len(cues) and cues[i] else "自動"
                    row.setdefault("detail", []).append(
                        {"item": tx if isinstance(tx, str) else str(tx), "at": round(at, 1), "src": src, "said": said})
        rows.append(row)
    static = [r for r in rows if r.get("static")]
    undriven = [r for r in rows if not r["driven"] and not r.get("static")]
    return {
        "S5": {"static": [f"{r['scene']} {r['type']}（{r['items']} 項）" for r in static]},
        "S1": {"item_scenes": len(rows), "driven": len(rows) - len(undriven) - len(static),
               "undriven": [f"{r['scene']} {r['type']}（{r['items']} 項，{r['dur']:.0f}s）" for r in undriven]},
        "S2": {"scenes_looping": sum(1 for r in rows if r["loop_pts"]),
               "loop_points": sum(r["loop_pts"] for r in rows),
               "examples": [f"{r['scene']} {r['type']}：講完後又循環 {r['loop_pts']} 次" for r in rows if r["loop_pts"]][:6]},
        "S3": {"count": sum(len(r["misses"]) for r in rows), "examples": [m for r in rows for m in r["misses"]][:6]},
        "S4": {"undriven_items": sum(r["items"] for r in undriven),
               "late": [f"{r['scene']} {x}" for r in rows for x in r["late"]][:8]},
        "rows": rows,
    }


# ══ P 唸法與寫法 ═════════════════════════════════════════════════
TERM = re.compile(r"[A-Za-z0-9][A-Za-z0-9.\-/:+_]*[A-Za-z0-9]|[A-Za-z0-9]")


def narration_lines(sid: str) -> list[tuple[str, str]]:
    return [(scn, ln) for scn, v in original_sentences(sid).items() for ln in v["lines"]]


def screen_texts(data: dict) -> list[str]:
    out = []
    def walk(x):
        if isinstance(x, str):
            out.append(x.replace("\u200b", ""))
        elif isinstance(x, list):
            for y in x: walk(y)
        elif isinstance(x, dict):
            for k, y in x.items():
                if k not in ("focusPlan", "icon", "cue", "kind", "variant", "color"):
                    walk(y)
    for sc in data["scenes"]:
        walk(sc.get("props", {}))
    return out


def check_pron(ids: list[str], datas: dict) -> dict:
    lex = LEX["詞典"]
    terms: dict[str, dict] = {}
    for sid in ids:
        for scn, ln in narration_lines(sid):
            for m in TERM.findall(ln):
                if re.fullmatch(r"\d{1,2}", m):
                    continue
                t = terms.setdefault(m, {"n": 0, "where": f"{sid} {scn}", "ctx": ln, "say": None})
                t["n"] += 1
    for k, t in terms.items():
        t["say"] = to_speech(k)
        t["in_lex"] = k in lex
        t["rule"] = ("詞典" if k in lex else
                     "IP 規則" if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", k) else
                     "版本號規則" if re.fullmatch(r"\d\.\d", k) else "未定義（TTS 自己猜）")
    undefined = {k: v for k, v in terms.items() if v["rule"].startswith("未定義")}

    # P3 寫法不一致：同一詞忽略大小寫與連字號後相同，但寫法不同（旁白＋畫面）
    spell = defaultdict(Counter)
    fullwidth = []
    for sid in ids:
        texts = [ln for _, ln in narration_lines(sid)] + screen_texts(datas[sid])
        for s in texts:
            for mm in re.finditer(r"[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]", s):
                m = mm.group(0)
                # 網址、網域裡本來就是小寫（google.com、https://），不算寫法不一致
                if re.match(r"[.:/]", s[mm.end():mm.end() + 1]) or s[max(0, mm.start() - 1):mm.start()] in "./":
                    continue
                spell[re.sub(r"[-\s]", "", m.lower())][m] += 1
            if re.search(r"[Ａ-Ｚａ-ｚ０-９]", s):
                fullwidth.append(f"{sid}｜{s[:30]}")
    # 全大寫的英文標籤（PORT、SWITCH、HTTP SECURE）是排版風格；只有在扣掉它之後仍有兩種以上寫法才算不一致
    variants = {}
    for k, v in spell.items():
        forms = {w: n for w, n in v.items() if not (w.isupper() and len(w) >= 4 and any(not x.isupper() for x in v))}
        if len(forms) > 1:
            variants[k] = forms
    return {"P1": {"terms": len(terms), "undefined": len(undefined),
                   "list": sorted(([k, v["n"], v["say"], v["ctx"][:40], v["where"]] for k, v in undefined.items()),
                                  key=lambda r: -r[1])},
            "P2": {"list": sorted(([k, v["n"], v["say"], v["rule"]] for k, v in terms.items()),
                                  key=lambda r: -r[1])},
            "P3": {"variants": variants, "fullwidth": fullwidth[:10]}}


# ══ A 聲音／V 畫面 ═══════════════════════════════════════════════
def loudness(mp4: Path) -> dict:
    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
    txt = r.stderr[r.stderr.rfind("Summary:"):]
    g = lambda pat: float(m.group(1)) if (m := re.search(pat, txt, re.S)) else None
    return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU"),
            "TP": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def silences(mp4: Path, dur: float) -> list[list[float]]:
    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vn", "-af",
            f"silencedetect=n={TH['silence_db']}dB:d={TH['silence_sec']}", "-f", "null", "-"])
    st = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    out = []
    for a, b in zip(st, en + [dur] * (len(st) - len(en))):
        if a > 1.0 and b < dur - 7.0:          # 頭尾（含片尾 6 秒測驗卡）不算
            out.append([round(a, 2), round(b, 2)])
    return out


def blacks(mp4: Path) -> list[list[float]]:
    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vf",
            # pix_th 0.08：Remotion 輸出是全範圍色彩，純黑的亮度是 16（0.063）；背景 #181818 是 24（0.094）。
            # 0.05 抓不到黑畫面（自我測試抓到的漏洞），0.10 又會把整片深灰背景當成黑畫面
            f"blackdetect=d={TH['black_sec']}:pix_th=0.08:pic_th=0.98", "-an", "-f", "null", "-"])
    return [[float(a), float(b)] for a, b in
            re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", r.stderr)]


def check_av(sid: str, data: dict, mp4: Path) -> dict:
    from verify_motion import analyse
    pr = probe(mp4)
    v = next((s for s in pr.get("streams", []) if s["codec_type"] == "video"), {})
    a = next((s for s in pr.get("streams", []) if s["codec_type"] == "audio"), {})
    dur = float(pr.get("format", {}).get("duration", 0))
    want = data["scenes"][-1]["startSec"] + data["scenes"][-1]["durSec"]
    lo = loudness(mp4)
    mo = analyse(mp4)
    dj = DATA / f"{sid}.json"
    return {
        "A1": lo, "A2": {"TP": lo["TP"], "ok": lo["TP"] is not None and lo["TP"] <= TH["true_peak"]},
        "A3": silences(mp4, dur),
        "A4": {"video_sec": round(dur, 2), "timeline_sec": round(want, 2), "diff": round(dur - want, 2)},
        "V1": {"size": f"{v.get('width')}x{v.get('height')}", "fps": v.get("r_frame_rate"),
               "vcodec": v.get("codec_name"), "acodec": a.get("codec_name"),
               "ar": a.get("sample_rate"), "ch": a.get("channels")},
        "V2": blacks(mp4),
        "V3": {"max_still": mo["max_still"], "at": mo["max_still_at"], "static_ratio": round(mo["static_ratio"], 3)},
        "V4": {"mp4_newer_than_data": mp4.stat().st_mtime > dj.stat().st_mtime},
        "V5": jumps(mp4),
    }


# ══ E 整集 ═══════════════════════════════════════════════════════
def check_episode(name: str, ep_mp4: Path, ids: list[str], sec_res: dict) -> dict:
    pr = probe(ep_mp4)
    dur = float(pr.get("format", {}).get("duration", 0))
    lufs = [sec_res[i]["av"]["A1"]["I"] for i in ids if sec_res.get(i, {}).get("av")]
    lo = loudness(ep_mp4)
    return {"E1": {"minutes": round(dur / 60, 2),
                   "ok": TH["ep_minutes"][0] <= dur / 60 <= TH["ep_minutes"][1]},
            "E2": {"ep_lufs": lo["I"], "ep_tp": lo["TP"], "section_lufs": lufs,
                   "spread": round(max(lufs) - min(lufs), 2) if lufs else None},
            "E3": {"black": blacks(ep_mp4), "silence": silences(ep_mp4, dur)}}


# ══ 證據圖 ═══════════════════════════════════════════════════════
def contact_sheet(sid: str, data: dict, mp4: Path, out: Path):
    """每個場景取 70% 處一格，排成總覽圖（給人和 AI 看截圖用）。"""
    ts = [round(s["startSec"] + s["durSec"] * 0.7, 2) for s in data["scenes"]]
    sel = "+".join(f"eq(n\\,{int(t * FPS)})" for t in ts)
    cols = 4
    rows = math.ceil(len(ts) / cols)
    sh(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-vf",
        f"select='{sel}',scale=480:270,tile={cols}x{rows}:padding=6:color=0x303030",
        "-frames:v", "1", "-fps_mode", "vfr", str(out)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("label")
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--sec-dir", default="05_輸出_節")
    ap.add_argument("--ep", action="append", default=[])
    ap.add_argument("--ep-dir", default="06_輸出_集")
    ap.add_argument("--skip-av", action="store_true")
    ap.add_argument("--merge", action="store_true", help="併入同標籤既有的 report.json（分批量測用）")
    a = ap.parse_args()

    out = ROOT / "11_品檢" / a.label
    out.mkdir(parents=True, exist_ok=True)
    datas = {sid: json.loads((DATA / f"{sid}.json").read_text(encoding="utf-8")) for sid in a.ids}
    res: dict = {"label": a.label, "thresholds": TH, "sections": {}, "episodes": {}}
    if a.merge and (out / "report.json").exists():
        old = json.loads((out / "report.json").read_text(encoding="utf-8"))
        res["sections"].update(old.get("sections", {}))
        res["episodes"].update(old.get("episodes", {}))

    for sid in a.ids:
        mp4 = ROOT / a.sec_dir / f"{sid}.mp4"
        has = mp4.exists()
        print(f"[{sid}] 字幕帶掃描…", flush=True)
        scan = band_scan(mp4) if has else None
        r = {"captions": check_captions(sid, datas[sid], mp4 if has else None, scan),
             "sync": check_sync(sid, datas[sid])}
        lay = out / f"layout_{sid}.json"
        if lay.exists():
            r["layout"] = json.loads(lay.read_text(encoding="utf-8"))
        if has and not a.skip_av:
            print(f"[{sid}] 聲音／畫面…", flush=True)
            r["av"] = check_av(sid, datas[sid], mp4)
            contact_sheet(sid, datas[sid], mp4, out / f"sheet_{sid}.jpg")
        res["sections"][sid] = r

    all_ids = sorted(res["sections"], key=lambda x: [int(n) for n in x.split("-")])
    datas.update({sid: json.loads((DATA / f"{sid}.json").read_text(encoding="utf-8"))
                  for sid in all_ids if sid not in datas})
    res["pron"] = check_pron(all_ids, datas)

    for spec in a.ep:
        name, ids = spec.split("=")
        ep = ROOT / a.ep_dir / f"{name}.mp4"
        if ep.exists() and not a.skip_av:
            print(f"[{name}] 整集…", flush=True)
            res["episodes"][name] = check_episode(name, ep, ids.split(","), res["sections"])

    (out / "report.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {out / 'report.json'}")


if __name__ == "__main__":
    main()
