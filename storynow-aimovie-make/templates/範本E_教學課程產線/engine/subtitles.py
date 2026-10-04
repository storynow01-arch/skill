#!/usr/bin/env python3
"""字幕文字還原。

問題：SRT 來自 edge-tts，記的是「送進去 TTS 的唸法文字」——
      DNS → D N S、192.168.0.1 → 一九二點一六八點零點一。
      直接拿來當字幕，畫面上會出現「Ｄ Ｎ Ｓ一個位元組的資料都不搬」。

解法：字幕改用稿子上的原文。to_speech() 只做 token 替換，不動句子結構，
      所以原文句數與 SRT 句數會一一對應，按位置換回去即可。
      對不上就保留唸法版並回報，不靜默失敗。
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SENT_SPLIT = re.compile(r"(?<=[。？！])")
# 至少要有一個中日文字、字母或數字才算唸得出聲音
SPEAKABLE = re.compile(r"[\w㐀-鿿]")
SCENE_HEAD = re.compile(r"(S\d+)")
NARRATION = re.compile(r"^NARRATION:\s*\n(.*?)(?=\n---|\Z)", re.S | re.M)
BOLD = re.compile(r"\*\*(.+?)\*\*")
SPACES = re.compile(r"[ \t]+")


def original_sentences(script_id: str) -> dict[str, list[str]]:
    """回傳 {場景 id: [原文句子, ...]}"""
    md = next((q for q in (ROOT / "01_腳本").glob(f"{script_id}_*.md")
               if q.suffix == ".md"), None)
    if not md:
        return {}
    text = md.read_text(encoding="utf-8")
    if text.startswith("---"):
        text = text.split("---", 2)[2]

    out: dict[str, list[str]] = {}
    for blk in re.split(r"^## ", text, flags=re.M)[1:]:
        m = SCENE_HEAD.match(blk)
        nar = NARRATION.search(blk)
        if not m or not nar:
            continue
        body = SPACES.sub("", BOLD.sub(r"\1", nar.group(1)))
        # 稿子是一行一句，送進 TTS 時換行有保留 ——
        # 所以「按行切」才會跟 edge-tts 的 SentenceBoundary 對得上。
        # 按標點切會漏掉「今天帶走這兩句：」這種以冒號結尾的行。
        # 只有標點的行（例如測驗卡停頓用的「……」）不會產生語音，
        # edge-tts 也不會給它一個 SentenceBoundary —— 留著會讓行數永遠比 SRT 多一。
        lines = [x.strip() for x in body.split("\n")
                 if x.strip() and SPEAKABLE.search(x)]
        # 第三個候選：在「每一行之內」切句再攤平。
        # 需要它是因為前兩個候選各有盲點：
        #   lines —— 一行裡寫了兩句（「…同一種東西？差在哪裡？」）時，TTS 會切成兩句，行數就少了
        #   sents —— 先把所有行黏成一串再切，會讓「今天帶走這一句：」被併進下一句，句數又少了
        # 逐行切句同時避開這兩個盲點：以冒號結尾的行自成一句，行內的多句也會被拆開。
        parts = [p.strip() for ln in lines for p in SENT_SPLIT.split(ln) if p.strip()]
        out[m.group(1)] = {
            "lines": lines,
            "parts": parts,
            "sents": [x for x in SENT_SPLIT.split("".join(lines)) if x.strip()],
        }
    return out


def restore(cues_by_scene: dict[str, list[dict]],
            originals: dict[str, list[str]]) -> tuple[int, list[str]]:
    """把唸法文字換回原文。回傳 (成功場景數, 對不上的場景說明)"""
    fixed, misses = 0, []
    for scene, cues in cues_by_scene.items():
        opt = originals.get(scene)
        if not opt:
            continue
        # 先試按行，再試逐行切句，最後才試整段切句 —— 哪個句數對得上就用哪個
        src = next((v for v in (opt["lines"], opt["parts"], opt["sents"])
                    if len(v) == len(cues)), None)
        if src is None:
            misses.append(f"{scene}: 原文 {len(opt['lines'])} 行 / "
                          f"{len(opt['parts'])} 段 / "
                          f"{len(opt['sents'])} 句 vs SRT {len(cues)} 句")
            continue
        for c, o in zip(cues, src):
            c["text"] = o.strip()
        fixed += 1
    return fixed, misses
