#!/usr/bin/env python3
"""句內異常停頓（品檢 N8，2026-10-06）：配音裡超過 1.2 秒的靜音（場景開頭／結尾、測驗的「……」思考時間除外）。
停太久會讓畫面靜止、整集變長（EP1 v8 33.15 分的原因之一：1-6 回顧唸名詞清單，每個停 1.5～2 秒）。
  py qa\\pause_check.py 1-1 1-2 …        → 印出每節的長停頓，並寫 11_品檢\\停頓檢查\\停頓.json
只提醒、不擋：停頓是不是太長要人聽；確定太長可以改稿（名詞清單改成一句話）或重配那一場。
"""
from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent.parent
TH, EDGE, QUIZ_OK = 1.2, 0.5, 3.5          # 門檻、頭尾不算的秒數、測驗思考停頓容許


def silences(mp3: Path) -> list[tuple[float, float]]:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp3), "-af", f"silencedetect=noise=-38dB:d={TH}",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return list(zip(st, en))


def dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return float(r.stdout or 0)


def check(sid: str, voice: Path = ROOT / "02_語音") -> list[dict]:
    plan = json.loads((ROOT / "01_腳本" / f"{sid}_plan.json").read_text(encoding="utf-8"))
    types = {s["id"]: s["type"] for s in plan["scenes"]}
    out = []
    for mp3 in sorted((voice / sid).glob("S*.mp3"), key=lambda p: int(p.stem[1:])):
        d = dur(mp3)
        srt = (voice / sid / f"{mp3.stem}.srt")
        lines = re.findall(r"-->\s*[\d:,]+\n(.+)", srt.read_text(encoding="utf-8")) if srt.exists() else []
        for a, b in silences(mp3):
            if a < EDGE or b > d - EDGE:
                continue
            if types.get(mp3.stem) == "quiz" and b - a <= QUIZ_OK:
                continue
            out.append({"sid": sid, "scene": mp3.stem, "at": round(a, 2), "sec": round(b - a, 2)})
    return out


if __name__ == "__main__":
    allp = []
    for sid in sys.argv[1:]:
        ps = check(sid)
        allp += ps
        print(f"{sid}：長停頓 {len(ps)} 處" + ("　" + "、".join(f"{p['scene']} {p['at']}s（{p['sec']}s）" for p in ps[:6]) if ps else ""))
    out = ROOT / "11_品檢" / "停頓檢查"
    out.mkdir(parents=True, exist_ok=True)
    (out / "停頓.json").write_text(json.dumps(allp, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"合計 {len(allp)} 處（> {TH} 秒；頭尾與測驗思考時間不算）")
