#!/usr/bin/env python3
"""列出「我的語音」：Gemini 專案裡的克隆聲音＋文字設計聲音，對照 voices.json 的標註（預設、選定風格、語速）。

  python list_voices.py              # 表格（給人看）
  python list_voices.py --json       # JSON（給程式用）
  python list_voices.py --html out.html   # 另存一頁表格

使用者問「目前我的語音有哪些可以選擇」時跑這支（SKILL.md 硬規則）。
金鑰：環境變數 GEMINI_API_KEY，或從目前資料夾往上找 .env.local —— 聲音存在那把金鑰的 Google 專案裡，換金鑰就看到另一批。
不列 Google 內建的兩千多個 prebuilt 聲音（沒有台灣華語原生聲音，教學影片用不到）。
"""
from __future__ import annotations
import html, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gemini_tts as G                                     # noqa: E402

TYPE_ZH = {"replicated": "克隆", "prompted": "文字設計"}


def fetch() -> list[dict]:
    out, tok = [], ""
    for _ in range(50):
        r = G.call("GET", "voices", query="pageSize=1000" + (f"&pageToken={tok}" if tok else ""))
        out += [v for v in r.get("voices", []) if v.get("type") != "prebuilt"]
        tok = r.get("next_page_token") or r.get("nextPageToken") or ""
        if not tok:
            break
    return out


def merged() -> list[dict]:
    reg = json.loads((HERE / "voices.json").read_text(encoding="utf-8"))
    by_id = {v["voice_id"]: (k, v) for k, v in reg.get("voices", {}).items()}
    rows = []
    for v in fetch():
        key, note = by_id.get(v["id"], ("", {}))
        rows.append({
            "名冊名稱": key, "顯示名稱": v.get("display_name", ""), "類型": TYPE_ZH.get(v.get("type"), v.get("type")),
            "voice_id": v["id"], "預設": key == reg.get("default"), "到期": (v.get("expire_time") or "")[:10],
            "說明": note.get("說明", "") or (v.get("prompted") or {}).get("input", ""),
            "選定風格": note.get("style", ""), "其他風格": note.get("style_presets", {}), "語速": note.get("語速", ""),
        })
    # 克隆在前、名冊有登記的在前、預設最前
    rows.sort(key=lambda r: (not r["預設"], r["類型"] != "克隆", not r["名冊名稱"], r["顯示名稱"]))
    missing = [k for k, v in reg.get("voices", {}).items() if v["voice_id"] not in {r["voice_id"] for r in rows}]
    return rows, missing


def main():
    G.api_key(Path.cwd())
    rows, missing = merged()
    if "--json" in sys.argv:
        print(json.dumps({"voices": rows, "名冊有但專案找不到": missing}, ensure_ascii=False, indent=1)); return
    print(f"我的語音：{len(rows)} 個（克隆 {sum(r['類型'] == '克隆' for r in rows)}、文字設計 {sum(r['類型'] == '文字設計' for r in rows)}）\n")
    for i, r in enumerate(rows, 1):
        tag = "★預設 " if r["預設"] else ""
        print(f"{i:2}. {tag}{r['名冊名稱'] or r['顯示名稱']}（{r['類型']}）  {r['voice_id']}  到期 {r['到期']}")
        if r["名冊名稱"] and r["顯示名稱"] != r["名冊名稱"]:
            print(f"    Google 上的名稱：{r['顯示名稱']}")
        if r["說明"]:
            print(f"    說明：{r['說明'][:80]}")
        if r["選定風格"]:
            print(f"    選定風格：{r['選定風格']}")
            for k, s in (r["其他風格"] or {}).items():
                print(f"      · {k}：{s}")
        if r["語速"]:
            print(f"    語速：{r['語速']}")
    if missing:
        print(f"\n⚠ voices.json 有登記、但這把金鑰的專案裡找不到：{', '.join(missing)}（換了金鑰，或聲音超過一年沒用已過期）")
    print("\n使用方式：說「用 <名稱> 配音」；要換風格加「風格 <編號>」。storyboard 寫法見 references/gemini-voice-lessons.md")
    if "--html" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--html") + 1])
        tr = "".join(f"<tr><td>{'★' if r['預設'] else ''}{html.escape(r['名冊名稱'] or r['顯示名稱'])}</td><td>{r['類型']}</td>"
                     f"<td><code>{r['voice_id']}</code></td><td>{html.escape(r['選定風格'] or r['說明'])}</td><td>{r['到期']}</td></tr>"
                     for r in rows)
        out.write_text(f'<!doctype html><meta charset="utf-8"><title>我的語音</title><style>body{{font-family:sans-serif;'
                       f'background:#181818;color:#eee;padding:16px}}td,th{{padding:6px 10px;border-bottom:1px solid #333;'
                       f'text-align:left}}</style><h1>我的語音</h1><table><tr><th>名稱</th><th>類型</th><th>voice_id</th>'
                       f'<th>風格／說明</th><th>到期</th></tr>{tr}</table>', encoding="utf-8")
        print(f"→ {out}")


if __name__ == "__main__":
    main()
