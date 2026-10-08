"""E2 音效不蓋旁白（2026-10-08）：旁白正在講的時候，音效（描線、啵、叮、咻）要比旁白小 6 dB 以上。

    python sfx_check.py --sfx <只有音效的音軌>.wav --voice public/voice.wav [--lead 秒] [--out qa/品檢紀錄]

只有音效的音軌：Remotion 只渲染聲音、旁白與配樂關掉——
    npx remotion render src/index.ts Template<代號> qa/_sfx_only.wav --codec=wav --props=<spec 把 voice、music 設成 null>
（make_video.py --sfx-check 會自動做；約多花一次渲染的 1/3 時間，所以預設不跑）
每 50 毫秒比一次：音效的音量 vs 同一時間旁白前後 0.4 秒的說話音量；旁白沒在講的時候不算（音效本來就該聽得到）。
"""
import argparse, os, sys, wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SR = 48000
MARGIN = 6.0       # 音效至少比旁白小 6 dB


def load(path):
    with wave.open(path) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, ch).mean(1) if ch > 1 else x
    if sr != SR:
        x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)
    return x


def rms_db(x, win):
    n = len(x) // win
    return 20 * np.log10(np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--sfx', required=True); ap.add_argument('--voice', required=True)
    ap.add_argument('--lead', type=float, default=0.0); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('E2 音效不蓋旁白', a.out)
    sfx, voice = load(a.sfx), load(a.voice)
    if a.lead:                                     # 成片前面有封面片頭：音效音軌已含片頭，旁白往後對齊
        voice = np.concatenate([np.zeros(int(a.lead * SR), np.float32), voice])
    win = SR // 20
    s, v = rms_db(sfx, win), rms_db(voice, win)
    n = min(len(s), len(v))
    s, v = s[:n], v[:n]
    k = 8                                          # 前後 0.4 秒的說話音量（取最大，避免字與字之間的空隙）
    vs = np.array([v[max(0, i - k): i + k + 1].max() for i in range(n)])
    talking = vs > -40
    bad = talking & (s > -50) & (s > vs - MARGIN)
    spans, i = [], 0
    while i < n:
        if bad[i]:
            j = i
            while j + 1 < n and bad[j + 1 : j + 4].any():
                j += 1
            spans.append((i, j))
            i = j + 1
        else:
            i += 1
    for i, j in spans:
        worst = int(np.argmax(s[i: j + 1] - vs[i: j + 1])) + i
        rec.problem('E2.音效', f'{i / 20:.1f}～{(j + 1) / 20:.1f}s',
                    f'音效 {s[worst]:.0f} dB、旁白 {vs[worst]:.0f} dB（只差 {vs[worst] - s[worst]:.0f} dB，至少要 {MARGIN:g}）')
    if talking.any():
        gap = np.median((vs - s)[talking & (s > -50)]) if (talking & (s > -50)).any() else None
        rec.note(f'旁白講話時有音效的段落：音效比旁白小 {gap:.0f} dB（中位數）' if gap is not None else '旁白講話時沒有音效')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
