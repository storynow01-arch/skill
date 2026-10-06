#!/usr/bin/env python3
"""物件文字粗篩（不需配音）：每個物件（卡片標題、pill、層名…）至少要跟該場旁白有一個共同的兩字詞或英數詞，
否則建置時多半會被「文不對題」擋下。用建置同一個判斷函式 cues._said，但比對整場旁白（建置時只看前後一句，更嚴）。
  py qa\item_check.py 1-1 1-2 …
"""
import json, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "04_引擎"))
from subtitles import original_sentences      # noqa: E402
from cues import item_texts, _said             # noqa: E402

bad = 0
for sid in sys.argv[1:]:
    orig = original_sentences(sid)
    plan = json.loads((ROOT / "01_腳本" / f"{sid}_plan.json").read_text(encoding="utf-8"))
    for sc in plan["scenes"]:
        if sc.get("props", {}).get("allowStatic") or sc["id"] not in orig:
            continue
        said = "".join(orig[sc["id"]]["lines"])
        miss = [t for t in item_texts(sc) if t and not _said(t, said)]
        if miss:
            bad += len(miss); print(f"✗ {sid} {sc['id']} {sc['type']}：{'、'.join(miss)}")
print(f"物件對不上旁白 {bad} 個")
