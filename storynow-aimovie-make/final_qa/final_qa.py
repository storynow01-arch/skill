#!/usr/bin/env python3
"""最終品檢（通用版）：只需要成片 mp4，不依賴任何專案資料格式。

  py final_qa.py <影片.mp4> [--out 報告資料夾] [--band-y 930] [--band-h 90] [--terms 詞1,詞2]
                 [--text 旁白全文.txt] [--lufs -16] [--minutes 28,33]

給 storynow-aimovie-make 第⑪步用：不管影片是哪個範本、哪條流程做的，都能跑。
產線專屬的細項（字幕與稿子逐字比對、物件與旁白同步）由各範本自己的品檢負責（範本E：qa_run.py）。

只看影片能判斷的：
  F1 字幕閃爍   字幕帶在前後都有字的情況下突然空 1～2 格
  F2 字幕抖動   字幕帶外框在前後兩格一致時，中間那一格寬度或位置不同（字型沒載完、逐格重排）
  F3 黑畫面     F4 畫面凍結（最長靜止）   F5 規格（解析度、fps、編碼）
  F6 響度／峰值   F7 中段無聲   F8 長度
  F9 唸法：--terms 給的英數詞逐一做時長比對（原樣 vs 逐字母／中文數字），列出 TTS 自己猜的
  F10 多音詞：--text 給旁白全文時，列出含多音詞的句子（需人工試聽）
有原始資料時再加：
  G1～G6 字幕（--spec spec.json）：句尾標點、Netflix 字數／語速／停留、字幕＝旁白原文、字幕同步、唸法殘留、斷句
  L 版面（--layout qa_layout.json）
輸出：final_qa.html（報告＋截圖總覽）、sheet.jpg，以及<out>\\final_qa.json、<out>\\final_qa.md（摘要）
"""
from __future__ import annotations
import argparse, json, re, subprocess
from fractions import Fraction
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent


def sh(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def band_boxes(mp4: Path, y0: int, h: int, scale: int = 2):
    w, hh = 1920 // scale, h // scale
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                          f"crop=1920:{h}:0:{y0},scale={w}:{hh}:flags=area,format=gray",
                          "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    out, fsz = [], w * hh
    while True:
        buf = p.stdout.read(fsz * 300)
        if not buf:
            break
        arr = np.frombuffer(buf, np.uint8)
        for fr in arr[: len(arr) // fsz * fsz].reshape(-1, hh, w):
            m = fr > 190
            if m.sum() < 12:
                out.append(None)
                continue
            xs = np.nonzero(m.any(0))[0]
            ys = np.nonzero(m.any(1))[0]
            out.append((int(xs[0]) * scale, int(xs[-1]) * scale, int(ys[0]) * scale, int(ys[-1]) * scale,
                        int(m.sum())))
    p.wait()
    return out


def flicker_and_jitter(boxes, fps=30.0, tol=2):
    """F1：None 夾在兩個有字的格子之間（最多 2 格）。
    F2：前後兩格外框一致（同一頁字幕），中間那格外框不同——一頁字幕在播的時候不該變形。"""
    flick, jit = [], []
    n = len(boxes)
    for i in range(1, n - 1):
        if boxes[i] is None:
            j = i
            while j < n and boxes[j] is None and j - i < 3:
                j += 1
            if j - i <= 2 and boxes[i - 1] is not None and j < n and boxes[j] is not None:
                if not flick or flick[-1]["frame"] != i - 1:
                    flick.append({"frame": i, "sec": round(i / fps, 2), "blank": j - i})
            continue
        a, b, c = boxes[i - 1], boxes[i], boxes[i + 1]
        if a is None or c is None:
            continue
        same_ac = all(abs(a[k] - c[k]) <= tol for k in range(4))
        diff_b = any(abs(a[k] - b[k]) > tol for k in range(4))
        # 像素數也要接近，排除「換頁」那一格（換頁時文字內容整個變了）
        if same_ac and diff_b and abs(a[4] - c[4]) < 0.05 * a[4]:
            jit.append({"frame": i, "sec": round(i / fps, 2), "dx": max(abs(a[0] - b[0]), abs(a[1] - b[1])),
                        "dy": max(abs(a[2] - b[2]), abs(a[3] - b[3]))})
    return flick, jit


def _frame_diffs(vf: list[str], h: int, w: int, mp4: Path, chunk: int = 600) -> np.ndarray:
    """逐格平均亮度差。分段從 ffmpeg 管線讀，整集（5 萬格）也只佔幾百 MB 記憶體。
    2026-10-04：原本一次讀進整集要 18 GB，EP2 跑到 F11 記憶體不足中斷。"""
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(mp4), *vf, "-f", "rawvideo", "-"],
                            stdout=subprocess.PIPE)
    size, out, prev = h * w, [], None
    while True:
        buf = proc.stdout.read(size * chunk)
        n = len(buf) // size
        if n == 0:
            break
        a = np.frombuffer(buf[:n * size], np.uint8).reshape(n, h, w).astype(np.float32)
        if prev is not None:
            a = np.concatenate([prev[None], a])
        out.append(np.abs(np.diff(a, axis=0)).mean(axis=(1, 2)))
        prev = a[-1]
    proc.wait()
    return np.concatenate(out) if out else np.zeros(0)


