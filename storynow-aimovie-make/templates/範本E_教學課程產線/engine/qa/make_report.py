#!/usr/bin/env python3
"""把 11_品檢\\<標籤>\\ 裡的量測結果整理成一份 HTML 報告。

  py qa\\make_report.py <標籤> [--title 標題] [--changes changes.json]

讀：report.json（qa_run.py）、layout_<節>.json（qa_layout.mjs）、asr.json（qa_asr.py）
寫：11_品檢\\<標籤>\\品檢報告.html（圖片以相對路徑引用，整個資料夾一起帶走即可）
changes.json：修改紀錄（修改前後對照），由 make_compare.py 產生。
"""
from __future__ import annotations
import argparse, html, json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
E = html.escape

CSS = """
:root{--bg:#f6f6f4;--card:#fff;--ink:#1d1d1f;--muted:#6b6b70;--line:#e3e3e0;--ok:#1a7f45;--bad:#c4321c;--warn:#a86400;--accent:#d97a00}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--card:#202020;--ink:#ececec;--muted:#9a9a9a;--line:#333;--ok:#3fbf73;--bad:#ff6a50;--warn:#e8a43a;--accent:#f89800}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "Microsoft JhengHei","Noto Sans TC",system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 16px 80px}h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:40px 0 10px;padding-top:8px;border-top:2px solid var(--line)}
h3{font-size:16px;margin:22px 0 8px}.sub{color:var(--muted);margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.kpi b{display:block;font-size:24px}.kpi span{color:var(--muted);font-size:13px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:8px 0 16px;font-size:14px}
th,td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:color-mix(in srgb,var(--line) 45%,transparent);font-weight:600;white-space:nowrap}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}.warn{color:var(--warn);font-weight:600}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
img{max-width:100%;border-radius:8px;border:1px solid var(--line);display:block}details{margin:6px 0}summary{cursor:pointer;color:var(--accent)}
.tag{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line);color:var(--muted);margin-right:4px}
audio{height:30px;width:220px}code{font-family:Consolas,monospace;font-size:13px}
.wrap{overflow-x:auto}
"""


def mark(ok: bool | None, good="通過", bad="未通過") -> str:
    if ok is None:
        return '<span class="warn">未量</span>'
    return f'<span class="ok">✓ {good}</span>' if ok else f'<span class="bad">✗ {bad}</span>'


def table(head: list[str], rows: list[list], num: set[int] = frozenset()) -> str:
    h = "".join(f"<th>{E(x)}</th>" for x in head)
    b = "".join("<tr>" + "".join(f'<td class="n">{c}</td>' if i in num else f"<td>{c}</td>"
                                 for i, c in enumerate(r)) + "</tr>" for r in rows)
    return f'<div class="wrap"><table><tr>{h}</tr>{b}</table></div>'


