#!/usr/bin/env python3
"""整集長度預估（品檢 N7，2026-10-06）：配完音就估，不用等渲染。超出 28～33 分先提醒。
  py qa\\ep_estimate.py EP1=1-1,1-2,… EP2=…
估法：封面＋片頭＋過渡 14.6 秒 ＋ 每節（各場配音長度合計 ＋ 片尾測驗 6 秒）。
EP1 v8 實際 33.15 分時，這支在渲染前就會估出超過（2026-10-06 實測對照見品檢強化統計）。
"""
from __future__ import annotations
import subprocess, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent.parent
INTRO, QA_CARD, LO, HI = 14.6, 6.0, 28.0, 33.0


def dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout)
    except ValueError:
        return 0.0


def estimate(ids: list[str], voice: Path = ROOT / "02_語音") -> tuple[float, list[str]]:
    total, missing = INTRO, []
    for sid in ids:
        mp3 = sorted((voice / sid).glob("S*.mp3"))
        if not mp3:
            missing.append(sid); continue
        total += sum(dur(p) for p in mp3) + QA_CARD
    return total, missing


def main():
    bad = 0
    for arg in sys.argv[1:]:
        name, ids = arg.split("=", 1)
        t, miss = estimate(ids.split(","))
        m = t / 60
        flag = "✓" if LO <= m <= HI else "⚠ 超出 28～33 分"
        print(f"{name}：預估 {m:.2f} 分 {flag}" + (f"（尚未配音：{'、'.join(miss)}，未計入）" if miss else ""))
        bad += not (LO <= m <= HI) and not miss
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
