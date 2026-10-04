#!/usr/bin/env python3
"""final_qa.py 的兩個延伸：

1. spec_checks()：讀 storynow-aimovie-make 十一步流程建置出的 src/data/spec.json
   （captions：每頁字幕文字與起訖格數；voiceLines：每句旁白原文、送進 TTS 的寫法、起訖秒數），
   量「字幕對不對、同不同步」與 Netflix 繁中字幕規範。
2. render_html()：把全部結果做成一份 HTML 報告（附截圖總覽），跟 final_qa.md 放在一起。
"""
from __future__ import annotations
import html, json, re, subprocess
from pathlib import Path

E = html.escape
PUNCT = "。，、；：？！…—．,.;:?!"
PARTICLE_START = "的了嗎呢吧啊著過」』）"
NETFLIX = {"max_chars": 16, "hard_chars": 18, "max_cps": 9.0, "min_sec": 5 / 6, "max_sec": 7.0}
SYNC_TOL = 0.25          # 字幕起訖可以比旁白早／晚多少秒


def _vis(t: str) -> str:
    return re.sub(rf"[\s　{re.escape(PUNCT)}「」『』（）()]", "", t)


def spec_checks(spec_path: Path) -> dict:
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    fps = spec.get("fps", 30)
    caps = spec.get("captions") or []
    lines = spec.get("voiceLines") or []
    R: dict = {"captions": len(caps), "voiceLines": len(lines), "voice_timing": bool(lines)}
    if not lines:
        # 舊版 build.py 的 spec.json 沒有 voiceLines：旁白原文改從專案的 storyboard.json 讀（沒有時間，G4 無法量）
        sb = Path(spec_path).resolve().parent.parent.parent / "storyboard.json"
        if sb.exists():
            story = json.loads(sb.read_text(encoding="utf-8"))
            for sc in story.get("scenes", []):
                for ln in sc.get("lines", []):
                    t = ln if isinstance(ln, str) else ln.get("text", "")
                    if t and not re.fullmatch(r"[.…。\s]+", t):
                        lines.append({"text": t, "from": None, "to": None})

    # G1 標點
    end_p = [c["text"] for c in caps if c["text"].strip() and c["text"].strip()[-1] in PUNCT]
    inner = [c["text"] for c in caps if re.search(r"[。，、；：？！]", c["text"].strip()[:-1])]
    R["G1"] = {"end": len(end_p), "inner": len(inner), "examples": end_p[:5]}

    # G2 Netflix 字數／語速／停留
    over16, over18, fast, short, long_ = [], [], [], [], []
    for c in caps:
        n = len(_vis(c["text"]))
        sec = (c["to"] - c["from"]) / fps
        if n > NETFLIX["max_chars"]:
            over16.append(f"{n}字｜{c['text']}")
        if n > NETFLIX["hard_chars"]:
            over18.append(f"{n}字｜{c['text']}")
        if sec > 0 and n / sec > NETFLIX["max_cps"]:
            fast.append(f"{n / sec:.1f}字/秒｜{c['text']}")
        if sec < NETFLIX["min_sec"]:
            short.append(f"{sec:.2f}秒｜{c['text']}")
        if sec > NETFLIX["max_sec"]:
            long_.append(f"{sec:.1f}秒｜{c['text']}")
    R["G2"] = {"over16": len(over16), "over18": len(over18), "fast": len(fast), "short": len(short),
               "long": len(long_), "examples": over18[:3] + fast[:3] + short[:3] + long_[:3]}

    # G3 字幕串起來＝旁白原文
    want = _vis("".join(l["text"] for l in lines))
    got = _vis("".join(c["text"] for c in caps))
    R["G3"] = {"match": want == got, "voice_chars": len(want), "caption_chars": len(got)}
    if want != got:
        i = next((k for k in range(min(len(want), len(got))) if want[k] != got[k]), min(len(want), len(got)))
        R["G3"]["first_diff"] = {"voice": want[max(0, i - 8):i + 12], "caption": got[max(0, i - 8):i + 12]}

    # G4 字幕同步：每頁字幕要落在「它那幾個字所屬的旁白句」的時間內
    #   開頭不得早於句子開始 SYNC_TOL 秒；結尾可延長到句後停頓（再多 0.6 秒）
    flat, owner = "", []
    for k, l in enumerate(lines):
        t = _vis(l["text"])
        flat += t
        owner += [k] * len(t)
    off, pos = [], 0
    for c in (caps if R["voice_timing"] else []):
        body = _vis(c["text"])
        j = flat.find(body, pos) if body else -1
        if j < 0:
            continue                         # 對不上原文的頁由 G3 負責回報
        l0, l1 = lines[owner[j]], lines[owner[j + len(body) - 1]]
        cf, ct = c["from"] / fps, c["to"] / fps
        if cf < l0["from"] - SYNC_TOL or cf > l1["to"] or ct > l1["to"] + SYNC_TOL + 0.6:
            off.append(f"{cf:.2f}～{ct:.2f}s｜{c['text']}（旁白 {l0['from']:.2f}～{l1['to']:.2f}s）")
        pos = j + len(body)
    R["G4"] = {"count": len(off), "examples": off[:6], "measured": R["voice_timing"]}

    # G5 唸法文字殘留：字幕上出現送進 TTS 的寫法（D N S、一九二點…）
    leak = [c["text"] for c in caps
            if re.search(r"(?<![A-Za-z])[A-Za-z] [A-Za-z](?: [A-Za-z])+", c["text"])]
    R["G5"] = {"count": len(leak), "examples": leak[:5]}

    # G6 斷句：一頁以虛詞或收尾符號開頭
    bad = [c["text"] for c in caps if c["text"].strip()[:1] in PARTICLE_START]
    R["G6"] = {"count": len(bad), "examples": bad[:5]}
    return R


