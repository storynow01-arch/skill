#!/usr/bin/env python3
"""唸法回聽：把含英數詞的句子從配音裡切出來，用語音辨識聽 TTS 實際唸成什麼。

  py qa\\qa_asr.py <輸出資料夾> <節...>

⚠ 中文同音字辨識錯誤很多（見 cues.py 的紀錄），所以這裡只看英數詞：
  辨識結果裡找得到該詞的字母／數字＝唸對的機率高；找不到＝列入人工試聽。
  每句另存成 mp3 片段，報告直接放播放器，不用回頭翻整支影片。
輸出：<輸出資料夾>/asr.json、<輸出資料夾>/clips/<節>_<場景>_<句>.mp3
"""
from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
from subtitles import original_sentences, match_lines          # noqa: E402
from build_data import parse_srt                  # noqa: E402
from tts import to_speech                         # noqa: E402

TERM = re.compile(r"[A-Za-z0-9][A-Za-z0-9.\-/:+_]*[A-Za-z0-9]|[A-Za-z]")
MODEL = "base"


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main(out: Path, ids: list[str]):
    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL, device="cpu", compute_type="int8")
    clips = out / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    rows = []
    for sid in ids:
        for scn, opt in original_sentences(sid).items():
            srt = parse_srt(ROOT / "02_語音" / sid / f"{scn}.srt", 0)
            lines = match_lines(opt, srt, None)
            if not lines:
                continue
            for k, (ln, cue) in enumerate(zip(lines, srt)):
                terms = [t for t in TERM.findall(ln) if not re.fullmatch(r"\d", t)]
                if not terms:
                    continue
                clip = clips / f"{sid}_{scn}_{k:02d}.mp3"
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(cue['start'] - 0.1, 0):.2f}",
                                "-to", f"{cue['end'] + 0.25:.2f}", "-i",
                                str(ROOT / "02_語音" / sid / f"{scn}.mp3"), "-c:a", "libmp3lame", "-q:a", "4",
                                str(clip)], check=True)
                segs, _ = model.transcribe(str(clip), language="zh", beam_size=5, vad_filter=False)
                heard = "".join(s.text for s in segs).strip()
                hn = norm(heard)
                for t in terms:
                    ok = norm(t) and norm(t) in hn
                    rows.append({"sid": sid, "scene": scn, "line": ln, "term": t, "sent_to_tts": to_speech(t),
                                 "heard": heard, "found": bool(ok), "clip": f"clips/{clip.name}"})
        print(f"{sid}: {sum(1 for r in rows if r['sid'] == sid)} 個英數詞", flush=True)
    (out / "asr.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    miss = [r for r in rows if not r["found"]]
    print(f"→ {len(rows)} 個詞次，辨識結果裡找不到的 {len(miss)} 個")


def poly(out: Path, ids: list[str], per_word: int = 2):
    """多音詞試聽清單：旁白裡出現的每個多音詞切 per_word 段，附正確讀音。
    同一個詞 TTS 通常唸法一致，聽前兩段就能判斷；聽到唸錯再全部搜尋修正。"""
    spec = json.loads((ROOT / "00_規範" / "多音字清單.json").read_text(encoding="utf-8"))["詞"]
    clips = out / "clips_poly"
    clips.mkdir(parents=True, exist_ok=True)
    rows, count = [], {}
    for sid in ids:
        for scn, opt in original_sentences(sid).items():
            srt = parse_srt(ROOT / "02_語音" / sid / f"{scn}.srt", 0)
            lines = match_lines(opt, srt, None)
            if not lines:
                continue
            for k, (ln, cue) in enumerate(zip(lines, srt)):
                for w, py in spec.items():
                    if w not in ln:
                        continue
                    count[w] = count.get(w, 0) + 1
                    if count[w] > per_word:
                        continue
                    clip = clips / f"{w}_{count[w]}.mp3"
                    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(cue['start'] - 0.1, 0):.2f}",
                                    "-to", f"{cue['end'] + 0.25:.2f}", "-i",
                                    str(ROOT / "02_語音" / sid / f"{scn}.mp3"), "-c:a", "libmp3lame", "-q:a", "4",
                                    str(clip)], check=True)
                    rows.append({"word": w, "pinyin": py, "sid": sid, "scene": scn, "line": ln,
                                 "clip": f"clips_poly/{clip.name}"})
    for r in rows:
        r["total"] = count[r["word"]]
    (out / "poly.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {len(count)} 個多音詞、{sum(count.values())} 處；切出 {len(rows)} 段試聽")


if __name__ == "__main__":
    if "--poly" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--poly"]
        poly(Path(args[0]), args[1:])
    else:
        main(Path(sys.argv[1]), sys.argv[2:])