JUMP_TH = 2.0     # 內容區逐格平均亮度差；平滑的淡入淡出、換場交叉溶接都遠低於此


def jumps(mp4: Path, fps: float = 30.0, y0: int = 120, h: int = 780) -> list[dict]:
    """F11 畫面突跳：內容區（不含上方章節標籤與下方字幕帶）在「前後都平穩、只有這一格」大幅改變。
    2026-10-04 使用者回報物件「突然跳一下」；實測原因是焦點亮暗瞬間切換、footer 出現時整塊內容往上跳。
    正常的出場（彈簧上浮 0.45 秒）、漸變（0.4 秒）、換場（0.4 秒交叉溶接）都是好幾格逐漸變化，不會被算進來。"""
    d = _frame_diffs(["-vf", f"crop=1920:{h}:0:{y0},scale=480:{h // 4},format=gray"], h // 4, 480, mp4)
    out = []
    for i in range(1, len(d) - 1):
        if d[i] > JUMP_TH and d[i - 1] < d[i] / 3 and d[i + 1] < d[i] / 3:
            out.append({"sec": round((i + 1) / fps, 2), "size": round(float(d[i]), 2)})
    return out


def still_analysis(mp4: Path, fps: int = 4, th: float = 0.6):
    """4fps、480x270 逐格差分（與 verify_motion.py 同一套），量最長連續靜止"""
    d = _frame_diffs(["-vf", f"fps={fps},scale=480:270,format=gray"], 270, 480, mp4)
    run = best = best_at = 0
    for i, x in enumerate(d):
        run = run + 1 if x < th else 0
        if run > best:
            best, best_at = run, i - run + 1
    return {"max_still": best / fps, "max_still_at": best_at / fps, "static_ratio": float((d < th).mean())}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mp4")
    ap.add_argument("--out")
    ap.add_argument("--band-y", type=int, default=930)
    ap.add_argument("--band-h", type=int, default=90)
    ap.add_argument("--terms", default="")
    ap.add_argument("--text")
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--minutes", default="")
    ap.add_argument("--jump-skip", default="",
                    help="F11 不檢查的時間段（秒），例：0-14.6 = 封面＋委製方提供的片頭影片")
    ap.add_argument("--silence-ok", type=float, default=0.0,
                    help="長度不超過這個秒數的無聲段屬於設計（例如片尾測驗卡 6 秒倒數），列出但不算未通過")
    ap.add_argument("--jumps-by-design", action="store_true",
                    help="F11 突跳是範本的招牌設計（範本A 像素逐 2 格、範本C 硬切砸字）：照樣全部列出，但不算不通過；一定要人工看連續格確認")
    ap.add_argument("--spec", help="十二步流程建置出的 src/data/spec.json：量字幕＝旁白、字幕同步、Netflix 字幕規範")
    ap.add_argument("--layout", help="qa_layout.mjs 輸出的版面量測 json（qa_layout.json）")
    a = ap.parse_args()
    mp4 = Path(a.mp4)
    out = Path(a.out) if a.out else mp4.parent / f"{mp4.stem}_品檢"
    out.mkdir(parents=True, exist_ok=True)
    R: dict = {"file": str(mp4)}

    pr = json.loads(sh(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
                        "-of", "json", str(mp4)]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    au = next((s for s in pr["streams"] if s["codec_type"] == "audio"), {})
    dur = float(pr["format"]["duration"])
    fps = float(Fraction(v["r_frame_rate"]))          # ffprobe 回傳分數字串，如 "30/1"
    R["F5"] = {"size": f"{v['width']}x{v['height']}", "fps": round(fps, 3), "vcodec": v["codec_name"],
               "acodec": au.get("codec_name"), "ar": au.get("sample_rate"), "ch": au.get("channels")}
    R["F8"] = {"seconds": round(dur, 2), "minutes": round(dur / 60, 2)}
    if a.minutes:
        lo, hi = map(float, a.minutes.split(","))
        R["F8"]["ok"] = lo <= dur / 60 <= hi

    boxes = band_boxes(mp4, a.band_y, a.band_h)
    fl, jt = flicker_and_jitter(boxes, fps)
    R["F1"] = {"count": len(fl), "examples": fl[:10]}
    R["F2"] = {"count": len(jt), "examples": jt[:10]}

    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vf", "blackdetect=d=0.3:pix_th=0.08:pic_th=0.98",
            "-an", "-f", "null", "-"])
    R["F3"] = [[float(x), float(y)] for x, y in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", r.stderr)]

    jp = jumps(mp4, fps)
    skip = [tuple(map(float, r.split("-"))) for r in a.jump_skip.split(",") if r]
    skipped = [x for x in jp if any(lo <= x["sec"] <= hi for lo, hi in skip)]
    jp = [x for x in jp if x not in skipped]
    R["F11"] = {"count": len(jp), "examples": jp[:12], "skipped": len(skipped), "skip": a.jump_skip}
    mo = still_analysis(mp4)
    R["F4"] = {"max_still": mo["max_still"], "at": mo["max_still_at"], "static_ratio": round(mo["static_ratio"], 3)}

    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
    s = r.stderr[r.stderr.rfind("Summary:"):]
    g = lambda pat: float(m.group(1)) if (m := re.search(pat, s, re.S)) else None
    I, tp = g(r"I:\s+(-?[\d.]+) LUFS"), g(r"Peak:\s+(-?[\d.]+) dBFS")
    R["F6"] = {"I": I, "TP": tp, "ok": I is not None and abs(I - a.lufs) <= 1.0 and tp is not None and tp <= -1.0}
    r = sh(["ffmpeg", "-nostats", "-i", str(mp4), "-vn", "-af", "silencedetect=n=-45dB:d=1.5", "-f", "null", "-"])
    st = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    R["F7"] = [[round(x, 2), round(y, 2)] for x, y in zip(st, en + [dur] * (len(st) - len(en)))
               if x > 1.0 and y < dur - 1.0]

    if a.terms:
        from pron_check import compare_terms
        R["F9"] = compare_terms([t for t in a.terms.split(",") if t], out / "pron")
    if a.text:
        lst = HERE / "多音字清單.json"
        if not lst.exists():                       # 在課程產線裡，清單放在 00_規範
            lst = HERE.parent.parent / "00_規範" / "多音字清單.json"
        spec = json.loads(lst.read_text(encoding="utf-8"))["詞"]
        text = Path(a.text).read_text(encoding="utf-8")
        # 只掃旁白：跳過分鏡稿裡的畫面說明、標題、front matter
        skip = re.compile(r"^\s*(VISUAL:|NARRATION:|#|---|\w+:\s)")
        R["F10"] = [{"word": w, "pinyin": py, "line": ln.strip()} for ln in text.splitlines()
                    if ln.strip() and not skip.match(ln) for w, py in spec.items() if w in ln]

    from final_report import spec_checks, layout_summary, contact_sheet, render_html
    if a.spec:
        R["G"] = spec_checks(Path(a.spec))
    if a.layout:
        R["L"] = layout_summary(Path(a.layout))

    bad = []
    if R["F1"]["count"]: bad.append(f"F1 字幕閃爍 {R['F1']['count']} 處")
    if R["F2"]["count"]: bad.append(f"F2 字幕抖動 {R['F2']['count']} 處")
    if R["F3"]: bad.append(f"F3 黑畫面 {len(R['F3'])} 段")
    if R["F11"]["count"] and a.jumps_by_design:
        R["F11"]["by_design"] = True
    if R["F11"]["count"] and not a.jumps_by_design: bad.append(f"F11 畫面突跳 {R['F11']['count']} 處（{', '.join(str(x['sec']) + 's' for x in R['F11']['examples'][:5])}）")
    if R["F5"]["size"] != "1920x1080": bad.append(f"F5 解析度 {R['F5']['size']}")
    if not R["F6"]["ok"]: bad.append(f"F6 響度 {I} LUFS／峰值 {tp} dBTP（目標 {a.lufs}±1、≤−1）")
    designed = [x for x in R["F7"] if x[1] - x[0] <= a.silence_ok + 0.05]
    real = [x for x in R["F7"] if x not in designed]
    R["F7_designed"] = designed
    if real: bad.append(f"F7 中段無聲 {len(real)} 段（{', '.join(f'{x[0]:.0f}s' for x in real[:6])}）")
    if R["F8"].get("ok") is False: bad.append(f"F8 長度 {R['F8']['minutes']} 分")
    G = R.get("G")
    if G:
        if G["G1"]["end"]: bad.append(f"G1 字幕句尾標點 {G['G1']['end']} 頁")
        n2 = G["G2"]["over18"] + G["G2"]["fast"] + G["G2"]["short"] + G["G2"]["long"]
        if n2: bad.append(f"G2 字幕不符 Netflix 規範 {n2} 頁")
        if not G["G3"]["match"]: bad.append("G3 字幕與旁白原文不一致")
        if G["G4"]["count"]: bad.append(f"G4 字幕與旁白不同步 {G['G4']['count']} 頁")
        if G["G5"]["count"]: bad.append(f"G5 唸法文字殘留 {G['G5']['count']} 頁")
        if G["G6"]["count"]: bad.append(f"G6 斷句不佳 {G['G6']['count']} 頁")
    if R.get("L") and R["L"]["issues"]:
        bad.append(f"L 版面問題 {R['L']['issues']} 個（{'、'.join(f'{k} {v}' for k, v in R['L']['kinds'].items())}）")
    md = [f"# 最終品檢：{mp4.name}", "", f"- 長度 {R['F8']['minutes']} 分、{R['F5']['size']} {R['F5']['fps']}fps、"
          f"響度 {I} LUFS、峰值 {tp} dBTP、最長靜止 {R['F4']['max_still']}s", "",
          "## 結果", ""] + ([f"- ✗ {b}" for b in bad] or ["- ✓ 全部通過"])
    if designed:
        md += [f"- ℹ 設計上的無聲 {len(designed)} 段（≤{a.silence_ok:g} 秒）："
               + "、".join(f"{x[0]:.0f}～{x[1]:.0f}s" for x in designed)]
    if R.get("F9"):
        md += ["", "## F9 唸法（時長比對）", ""] + [f"- `{t['term']}`：{t['verdict']}" for t in R["F9"]]
    if R.get("F10"):
        md += ["", f"## F10 多音詞（{len(R['F10'])} 處，需試聽）", ""] + \
              [f"- {x['word']}（{x['pinyin']}）：{x['line'][:40]}" for x in R["F10"][:40]]
    if G:
        md += ["", "## 字幕（spec.json）", "",
               f"- 句尾標點 {G['G1']['end']} 頁、句中標點 {G['G1']['inner']} 頁",
               f"- Netflix：>18 字 {G['G2']['over18']}、>9 字/秒 {G['G2']['fast']}、<5/6 秒 {G['G2']['short']}、>7 秒 {G['G2']['long']}",
               f"- 字幕＝旁白原文：{'是' if G['G3']['match'] else '否'}；不同步 {str(G['G4']['count']) + ' 頁' if G['G4'].get('measured') else '無法量（spec.json 沒有旁白時間）'}；唸法殘留 {G['G5']['count']}；斷句不佳 {G['G6']['count']}"]
    if R.get("L"):
        md += ["", "## 版面", "", f"- {R['L']['frames']} 格量測，{R['L']['issues']} 個問題"]
    sheet = out / "sheet.jpg"
    contact_sheet(mp4, dur, sheet)
    R["result"] = "通過" if not bad else bad
    (out / "final_qa.json").write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding="utf-8")
    html_path = render_html(R, bad, out, mp4, sheet)
    md += ["", f"HTML 報告：{html_path.name}"]
    (out / "final_qa.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md))
    return 0 if not bad else 1


if __name__ == "__main__":
    raise SystemExit(main())
