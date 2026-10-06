#!/usr/bin/env python3
"""分鏡 cue 檢查（不需配音）：每個 cue／cueWords 都要在該場景的旁白原文找得到，且依序出現。
  py qa\cue_check.py 2-1 2-2 …     改稿之後、配音之前先跑，避免建置時才發現 cue 查無
"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "04_引擎"))
from subtitles import original_sentences          # noqa: E402
from cues import collect_cues                      # noqa: E402

norm = lambda s: re.sub(r"[\s​]", "", s)
bad = 0
for sid in sys.argv[1:]:
    orig = original_sentences(sid)
    plan = json.loads((ROOT / "01_腳本" / f"{sid}_plan.json").read_text(encoding="utf-8"))
    for sc in plan["scenes"]:
        cues = [c for c in collect_cues(sc.get("props", {})) if c]
        if not cues or sc["id"] not in orig:
            continue
        text = norm("".join(orig[sc["id"]]["lines"]))
        pos = 0
        for c in cues:
            k = text.find(norm(c), pos)
            if k < 0:
                k2 = text.find(norm(c))
                print(f"✗ {sid} {sc['id']} 「{c}」" + ("（順序不對）" if k2 >= 0 else "（旁白裡找不到）")); bad += 1
            else:
                pos = k
print(f"cue 問題 {bad} 處")
sys.exit(1 if bad else 0)
