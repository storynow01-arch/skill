#!/usr/bin/env python3
"""分鏡預覽頁（2026-10-06）：每節一頁，每個場景一列「截圖＋場景型別＋旁白」，給使用者在配音前檢查內容。
  py qa\\storyboard_page.py <截圖資料夾> <單元名稱> <節...>
  例：py qa\\storyboard_page.py ..\\11_品檢\\分鏡預覽\\單元四 單元四 4-1 4-2 …
截圖由 remotion\\storyboard_stills.mjs 產生（<截圖資料夾>\\<節>\\S1.jpg …）。輸出 <截圖資料夾>\\分鏡預覽.html（一頁含全部節，左側目錄）。
"""
import html, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "04_引擎"))
from subtitles import original_sentences      # noqa: E402
import json, re                                # noqa: E402

TYPE_ZH = {"title_card": "標題", "scenario": "情境", "definition": "定義", "concept_cards": "概念卡", "comparison": "對照",
           "quiz": "隨堂測驗", "closing_card": "結語", "qa_endcard": "片尾測驗", "flow_arrows": "流程", "layer_stack": "分層",
           "network_diagram": "網路圖", "ui_mock": "主控台模擬"}
E = html.escape


def main(out: Path, unit: str, ids: list[str]):
    toc, secs = [], []
    for sid in ids:
        md = next(p for p in (ROOT / "01_腳本").glob(f"{sid}_*.md") if not p.name.endswith("_plan.json"))
        title = re.search(r"^title:\s*(.+)$", md.read_text(encoding="utf-8"), re.M)
        title = title.group(1).strip() if title else sid
        orig = original_sentences(sid)
        plan = json.loads((ROOT / "01_腳本" / f"{sid}_plan.json").read_text(encoding="utf-8"))
        rows = []
        for sc in plan["scenes"]:
            img = out / sid / f"{sc['id']}.jpg"
            lines = orig.get(sc["id"], {}).get("lines", [])
            narr = "<br>".join(E(x) for x in lines) or "<span class='m'>（無旁白：片尾測驗卡）</span>"
            rows.append(f"<tr><td class='img'>{'<img loading=lazy src=' + chr(39) + E(img.relative_to(out).as_posix()) + chr(39) + '>' if img.exists() else '（沒有截圖）'}</td>"
                        f"<td class='meta'><b>{sc['id']}</b><br>{E(TYPE_ZH.get(sc['type'], sc['type']))}</td><td class='narr'>{narr}</td></tr>")
        toc.append(f"<a href='#s{sid}'>{sid} {E(title)}</a>")
        secs.append(f"<h2 id='s{sid}'>{sid}　{E(title)}</h2><table>{''.join(rows)}</table>")
    page = f"""<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(unit)} 分鏡預覽</title><style>
body{{margin:0;background:#161616;color:#ececec;font:15px/1.65 "Microsoft JhengHei","Noto Sans TC",sans-serif}}
nav{{position:fixed;left:0;top:0;bottom:0;width:210px;overflow:auto;background:#1e1e1e;padding:16px 10px;border-right:1px solid #333}}
nav a{{display:block;color:#F89800;text-decoration:none;padding:3px 6px;font-size:14px}}main{{margin-left:230px;padding:16px 24px 80px;max-width:1500px}}
table{{border-collapse:collapse;width:100%}}td{{border-bottom:1px solid #333;padding:8px;vertical-align:top}}
td.img img{{width:640px;border-radius:6px;border:1px solid #333}}td.meta{{width:90px;color:#bbb}}td.narr{{color:#ddd}}.m{{color:#888}}
@media (max-width:900px){{nav{{display:none}}main{{margin-left:0}}td.img img{{width:100%}}}}
</style><nav><b>{E(unit)}</b><br>{''.join(toc)}</nav><main><h1>{E(unit)} 分鏡預覽</h1>
<p>每個場景截在「物件都出現了」的那一格，右邊是旁白。暫配音只影響長短，畫面內容跟正式版一樣 —— 看到要改的地方直接告訴我節與場景（例：4-8 S4）。</p>
{''.join(secs)}</main></html>"""
    (out / "分鏡預覽.html").write_text(page, encoding="utf-8")
    print("→", out / "分鏡預覽.html")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3:])
