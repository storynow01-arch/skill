#!/usr/bin/env python3
"""把「分鏡計畫 + TTS 實際時長 + 逐字時間戳」合成 Remotion 要吃的 data JSON。

時間軸一律以語音為準——分鏡計畫不寫死秒數，由這支程式從實際音檔推導。

用法: python build_data.py 1-1
"""
from __future__ import annotations
import json, math, re, shutil, sys
import os
from pathlib import Path

from subtitles import original_sentences, restore, match_lines
from cues import scene_timeline, resolve, build_plan, extra_timings, item_texts, narration_matches

ROOT = Path(__file__).resolve().parent.parent
FPS = 30


def parse_srt(p: Path, offset: float):
    """edge-tts 的 SRT → cue list，時間加上該 scene 在整節中的起點。"""
    if not p.exists():
        return []
    out, blocks = [], re.split(r"\n\s*\n", p.read_text(encoding="utf-8").strip())
    for b in blocks:
        lines = [l for l in b.split("\n") if l.strip()]
        if len(lines) < 3:
            continue
        m = re.match(r"([\d:,]+)\s*-->\s*([\d:,]+)", lines[1])
        if not m:
            continue

        def sec(s):
            h, mi, rest = s.split(":")
            s2, ms = rest.split(",")
            return int(h) * 3600 + int(mi) * 60 + int(s2) + int(ms) / 1000

        out.append({"start": round(sec(m.group(1)) + offset, 3),
                    "end": round(sec(m.group(2)) + offset, 3),
                    "text": "".join(lines[2:]).strip()})
    return out


# 字幕不放標點（2026-10-03 使用者要求）：句尾標點刪掉，句中斷句處換成全形空白。
# 只處理全形標點與破折號／刪節號；英數詞裡的 . - : /（google.com、Wi-Fi、2.4G）不動。
CAP_TRAIL = re.compile(r"[。，、；：？！…—\s　]+$")
CAP_INNER = re.compile(r"\s*(?:[。，、；：？！]|……|…|——|—)+\s*")


SPOKEN_DOT = re.compile(r"(?<=[A-Za-z0-9])\s*點\s*(?=[A-Za-z])")


def written_form(text: str) -> str:
    """稿子為了唸法寫成「mail 點 google 點 com」「edu 點 tw」→ 字幕與畫面顯示正式寫法 mail.google.com、edu.tw。
    聲音不受影響（配音照稿子唸）。2026-10-05 使用者抽檢 1-3。"""
    return SPOKEN_DOT.sub(".", text)


def clean_caption(text: str) -> str:
    t = CAP_TRAIL.sub("", written_form(text).strip())
    t = CAP_INNER.sub("　", t)
    return t.strip("　 ")


def to_captions(cues):
    """轉成 @remotion/captions 的 Caption 格式。

    ⚠ pageBreakAfter 必須設 True。
    createTikTokStyleCaptions 是為「逐詞 token」設計的，會把間隔小於
    combineTokensWithinMilliseconds 的 token 合併成一頁。我們的 cue 是
    「整句」而且首尾相接（間隔 0ms），少了這個旗標會把整節 94 句
    合併成一頁 1465 字、只顯示 2.6 秒 —— 等於整支片沒有字幕。

    官方型別：{text, startMs, endMs, timestampMs, confidence, pageBreakAfter}
    """
    out = []
    for ci, c in enumerate(cues):
        text = clean_caption(c["text"])
        if not text:
            # 「……」停頓行：Gemini 配音會把它當一句、給一段時間，清完標點變空頁（2026-10-05 1-1 S6）→ 不出字幕
            continue
        out.append({
            "text": text,
            "startMs": int(c["start"] * 1000),
            "endMs": int(c["end"] * 1000),
            "timestampMs": int((c["start"] + c["end"]) / 2 * 1000),
            "confidence": None,
            "pageBreakAfter": True,     # 一句一頁，維持原片「一句一行」
        })
    return out