def layout_summary(layout_path: Path) -> dict:
    """讀 qa_layout.mjs 的輸出（十一步流程的 engine/scripts 或範本E 都是 [{frame, issues:[{kind,...}]}]）"""
    data = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    kinds: dict[str, int] = {}
    rows = []
    for x in data:
        for i in x.get("issues", []):
            kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
            if len(rows) < 30:
                rows.append([x.get("scene", ""), x.get("frame", ""), i["kind"], i.get("text", ""), i.get("detail", "")])
    return {"frames": len(data), "issues": sum(kinds.values()), "kinds": kinds, "rows": rows}


def contact_sheet(mp4: Path, dur: float, out: Path, n: int = 12):
    ts = [dur * (k + 0.5) / n for k in range(n)]
    sel = "+".join(f"between(t\\,{t:.2f}\\,{t + 0.05:.2f})" for t in ts)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-vf",
                    f"select='{sel}',scale=480:270,tile=4x{(n + 3) // 4}:padding=6:color=0x303030",
                    "-frames:v", "1", "-fps_mode", "vfr", str(out)], capture_output=True)


CSS = """:root{--bg:#f6f6f4;--card:#fff;--ink:#1d1d1f;--muted:#6b6b70;--line:#e3e3e0;--ok:#1a7f45;--bad:#c4321c;--warn:#a86400}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--card:#202020;--ink:#ececec;--muted:#9a9a9a;--line:#333;--ok:#3fbf73;--bad:#ff6a50;--warn:#e8a43a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "Microsoft JhengHei","Noto Sans TC",system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:28px 16px 64px}h1{font-size:24px;margin:0 0 6px}h2{font-size:19px;margin:34px 0 10px;padding-top:8px;border-top:2px solid var(--line)}
.sub{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.kpi b{display:block;font-size:22px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);margin:8px 0 14px;font-size:14px}
th,td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-weight:600;white-space:nowrap}
.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}.warn{color:var(--warn);font-weight:600}
img{max-width:100%;border-radius:8px;border:1px solid var(--line)}code{font-family:Consolas,monospace}.wrap{overflow-x:auto}"""