def build(label: str, title: str, changes: Path | None) -> Path:
    d = ROOT / "11_品檢" / label
    rep = json.loads((d / "report.json").read_text(encoding="utf-8"))
    th = rep["thresholds"]
    secs = rep["sections"]
    # 版面量測是另一支程式（qa_layout.mjs）產生的，可能比 report.json 晚完成：一律以資料夾裡的檔案為準
    for sid in secs:
        lf = d / f"layout_{sid}.json"
        if lf.exists():
            secs[sid]["layout"] = json.loads(lf.read_text(encoding="utf-8"))
    asr = json.loads((d / "asr.json").read_text(encoding="utf-8")) if (d / "asr.json").exists() else []
    out = [f"<!doctype html><html lang='zh-Hant'><head><meta charset='utf-8'>"
           f"<meta name='viewport' content='width=device-width,initial-scale=1'><title>{E(title)}</title>"
           f"<style>{CSS}</style></head><body><main>"]
    out.append(f"<h1>{E(title)}</h1><p class='sub'>標籤：{E(label)}　節數：{len(secs)}　"
               f"整集：{'、'.join(rep['episodes']) or '—'}</p>")

    # ── 總覽 ──
    tot = Counter()
    for sid, s in secs.items():
        c = s["captions"]
        tot["caps"] += c["C1"]["total"]; tot["trail"] += c["C1"]["count"]; tot["inner"] += c["C1"].get("inner", 0)
        tot["flicker"] += c["C2"]["count"] or 0; tot["jitter"] += c["C3"]["count"] or 0
        tot["c6bad"] += 0 if c["C6"]["match"] else 1
        sy = s["sync"]
        tot["items"] += sy["S1"]["item_scenes"]; tot["undriven"] += len(sy["S1"]["undriven"])
        tot["loop"] += sy["S2"]["loop_points"]
        lay = s.get("layout") or []
        tot["layout"] += sum(len(x.get("issues", [])) for x in lay); tot["frames"] += len(lay)
        av = s.get("av")
        if av:
            tot["silence"] += len(av["A3"]); tot["black"] += len(av["V2"])
    pr = rep["pron"]
    asr_miss = sum(1 for r in asr if not r["found"])
    kpis = [("字幕句尾標點", tot["trail"], f"共 {tot['caps']} 頁"), ("字幕換頁閃爍", tot["flicker"], "成片實測"),
            ("同頁抖動", tot["jitter"], "字幕位置變動"), ("物件沒對旁白", tot["undriven"], f"共 {tot['items']} 個有項目的場景"),
            ("講完又循環", tot["loop"], "焦點回頭重跑次數"), ("版面問題", tot["layout"], f"量了 {tot['frames']} 格"),
            ("唸法未定義", pr["P1"]["undefined"], f"共 {pr['P1']['terms']} 個英數詞"),
            ("回聽找不到", asr_miss, f"共 {len(asr)} 詞次" if asr else "未跑"),
            ("中段無聲", tot["silence"], f">{th['silence_sec']}s"), ("黑畫面", tot["black"], f">{th['black_sec']}s")]
    out.append("<h2>總覽</h2><div class='grid'>" + "".join(
        f"<div class='kpi'><b class='{'ok' if v == 0 else 'bad'}'>{v}</b>{E(k)}<br><span>{E(n)}</span></div>"
        for k, v, n in kpis) + "</div>")

    if changes and changes.exists():
        ch = json.loads(changes.read_text(encoding="utf-8"))
        out.append("<h2>修改紀錄（修改前後對照）</h2>")
        for k, c in enumerate(ch, 1):
            out.append(f"<div class='box'><h3>修改 {k}：{E(c['title'])}</h3>"
                       f"<p><span class='tag'>對應問題 {E(c['issue'])}</span><span class='tag'>{E(c['file'])}</span></p>"
                       f"<p><b>原因：</b>{E(c['cause'])}</p><p><b>改法：</b>{E(c['fix'])}</p>"
                       + "".join(f"<p class='sub'>{E(img['caption'])}</p><img src='{E(img['src'])}' loading='lazy'>"
                                 for img in c.get("images", []))
                       + (table(["詞", "節／場景", "修改前", "修改後"],
                                [[f"<code>{E(a['term'])}</code>", f"{E(a['sid'])} {E(a['scene'])}",
                                  f"<audio controls preload='none' src='{E(a['before'])}'></audio>",
                                  f"<audio controls preload='none' src='{E(a['after'])}'></audio>"]
                                 for a in c["audio"]]) if c.get("audio") else "")
                       + "</div>")

    # ── C 字幕 ──
    out.append("<h2>C 字幕</h2>")
    rows = []
    for sid, s in secs.items():
        c = s["captions"]
        rows.append([sid, c["C1"]["total"], c["C1"]["count"], c["C1"].get("inner", "—"), c["C2"]["count"],
                     c["C3"]["count"], c["C4"].get("over16", "—"), c["C4"]["long"], c["C4"]["fast"], c["C4"]["short"],
                     c["C4"].get("toolong", "—"), c["C5"]["count"], c.get("C7", {}).get("count", "—"),
                     mark(c["C6"]["match"], "一致", "不一致")])
    out.append("<p class='sub'>C4 依 Netflix 繁體中文字幕規範：每行 16 字（需要時 18）、每秒 ≤9 字、每頁 5/6～7 秒。</p>")
    out.append(table(["節", "字幕頁", "C1 句尾標點", "句中標點", "C2 換頁閃爍", "C3 同頁抖動",
                      "C4 >16字（容許）", ">18字", ">9字/秒", "<5/6秒", ">7秒",
                      "C5 唸法殘留", "C7 斷句不佳", "C6 與稿子"], rows, set(range(1, 13))))
    ex = [(sid, x) for sid, s in secs.items() for x in s["captions"]["C2"]["examples"][:2]]
    if ex:
        out.append("<details><summary>C2 閃爍位置舉例</summary>" + table(
            ["節", "秒", "空白格數", "前一頁 → 後一頁"],
            [[sid, x["at"], x["frames"], E(" → ".join(x["between"]))] for sid, x in ex], {1, 2}) + "</details>")
    ex = [(sid, x) for sid, s in secs.items() for x in s["captions"]["C4"]["examples"]]
    if ex:
        out.append("<details><summary>C4 字數／語速舉例</summary>" + table(
            ["節", "內容"], [[sid, E(x)] for sid, x in ex]) + "</details>")

    # ── S 同步 ──
    out.append("<h2>S 物件與旁白同步</h2>")
    rows = []
    for sid, s in secs.items():
        sy = s["sync"]
        rows.append([sid, sy["S1"]["item_scenes"], sy["S1"]["driven"], len(sy["S1"]["undriven"]),
                     sy["S2"]["loop_points"], sy["S3"]["count"], len(sy["S4"]["late"])])
    out.append(table(["節", "有項目的場景", "依旁白出場", "S1 計時輪播（沒對旁白）", "S2 講完又循環",
                      "S3 cue 查無", "S4 亮起比旁白晚 >1s"], rows, set(range(1, 7))))
    det = []
    for sid, s in secs.items():
        for r in s["sync"]["rows"]:
            for it in r.get("detail", []):
                det.append([sid, r["scene"], E(r["type"]), E(it["item"]), it["at"], E(it.get("src", "")), E(it["said"])])
    if det:
        out.append("<details><summary>逐項核對：每個物件在幾秒出場、當下旁白在唸什麼</summary>"
                   + table(["節", "場景", "型別", "物件", "出場秒", "依據", "當下旁白"], det, {4}) + "</details>")
    und = [(sid, x) for sid, s in secs.items() for x in s["sync"]["S1"]["undriven"]]
    if und:
        out.append("<details><summary>S1 計時輪播的場景</summary>" + table(
            ["節", "場景"], [[sid, E(x)] for sid, x in und]) + "</details>")

    # ── P 唸法 ──
    out.append("<h2>P 唸法與寫法</h2>")
    out.append("<h3>P1 不在發音規範裡的英數詞（TTS 自己猜怎麼唸）</h3>")
    out.append(table(["詞", "次數", "送進 TTS 的寫法", "上下文", "第一次出現"],
                     [[f"<code>{E(k)}</code>", n, f"<code>{E(say)}</code>", E(ctx), E(w)]
                      for k, n, say, ctx, w in pr["P1"]["list"]], {1}))
    dur = json.loads((d / "pron_duration.json").read_text(encoding="utf-8")) if (d / "pron_duration.json").exists() else {}
    if dur:
        out.append("<h3>P2 唸法實測（時長比對）</h3><p class='sub'>同一詞重複 4 次送 TTS，跟各種候選唸法比時長；"
                   "時長相同＝TTS 就是那樣唸。這是判斷依據（語音辨識對英文縮寫誤判太多，只當試聽清單）。</p>")
        import sys as _sys
        _sys.path.insert(0, str(ROOT / "04_引擎"))
        from tts import to_speech
        rows = []
        for k, row in dur.items():
            raw = row[k]
            alts = [(a, v) for a, v in row.items() if a != k]
            best = min(alts, key=lambda x: abs(x[1] - raw))
            same = abs(best[1] - raw) <= 0.03
            now = to_speech(k)
            rows.append([f"<code>{E(k)}</code>", f"{raw:.2f}s", E("　".join(f"{a} {v:.2f}s" for a, v in alts)),
                         (f"<span class='ok'>＝{E(best[0])}</span>" if same else f"<span class='warn'>都不像（最接近 {E(best[0])}）</span>"),
                         f"<code>{E(now)}</code>" + (" <span class='ok'>已明定</span>" if now != k else "")])
        out.append(table(["詞", "原樣送 TTS", "候選唸法", "原樣時 TTS 唸成", "現在送進 TTS"], rows, {1}))
    if asr:
        bad = [r for r in asr if not r["found"]]
        out.append(f"<details><summary>P2b 回聽試聽清單（語音辨識沒聽出該詞的 {len(bad)} 處，僅供抽查）</summary>"
                   "<p class='sub'>中文模式的語音辨識常把英文縮寫聽成中文字，這裡列出來方便直接按播放確認。</p>")
        out.append(table(["節", "場景", "詞", "送進 TTS", "辨識結果", "試聽"],
                         [[r["sid"], r["scene"], f"<code>{E(r['term'])}</code>", f"<code>{E(r['sent_to_tts'])}</code>",
                           E(r["heard"]), f"<audio controls preload='none' src='{E(r['clip'])}'></audio>"]
                          for r in bad]) + "</details>")
    poly = json.loads((d / "poly.json").read_text(encoding="utf-8")) if (d / "poly.json").exists() else []
    if poly:
        out.append(f"<h3>P4 多音詞試聽（{len({p['word'] for p in poly})} 個詞，每詞 2 段）</h3>"
                   "<p class='sub'>程式分不出聲調，這一項要人聽。對照右邊的正確讀音，唸錯的打勾回報即可。</p>")
        out.append(table(["詞", "正確讀音", "出現次數", "節／場景", "句子", "試聽"],
                         [[E(p["word"]), E(p["pinyin"]), p["total"], f"{E(p['sid'])} {E(p['scene'])}", E(p["line"]),
                           f"<audio controls preload='none' src='{E(p['clip'])}'></audio>"] for p in poly], {2}))
    v = pr["P3"]["variants"]
    out.append("<h3>P3 同一個詞有不同寫法</h3>" + (table(
        ["詞", "出現的寫法（次數）"], [[E(k), E("、".join(f"{a}（{b}）" for a, b in w.items()))] for k, w in v.items()])
        if v else "<p class='ok'>沒有</p>"))

    # ── L 版面 ──
    out.append("<h2>L 版面</h2><p class='sub'>每個場景抽 3～6 格，用瀏覽器量每段文字的實際位置。"
               f"安全區左右 80px、上下 100px（ChatGPT 建議＝Remotion 官方規則）；文字間距 ≥12px；字級下限 24px；字幕區不得有畫面文字。</p>")
    rows, det = [], []
    for sid, s in secs.items():
        lay = s.get("layout") or []
        cnt = Counter(i["kind"] for x in lay for i in x.get("issues", []))
        errs = sum(1 for x in lay if x.get("error"))
        rows.append([sid, len(lay), errs] + [cnt.get(k, 0) for k in
                    ("超出畫面", "超出安全區", "文字重疊", "間距過小", "闖進字幕區", "字級過小", "內容溢出", "斷行不佳", "標題過長",
                     "詞中斷行", "圖塊重疊", "對比不足", "版面偏移", "畫面空白")])
        seen = set()
        for x in lay:
            for i in x.get("issues", []):
                key = (x["scene"], i["kind"], i["text"])
                if key in seen:
                    continue
                seen.add(key)
                det.append([sid, x["scene"], E(x["type"]), x["t"], E(i["kind"]), E(i["text"]), E(i["detail"])])
    out.append(table(["節", "量測格數", "算圖失敗", "超出畫面", "超出安全區", "文字重疊", "間距過小", "闖進字幕區", "字級過小",
                      "內容溢出", "斷行不佳", "標題過長", "詞中斷行", "圖塊重疊", "對比不足", "版面偏移", "畫面空白"],
                     rows, set(range(1, 17))))
    if det:
        out.append("<details open><summary>版面問題明細</summary>" + table(
            ["節", "場景", "型別", "場景內秒數", "問題", "文字", "位置／數值"], det, {3}) + "</details>")

    # ── A／V ──
    out.append("<h2>A 聲音・V 畫面</h2>")
    rows = []
    for sid, s in secs.items():
        av = s.get("av")
        if not av:
            continue
        lo = av["A1"]
        rows.append([sid, f"{lo['I']}", f"{lo['LRA']}", f"{lo['TP']}", mark(av["A2"]["ok"]), len(av["A3"]),
                     f"{av['A4']['diff']:+.2f}s", av["V1"]["size"], av["V1"]["fps"], len(av["V2"]),
                     f"{av['V3']['max_still']:.1f}s", f"{av['V3']['static_ratio'] * 100:.0f}%",
                     mark(av["V4"]["mp4_newer_than_data"], "新", "舊檔")])
    out.append("<p class='sub'>單節響度只看各節是否一致；是否達標看整集（E 區），整集合併時統一正規化。</p>")
    out.append(table(["節", "A1 響度 LUFS", "響度範圍 LU", "峰值 dBTP", f"A2 ≤{th['true_peak']}",
                      "A3 中段無聲", "A4 聲畫差", "V1 尺寸", "fps", "V2 黑畫面", "V3 最長靜止", "靜止比例", "V4 檔案"],
                     rows, {1, 3, 5, 6, 9, 10, 11}))

    # ── E 整集 ──
    if rep["episodes"]:
        out.append("<h2>E 整集</h2>")
        out.append(table(["集", "長度（分）", f"E1 {th['ep_minutes'][0]}～{th['ep_minutes'][1]}", "整集響度", f"{th['lufs'][0]}～{th['lufs'][1]}", "峰值",
                          f"E2 各節響度落差（≤{th['ep_lufs_spread']}）", "E3 黑畫面", "E3 無聲"],
                         [[k, e["E1"]["minutes"], mark(e["E1"]["ok"]), e["E2"]["ep_lufs"],
                           mark(e["E2"]["ep_lufs"] is not None and th["lufs"][0] <= e["E2"]["ep_lufs"] <= th["lufs"][1]),
                           e["E2"]["ep_tp"],
                           f"{e['E2']['spread']} " + mark(e["E2"]["spread"] is not None and e["E2"]["spread"] <= th["ep_lufs_spread"]),
                           E(str(e["E3"]["black"])), E(str(e["E3"]["silence"]))] for k, e in rep["episodes"].items()],
                         {1, 3, 5}))

    # ── 截圖總覽 ──
    sheets = sorted(d.glob("sheet_*.jpg"), key=lambda p: [int(x) for x in p.stem[6:].split("-")])
    if sheets:
        out.append("<h2>截圖總覽（每個場景 70% 處一格）</h2>")
        for p in sheets:
            out.append(f"<details><summary>{E(p.stem[6:])}</summary><img src='{E(p.name)}' loading='lazy'></details>")

    out.append("</main></body></html>")
    f = d / "品檢報告.html"
    f.write_text("\n".join(out), encoding="utf-8")
    return f


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("label")
    ap.add_argument("--title", default="教學影片品檢報告")
    ap.add_argument("--changes")
    a = ap.parse_args()
    print("→", build(a.label, a.title, Path(a.changes) if a.changes else None))
