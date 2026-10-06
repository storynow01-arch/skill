#!/usr/bin/env python3
"""逐字審稿報告：把 11_品檢\\文稿審查\\文稿總審_單元N\\_審稿筆記.json 做成 審稿報告.html＋.md（格式同單元一）。

  py qa\\review_report.py 2        # 讀 11_品檢\\文稿審查\\文稿總審_單元二\\_審稿筆記.json

筆記每筆：sid、scene、level（必改／待決定／建議）、kind（類別）、orig、fix、why。
"""
from __future__ import annotations
import html, json, sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
ZH = "零一二三四五六七八九"
ORDER = {"必改": 0, "待決定": 1, "建議": 2}


def main(unit: int):
    d = ROOT / "11_品檢" / "文稿審查" / f"文稿總審_單元{ZH[unit]}"
    notes = json.loads((d / "_審稿筆記.json").read_text(encoding="utf-8"))
    key = lambda n: [int(x) for x in n["sid"].split("-")]
    notes.sort(key=key)
    lv = Counter(n["level"] for n in notes)
    kinds = Counter(n["kind"] for n in notes)
    head = (f"範圍：{unit}-1～{unit}-14 旁白與畫面文字逐句閱讀＋唸法清單。共 {len(notes)} 處：**必改 {lv['必改']}**、"
            f"待決定 {lv['待決定']}、建議 {lv['建議']}。\n類別：" + "、".join(f"{k} {v}" for k, v in kinds.most_common()))
    groups: OrderedDict[str, list] = OrderedDict()
    for n in notes:
        groups.setdefault(n["sid"], []).append(n)

    md = [f"# 單元{ZH[unit]} 逐字審稿報告", "", head, "",
          "使用者勾選要改的項目後，程式套用到文稿與分鏡（先備份），再跑第⓪關文稿檢查。", ""]
    i = 0
    for sid, ns in groups.items():
        md += [f"## {sid}", "", "| # | 等級 | 類別 | 場景 | 原文 | 建議 | 理由 |", "|---|---|---|---|---|---|---|"]
        for n in ns:
            i += 1
            c = lambda s: s.replace("|", "／").replace("\n", " ")
            md.append(f"| {i} | {n['level']} | {n['kind']} | {n['scene']} | {c(n['orig'])} | {c(n['fix'])} | {c(n['why'])} |")
        md.append("")
    md += ["## 唸法（配音前確認）", "", "- 唸法清單：`唸法清單.md`。", "- 新聲音配音後會跑 AI 耳朵聽檢，只把有疑問的場景給你聽。", ""]
    (d / "審稿報告.md").write_text("\n".join(md), encoding="utf-8")

    E = html.escape
    rows, i = [], 0
    for sid, ns in groups.items():
        rows.append(f"<h2>{E(sid)}</h2><table><tr><th>#</th><th>等級</th><th>類別</th><th>場景</th><th>原文</th><th>建議</th><th>理由</th></tr>")
        for n in ns:
            i += 1
            cls = {"必改": "bad", "待決定": "warn", "建議": "ok"}[n["level"]]
            rows.append(f"<tr><td>{i}</td><td class='{cls}'>{E(n['level'])}</td><td>{E(n['kind'])}</td><td>{E(n['scene'])}</td>"
                        f"<td>{E(n['orig'])}</td><td>{E(n['fix'])}</td><td class='why'>{E(n['why'])}</td></tr>")
        rows.append("</table>")
    page = f"""<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>單元{ZH[unit]} 審稿報告</title><style>
:root{{--bg:#f6f6f4;--card:#fff;--ink:#1d1d1f;--muted:#6b6b70;--line:#e3e3e0;--ok:#1a7f45;--bad:#c4321c;--warn:#a86400}}
@media (prefers-color-scheme:dark){{:root{{--bg:#161616;--card:#202020;--ink:#ececec;--muted:#9a9a9a;--line:#333;--ok:#3fbf73;--bad:#ff6a50;--warn:#e8a43a}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "Microsoft JhengHei","Noto Sans TC",sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:24px 16px 80px}}table{{width:100%;border-collapse:collapse;background:var(--card);font-size:14px}}
th,td{{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}}.bad{{color:var(--bad);font-weight:700}}
.warn{{color:var(--warn);font-weight:700}}.ok{{color:var(--ok)}}.why{{color:var(--muted)}}h2{{margin-top:32px}}</style>
<main><h1>單元{ZH[unit]} 逐字審稿報告</h1><p>{E(head).replace(chr(10), '<br>').replace('**', '')}</p>{''.join(rows)}</main></html>"""
    (d / "審稿報告.html").write_text(page, encoding="utf-8")
    print(f"→ {d / '審稿報告.html'}（{len(notes)} 處：必改 {lv['必改']}、待決定 {lv['待決定']}、建議 {lv['建議']}）")


if __name__ == "__main__":
    main(int(sys.argv[1]))