def _row(code, name, ok, value, note=""):
    mark = "<span class='ok'>✓</span>" if ok is True else "<span class='bad'>✗</span>" if ok is False else "<span class='warn'>－</span>"
    return f"<tr><td>{mark}</td><td><code>{E(code)}</code></td><td>{E(name)}</td><td>{E(str(value))}</td><td class='sub'>{E(note)}</td></tr>"


def render_html(R: dict, bad: list[str], out: Path, mp4: Path, sheet: Path | None) -> Path:
    rows = [
        _row("F1", "字幕閃爍", R["F1"]["count"] == 0, R["F1"]["count"], "字幕帶前後有字、中間空 1～2 格"),
        _row("F2", "字幕抖動", R["F2"]["count"] == 0, R["F2"]["count"], "同一頁字幕外框逐格變動"),
        _row("F3", "黑畫面", not R["F3"], len(R["F3"]), "> 0.3 秒"),
        _row("F11", "畫面突跳", R["F11"]["count"] == 0, R["F11"]["count"], "內容區單一格大幅改變（瞬間亮暗切換、版面跳動）"),
        _row("F4", "最長靜止", None, f"{R['F4']['max_still']}s", "參考值"),
        _row("F5", "規格", R["F5"]["size"] == "1920x1080", f"{R['F5']['size']} {R['F5']['fps']}fps {R['F5']['vcodec']}/{R['F5']['acodec']}"),
        _row("F6", "響度／峰值", R["F6"]["ok"], f"{R['F6']['I']} LUFS／{R['F6']['TP']} dBTP", "EBU R128"),
        _row("F7", "中段無聲", not [x for x in R["F7"] if x not in R.get("F7_designed", [])],
             len(R["F7"]) - len(R.get("F7_designed", [])), f"設計上的無聲 {len(R.get('F7_designed', []))} 段另列"),
        _row("F8", "長度", R["F8"].get("ok"), f"{R['F8']['minutes']} 分"),
    ]
    g = R.get("G")
    if g:
        rows += [
            _row("G1", "字幕句尾標點", g["G1"]["end"] == 0, g["G1"]["end"], f"句中標點 {g['G1']['inner']} 頁（Netflix 允許，本專案慣例不放）"),
            _row("G2", "字幕字數／語速／停留", not (g["G2"]["over18"] or g["G2"]["fast"] or g["G2"]["short"] or g["G2"]["long"]),
                 f">18字 {g['G2']['over18']}、>9字/秒 {g['G2']['fast']}、<5/6秒 {g['G2']['short']}、>7秒 {g['G2']['long']}",
                 f"Netflix 繁中規範；>16 字（容許）{g['G2']['over16']} 頁"),
            _row("G3", "字幕＝旁白原文", g["G3"]["match"], f"{g['G3']['caption_chars']}／{g['G3']['voice_chars']} 字"),
            (_row("G4", "字幕與旁白同步", g["G4"]["count"] == 0, g["G4"]["count"], f"每頁字幕要落在所屬旁白句的時間內 ±{SYNC_TOL}s")
             if g["G4"].get("measured") else
             _row("G4", "字幕與旁白同步", None, "無法量", "這份 spec.json 沒有 voiceLines（舊版 build.py），重新建置後即可量")),
            _row("G5", "唸法文字殘留", g["G5"]["count"] == 0, g["G5"]["count"]),
            _row("G6", "斷句不佳", g["G6"]["count"] == 0, g["G6"]["count"], "一頁以「的、了、」」開頭"),
        ]
    lay = R.get("L")
    if lay:
        rows.append(_row("L", "版面（瀏覽器量測）", lay["issues"] == 0, f"{lay['issues']} 個問題／{lay['frames']} 格",
                         "、".join(f"{k} {v}" for k, v in lay["kinds"].items())))
    h = [f"<!doctype html><html lang='zh-Hant'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
         f"<title>最終品檢</title><style>{CSS}</style></head><body><main>",
         f"<h1>最終品檢：{E(mp4.name)}</h1>",
         f"<p class='sub'>{R['F8']['minutes']} 分・{R['F5']['size']}・響度 {R['F6']['I']} LUFS</p>",
         "<div class='grid'>" + "".join(
             f"<div class='kpi'><b class='{c}'>{v}</b>{E(k)}</div>" for k, v, c in [
                 ("結果", "通過" if not bad else f"{len(bad)} 項未通過", "ok" if not bad else "bad"),
                 ("字幕閃爍", R["F1"]["count"], "ok" if not R["F1"]["count"] else "bad"),
                 ("字幕抖動", R["F2"]["count"], "ok" if not R["F2"]["count"] else "bad"),
                 ("響度 LUFS", R["F6"]["I"], "ok" if R["F6"]["ok"] else "bad")]) + "</div>"]
    if bad:
        h.append("<h2>未通過</h2><ul>" + "".join(f"<li class='bad'>{E(b)}</li>" for b in bad) + "</ul>")
    h.append("<h2>檢查項目</h2><div class='wrap'><table><tr><th></th><th>代號</th><th>項目</th><th>結果</th><th>說明</th></tr>"
             + "".join(rows) + "</table></div>")
    ex = []
    for key, title in (("F1", "字幕閃爍位置"), ("F2", "字幕抖動位置"), ("F11", "畫面突跳位置")):
        if R[key]["count"]:
            ex.append(f"<h3>{title}</h3><p>" + "、".join(f"{e['sec']}s" for e in R[key]["examples"]) + "</p>")
    if g:
        for key, title in (("G2", "字數／語速舉例"), ("G4", "不同步的字幕"), ("G5", "唸法文字殘留"), ("G6", "斷句不佳")):
            if g[key].get("examples"):
                ex.append(f"<h3>{title}</h3><ul>" + "".join(f"<li>{E(x)}</li>" for x in g[key]["examples"]) + "</ul>")
        if not g["G3"]["match"]:
            d = g["G3"].get("first_diff", {})
            ex.append(f"<h3>字幕與旁白第一處不同</h3><p>旁白：{E(d.get('voice', ''))}<br>字幕：{E(d.get('caption', ''))}</p>")
    if lay and lay["rows"]:
        ex.append("<h3>版面問題</h3><div class='wrap'><table><tr><th>場景</th><th>格</th><th>問題</th><th>文字</th><th>數值</th></tr>"
                  + "".join("<tr>" + "".join(f"<td>{E(str(c))}</td>" for c in r) + "</tr>" for r in lay["rows"]) + "</table></div>")
    if R.get("F7_designed"):
        ex.append("<h3>設計上的無聲</h3><p>" + "、".join(f"{x[0]:.0f}～{x[1]:.0f}s" for x in R["F7_designed"]) + "</p>")
    if ex:
        h.append("<h2>明細</h2>" + "".join(ex))
    if R.get("F9"):
        h.append("<h2>英數詞唸法（時長比對）</h2><table><tr><th>詞</th><th>判定</th></tr>" +
                 "".join(f"<tr><td><code>{E(t['term'])}</code></td><td>{E(t['verdict'])}</td></tr>" for t in R["F9"]) + "</table>")
    if R.get("F10"):
        h.append(f"<h2>多音詞（{len(R['F10'])} 處，需試聽）</h2><table><tr><th>詞</th><th>正確讀音</th><th>句子</th></tr>" +
                 "".join(f"<tr><td>{E(x['word'])}</td><td>{E(x['pinyin'])}</td><td>{E(x['line'])}</td></tr>" for x in R["F10"][:60]) + "</table>")
    if sheet and sheet.exists():
        h.append(f"<h2>截圖總覽</h2><img src='{E(sheet.name)}' alt='每隔一段時間取一格'>")
    h.append("</main></body></html>")
    f = out / "final_qa.html"
    f.write_text("\n".join(h), encoding="utf-8")
    return f
