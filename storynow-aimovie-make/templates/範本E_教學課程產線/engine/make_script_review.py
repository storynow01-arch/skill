#!/usr/bin/env python3
"""把一個單元的所有稿子彙整成審閱用 MD（尚未配音也能跑）。

已配音的節用實測秒數，未配音的用實測語速推估。
順便跑一次唸法檢查，把會被 TTS 唸錯的寫法先揪出來。

  python make_script_review.py 1 1-1 1-2 … 1-13
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

from tts import to_speech, lint

ROOT = Path(__file__).resolve().parent.parent
TARGET_SEC = 30 * 60
HEAD_SEC = 14.6
CPS = 5.12          # 實測：1-1~1-3 共 2049 字 / 400 秒

TYPE_ZH = {
    "title_card": "標題卡", "scenario": "情境卡", "definition": "定義卡",
    "concept_cards": "概念卡組", "comparison": "左右對照", "quiz": "課中檢查",
    "closing_card": "結語卡", "qa_endcard": "片尾測驗",
    "flow_arrows": "流程箭頭", "layer_stack": "分層堆疊",
}


def read(sid: str):
    md = next((p for p in ROOT.glob(f"01_腳本/{sid}_*.md") if p.suffix == ".md"), None)
    if not md:
        return None
    text = md.read_text(encoding="utf-8")
    fm = {}
    if text.startswith("---"):
        parts = text.split("---", 2)
        for line in parts[1].strip().split("\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip().strip('"')
        text = parts[2]
    scenes = []
    for blk in re.split(r"^## ", text, flags=re.M)[1:]:
        head = blk.split("\n", 1)[0]
        m = re.match(r"(S\d+)\s*·\s*([^\s·]+)\s*·\s*(\S+)", head) or \
            re.match(r"(S\d+)\s*·\s*([^\s·]+)", head)
        if not m:
            continue
        g = m.groups()
        vis = re.search(r"^VISUAL:\s*(.*?)(?=\nNARRATION:|\Z)", blk, re.S | re.M)
        nar = re.search(r"^NARRATION:\s*\n(.*?)(?=\n---|\Z)", blk, re.S | re.M)
        narr = nar.group(1).strip() if nar else ""
        scenes.append({
            "id": g[0], "func": g[1], "type": g[2] if len(g) > 2 else "",
            "visual": (vis.group(1).strip() if vis else ""),
            "narr": narr,
            "chars": len(re.sub(r"\s", "", narr)),
        })
    return {"file": md.name, "fm": fm, "scenes": scenes}


def real_seconds(sid: str):
    p = ROOT / "02_語音" / sid / "marks.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))["total_seconds"]
    return None


def main(unit: str, ids: list[str]):
    L: list[str] = []
    A = L.append
    A(f"# 單元{unit} — 全部文本（審閱版）")
    A("")
    A("> 產生自 `04_引擎/make_script_review.py`。")
    A(f"> 已配音的節用實測秒數，未配音的用實測語速 **{CPS} 字/秒** 推估。")
    A("")

    docs, rows, total_sec, total_chars = {}, [], 0.0, 0
    type_count: dict[str, int] = {}
    warnings: list[str] = []

    for sid in ids:
        d = read(sid)
        if not d:
            A(f"⚠ 找不到 {sid} 的稿")
            continue
        docs[sid] = d
        chars = sum(s["chars"] for s in d["scenes"])
        real = real_seconds(sid)
        narr_sec = real if real else chars / CPS
        # 片尾測驗固定 6 秒（無旁白）
        sec = narr_sec + 6.0
        for s in d["scenes"]:
            if s["type"]:
                type_count[s["type"]] = type_count.get(s["type"], 0) + 1
            for w in lint(to_speech(s["narr"]), f"{sid} {s['id']}"):
                warnings.append(w)
        rows.append({
            "id": sid, "title": d["fm"].get("title", ""),
            "metaphor": d["fm"].get("core_metaphor", "—"),
            "scenes": len(d["scenes"]), "chars": chars,
            "sec": sec, "real": real is not None,
            "ep": d["fm"].get("episode", "1"),
        })
        total_sec += sec
        total_chars += chars

    A("## 一、總覽")
    A("")
    eps = sorted({r["ep"] for r in rows})
    ep_total = {}
    for ep in eps:
        er = [r for r in rows if r["ep"] == ep]
        A(f"### 集{ep}")
        A("")
        A("| 節 | 標題 | 核心比喻 | 場景 | 字數 | 時長 | 集內累計 |")
        A("|---|---|---|---:|---:|---:|---:|")
        cum = HEAD_SEC
        A(f"| — | 封面 + 片頭 + 過渡 | | | | {HEAD_SEC:.1f}s | {cum/60:.2f} 分 |")
        for r in er:
            cum += r["sec"]
            mark = "" if r["real"] else "*"
            A(f"| **{r['id']}** | {r['title']} | {r['metaphor']} | {r['scenes']} | "
              f"{r['chars']} | {r['sec']:.0f}s{mark} | **{cum/60:.2f} 分** |")
        ep_total[ep] = cum
        gap = cum - TARGET_SEC
        A(f"| | **小計** | | **{sum(r['scenes'] for r in er)}** | "
          f"**{sum(r['chars'] for r in er)}** | | **{cum/60:.2f} 分** |")
        A("")
        A(f"→ 集{ep}：{len(er)} 節、**{cum/60:.2f} 分鐘**　"
          f"（目標 30 分，{'超出' if gap > 0 else '不足'} {abs(gap)/60:.1f} 分）")
        A("")
    A("`*` = 尚未配音，依語速推估")
    A("")
    A(f"**單元合計：{len(rows)} 節、{total_chars} 字、"
      f"{(total_sec + HEAD_SEC*len(eps))/60:.2f} 分鐘**（含 {len(eps)} 次開頭素材）")
    A("")
    done = total_sec + HEAD_SEC * len(eps)

    A("## 二、統計")
    A("")
    A("### 各節字數分布")
    A("")
    A("| 節 | 字數 | 相對長度 |")
    A("|---|---:|---|")
    mx = max(r["chars"] for r in rows)
    for r in rows:
        bar = "█" * round(r["chars"] / mx * 28)
        A(f"| {r['id']} | {r['chars']} | {bar} |")
    A(f"| **平均** | **{total_chars//len(rows)}** | |")
    A("")

    A("### 場景型別分布")
    A("")
    A("| 型別 | 次數 | 佔比 |")
    A("|---|---:|---:|")
    tot = sum(type_count.values())
    for k, v in sorted(type_count.items(), key=lambda x: -x[1]):
        A(f"| {TYPE_ZH.get(k, k)} `{k}` | {v} | {v/tot*100:.0f}% |")
    A("")

    A("### 唸法檢查")
    A("")
    if warnings:
        A("以下寫法會被 TTS 唸錯，需處理：")
        A("")
        for w in warnings:
            A(f"- ⚠ {w}")
    else:
        A("✓ 全部通過，無會被唸錯的技術寫法。")
    A("")

    A("## 三、逐節內容")
    A("")
    for sid in ids:
        d = docs.get(sid)
        if not d:
            continue
        fm = d["fm"]
        A(f"### {sid}　{fm.get('title','')}")
        A("")
        A(f"- **核心比喻**：{fm.get('core_metaphor','—')}")
        A(f"- **前接**：{fm.get('prev','—')}　→　**後接**：{fm.get('next_hint','—')}")
        A(f"- **場景**：{len(d['scenes'])}　**字數**：{sum(s['chars'] for s in d['scenes'])}")
        A("")
        for s in d["scenes"]:
            A(f"#### {s['id']} · {s['func']}"
              f"　`{TYPE_ZH.get(s['type'], s['type'] or '—')}`　{s['chars']} 字")
            A("")
            if s["visual"]:
                A(f"`畫面` {s['visual']}")
                A("")
            for line in s["narr"].split("\n"):
                if line.strip():
                    A(f"> {line.strip()}")
            A("")
        A("---")
        A("")

    out = ROOT / "01_腳本" / f"單元{unit}_全文本審閱.md"
    out.write_text("\n".join(L), encoding="utf-8")
    print(f"→ {out}")
    print(f"   {len(rows)} 節 / {sum(r['scenes'] for r in rows)} 場景 / "
          f"{total_chars} 字 / 推估 {done/60:.2f} 分鐘")
    if warnings:
        print(f"   ⚠ 唸法警告 {len(warnings)} 則")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
