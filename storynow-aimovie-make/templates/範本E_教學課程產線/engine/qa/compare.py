#!/usr/bin/env python3
"""修改前後對照圖。

  兩種圖：
  pair   同一秒的單格，左「修改前」右「修改後」
  strip  同一段時間抽 N 格，上排修改前、下排修改後，每格標秒數（看「物件何時出現、會不會循環」用）

  另可只裁字幕帶（crop=band）放大看標點與閃爍。
由 make_compare.py 呼叫；也可單獨 import 使用。
"""
from __future__ import annotations
import subprocess
from pathlib import Path

FONT = "C\\:/Windows/Fonts/msjh.ttc"
BAND = "crop=1920:150:0:905"


def _frame(mp4: Path, t: float, out: Path, vf: str = "", label: str = ""):
    filt = [f for f in (vf,) if f]
    if label:
        filt.append(f"drawtext=fontfile='{FONT}':text='{label}':x=16:y=12:fontsize=34:"
                    f"fontcolor=white:box=1:boxcolor=0x000000AA:boxborderw=10")
    args = ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(mp4), "-frames:v", "1"]
    if filt:
        args += ["-vf", ",".join(filt)]
    subprocess.run(args + [str(out)], check=True)


def _stack(inputs: list[Path], out: Path, how: str, cols: int = 0):
    args = ["ffmpeg", "-y", "-v", "error"]
    for p in inputs:
        args += ["-i", str(p)]
    n = len(inputs)
    if how == "h":
        fc = "".join(f"[{i}:v]" for i in range(n)) + f"hstack=inputs={n}"
    elif how == "v":
        fc = "".join(f"[{i}:v]" for i in range(n)) + f"vstack=inputs={n}"
    subprocess.run(args + ["-filter_complex", fc, str(out)], check=True)


def pair(old: Path, new: Path, t: float, out: Path, band: bool = False, t_new: float | None = None):
    tmp = out.with_suffix("")
    vf = BAND if band else "scale=960:540"
    a, b = Path(f"{tmp}_a.png"), Path(f"{tmp}_b.png")
    _frame(old, t, a, vf, f"修改前  {t:.1f}s")
    _frame(new, t if t_new is None else t_new, b, vf, f"修改後  {(t if t_new is None else t_new):.1f}s")
    _stack([a, b], out, "v" if band else "h")
    a.unlink(); b.unlink()


def strip(old: Path, new: Path, times: list[float], out: Path, scale: str = "scale=480:270",
          times_new: list[float] | None = None, columns: bool = False):
    """times_new：修改後的對應秒數（重新配音後場景起點會變）；不給就用同一組
    columns=True：左欄修改前、右欄修改後，每一格往下排（字幕帶這種扁長圖用）"""
    tmp = out.with_suffix("")
    rows = []
    for tag, src, ts in (("前", old, times), ("後", new, times_new or times)):
        cells = []
        for k, t in enumerate(ts):
            c = Path(f"{tmp}_{tag}{k}.png")
            _frame(src, t, c, scale, f"{'修改' + tag} {t:.1f}s")
            cells.append(c)
        r = Path(f"{tmp}_{tag}.png")
        _stack(cells, r, "v" if columns else "h")
        for c in cells:
            c.unlink()
        rows.append(r)
    _stack(rows, out, "h" if columns else "v")
    for r in rows:
        r.unlink()
