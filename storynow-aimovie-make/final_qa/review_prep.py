#!/usr/bin/env python3
"""逐字審稿・審稿表（2026-10-06，從範本E 移植；外層工作流、範本 A～G 共用）：配音前，AI 逐句審稿用的底稿。

  python <skill>/final_qa/review_prep.py storyboard.json [--out qa/逐字審稿]
  storyboard 支援：範本 A～D／十二步流程（scenes[].lines）、範本F／G（segments[].say）；
  也可以給純文字稿 .txt／.md（一行一句）。

輸出 <out>/審稿表.md：每一句旁白＋這句裡的多音詞（應唸）、英數詞、數字、實際送 TTS 的文字（依配音規則：有 Gemini 金鑰看 Gemini 唸法）。
接著由 Claude 逐句審（檢查清單見 references/workflow.md「逐字審稿」）：錯別字漏字、技術內容正確、用詞一致、句子長度、
容易聽錯的說法、畫面文字與旁白一致 → 把每一處寫進 <out>/審稿筆記.json，再跑 review_report.py 產出報告給使用者 ⛔。
"""
from __future__ import annotations
import argparse, json, os, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "engine" / "scripts"))


def sentences(p: Path) -> list[tuple[str, str]]:
    """(場景, 一句旁白)"""
    if p.suffix.lower() == ".json":
        sb = json.loads(p.read_text(encoding="utf-8"))
        if "scenes" in sb:
            # 句子可寫成 {"text": 字幕, "say": 念法}：審的是字幕原文（念法由唸法清單另外檢查）
            return [(sc.get("id", f"S{i}"), ln["text"] if isinstance(ln, dict) else ln)
                    for i, sc in enumerate(sb["scenes"], 1) for ln in sc.get("lines") or []]
        if "segments" in sb:
            return [(f"第{i}段", sg["say"]) for i, sg in enumerate(sb["segments"], 1)]
        raise SystemExit("看不懂這份 storyboard（要有 scenes[].lines 或 segments[].say）")
    return [("", ln.strip()) for ln in p.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("--out", default="qa/逐字審稿")
    a = ap.parse_args()
    import gemini_tts as G
    gem = G.has_key(os.getcwd())
    try:
        from ai_listen import checklist          # 多音詞（應唸）、英數詞、數字
    except Exception as e:                       # pypinyin／opencc 沒裝：只列句子
        print("（沒有 pypinyin／opencc，審稿表不列多音詞：", e, "）")
        checklist = lambda t: {}
    try:
        from build import to_speech
    except Exception:
        to_speech = lambda t, p="edge": t
    rows = sentences(Path(a.src))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    md = [f"# 逐字審稿・審稿表（{Path(a.src).name}，{len(rows)} 句）", "",
          f"配音：{'Gemini（專案有金鑰）' if gem else 'edge-tts（專案沒有 Gemini 金鑰）'}。每句下方是要特別聽／看的地方。", ""]
    for k, (scn, s) in enumerate(rows, 1):
        md.append(f"**{k}.** `{scn}` {s}")
        chk = checklist(s)
        notes = []
        for key in ("多音詞（應唸）", "英數詞（應唸）", "數字（應唸）"):
            if chk.get(key):
                show = (lambda w, r: w) if key.startswith("英數詞") else (lambda w, r: f"{w}（{r}）" if r else w)   # 英數詞的「應唸」是通用說明，不列
                notes.append(key.replace("（應唸）", "") + "：" + "、".join(show(w, r) for w, r in chk[key].items()))
        say = to_speech(s, "gemini" if gem else "edge")
        if say.replace(" ", "") != s.replace(" ", ""):
            notes.append(f"送 TTS：{say}")
        if len(re.sub(r"[^一-鿿A-Za-z0-9]", "", s)) > 32:
            notes.append("句子偏長（字幕每頁 ≤16 字，考慮拆句）")
        md += [f"   - {n}" for n in notes] + [""]
    (out / "審稿表.md").write_text("\n".join(md), encoding="utf-8")
    note = out / "審稿筆記.json"
    if not note.exists():
        note.write_text(json.dumps([{"場景": "S1", "原文": "（範例）", "建議": "", "理由": "", "等級": "必改／建議／待決定"}],
                                   ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {out / '審稿表.md'}（{len(rows)} 句）；審完寫進 {note}，再跑 review_report.py {out}")


if __name__ == "__main__":
    main()