CAP_MAX = 16        # Netflix 繁體中文字幕規範：每行 16 字（2026-10-04 起採用，原為 24）
CAP_MAX_HARD = 18   # 規範允許「需要時」放寬到 18 字：只用在合併過短的頁
CAP_MIN_SEC = 5 / 6 # 規範：每頁最短 5/6 秒
CAP_MAX_CPS = 8.8   # 規範：成人節目每秒 ≤9 字；留 0.2 給影格取整（30fps 每頁起訖各差 ±17ms）
PUNCT_SPLIT = re.compile(r"(?<=[，、；：。？！])|(?<=——)|(?<=……)")
LATIN = re.compile(r"[A-Za-z0-9][A-Za-z0-9.\-/:+_]*")


def _vis_len(t: str) -> int:
    """字幕上看到的字數：標點會被 clean_caption 拿掉，不算"""
    return len(re.sub(r"[。，、；：？！…—\s　]", "", t))


def _word_cut(text: str) -> int:
    """沒有標點可切的長段：用斷詞找最靠近中間的詞邊界，英數詞（Wi-Fi、192.168.0.1）不切開"""
    # 內建詞典是簡體，不認得繁體的「手機」（會切成手／機）→ _jieba() 改用官方繁簡通用大詞典
    jieba = _jieba()
    protect = [(m.start(), m.end()) for m in LATIN.finditer(text)]
    # 引號裡面不切（「我的IP」不能被拆成「我／的IP」）
    protect += [(m.start(), m.end()) for m in re.finditer(r"「[^」]*」|『[^』]*』|（[^）]*）", text)]
    pos, cuts = 0, []
    for w in jieba.cut(text):
        pos += len(w)
        # 下一頁不能以虛詞或收尾符號開頭（「的IP」常常不一樣」這種頁很難讀）
        bad_start = text[pos:pos + 1] in set("的了嗎呢吧啊著過」』）")
        if 0 < pos < len(text) and not bad_start and not any(a < pos < b for a, b in protect):
            cuts.append(pos)
    if not cuts:
        return len(text) // 2
    return min(cuts, key=lambda c: abs(c - len(text) / 2))


def _split_long(text: str) -> list[str]:
    if _vis_len(text) <= CAP_MAX:
        return [text]
    k = _word_cut(text)
    return _split_long(text[:k]) + _split_long(text[k:])


def visual_titles(script_id: str) -> dict[str, str]:
    """稿子每個場景 VISUAL 行的標題：「VISUAL: comparison | 可靠的代價」→ {"S6": "可靠的代價"}"""
    md = next((q for q in (ROOT / "01_腳本").glob(f"{script_id}_*.md") if "_plan" not in q.name), None)
    if not md:
        return {}
    out = {}
    for m in re.finditer(r"^## (S\d+).*?\n\s*VISUAL:\s*\w+\s*\|\s*([^|\n]+)", md.read_text(encoding="utf-8"), re.M):
        out[m.group(1)] = m.group(2).strip()
    return out


ZWSP = "\u200b"
NO_WRAP_KEYS = {"cue", "cueWords", "icon", "focusPlan", "kind", "variant", "frame", "color"}


def _jieba():
    import logging
    import jieba
    jieba.setLogLevel(logging.WARNING)
    big = Path(__file__).resolve().parent / "qa" / "dict" / "dict.txt.big"
    if big.exists() and getattr(jieba, "_tw_dict", None) != str(big):
        jieba.set_dictionary(str(big))
        jieba._tw_dict = str(big)
        user = ROOT / "00_規範" / "專業詞庫.txt"      # 專業詞不要被拆開（分享器、電信業者…）
        if user.exists():
            jieba.load_userdict(str(user))
    return jieba


def word_breaks(text: str) -> str:
    """畫面文字在中文詞與詞之間插入零寬空白，搭配 CSS word-break: keep-all，
    瀏覽器就只會在詞的邊界換行（2026-10-04：「權威伺／服器」「本地／DNS」這類斷行）。
    英數詞、引號內不插；已有空白或標點的地方本來就能斷，不重複插。"""
    if not text or not re.search(r"[㐀-鿿]", text):
        return text
    jb = _jieba()
    out, prev = [], ""
    for w in jb.cut(text):
        if out and re.match(r"[㐀-鿿]", w[:1]) and re.search(r"[㐀-鿿]$", prev):
            out.append(ZWSP)
        out.append(w)
        prev = w
    return "".join(out)


