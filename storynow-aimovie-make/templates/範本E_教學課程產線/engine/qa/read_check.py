#!/usr/bin/env python3
"""唸法清單：逐節列出旁白裡所有「TTS 可能唸錯」的東西，給審稿逐項確認。

  py qa\\read_check.py <輸出資料夾> <節...>        例：py qa\\read_check.py ..\\11_品檢\\文稿審查\\文稿總審_單元一 1-1 1-2

每節列出：
  英數詞（含網址、指令、型號）＋ 送給 TTS 的寫法（to_speech，Gemini 略過 skip_rules）
  數字（含單位、百分比、年份、連接埠）＋ 預期唸法
  多音詞（多音字清單.json 的字）＋ 字典讀音（pypinyin）
  符號（%、/、:、→、—、～ 等出現在旁白裡的）
輸出：唸法清單.md、唸法清單.json
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
from tts import parse, to_speech      # noqa: E402

LATIN = re.compile(r"(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#]*(?:[.\-/:][A-Za-z0-9+#]+)*(?![A-Za-z0-9])")
NUM = re.compile(r"\d+(?:\.\d+)*%?(?:\s?(?:年代|年|毫秒|秒|分鐘|公尺|公里|元|台幣|Mbps|MB/s|MB|GB|GHz|位元|個|台|次|天|小時|%))?")
SYM = re.compile(r"[%/:→—～~&@#=+*<>\[\]{}|\\]")


def SPEC_WORDS():
    return [w for w in json.loads((ROOT / "00_規範" / "多音字清單.json").read_text(encoding="utf-8"))["詞"]]


def main(out: Path, ids: list[str]):
    cfg = json.loads((ROOT / "00_規範" / "配音設定.json").read_text(encoding="utf-8"))
    skip = set(cfg.get("skip_rules", []))
    poly_chars = set(json.loads((ROOT / "00_規範" / "多音字清單.json").read_text(encoding="utf-8")).get("字", ""))
    import jieba
    sys.path.insert(0, str(ENGINE / "qa"))
    from poly_ab import word_pinyin
    big = ENGINE / "qa" / "dict" / "dict.txt.big"
    if big.exists():
        jieba.set_dictionary(str(big))
    for w in SPEC_WORDS():
        jieba.add_word(w)                                  # 多音字清單的詞不要被拆開（鋪好、重問）
    rows, md = [], ["# 唸法清單", "", "Gemini 配音前逐項確認：「送 TTS」欄是程式轉換後真正送出的文字。", ""]
    for sid in ids:
        f = next(p for p in (ROOT / "01_腳本").glob(f"{sid}_*.md") if "_plan" not in p.name)
        md += [f"## {sid} {f.stem.split('_', 1)[1]}", ""]
        seen = set()
        for scn, _, narr in parse(f):
            for line in narr.split("\n"):
                said = to_speech(line, skip=skip)
                for m in LATIN.finditer(line):
                    w = m.group(0)
                    if ("en", w) in seen:
                        continue
                    seen.add(("en", w))
                    sw = to_speech(w, skip=skip)
                    rows.append({"sid": sid, "scene": scn, "kind": "英數", "item": w, "tts": sw, "line": line})
                for m in NUM.finditer(line):
                    w = m.group(0).strip()
                    if ("num", w) in seen or not w:
                        continue
                    seen.add(("num", w))
                    rows.append({"sid": sid, "scene": scn, "kind": "數字", "item": w, "tts": to_speech(w, skip=skip), "line": line})
                for w in jieba.cut(line):
                    c = next((ch for ch in w if ch in poly_chars), None)
                    if c and ("poly", w) not in seen and re.fullmatch(r"[一-鿿]+", w):
                        seen.add(("poly", w))
                        py = " ".join(word_pinyin(w))      # 轉簡體再查＋多音字清單覆蓋（qa/poly_ab.py）
                        rows.append({"sid": sid, "scene": scn, "kind": "多音", "item": w, "tts": py, "line": line})
                for m in SYM.finditer(line):
                    k = ("sym", m.group(0), line)
                    if k in seen:
                        continue
                    seen.add(k)
                    rows.append({"sid": sid, "scene": scn, "kind": "符號", "item": m.group(0), "tts": said[:40], "line": line})
        for kind in ("英數", "數字", "多音", "符號"):
            rs = [r for r in rows if r["sid"] == sid and r["kind"] == kind]
            if rs:
                md.append(f"**{kind}**（{len(rs)}）：" + "、".join(f"{r['item']}→{r['tts']}" if r['tts'] != r['item'] else r['item']
                                                         for r in rs if kind != "符號")
                          + ("".join(f"\n- {r['scene']} 「{r['item']}」 {r['line'][:60]}" for r in rs) if kind == "符號" else ""))
                md.append("")
    out.mkdir(parents=True, exist_ok=True)
    (out / "唸法清單.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "唸法清單.md").write_text("\n".join(md), encoding="utf-8")
    print(f"{len(ids)} 節：英數 {sum(r['kind']=='英數' for r in rows)}、數字 {sum(r['kind']=='數字' for r in rows)}、"
          f"多音 {sum(r['kind']=='多音' for r in rows)}、符號 {sum(r['kind']=='符號' for r in rows)} → {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), sys.argv[2:])
