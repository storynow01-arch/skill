#!/usr/bin/env python3
"""從雙軌稿抽 NARRATION，用 edge-tts 產生語音 + 逐字時間戳。

用法:
    python tts.py ../01_腳本/1-1_什麼是通訊協定.md
輸出:
    ../02_語音/1-1/S1.mp3 ... S7.mp3   每個 scene 一段（方便單獨重錄）
    ../02_語音/1-1/full.mp3            整節合併
    ../02_語音/1-1/marks.json          逐字時間戳（給字幕與動畫對齊）
"""
from __future__ import annotations
import asyncio, json, re, sys, subprocess
from pathlib import Path

import edge_tts

VOICE = "zh-TW-YunJheNeural"   # 唯一台灣腔男聲；Friendly + Positive
RATE  = "+18%"                 # 語速加快，避免學生睡著
PITCH = "+4Hz"                 # 音高微升，聽起來更年輕

SCENE_RE = re.compile(r"^##\s+(S\d+)\s*·\s*([^\s·]+)", re.M)

# ── 唸法轉換 ────────────────────────────────────────────────
# 旁白稿一律寫專業標準寫法（192.168.0.1），送進 TTS 前才轉成正確唸法。
# 依據：00_規範/發音規範.json（含實測數據）
_ZH = "零一二三四五六七八九"
_SPEC = json.loads((Path(__file__).resolve().parent.parent /
                    "00_規範" / "發音規範.json").read_text(encoding="utf-8"))
_IPV4 = re.compile(r"(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])")
# 兩段式：IP 前綴 192.168 與版本號 2.4 都適用 —— 一律逐字唸
# 2026-10-06：整數部分是兩位數的小數（12.5、99.9）不逐字唸 —— 那是一般數值，交給聲音唸「十二點五」「九十九點九」；
# 只有個位數（2.4）與三位數（IP 前綴 192.168）才逐字。版本號 3.11 這類放在 數字詞典（先套用）。
_DOT2 = re.compile(r"(?<![\d.])(\d|\d{3})\.(\d{1,3})(?![\d.])")


def _digits(s: str) -> str:
    return "".join(_ZH[int(c)] for c in s)


def to_speech(text: str, skip: set | frozenset = frozenset()) -> str:
    """把專業寫法轉成 TTS 唸得對的形式。
    skip：要略過的規則（tts_gemini.py 用）——"多音詞替換" 整組，或 詞典 裡的單一詞（例如 ping、about）"""
    text = _IPV4.sub(lambda m: "點".join(_digits(g) for g in m.groups()), text)
    # 數字詞典先套用（3.11＝三點十一、443＝四四三），再處理一般兩段式數字
    for num, say in _SPEC.get("數字詞典", {}).items():
        if not num.startswith("_"):
            text = re.sub(rf"(?<![\d.]){re.escape(num)}(?![\d.])", say, text)
    text = _DOT2.sub(lambda m: f"{_digits(m.group(1))}點{_digits(m.group(2))}", text)
    # 規範裡 handler 為「literal:替換文字」的規則（例如單獨唸的 com → c o m）
    for r in _SPEC.get("regex_rules", []):
        h = r.get("handler", "")
        if h.startswith("literal:") and r.get("name") not in skip:
            text = re.sub(r["pattern"], h[len("literal:"):], text)
    # 多音詞換成只有一種讀音的同音字（字幕仍用原字）
    for term, say in _SPEC.get("多音詞替換", {}).items():
        if not term.startswith("_") and "多音詞替換" not in skip:
            text = text.replace(term, say)
    for term, say in _SPEC["詞典"].items():
        if term in skip:
            continue
        text = re.sub(rf"(?<![A-Za-z]){re.escape(term)}(?![A-Za-z0-9])", say, text)
    return text


def lint(text: str, scene: str) -> list[str]:
    """轉換後仍殘留的危險樣式 —— 代表規則沒蓋到，必須修。"""
    return [f"{scene}: {d['訊息']} → {re.search(d['pattern'], text).group(0)}"
            for d in _SPEC["危險樣式"] if re.search(d["pattern"], text)]



def parse(md_path: Path):
    """回傳 [(scene_id, slug, narration_text), ...]"""
    text = md_path.read_text(encoding="utf-8")
    blocks = re.split(r"^## ", text, flags=re.M)[1:]
    out = []
    for b in blocks:
        head = b.split("\n", 1)[0]
        m = re.match(r"(S\d+)\s*·\s*([^\s·]+)", head)
        if not m:
            continue
        nm = re.search(r"^NARRATION:\s*\n(.*?)(?=\n---|\Z)", b, re.S | re.M)
        if not nm:
            continue
        narr = nm.group(1)
        narr = re.sub(r"\*\*(.+?)\*\*", r"\1", narr)      # 去掉粗體標記
        narr = re.sub(r"[ \t]+", "", narr)
        narr = "\n".join(l for l in narr.split("\n") if l.strip())
        out.append((m.group(1), m.group(2), narr))
    return out


async def synth(text: str, mp3: Path, vtt: Path):
    """注意：zh-TW 的 edge-tts 只送 SentenceBoundary，不送 WordBoundary。
    句級時間戳對中文字幕反而更合適（一句一行），照單全收即可。"""
    comm = edge_tts.Communicate(to_speech(text), VOICE, rate=RATE, pitch=PITCH)
    subs = edge_tts.SubMaker()
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                subs.feed(chunk)
    vtt.write_text(subs.get_srt(), encoding="utf-8")


def dur(p: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


async def main(md: Path):
    sid = md.stem.split("_")[0]
    out = md.parent.parent / "02_語音" / sid
    out.mkdir(parents=True, exist_ok=True)

    scenes = parse(md)
    print(f"{md.name} → {len(scenes)} 個 scene\n")

    total, rows = 0.0, []
    problems = []
    for s, slug, narr in scenes:
        problems += lint(to_speech(narr), s)
        mp3, vtt = out / f"{s}.mp3", out / f"{s}.srt"
        await synth(narr, mp3, vtt)
        d = dur(mp3)
        total += d
        chars = len(re.sub(r"\s", "", narr))
        rows.append({"scene": s, "slug": slug, "seconds": round(d, 2),
                     "chars": chars, "cps": round(chars / d, 1) if d else 0})
        print(f"  {s:3} {slug:14} {d:6.2f}s  {chars:4d}字  {chars/d if d else 0:4.1f}字/秒")

    lst = out / "concat.txt"
    lst.write_text("".join(f"file '{out / (r['scene'] + '.mp3')}'\n" for r in rows),
                   encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat",
                    "-safe", "0", "-i", str(lst), "-c", "copy", str(out / "full.mp3")])

    (out / "marks.json").write_text(json.dumps(
        {"id": sid, "voice": VOICE, "rate": RATE, "pitch": PITCH,
         "total_seconds": round(total, 2), "scenes": rows},
        ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n  合計 {total:.1f} 秒 ({total/60:.2f} 分)")
    print(f"  輸出 → {out}")


if __name__ == "__main__":
    asyncio.run(main(Path(sys.argv[1]).resolve()))