SCREEN_TRAIL = re.compile(r"[。，、；：…\s　]+$")
SCREEN_INNER = re.compile(r"\s*[；。]\s*")
# 「，」換成 EN SPACE（U+2002）當記號：Phrases 排版後，同一行內顯示「，」，在換行處就隱藏（2026-10-05 F10：單行標題逗號換全形空白會空一大格）
SCREEN_COMMA = re.compile(r"\s*，\s*")
COMMA_MARK = " "
SCREEN_DASH2 = re.compile(r"\s*(?:——|──|--)\s*")
SCREEN_DASH1 = re.compile(r"\s*[—―]\s*")


def clean_screen_text(text: str) -> str:
    """畫面物件文字比照字幕規則（2026-10-04 使用者抽檢：兩行字還留著「，」）：
    行尾標點刪掉；句中的「；」「。」改成全形空白（換行的機會點，不顯示標點）；
    「，」改成 COMMA_MARK，由 Phrases 決定：同一行內顯示「，」、換行處隱藏（2026-10-05 F10）。
    破折號（2026-10-05 使用者抽檢）：「——」改空白、「 — 」（標籤與說明之間）改「：」；範圍的「–」（0 – 65535）保留。
    保留：問號／驚嘆號（標題是問句）、「、」（列舉）、「：」（第二段：…）、引號、箭頭。"""
    t = written_form(text.strip())
    t = SCREEN_DASH2.sub("　", t)                 # 「沒寫不是沒有 —— http…」：雙破折號只是停頓 → 空白
    t = SCREEN_DASH1.sub("：", t)                 # 「HTTP — 沒有加密」：標籤與說明 → 冒號
    t = SCREEN_TRAIL.sub("", t)
    t = SCREEN_COMMA.sub(COMMA_MARK, t)
    return SCREEN_INNER.sub("　", t)


LATIN_HYPHEN = re.compile(r"(?<=[A-Za-z0-9])-(?=[A-Za-z0-9])")


def keep_latin_whole(text: str) -> str:
    """英數詞裡的連字號前後加 word joiner（U+2060），瀏覽器不會在「Wi-／Fi」這裡斷行（2026-10-05 版面探針 1-9）"""
    return LATIN_HYPHEN.sub("⁠-⁠", text)



def resolve_terminal(scenes, captions):
    """③ 終端機（2026-10-06）：每一行寫 cue（旁白片語）＋dt（唸到後幾秒出現），換算成場景內秒數 at。
    找不到 cue 就中止建置（跟測驗缺揭曉時間一樣，不讓它悄悄跑出錯的時間）。"""
    norm = lambda x: re.sub(r"[\s　，。、：；！？「」—]", "", x or "")
    for sc in scenes:
        if sc["type"] != "terminal":
            continue
        for ln in sc["props"].get("lines", []):
            if isinstance(ln.get("at"), (int, float)):
                continue
            cue, hit = norm(ln.get("cue")), None
            for c in captions:
                st, txt = c["startMs"] / 1000, norm(c["text"])
                if sc["startSec"] <= st < sc["startSec"] + sc["durSec"] and cue and (cue in txt or (len(txt) >= 4 and txt in cue)):
                    hit = st
                    break
            if hit is None:
                raise SystemExit(f"  ✗ 缺必要時間點：{sc['id']} 終端機「{ln.get('text')}」的 cue「{ln.get('cue')}」旁白裡找不到")
            ln["at"] = round(hit - sc["startSec"] + ln.get("dt", 0.3), 2)
            ln.pop("cue", None); ln.pop("dt", None)

def add_word_breaks(obj, key=None):
    if isinstance(obj, str):
        return obj if key in NO_WRAP_KEYS else keep_latin_whole(word_breaks(clean_screen_text(obj)))
    if isinstance(obj, list):
        return [add_word_breaks(x, key) for x in obj]
    if isinstance(obj, dict):
        return {k: add_word_breaks(v, k) for k, v in obj.items()}
    return obj


