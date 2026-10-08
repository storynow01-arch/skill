"""E1 閃爍安全（2026-10-08）：依 WCAG 2.3.1「三次閃光」——任何 1 秒內，大面積閃光不得超過 3 次（避免光敏性癲癇）。

    python flash_check.py <影片>.mp4 [--out qa/品檢紀錄]

做法（WCAG 2.x 的一般閃光與紅色閃光門檻）：
  影片縮成 64×36 逐格讀；每個「大面積」視窗（約畫面 11%：WCAG 以 1024×768 螢幕上 341×256 像素為 10° 視野的 25%）
  一般閃光：視窗平均相對亮度「一升一降」各變化 ≥0.10，且較暗那一端 <0.80，算一次閃光（兩次反向變化）
  紅色閃光：飽和紅（R/(R+G+B) ≥ 0.8）的 (R−G−B)×320 一升一降各變化 ≥20
  任何連續 1 秒內反向變化超過 6 次（＝閃光超過 3 次）→ E1.閃爍（擋）
"""
import argparse, os, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

W, H = 64, 36
WIN_W, WIN_H, STEP_W, STEP_H = 21, 12, 7, 6     # 21×12＝252 格 ≈ 畫面 11%


def fps_of(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate',
                        '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    n, d = (r.strip(',').split(',')[0].split('/') + ['1'])[:2]
    return float(n) / float(d or 1)


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo',
                          '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        b = p.stdout.read(size)
        if len(b) < size:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32) / 255
    p.wait()


def window_means(img):
    """所有大面積視窗的平均值（積分影像）"""
    ii = np.pad(img.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    out = []
    for y in range(0, H - WIN_H + 1, STEP_H):
        for x in range(0, W - WIN_W + 1, STEP_W):
            out.append(ii[y + WIN_H, x + WIN_W] - ii[y, x + WIN_W] - ii[y + WIN_H, x] + ii[y, x])
    return np.array(out) / (WIN_W * WIN_H)


def transitions(series, th, dark_limit=None):
    """反向變化發生的格數：從最近的高點下降 ≥th、或從最近的低點上升 ≥th 才算一次，之後換方向
    （dark_limit：較暗那一端要 < 這個值才算）。高點與低點分開追蹤（2026-10-08 自我測試抓到：合用一個變數會互相覆蓋，永遠偵測不到）"""
    out, hi, lo, direction = [], series[0], series[0], 0
    for i, v in enumerate(series[1:], 1):
        if direction >= 0: hi = max(hi, v)
        if direction <= 0: lo = min(lo, v)
        if direction >= 0 and hi - v >= th and (dark_limit is None or v < dark_limit):
            out.append(i); direction, lo = -1, v
        elif direction <= 0 and v - lo >= th and (dark_limit is None or lo < dark_limit):
            out.append(i); direction, hi = 1, v
    return out


def worst_second(times, fps):
    """任何連續 1 秒內最多幾次反向變化，回傳 (次數, 開始格)"""
    best, at, j = 0, 0, 0
    for i in range(len(times)):
        while times[i] - times[j] >= fps:
            j += 1
        if i - j + 1 > best:
            best, at = i - j + 1, times[j]
    return best, at


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mp4'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('E1 閃爍安全', a.out)
    fps = fps_of(a.mp4)
    lum, red = [], []
    for f in frames(a.mp4):
        lin = np.where(f <= 0.03928, f / 12.92, ((f + 0.055) / 1.055) ** 2.4)
        lum.append(window_means(0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]))
        s = f.sum(2) + 1e-6
        sat = np.where(f[..., 0] / s >= 0.8, np.maximum(0, f[..., 0] - f[..., 1] - f[..., 2]) * 320, 0)
        red.append(window_means(sat))
    lum, red = np.array(lum), np.array(red)
    worst = {'一般閃光': (0, 0), '紅色閃光': (0, 0)}
    for k in range(lum.shape[1]):
        for kind, series, th, dark in (('一般閃光', lum[:, k], 0.10, 0.80), ('紅色閃光', red[:, k], 20.0, None)):
            n, at = worst_second(transitions(series, th, dark), fps)
            if n > worst[kind][0]:
                worst[kind] = (n, at)
    for kind, (n, at) in worst.items():
        msg = f'{at / fps:.1f}s 起 1 秒內 {n} 次反向變化（{n // 2} 次閃光，上限 3 次）'
        if n > 6:
            rec.problem('E1.閃爍', kind, msg)
        else:
            rec.note(f'{kind}：最多 {msg}')
    rec.note(f'{len(lum)} 格、{lum.shape[1]} 個大面積視窗')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
