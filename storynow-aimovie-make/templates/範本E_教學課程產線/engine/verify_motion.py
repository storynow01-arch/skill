#!/usr/bin/env python3
"""驗證成品是否符合「畫面絕不靜止超過 4 秒」。

用的是拉片 Gary Chen 時同一套方法：4fps 密集取樣 + 影格差分。
規格說到不算數，要從成品量回來才算。

  python verify_motion.py 1-1 1-2 1-3
"""
from __future__ import annotations
import subprocess, sys, tempfile, shutil
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FPS = 4
STILL_THRESHOLD = 0.6
# 量測解析度 480x270。
# 拉片時用 192x108 是為了跑 8000 幀求快；但那個解析度會把細微動態（星點、光暈呼吸）
# 平均掉，量不到。已用兩種解析度重測參考片驗證基準仍然成立：
#   GaryChen 部署教學  192x108 → 74.3% / 3.8s    480x270 → 73.4% / 3.8s
#   GaryChen Make_n8n  192x108 → 74.0% / 4.0s    480x270 → 72.3% / 4.0s
# 數值一致，代表他的動態夠粗；基準值可直接沿用。
MAX_STILL = 4.0


def analyse(mp4: Path, w: int = 480, h: int = 270):
    tmp = Path(tempfile.mkdtemp())
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4),
                        "-vf", f"fps={FPS},scale={w}:{h}", "-q:v", "4",
                        str(tmp / "f_%06d.jpg")], check=True)
        fs = sorted(tmp.glob("f_*.jpg"))
        arr = np.stack([np.array(Image.open(f).convert("L"), dtype=np.float32) for f in fs])
        d = np.abs(np.diff(arr, axis=0)).mean(axis=(1, 2))

        static_ratio = float((d < STILL_THRESHOLD).mean())
        run = best = 0
        best_at = 0
        for i, v in enumerate(d):
            if v < STILL_THRESHOLD:
                run += 1
                if run > best:
                    best, best_at = run, i
            else:
                run = 0
        return {
            "frames": len(fs),
            "seconds": len(fs) / FPS,
            "static_ratio": static_ratio,
            "max_still": best / FPS,
            "max_still_at": (best_at - best + 1) / FPS,
        }
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def per_scene(sid: str, mp4: Path):
    """逐場景報告 —— 找出是「哪一種組件」不夠動，而不是只知道整節超標。"""
    import json
    dp = ROOT / "04_引擎" / "remotion" / "src" / "data" / f"{sid}.json"
    if not dp.exists():
        return []
    scenes = json.loads(dp.read_text(encoding="utf-8"))["scenes"]

    tmp = Path(tempfile.mkdtemp())
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4),
                        "-vf", f"fps={FPS},scale=480:270", "-q:v", "4",
                        str(tmp / "f_%06d.jpg")], check=True)
        fs = sorted(tmp.glob("f_*.jpg"))
        arr = np.stack([np.array(Image.open(f).convert("L"), dtype=np.float32) for f in fs])
        d = np.abs(np.diff(arr, axis=0)).mean(axis=(1, 2))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    rows = []
    for sc in scenes:
        a = int(sc["startSec"] * FPS)
        b = min(int((sc["startSec"] + sc["durSec"]) * FPS), len(d))
        seg = d[a:b]
        if len(seg) == 0:
            continue
        run = best = 0
        for v in seg:
            run = run + 1 if v < STILL_THRESHOLD else 0
            best = max(best, run)
        rows.append({"id": sc["id"], "type": sc["type"], "dur": sc["durSec"],
                     "static": float((seg < STILL_THRESHOLD).mean()),
                     "max_still": best / FPS})
    return rows


def scenes_report(ids):
    print(f"{'節':6} {'場景':5} {'型別':16} {'長度':>7} {'靜止':>7} {'最長靜止':>9}   判定")
    print("-" * 74)
    bad_types = {}
    for sid in ids:
        mp4 = ROOT / "05_輸出_節" / f"{sid}.mp4"
        if not mp4.exists():
            continue
        for r in per_scene(sid, mp4):
            ok = r["max_still"] <= MAX_STILL
            if not ok:
                bad_types[r["type"]] = bad_types.get(r["type"], 0) + 1
            print(f"{sid:6} {r['id']:5} {r['type']:16} {r['dur']:6.1f}s "
                  f"{r['static']*100:6.1f}% {r['max_still']:8.1f}s   "
                  f"{'✓' if ok else '✗ 超標'}")
    if bad_types:
        print("\n不夠動的組件：")
        for t, n in sorted(bad_types.items(), key=lambda x: -x[1]):
            print(f"   {t:18} {n} 個場景超標")
    return not bad_types


def main(ids):
    print(f"{'節':6} {'長度':>8} {'靜止比例':>9} {'最長連續靜止':>13}   判定")
    print("-" * 62)
    ok = True
    for sid in ids:
        p = ROOT / "05_輸出_節" / f"{sid}.mp4"
        if not p.exists():
            print(f"{sid:6} 找不到 {p}")
            ok = False
            continue
        r = analyse(p)
        passed = r["max_still"] <= MAX_STILL
        ok &= passed
        mark = "✓ 通過" if passed else f"✗ 超標（{r['max_still_at']:.1f}s 起）"
        print(f"{sid:6} {r['seconds']:7.1f}s {r['static_ratio']*100:8.1f}% "
              f"{r['max_still']:12.1f}s   {mark}")
    print("-" * 62)
    print(f"參考值 — Gary Chen 原片 @480x270：靜止比例 72~73% / 最長連續靜止 3.8~4.0s")
    if not ok:
        print()
        scenes_report(ids)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main(sys.argv[1:] or ["1-1", "1-2", "1-3"])