def split_cues(cues, max_chars=CAP_MAX):
    """zh-TW 的 edge-tts 給的是「句」級時間戳。
    每頁字幕 ≤16 字：先在標點處切、貪婪合併；仍超過的段落用斷詞從中間切。
    時間依「實際唸出來的長度」分配（DNS、IP 位址唸起來比字面長），切點才會跟聲音對上。"""
    from cues import spoken_len
    out = []
    for ci, c in enumerate(cues):
        txt = c["text"].strip()
        if _vis_len(txt) <= max_chars:
            out.append(dict(c, text=txt))
            continue
        parts = [p for p in PUNCT_SPLIT.split(txt) if p]
        chunks, cur = [], ""
        for p in parts:
            if cur and _vis_len(cur + p) > max_chars:
                chunks.append(cur); cur = p
            else:
                cur += p
        if cur:
            chunks.append(cur)
        # 尾巴太短（例如整句最後只剩「NAT」）：從前一段挪幾個標點段過來，讓兩頁長度接近
        if len(chunks) >= 2 and _vis_len(chunks[-1]) < 5:
            prev = [p for p in PUNCT_SPLIT.split(chunks[-2]) if p]
            while len(prev) > 1 and _vis_len(prev[-1] + chunks[-1]) <= max_chars                     and _vis_len(chunks[-1]) < _vis_len("".join(prev[:-1])):
                chunks[-1] = prev.pop() + chunks[-1]
            chunks[-2] = "".join(prev)
        chunks = [x for ch in chunks for x in _split_long(ch)]
        weights = [max(spoken_len(x), 1) for x in chunks]
        total = sum(weights)
        t, span = c["start"], c["end"] - c["start"]
        # 句子後面的停頓（最多 0.35 秒）也算進可分配時間：字幕本來就會延長到停頓裡
        gap = (cues[ci + 1]["start"] - c["end"]) if ci + 1 < len(cues) else 0.35
        span += max(0.0, min(0.35, gap))
        # 時間分配：每頁先保證「字數 ÷ 9」秒（Netflix 每秒 ≤9 字），剩下的時間依實際唸法長度分。
        # 整句平均 ≤9 字/秒時，每一頁都保證 ≤9；切點跟聲音的誤差仍在句內幾百毫秒以內。
        need = [_vis_len(ch) / CAP_MAX_CPS for ch in chunks]
        if sum(need) < span:
            spare = span - sum(need)
            durs = [n + spare * w / total for n, w in zip(need, weights)]
        else:
            durs = [span * w / total for w in weights]
        pieces = []
        for ch, d in zip(chunks, durs):
            pieces.append({"start": round(t, 3), "end": round(t + d, 3), "text": ch})
            t += d
        # Netflix 最短 5/6 秒：太短的頁併進鄰頁（合併後 ≤18 字，規範允許的上限）
        merged = []
        for pc in pieces:
            if merged and (pc["end"] - pc["start"] < CAP_MIN_SEC or merged[-1]["end"] - merged[-1]["start"] < CAP_MIN_SEC)                     and _vis_len(merged[-1]["text"] + pc["text"]) <= CAP_MAX_HARD:
                merged[-1] = {"start": merged[-1]["start"], "end": pc["end"], "text": merged[-1]["text"] + pc["text"]}
            else:
                merged.append(pc)
        out += merged
    # 跨句：本身就唸不到 5/6 秒的短句（例如「由近到遠」0.8 秒）併進下一頁一起顯示，
    # 合併後 ≤16 字才併；下一頁放不下就併進上一頁
    i = 0
    while i < len(out):
        pg = out[i]
        # 實際顯示長度＝到下一頁開始為止（SRT 相鄰兩句常互相重疊幾十毫秒，用 end 會高估）
        shown = (out[i + 1]["start"] if i + 1 < len(out) else pg["end"]) - pg["start"]
        if shown < CAP_MIN_SEC:
            nxt = out[i + 1] if i + 1 < len(out) else None
            prv = out[i - 1] if i > 0 else None
            if nxt and _vis_len(pg["text"] + nxt["text"]) <= max_chars:
                out[i + 1] = {"start": pg["start"], "end": nxt["end"], "text": pg["text"] + nxt["text"]}
                del out[i]
                continue
            if prv and _vis_len(prv["text"] + pg["text"]) <= max_chars:
                out[i - 1] = {"start": prv["start"], "end": pg["end"], "text": prv["text"] + pg["text"]}
                del out[i]
                continue
        i += 1
    # 尾端延長到下一句開頭，避免字幕閃爍空檔
    for i in range(len(out) - 1):
        out[i]["end"] = round(min(out[i + 1]["start"], out[i]["end"] + 0.35), 3)
    # 最後一道：以「影格」為單位檢查每頁每秒 ≤9 字。整句語速本身就貼著上限時（1-3 的網址句 8.96 字/秒，
    # 換算整數格後三頁需要 145 格、句子只有 144 格），向前後鄰頁借 1～2 格；鄰頁借出後自己也不能超標。
    # 挪動量上限 0.3 秒（同步容許範圍）。
    F = FPS
    fr = lambda x: round(x * F)
    def cps_ok(k, s0, s1):
        n = _vis_len(out[k]["text"])
        return n / max((fr(s1) - fr(s0)) / F, 1e-6) <= 9.0
    for k in range(len(out)):
        s0 = out[k]["start"]
        s1 = out[k + 1]["start"] if k + 1 < len(out) else out[k]["end"]
        moved = 0.0
        while not cps_ok(k, s0, s1) and moved < 0.3:
            step = 1 / F
            if k + 1 < len(out) and cps_ok(k + 1, s1 + step, out[k + 2]["start"] if k + 2 < len(out) else out[k + 1]["end"]):
                s1 += step                       # 下一頁晚一格出現
            elif k > 0 and cps_ok(k - 1, out[k - 1]["start"], s0 - step):
                s0 -= step                       # 這一頁早一格出現
            else:
                break
            moved += step
        out[k]["start"] = round(s0, 3)
        if k > 0:
            out[k - 1]["end"] = round(s0, 3)
        if k + 1 < len(out):
            out[k + 1]["start"] = round(s1, 3)
            out[k]["end"] = round(s1, 3)
    return out


