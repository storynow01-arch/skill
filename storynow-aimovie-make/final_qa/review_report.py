#!/usr/bin/env python3
"""逐字審稿・報告（2026-10-06，從範本E 移植；外層工作流、範本 A～G 共用）：
把 Claude 逐句審稿寫的 審稿筆記.json 做成 審稿報告.html＋.md，給使用者決定改哪些 ⛔。

  python <skill>/final_qa/review_report.py qa/逐字審稿
審稿筆記.json：[{"場景": "S3", "原文": "…", "建議": "…", "理由": "…", "等級": "必改|建議|待決定"}, …]
使用者回覆後才改稿；改稿前先備份 storyboard，改完重跑文稿檢查（term_check.py，必改 0）。
"""
from __future__ import annotations
import html, json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
E = html.escape
ORDER = {"必改": 0, "建議": 1, "待決定": 2}


def main(d: Path):
    notes = [n for n in json.loads((d / "審稿筆記.json").read_text(encoding="utf-8")) if n.get("原文") and n.get("原文") != "（範例）"]
    notes.sort(key=lambda n: ORDER.get(n.get("等級", "建議"), 9))
    cnt = {k: sum(1 for n in notes if n.get("等級") == k) for k in ORDER}
    head = f"必改 {cnt['必改']}、建議 {cnt['建議']}、待決定 {cnt['待決定']}（共 {len(notes)} 處）"
    md = ["# 逐字審稿報告", "", head, "", "| # | 等級 | 場景 | 原文 | 建議 | 理由 |", "|---|---|---|---|---|---|"]
    md += [f"| {i} | {n.get('等級', '')} | {n.get('場景', '')} | {n['原文']} | {n.get('建議', '')} | {n.get('理由', '')} |".replace("\n", " ")
           for i, n in enumerate(notes, 1)]
    (d / "審稿報告.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    color = {"必改": "#ff6a50", "建議": "#e8a43a", "待決定": "#7fb2ff"}
    tr = "".join(f"<tr><td>{i}</td><td style='color:{color.get(n.get('等級'), '#ccc')}'>{E(n.get('等級', ''))}</td><td>{E(n.get('場景', ''))}</td>"
                 f"<td>{E(n['原文'])}</td><td>{E(n.get('建議', ''))}</td><td>{E(n.get('理由', ''))}</td></tr>" for i, n in enumerate(notes, 1))
    (d / "審稿報告.html").write_text(
        "<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>逐字審稿報告</title><style>body{background:#161616;color:#ececec;font:15px/1.65 'Microsoft JhengHei',sans-serif;padding:16px;max-width:1300px;margin:0 auto}"
        "table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #333;padding:8px;text-align:left;vertical-align:top}</style>"
        f"<h1>逐字審稿報告</h1><p>{E(head)}。回覆時寫編號＋要不要改即可（例：「1～5 照改、7 不改」）。</p>"
        f"<table><tr><th>#</th><th>等級</th><th>場景</th><th>原文</th><th>建議</th><th>理由</th></tr>{tr}</table></html>", encoding="utf-8")
    print(f"→ {d / '審稿報告.html'}　{head}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
