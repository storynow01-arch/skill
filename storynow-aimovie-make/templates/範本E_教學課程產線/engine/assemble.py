#!/usr/bin/env python3
"""把「封面 + 片頭 + 亮轉深過渡 + 各節」合成一集。

  python assemble.py EP1 1-1 1-2 1-3 ...

所有片段先正規化成同一組編碼參數，最後用 concat demuxer 直接串接（-c copy）。
改某一節時只要重渲那一節再跑一次這支，其餘片段的編碼結果會重複使用。
"""
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "03_素材" / "brand"
WORK = ROOT / "06_輸出_集" / "_work"

W, H, FPS = 1920, 1080, 30
BG = "0x181818"
COVER_SEC = 3.0
FADE_SEC = 0.6
VOPTS = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS)]
AOPTS = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]


def run(args):
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args])
    if r.returncode:
        raise SystemExit(f"ffmpeg 失敗: {' '.join(str(a) for a in args[:8])}…")


def make_cover(dst: Path):
    """封面靜幀，補無聲音軌以便與其他片段串接。"""
    run(["-loop", "1", "-t", str(COVER_SEC), "-i", str(BRAND / "cover.jpg"),
         "-f", "lavfi", "-t", str(COVER_SEC), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H},setsar=1",
         *VOPTS, *AOPTS, "-shortest", str(dst)])


def make_intro(dst: Path):
    """片頭放大到 1080p。原生 650x368（1.766）與 16:9（1.778）略有差異，
    以寬度為準放大後裁掉上下各約 4px，不留黑邊。"""
    run(["-i", str(BRAND / "intro.mp4"),
         "-vf", f"scale={W}:-2:flags=lanczos,crop={W}:{H},setsar=1",
         *VOPTS, *AOPTS, str(dst)])


def make_fade(dst: Path):
    """亮轉深過渡：取片頭最後一幀，淡入深色底 #181818。"""
    last = WORK / "_lastframe.png"
    run(["-sseof", "-0.1", "-i", str(BRAND / "intro.mp4"), "-frames:v", "1",
         "-vf", f"scale={W}:-2:flags=lanczos,crop={W}:{H}", str(last)])
    run(["-loop", "1", "-t", str(FADE_SEC), "-i", str(last),
         "-f", "lavfi", "-t", str(FADE_SEC), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"fade=t=out:st=0:d={FADE_SEC}:color={BG},setsar=1",
         *VOPTS, *AOPTS, "-shortest", str(dst)])


def norm_section(sid: str, dst: Path, sec_dir: Path):
    """節已經是 1920x1080/30fps，仍重封裝一次確保參數完全一致。"""
    src = sec_dir / f"{sid}.mp4"
    if not src.exists():
        raise SystemExit(f"找不到 {src}")
    run(["-i", str(src), "-vf", "setsar=1", *VOPTS, *AOPTS, str(dst)])


# 整集響度：線上教學平台常用 -16 LUFS（口語內容）／真峰值 -1.5 dBTP。
# 2026-10-03 品檢發現各節都在 -23 LUFS（廣播標準），在電腦、手機上偏小聲。
TARGET_I, TARGET_TP, TARGET_LRA = -16.0, -1.5, 11.0


def loudnorm(src: Path, dst: Path):
    """兩段式 loudnorm：第一遍量測，第二遍依量測值線性調整。影像直接複製不重壓。"""
    import json as _json
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-vn", "-af",
                        f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = _json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    af = (f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:"
          f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run(["-i", str(src), "-c:v", "copy", "-af", af, *AOPTS, str(dst)])


def dur(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def main(ep: str, sids: list[str], ver: str = ""):
    """ver：版本子資料夾（例如 v2）。單節從 05_輸出_節\<ver>\ 讀，整集寫到 06_輸出_集\<ver>\，
    不覆蓋已交付的檔案。"""
    sec_dir = ROOT / "05_輸出_節" / ver
    out_dir = ROOT / "06_輸出_集" / ver
    out_dir.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    parts = []

    cover = WORK / "cover.mp4"
    if not cover.exists():
        print("  封面…"); make_cover(cover)
    parts.append(cover)

    intro = WORK / "intro.mp4"
    if not intro.exists():
        print("  片頭…"); make_intro(intro)
    parts.append(intro)

    fade = WORK / "fade.mp4"
    if not fade.exists():
        print("  過渡…"); make_fade(fade)
    parts.append(fade)

    for sid in sids:
        p = WORK / f"sec_{ver}_{sid}.mp4" if ver else WORK / f"sec_{sid}.mp4"
        print(f"  {sid}…"); norm_section(sid, p, sec_dir)
        parts.append(p)

    lst = WORK / f"{ep}{'_' + ver if ver else ''}_concat.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    out = out_dir / f"{ep}.mp4"
    raw = WORK / f"{ep}{'_' + ver if ver else ''}_raw.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)])
    print("  響度正規化…"); loudnorm(raw, out)
    raw.unlink()

    print(f"\n{ep}.mp4")
    t = 0.0
    for p in parts:
        d = dur(p)
        print(f"   {p.stem:14} {t:7.2f}s  +{d:6.2f}s")
        t += d
    total = dur(out)
    print(f"   {'總長':14} {total:7.2f}s  ({total/60:.2f} 分)")
    print(f"→ {out}")


if __name__ == "__main__":
    args = sys.argv[1:]
    ver = ""
    if "--ver" in args:
        k = args.index("--ver"); ver = args[k + 1]; del args[k:k + 2]
    if len(args) < 2:
        raise SystemExit("用法: python assemble.py EP1 1-1 1-2 … [--ver v2]")
    main(args[0], args[1:], ver)