# 與 remotion/src/beats.ts 同一組常數，兩邊必須一致
BEAT_FIRST, BEAT_INTERVAL, MAX_STILL = 1.6, 3.5, 4.0


def beat_schedule(dur: float) -> list[float]:
    """與 beats.ts 的 schedule() 同一套演算法，兩邊必須一致。"""
    span = dur - BEAT_FIRST
    if span <= 0:
        return [0.0]
    n = max(1, math.ceil(span / BEAT_INTERVAL))
    gap = span / n
    return [round(BEAT_FIRST + i * gap, 2) for i in range(n)]


def check_motion(scenes: list[dict]) -> list[str]:
    """落實 garychen-dark.yaml 的鐵律：畫面絕不靜止超過 4 秒。
    節拍由 beats.ts 依場景長度自動排，這裡驗算排出來的間隔確實沒有空窗。"""
    bad = []
    for s in scenes:
        d = s["durSec"]
        if s.get("type") == "qa_endcard":
            continue                      # 倒數條逐幀連續變化，本質不會靜止
        beats = beat_schedule(d)
        if not beats:
            bad.append(f'{s["id"]} ({s["type"]}, {d:.1f}s): 排不出任何節拍')
            continue
        gaps = [beats[0]] + [beats[i + 1] - beats[i] for i in range(len(beats) - 1)] + [d - beats[-1]]
        worst = max(gaps)
        if worst > MAX_STILL:
            bad.append(f'{s["id"]} ({s["type"]}, {d:.1f}s): 最長靜止 {worst:.1f}s > {MAX_STILL}s')
    return bad


# VOICE_DIR：分鏡驗證用的暫配資料夾（2026-10-06）；正式出片不設，讀 02_語音
VOICE = Path(os.environ["VOICE_DIR"]) if os.environ.get("VOICE_DIR") else ROOT / "02_語音"


