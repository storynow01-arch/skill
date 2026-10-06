#!/usr/bin/env python3
"""句內異常停頓（2026-10-06，從範本E 移植；外層工作流、範本 A～G 共用）：
旁白「句子裡面」超過 1.2 秒的靜音（句子頭尾 0.5 秒、測驗的思考停頓 ≤3.5 秒不算）。
停太久畫面會靜止、片子變長；範本E 實測抓到「回顧名詞清單每個停 1.5～2 秒」「測驗思考停 5.2 秒」。

  python <skill>/final_qa/pause_check.py                    在專案資料夾執行，自動判斷：
      src/data/spec.json＋public/voice.wav（範本 A～D、十一步流程）→ 每句旁白 voiceLines 的範圍內檢查
      timings.json（範本F／G）→ 每段配音檔
  python <skill>/final_qa/pause_check.py 02_語音/1-1        一個資料夾裡的每個 mp3／wav（範本E 的每場音檔）
輸出 qa/停頓檢查.json（範本E 給資料夾時寫在該資料夾）。只提醒、不擋（exit 0）：停頓是不是太長要人聽。
"""
from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
TH, EDGE, QUIZ_OK = 1.2, 0.5, 3.5          # 門檻、頭尾不算的秒數、測驗思考停頓容許


def silences(audio: Path, a: float | None = None, b: float | None = None) -> list[tuple[float, float]]:
    cut = (["-ss", f"{a:.3f}", "-to", f"{b:.3f}"] if a is not None else [])
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *cut, "-i", str(audio), "-af",
                        f"silencedetect=noise=-38dB:d={TH}", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return list(zip(st, en))


def dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return float(r.stdout or 0)


def inner(audio: Path, a: float, b: float, quiz: bool) -> list[tuple[float, float]]:
    """a～b 範圍（秒）裡、頭尾 EDGE 以外的長靜音；回傳絕對時間"""
    out = []
    for s, e in silences(audio, a, b):
        if s < EDGE or e > (b - a) - EDGE:
            continue
        if quiz and e - s <= QUIZ_OK:
            continue
        out.append((a + s, e - s))
    return out


def check() -> tuple[list[dict], Path]:
    found = []
    if len(sys.argv) > 1:                                   # 一個資料夾裡的每個音檔（範本E）
        d = Path(sys.argv[1])
        for f in sorted([*d.glob("*.mp3"), *d.glob("*.wav")]):
            if f.stem in ("full", "voice", "narration", "final"): continue     # 整支合併檔不算（場景之間的停頓是刻意的）
            for at, sec in inner(f, 0, dur(f), "……" in (f.with_suffix(".srt").read_text(encoding="utf-8")
                                                          if f.with_suffix(".srt").exists() else "")):
                found.append({"where": f.stem, "at": round(at, 2), "sec": round(sec, 2)})
        return found, d / "停頓檢查.json"
    if Path("src/data/spec.json").exists():                 # 範本 A～D：每句旁白
        spec = json.loads(Path("src/data/spec.json").read_text(encoding="utf-8"))
        voice = Path("public") / (spec.get("voice") or "voice.wav")
        quiz = {s.get("id") for s in spec.get("scenes", []) if s.get("type") == "quiz"}
        for vl in spec.get("voiceLines", []):
            for at, sec in inner(voice, vl["from"], vl["to"], vl.get("scene") in quiz or "……" in vl["text"]):
                found.append({"where": f'{vl.get("scene", "")}「{vl["text"][:16]}」', "at": round(at, 2), "sec": round(sec, 2)})
    elif Path("timings.json").exists():                     # 範本F／G：每段配音
        for sg in json.loads(Path("timings.json").read_text(encoding="utf-8"))["segs"]:
            for at, sec in inner(Path(sg["wav"]), 0, sg["dur"], "……" in sg["text"]):
                found.append({"where": f'第 {sg["i"]} 段「{sg["text"][:16]}」', "at": round(sg["start"] + at, 2), "sec": round(sec, 2)})
    else:
        raise SystemExit("找不到 src/data/spec.json 或 timings.json：在專案資料夾執行，或給音檔資料夾")
    Path("qa").mkdir(exist_ok=True)
    return found, Path("qa") / "停頓檢查.json"


if __name__ == "__main__":
    found, out = check()
    out.write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"句內長停頓 {len(found)} 處（> {TH} 秒；頭尾與測驗思考時間不算）")
    for p in found[:12]:
        print(f"  {p['where']}　{p['at']} 秒處停 {p['sec']} 秒")
