#!/usr/bin/env python3
"""把「封面 + 片頭 + 亮轉深過渡 + 各節」合成一集。

  python assemble.py EP1 1-1 1-2 1-3 ...
  python assemble.py EP3 2-1 … 2-7 --ver v8 --fit-minutes 30.5   ← 整集壓到 30.5 分以內（2026-10-06 使用者規定）

--fit-minutes（方案 C，不重渲、不重配）：合併時把每節「複製一份」處理，05_輸出_節 的原檔不動——
  1. 句子之間超過 0.7 秒的停頓縮到 0.45 秒（隨堂測驗、片尾測驗的時段、每節開頭 1.5 秒、換場前 0.6 秒到後 0.9 秒不縮）
  2. 再整體等比加速（畫面 setpts、聲音 atempo 不變調），倍率依目標長度自動算；倍率超過 1.12 會警告

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


def norm_section(sid: str, dst: Path, sec_dir: Path, keep: list | None = None, speed: float = 1.0):
    """節已經是 1920x1080/30fps，仍重封裝一次確保參數完全一致。
    keep＝要保留的時段（縮停頓用）、speed＝加速倍率；都沒有就只是重封裝。"""
    src = sec_dir / f"{sid}.mp4"
    if not src.exists():
        raise SystemExit(f"找不到 {src}")
    if not keep and speed == 1.0:
        run(["-i", str(src), "-vf", "setsar=1", *VOPTS, *AOPTS, str(dst)])
        return
    expr = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in (keep or [(0, 1e9)]))
    run(["-i", str(src), "-vf", f"select='{expr}',setpts=N/FRAME_RATE/TB/{speed:.5f},setsar=1",
         "-af", f"aselect='{expr}',asetpts=N/SR/TB,atempo={speed:.5f}", *VOPTS, *AOPTS, str(dst)])


GAP_MIN, GAP_KEEP = 0.7, 0.45      # 超過 0.7 秒的停頓縮到 0.45 秒


def keep_spans(sid: str, sec_dir: Path) -> tuple[list, float]:
    """回傳 (保留時段, 縮完的秒數)。測驗時段、開頭 1.5 秒、換場前 0.6 秒到後 0.9 秒不縮。"""
    import json as _json, re as _re
    src = sec_dir / f"{sid}.mp4"
    total = dur(src)
    protect = [(0.0, 1.5)]
    data_f = ROOT / "04_引擎" / "remotion" / "src" / "data" / f"{sid}.json"
    bounds = []
    if data_f.exists():
        d = _json.loads(data_f.read_text(encoding="utf-8"))
        sc = d.get("scenes", [])
        if sc and abs(sc[-1]["startSec"] + sc[-1]["durSec"] - total) < 1.5:   # 資料檔跟成片對得上才用
            protect += [(x["startSec"], x["startSec"] + x["durSec"]) for x in sc if x["type"] in ("quiz", "qa_endcard")]
            bounds = [x["startSec"] for x in sc[1:]]
            # 畫面動畫的觸發時間（焦點切換、項目亮起、footer、測驗揭曉、結語各句…）前 0.35～後 0.7 秒不剪：
            # 2026-10-06 實測，動畫常在旁白開口前一點點開始，剪掉開頭就像瞬間跳過去（品檢 F11）
            def _times(o):
                if isinstance(o, dict):
                    for k, v in o.items():
                        if k == "focusPlan" and isinstance(v, list):
                            yield from (e[0] for e in v if isinstance(e, list) and e and isinstance(e[0], (int, float)))
                        elif k.endswith("At") and isinstance(v, (int, float)):
                            yield v
                        elif k.endswith("Ats") and isinstance(v, list):
                            yield from (t for t in v if isinstance(t, (int, float)))
                        else:
                            yield from _times(v)
                elif isinstance(o, list):
                    for v in o:
                        yield from _times(v)
            for x in sc:
                protect += [(x["startSec"] + t - 0.35, x["startSec"] + t + 0.7) for t in _times(x.get("props", {}))]
    if not bounds:                                   # 對不上：保守處理，最後 7 秒（片尾測驗）不縮
        protect.append((total - 7.0, total))
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(src), "-vn", "-af", f"silencedetect=noise=-38dB:d={GAP_MIN}",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    st = [float(x) for x in _re.findall(r"silence_start: ([\d.]+)", r)]
    en = [float(x) for x in _re.findall(r"silence_end: ([\d.]+)", r)]
    cuts = []
    for a, b in zip(st, en):
        if any(a < z1 and b > z0 for z0, z1 in protect):
            continue
        segs = [(a + 0.25, b - 0.2)]
        for t0 in bounds:                            # 換場：前 0.6 秒（出場淡化）到後 0.9 秒（下一場進場動畫）一律不剪
            w0, w1 = t0 - 0.6, t0 + 0.9               # 2026-10-06 實測：只保護「包住換場點」的停頓不夠，緊貼換場後的停頓被剪掉 → 進場動畫消失、像硬切
            segs = [y for (x0, x1) in segs for y in ([(x0, min(x1, w0)), (max(x0, w1), x1)] if x0 < w1 and x1 > w0 else [(x0, x1)])]
        cuts += [(x0, x1) for x0, x1 in segs if x1 - x0 > 0.1]
    keep, t = [], 0.0
    for a, b in sorted(cuts):
        keep.append((t, a)); t = b
    keep.append((t, total))
    return keep, sum(b - a for a, b in keep)


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


def main(ep: str, sids: list[str], ver: str = "", fit_min: float = 0.0):
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

    plan, speed = {}, 1.0
    if fit_min:                                      # 方案 C：先算每節縮停頓後的長度，再算加速倍率
        plan = {sid: keep_spans(sid, sec_dir) for sid in sids}
        fixed = sum(dur(p) for p in parts)
        trimmed = sum(v[1] for v in plan.values())
        target = fit_min * 60 - 3.0                  # 留 3 秒餘裕（編碼誤差）
        speed = max(1.0, trimmed / (target - fixed))
        orig = sum(dur(sec_dir / f"{s}.mp4") for s in sids)
        print(f"  縮停頓：{orig:.0f} → {trimmed:.0f} 秒（省 {orig - trimmed:.0f} 秒）；加速 ×{speed:.3f}" +
              ("　⚠ 超過 1.12，語速會明顯變快" if speed > 1.12 else ""))
    for sid in sids:
        tag = f"_fit{fit_min:g}" if fit_min else ""
        p = WORK / (f"sec_{ver}_{sid}{tag}.mp4" if ver else f"sec_{sid}{tag}.mp4")
        print(f"  {sid}…"); norm_section(sid, p, sec_dir, plan.get(sid, (None,))[0], speed)
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
    fit = 0.0
    if "--fit-minutes" in args:
        k = args.index("--fit-minutes"); fit = float(args[k + 1]); del args[k:k + 2]
    if len(args) < 2:
        raise SystemExit("用法: python assemble.py EP1 1-1 1-2 … [--ver v2] [--fit-minutes 30.5]")
    if not fit:                                      # 沒指定就看 00_規範/集長度設定.json（每日批次不用改指令）
        import json as _json
        cfg_f = ROOT / "00_規範" / "集長度設定.json"
        if cfg_f.exists():
            cfg = _json.loads(cfg_f.read_text(encoding="utf-8"))
            if args[0] in cfg.get("套用的集", []):
                fit = float(cfg["上限分鐘"])
    main(args[0], args[1:], ver, fit)
