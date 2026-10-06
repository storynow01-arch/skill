#!/usr/bin/env python3
"""把「旁白講到某個詞」變成「畫面在那一刻反應」。

問題：
  原本 concept_cards 等組件用 cycle(t, beats, n) 輪播焦點 —— 純計時器，
  跟旁白內容無關。旁白在講第三張卡的時候，畫面可能正亮著第一張。

走過的冤枉路（留著當紀錄）：
  第一版用 faster-whisper 做詞級對齊，再用字串比對找 cue。
  實測失敗 —— base 模型對中文 TTS 音檔的同音字錯誤太多：
      線接好了 → 現階好了     Wi-Fi → 微飯
      郵筒     → 郵桶         寄信  → 既性
  用「猜出來的文字」比對「已知的文字」，本來就是多此一舉。

現在的作法（確定性，無 ASR）：
  edge-tts 的 SentenceBoundary 給的是「每一句」的精確起訖時間，
  而且稿子一行一句，兩者一一對應。
  要找某個詞的時間，只要：
      ① 判斷它落在第幾句
      ② 在句內依字元位置線性內插
  誤差只來自句內語速的微小起伏，實測 ±0.3 秒以內 —— 對動畫同步綽綽有餘。

  查不到的 cue 會被回報，不靜默失敗。

同時仍要守住「畫面不靜止超過 4 秒」——
  內容時間點可能稀疏（講完三張卡後還有 10 秒在總結），
  densify() 會在過長的間隔中補上節拍點。
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_GAP = 3.5      # 與 beats.ts 的 INTERVAL 一致


def spoken_len(text: str) -> int:
    """送進 TTS 之後的字數（英文縮寫拆成字母、IP 轉成中文數字），不含空白"""
    from tts import to_speech
    return len(re.sub(r"\s", "", to_speech(text)))


def scene_timeline(cues: list[dict], originals: list[str]) -> list[tuple[str, float, float]]:
    """把 SRT 的時間套到原文句子上，回傳 [(原文句, 起, 迄)]（場景內秒數）。"""
    if not cues or len(cues) != len(originals):
        return []
    base = cues[0]["start"]
    return [(o.strip(), c["start"] - base, c["end"] - base)
            for c, o in zip(cues, originals)]


def find(timeline: list[tuple[str, float, float]], phrase: str,
         after: float = 0.0) -> float | None:
    """回傳 phrase 第一次被唸到的秒數（場景內）。"""
    target = re.sub(r"\s", "", phrase)
    if not target:
        return None
    for text, start, end in timeline:
        if end < after:
            continue
        flat = re.sub(r"\s", "", text)
        i = flat.find(target)
        if i < 0:
            continue
        # 句內依「實際唸出來的長度」內插：192.168.0.11、DNS 這類詞唸起來比字面長很多，
        # 用原文字數算會讓後面的詞時間點偏早
        ratio = spoken_len(flat[:i]) / max(spoken_len(flat), 1)
        t = start + (end - start) * ratio
        if t >= after:
            return round(t, 2)
    return None


def build_plan(times: list[float], count: int, dur: float) -> list[list[float]]:
    """把「第 i 項在 times[i] 被唸到」展開成明確的 [時間, 項目索引] 清單。

    ⚠ 時間點必須明確帶上「該亮第幾項」，不能靠陣列位置推（踩過坑：插入補點後整組錯位）。

    2026-10-03 改版（使用者要求「唸完之後固定，不要不斷循環」）：
      只保留內容時間點，一個蘿蔔一個坑。
      不再在開頭補「先亮第一項」、不再在講完後輪播、不再在長間隔插入重複強調。
      元件端（beats.ts narrate()）在最後一項之後 HOLD 秒自動轉為全亮固定。
    """
    pts = sorted((round(t, 2), i) for i, t in enumerate(times) if t is not None and 0 <= t < dur)
    return [[t, i] for t, i in pts]


CLEAN = re.compile(r"[^0-9A-Za-z㐀-鿿]+")


def auto_find(timeline: list[tuple[str, float, float]], text: str, after: float = 0.0) -> float | None:
    """項目沒寫 cue 時，用項目文字本身去旁白裡找。

    先試整段，再試越來越短的片段；同一長度裡取最早被唸到的那個。
    片段 ≥4 字的項目至少要對上 3 字，避免「網路」這種兩字常用詞對到前面別的句子。"""
    segs = [x for x in CLEAN.split(text or "") if x]
    if not segs:
        return None
    longest = max(len(x) for x in segs)
    floor = 3 if longest >= 4 else 2 if longest >= 2 else 1
    for L in range(min(longest, 10), floor - 1, -1):
        hits = []
        for seg in segs:
            for k in range(0, len(seg) - L + 1):
                t = find(timeline, seg[k:k + L], after=after)
                if t is not None:
                    hits.append(t)
        if hits:
            return min(hits)
    return None


ITEM_TEXT = {
    "concept_cards": ("cards", "title"), "flow_arrows": ("steps", "label"),
    "layer_stack": ("layers", "name"), "network_diagram": ("nodes", "label"),
    "scenario": ("pills", None), "definition": ("sideNotes", None),
    "ui_mock": ("steps", "label"),
    # quiz 不列入：旁白不會逐一唸選項（只唸題目與答案），選項跟著題目一起出現，唸到「答案」才揭曉
}


def item_texts(scene: dict) -> list[str]:
    props = scene.get("props", {})
    if scene.get("type") == "comparison":
        return [props.get("left", {}).get("text", ""), props.get("right", {}).get("text", "")]
    key, field = ITEM_TEXT.get(scene.get("type"), (None, None))
    items = props.get(key) or []
    return [(it.get(field, "") if isinstance(it, dict) else str(it)) for it in items]


def collect_cues(props: dict) -> list[str]:
    """支援兩種寫法：props.cueWords = [...]，或項目物件上的 .cue"""
    if isinstance(props.get("cueWords"), list):
        return [str(c or "") for c in props["cueWords"]]
    for key in ("cards", "layers", "nodes", "steps"):
        items = props.get(key)
        if isinstance(items, list) and items and isinstance(items[0], dict):
            got = [it.get("cue") for it in items]
            if any(got):
                return [c or "" for c in got]
    return []


def resolve(scene: dict, timeline: list[tuple[str, float, float]]
            ) -> tuple[list[float] | None, list[str]]:
    """回傳 (focusAt, 問題清單)"""
    cues = collect_cues(scene.get("props", {}))
    texts = item_texts(scene)
    if not timeline or not (cues or texts):
        return None, []
    if len(cues) < len(texts):
        cues = list(cues) + [""] * (len(texts) - len(cues))

    dur = scene.get("durSec", 0)
    times: list[float | None] = []
    misses: list[str] = []
    last = 0.0
    for k, c in enumerate(cues):
        if not c:
            # 分鏡沒寫 cue：拿項目文字去旁白裡自動找
            t = auto_find(timeline, texts[k], after=last) if k < len(texts) else None
            if t is None:
                misses.append(f'{scene["id"]}: 第 {k + 1} 項「{texts[k] if k < len(texts) else ""}」旁白裡找不到對應（自動）')
            else:
                last = t
            times.append(t)
            continue
        t = find(timeline, c, after=last)
        # 手寫 cue 指到的句子跟物件文字對不上（例如物件是「突然轉圈」，cue 卻指到後面另一句）→ 改用物件文字自動找
        if t is not None and k < len(texts) and texts[k] and not _said_at(texts[k], timeline, t):
            alt = auto_find(timeline, texts[k], after=last)
            if alt is not None and _said_at(texts[k], timeline, alt):
                t = alt
        if t is None:
            # 可能真的沒這句，也可能是 cue 的順序跟旁白不一致
            # （項目要依序亮起，所以只往後找）
            anywhere = find(timeline, c, after=0.0)
            hint = "（旁白裡有，但順序在前面 —— cue 要依旁白順序排）" if anywhere is not None else ""
            misses.append(f'{scene["id"]}: 找不到「{c}」{hint}')
            times.append(None)
        else:
            times.append(t)
            last = t

    known = [(i, t) for i, t in enumerate(times) if t is not None]
    if not known:
        return None, misses

    # 沒查到的用相鄰內插補上，維持陣列長度與項目數一致
    for i, t in enumerate(times):
        if t is not None:
            continue
        prev = max((k for k, _ in known if k < i), default=None)
        nxt = min((k for k, _ in known if k > i), default=None)
        if prev is not None and nxt is not None:
            a, b = times[prev], times[nxt]
            times[i] = round(a + (b - a) * (i - prev) / (nxt - prev), 2)
        elif prev is not None:
            times[i] = round(min(times[prev] + 2.5, max(dur - 0.5, 0)), 2)
        else:
            times[i] = round(max(times[nxt] - 2.5, 0.5), 2)

    return [t for t in times if t is not None], misses


def extra_timings(scene: dict, timeline: list[tuple[str, float, float]], items_end: float = 0.0) -> dict:
    """項目以外、也該跟著旁白出現的元素：footer、測驗揭曉、結語逐句、下一節預告。
    回傳要併進 props 的欄位；找不到的就不給，元件會退回原本的時間。"""
    props, out = scene.get("props", {}), {}
    typ = scene.get("type")
    for key in ("footer", "footerPill"):
        if props.get(key):
            # footer 多半是唸完項目後的總結，所以先往後找；找不到再從頭找
            # （1-4 S6：旁白先講代價、最後才講左右兩邊，只往後找會讓畫面前 12 秒全空）
            t = auto_find(timeline, props[key], after=items_end)
            if t is None:
                t = auto_find(timeline, props[key], after=0.0)
            if t is not None:
                out["footerAt"] = t
    if typ == "quiz":
        opts_end = items_end
        t = None
        for word in ("答案", "正解", "答對"):
            t = find(timeline, word, after=opts_end)
            if t is not None:
                break
        if t is None:
            # 旁白沒說「答案是」（單元四：「是你的。」「不代表。」）→ 題目問句（？）之後的下一句就是揭曉（2026-10-06）
            q = [k for k, (x, _, _) in enumerate(timeline) if "？" in x or "?" in x]
            if q and q[-1] + 1 < len(timeline):
                t = timeline[q[-1] + 1][1]
        if t is not None:
            out["revealAt"] = t
        if props.get("afterNote"):
            a = auto_find(timeline, props["afterNote"], after=out.get("revealAt", props.get("revealAt", 0)))
            if a is not None:
                out["afterAt"] = a
    if typ == "closing_card":
        lines = props.get("takeaway")
        lines = lines if isinstance(lines, list) else [lines] if lines else []
        last, ats = 0.0, []
        for ln in lines:
            t = auto_find(timeline, ln, after=last)
            ats.append(t)
            last = t if t is not None else last
        if any(x is not None for x in ats):
            # 第一句是結語卡的標題：一開場就出現（1-6 S13 旁白先講別的，第一句晚出現會讓畫面前幾秒全空）
            out["lineAts"] = [0.0 if i == 0 else x for i, x in enumerate(ats)]
        rats = []
        for r in props.get("recap") or []:
            t = auto_find(timeline, r, after=last)
            rats.append(t)
            last = t if t is not None else last
        if rats and any(x is not None for x in rats):
            # 旁白沒逐一唸到的重點詞：接在前一個後面 1.2 秒出現，維持由左到右的順序
            prev = out.get("lineAts", [0.0])[-1] or 0.0
            filled = []
            for x in rats:
                prev = x if x is not None and x >= prev else prev + 1.2
                filled.append(round(prev, 2))
            out["recapAts"] = filled
        if props.get("nextTeaser"):
            t = find(timeline, "下一節", after=0) or auto_find(timeline, props["nextTeaser"], after=last)
            if t is not None:
                out["teaserAt"] = t
    return out


STOP = set("的了是有在和與跟也都就要會不一個這那你我他它們之")


def _said(item: str, sentence: str) -> bool:
    """物件文字有沒有被這句旁白講到：英數詞相同，或（去掉虛字後）共用 2 個字以上、或物件一半以上的字出現在句子裡"""
    lat = lambda t: {m.lower() for m in re.findall(r"[A-Za-z0-9]{2,}", t or "")}
    if lat(item) & lat(sentence):
        return True
    chars = [c for c in re.sub(r"[^㐀-鿿]", "", item or "") if c not in STOP]
    if not chars:
        return False
    hit = sum(1 for c in set(chars) if c in sentence)
    return hit >= 2 or hit / len(set(chars)) >= 0.5


def narration_matches(scene: dict, timeline: list[tuple[str, float, float]],
                      times: list[float] | None) -> tuple[bool, list[str]]:
    """每個物件出場時，旁白正在唸的那一句（加下一句）跟物件文字至少要有一組相同的兩字詞或英數詞。
    有物件對不上（旁白根本沒唸到它），回傳 False 與對不上的清單。
    2026-10-04 使用者回報：1-1「不是軟體／不是設備」旁白沒唸，掛在別的詞上一起突然跳出來。"""
    texts = item_texts(scene)
    if not times or not texts:
        return True, []
    bad = []
    for k, (tx, t) in enumerate(zip(texts, times)):
        idx = next((j for j, (_, a, b) in enumerate(timeline) if a - 0.05 <= t <= b + 0.05), None)
        if idx is None:
            bad.append(tx); continue
        said = "".join(x for x, _, _ in timeline[max(0, idx - 1):idx + 2])   # 前一句、當句、下一句
        if not _said(tx, said):
            bad.append(tx)
    # 多個物件擠在同一個時間點（cue 寫成同一句），也視為沒有逐項唸到
    if len(times) >= 2 and len({round(t, 1) for t in times}) == 1:
        bad = list(texts)
    # 一半以上對不上才整組改靜態；少數對不上的，夾在前後已對上的物件之間出現就好
    return len(bad) * 2 < len(texts), bad


def _said_at(item: str, timeline: list[tuple[str, float, float]], t: float) -> bool:
    idx = next((j for j, (_, a, b) in enumerate(timeline) if a - 0.05 <= t <= b + 0.05), None)
    if idx is None:
        return False
    return _said(item, "".join(x for x, _, _ in timeline[max(0, idx - 1):idx + 2]))
