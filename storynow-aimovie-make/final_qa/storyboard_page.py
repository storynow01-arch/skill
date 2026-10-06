#!/usr/bin/env python3
"""分鏡預覽頁（2026-10-06，從範本E 移植；外層工作流、範本 A～G 共用）：
每個場景一列「截圖＋場景型別＋旁白」，**配音前**給使用者看畫面內容；暫配音（edge-tts）只影響長短，畫面內容跟正式版一樣。

  python <skill>/final_qa/storyboard_page.py <預覽資料夾>
預覽資料夾裡要有 scenes.json：{"title": "...", "scenes": [{"id": "S1", "type": "title", "img": "S1.jpg", "say": ["旁白句", …]}, …]}
  範本 A～D：engine/scripts/preview_stills.mjs 產生（make_video.py --preview 自動跑）
  範本F／G：make.py --preview 產生（每段 75% 處截圖）
輸出 <預覽資料夾>/分鏡預覽.html（截圖用相對路徑，整個資料夾可以直接傳給別人看）。
"""
from __future__ import annotations
import html, json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
E = html.escape


def main(d: Path) -> Path:
    data = json.loads((d / "scenes.json").read_text(encoding="utf-8"))
    rows = []
    for sc in data["scenes"]:
        img = d / sc["img"]
        say = "<br>".join(E(x) for x in sc.get("say") or []) or "<span class='m'>（這一場沒有旁白）</span>"
        tag = f"<img loading=lazy src='{E(sc['img'])}'>" if img.exists() else "（沒有截圖）"
        rows.append(f"<tr><td class='img'>{tag}</td>"
                    f"<td class='meta'><b>{E(str(sc['id']))}</b><br>{E(sc.get('type', ''))}</td><td class='narr'>{say}</td></tr>")
    title = data.get("title", d.name)
    page = f"""<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)} 分鏡預覽</title><style>
body{{margin:0;background:#161616;color:#ececec;font:15px/1.65 "Microsoft JhengHei","Noto Sans TC",sans-serif}}
main{{padding:16px;max-width:1400px;margin:0 auto}}table{{border-collapse:collapse;width:100%}}
td{{border-bottom:1px solid #333;padding:8px;vertical-align:top}}td.img img{{width:640px;max-width:100%;border-radius:6px;border:1px solid #333}}
td.meta{{width:110px;color:#bbb}}td.narr{{color:#ddd}}.m{{color:#888}}
@media (max-width:900px){{tr{{display:block}}td{{display:block;border:0}}td.img img{{width:100%}}}}
</style><main><h1>{E(title)} 分鏡預覽{(' · ' + E(data['template'])) if data.get('template') else ''}</h1>
<p>每個場景截在「物件都出現了」的那一格，右邊是旁白。配音前先看：畫面文字、圖示、比喻、順序有沒有要改的，直接說場景編號。</p>
<table>{''.join(rows)}</table></main></html>"""
    out = d / "分鏡預覽.html"
    out.write_text(page, encoding="utf-8")
    print("→", out)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