def main(sid: str, dry: bool = False):
    """dry=True：只算、只檢查，不寫任何檔案（品檢或其他程序正在讀資料檔時用）"""
    plan = json.loads((ROOT / "01_腳本" / f"{sid}_plan.json").read_text(encoding="utf-8"))
    marks = json.loads((VOICE / sid / "marks.json").read_text(encoding="utf-8"))
    dur = {r["scene"]: r["seconds"] for r in marks["scenes"]}

    originals = original_sentences(plan.get("scriptId", sid))
    scenes, cues, t = [], [], 0.0
    by_scene = {}
    for s in plan["scenes"]:
        # fixedSec 的場景沒有旁白（如片尾測驗卡），時長寫死不依語音
        d = s.get("fixedSec") or dur.get(s["id"])
        if d is None:
            raise SystemExit(f"缺少 {s['id']} 的語音，請先跑 tts.py（或在 plan 加 fixedSec）")
        scenes.append({**s, "startSec": round(t, 3), "durSec": round(d, 3)})
        sc = parse_srt(VOICE / sid / f"{s['id']}.srt", t)
        by_scene[s["id"]] = sc
        cues += sc
        t += d

    restored, misses = restore(by_scene, originals)

    # ── 內容驅動的焦點時間點 ────────────────────────────────
    # 用旁白內容決定畫面何時反應，而不是照計時器輪播。
    # 時間來自 edge-tts 的句級邊界（精確），句內依字元位置內插。
    cue_misses, cued = [], 0
    static_scenes = []
    for sc in scenes:
        opt = originals.get(sc["id"])
        if not opt:
            continue
        # 與 subtitles.restore() 用同一組候選、同一個順序，兩邊才會對到同一份文字
        srt = by_scene.get(sc["id"], [])
        lines = match_lines(opt, srt, opt["sents"])
        tl = scene_timeline(srt, lines)
        times, ms = resolve(sc, tl)
        cue_misses += ms
        items_end = 0.0
        ok_sem, unsaid = narration_matches(sc, tl, times)
        if times and not ok_sem:
            # 旁白沒有逐項唸到這些物件＝文不對題。
            # 2026-10-04 使用者抽檢 1-8 S2：「跟所講的東西沒有相關性、突然跳出來一直停著，很無聊」
            # → 不再自動改成一開場出現，直接擋下，要求改 plan 的項目文字（用旁白裡的說法）。
            # 刻意不逐項唸的場景，在 plan 的 props 寫 "allowStatic": true 才放行。
            sc.setdefault("props", {})["staticItems"] = True
            if not sc.get("props", {}).get("allowStatic"):
                static_scenes.append(f'{sc["id"]}（{"、".join(unsaid[:3])}）')
            times = None
        if times:
            n = len(times)
            plan_pts = build_plan(times, n, sc["durSec"])
            if plan_pts:
                sc.setdefault("props", {})["focusPlan"] = plan_pts
                items_end = max(t for t, _ in plan_pts)
                cued += 1
        # footer、測驗揭曉、結語逐句等「非項目」元素也對齊旁白
        sc.setdefault("props", {}).update(extra_timings(sc, tl, items_end))
    if static_scenes:
        raise SystemExit(f"  ✗ 物件文字與旁白文不對題（旁白沒有逐項唸到）：{'；'.join(static_scenes)}\n"
                         f"    請改 01_腳本/{sid}_plan.json 的項目文字，用旁白裡的說法；"
                         f"刻意不唸的場景加 \"allowStatic\": true")
    if cued or cue_misses:
        print(f"  ✓ 內容驅動焦點：{cued} 個場景依旁白時間點對齊"
              + (f"，{len(cue_misses)} 個 cue 查無" if cue_misses else ""))
        for m in cue_misses[:8]:
            print("     ⚠ " + m)
    if misses:
        print("  ⚠ 這些場景的字幕仍是唸法文字（句數對不上）：")
        for m in misses:
            print("     " + m)

    # 開頭會空白的左右對照：兩邊要等旁白唸到才出場，如果第一邊超過 3 秒才出現，
    # 就把稿子 VISUAL 行的標題（例如「可靠的代價」）放上來，畫面不會空著（2026-10-04 品檢看圖發現 1-4 S6 前 12 秒全空）
    titles = visual_titles(plan.get("scriptId", sid))
    for sc in scenes:
        p = sc.get("props", {})
        if sc["type"] == "comparison" and not p.get("heading"):
            first = min((t for t, _ in p.get("focusPlan") or []), default=0.0)
            if first > 3.0 and titles.get(sc["id"]):
                p["heading"] = titles[sc["id"]]
    # 畫面文字加詞邊界（cue 已經解析完，不影響旁白對時）
    # 終端機的指令／輸出是原樣顯示的程式文字，不加詞邊界
    scenes = [{**sc, "props": {**add_word_breaks({k: v for k, v in sc.get("props", {}).items() if k != "lines"}),
                               **({"lines": sc["props"]["lines"]} if sc["type"] == "terminal" else {})}}
              for sc in scenes]
    captions = to_captions(split_cues(cues))
    resolve_terminal(scenes, captions)
    data = {"id": sid, "chapterLabel": plan["chapterLabel"], "audio": f"{sid}.mp3",
            "style": plan.get("style", "garychen-dark"),
            "captions": captions, "scenes": scenes}
    fx_f = ROOT / "00_規範" / "特效設定.json"   # 沒有這份（舊課程）＝不加特效，畫面跟以前一樣
    fx = json.loads(fx_f.read_text(encoding="utf-8")) if fx_f.exists() else {}
    if fx and sid not in fx.get("不套用的節", []):
        data["fx"] = {k: v for k, v in fx.items() if not k.startswith("_") and k != "不套用的節"}
    ddir = ROOT / "04_引擎" / "remotion" / "src" / "data"
    out = ddir / f"{sid}.json"
    if not dry:
        pub = ROOT / "04_引擎" / "remotion" / "public"
        pub.mkdir(parents=True, exist_ok=True)
        shutil.copy(VOICE / sid / "full.mp3", pub / f"{sid}.mp3")
        shutil.copy(ROOT / "03_素材" / "brand" / "cover.jpg", pub / "cover.jpg")
        shutil.copy(ROOT / "03_素材" / "brand" / "logo.png", pub / "logo.png")

        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        # Remotion --props 要的外層包裝
        (ddir / f"{sid}.props.json").write_text(
            json.dumps({"data": data}, ensure_ascii=False, indent=2), encoding="utf-8")

    # 字幕覆蓋檢查 —— 曾因漏掉 pageBreakAfter 讓整支片只剩 2.6 秒字幕，
    # 而且渲染不會報錯。這種靜默失敗一定要擋下來。
    caps = data["captions"]
    span = (caps[-1]["endMs"] - caps[0]["startMs"]) / 1000 if caps else 0
    cover = sum(c["endMs"] - c["startMs"] for c in caps) / 1000
    longest = max((_vis_len(c["text"]) for c in caps), default=0)
    if span and cover / span < 0.85:
        raise SystemExit(f"✗ 字幕覆蓋不足：{cover:.0f}s / {span:.0f}s "
                         f"= {cover/span*100:.0f}%（應 >85%）")
    if longest > CAP_MAX_HARD:
        raise SystemExit(f"✗ 有字幕單頁長達 {longest} 字（Netflix 繁中規範 ≤16，必要時 ≤18）——"
                         f"超長多半是 pageBreakAfter 沒設，整段被合成一頁")

    print(f"{sid}: {len(scenes)} scenes, {t:.1f}s ({t/60:.2f} 分), "
          f"{len(caps)} 句字幕（覆蓋 {cover/span*100:.0f}%，最長 {longest} 字）")
    # 2026-10-03：取消「畫面不得靜止超過 4 秒」的建置門檻。
    # 使用者要求物件跟著旁白動、唸完就固定，不要為了湊動態而循環；
    # 所以改成檢查「有項目的場景是不是都對上了旁白」，對不上就擋下來。
    with_items = [s for s in scenes if item_texts(s)]
    unsynced = [s["id"] for s in with_items
                if not s.get("props", {}).get("focusPlan") and not s.get("props", {}).get("staticItems")]
    if unsynced:
        raise SystemExit(f"  ✗ 這些場景的項目沒有對上旁白（請在 plan 補 cue）：{', '.join(unsynced)}")
    print(f"  ✓ 同步檢查通過：{len(with_items)} 個有項目的場景全部依旁白出場")
    # 必要時間點（品檢 N4，2026-10-06）：缺了元件會整格報錯或亂跳，建置就擋下
    missing = []
    for s in scenes:
        p = s.get("props", {})
        if s["type"] == "quiz" and not isinstance(p.get("revealAt"), (int, float)):
            missing.append(f"{s['id']} 測驗沒有揭曉時間（旁白要有「答案是」或問句後接答案）")
        if s["type"] == "qa_endcard" and not isinstance(p.get("answerSec"), (int, float)):
            missing.append(f"{s['id']} 片尾測驗沒有 answerSec")
    if missing:
        raise SystemExit("  ✗ 缺必要時間點：" + "；".join(missing))
    print("  ✓ 必要時間點齊全（測驗揭曉、片尾測驗）")
    for s in scenes:
        print(f"   {s['id']:3} {s['type']:14} {s['startSec']:6.2f}s +{s['durSec']:5.2f}s")
    print(f"→ {out}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--dry"]
    main(args[0] if args else "1-1", dry="--dry" in sys.argv)
