"""D2 色盲友善（2026-10-08）：同一格畫面裡用來區分意思的字色（例：卡諾圖的 1 紅、X 藍、保留綠），模擬紅綠色盲後還分得出來嗎？

    python colorblind_check.py [qa_layout.json] [--out qa/品檢紀錄]

讀版面探針收集的各格字色（QaProbe 的 colors）。灰黑白這類沒有彩度的顏色不算（靠深淺分，色盲看得到）。
模擬：Machado、Oliveira、Fernandes（2009）嚴重度 1.0 的紅色盲（protanopia）與綠色盲（deuteranopia）矩陣，在線性 RGB 計算。
兩色原本色差 ΔE ≥ 20（明顯不同），模擬後 ΔE < 12（幾乎分不出）→ D2.色盲（提醒後擋）。
建議改法：除了顏色，再加形狀或文字（例：保留加 ✓、淘汰加 ✗），或把其中一色換成藍／橘這類色盲分得出的組合。
"""
import argparse, itertools, json, os, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SIM = {
    '紅色盲': np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]),
    '綠色盲': np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]),
}


def lin(c):
    c = np.asarray(c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lab(l):
    """線性 RGB → CIE Lab（D65）"""
    xyz = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]) @ np.clip(l, 0, 1)
    xyz = xyz / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.array([116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])])


def chroma(rgb):
    L, a, b = lab(lin(rgb))
    return (a * a + b * b) ** 0.5


def de(c1, c2, m=None):
    l1, l2 = lin(c1), lin(c2)
    if m is not None:
        l1, l2 = m @ l1, m @ l2
    return float(np.linalg.norm(lab(l1) - lab(l2)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('layout', nargs='?', default='qa_layout.json'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('D2 色盲友善', a.out)
    seen = {}
    frames = json.load(open(a.layout, encoding='utf-8')) if os.path.exists(a.layout) else []
    for fr in frames:
        cols = {tuple(map(int, k.split(','))): v for k, v in (fr.get('colors') or {}).items()}
        cols = {c: t for c, t in cols.items() if chroma(c) >= 20}          # 有彩度的才算「用顏色區分」
        for (c1, t1), (c2, t2) in itertools.combinations(sorted(cols.items()), 2):
            if de(c1, c2) < 20:
                continue
            for kind, m in SIM.items():
                d = de(c1, c2, m)
                key = (c1, c2, kind)
                if d < 12 and key not in seen:
                    seen[key] = fr.get('frame')
                    rec.problem('D2.色盲', f'第 {fr.get("frame")} 格', f'{kind}看「{t1}」rgb{c1} 和「{t2}」rgb{c2} 幾乎一樣（ΔE {d:.0f}，原本 {de(c1, c2):.0f}）')
    rec.note(f'{len(frames)} 格量測' + ('' if frames else '（沒有 qa_layout.json：先跑版面量測）'))
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
