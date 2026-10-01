"""海青工商資訊科 宣傳片配樂 — 純 numpy 合成的 Tech House / Cinematic Hybrid。

128 BPM，32 小節 = 60.0 秒。段落與畫面分鏡對齊（以小節為單位）：
  0-3   Intro      濾波 pad + hats + 上升音效
  4-5   Title Drop 全鼓組 + 衝擊
  6-13  Ch1 AI & Software   groove + arp
  14-21 Ch2 Champions       加 lead stab，更滿
  22-28 Ch3 Future          最高能量
  29-31 Outro      大衝擊 → pad 收尾
"""
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
import wave, os

SR = 48000
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 32
DUR = BAR * BARS  # 60.0
N = int(SR * DUR) + SR  # 多 1 秒尾巴，最後裁切
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)


def t_of(bar, beat=0.0):
    return bar * BAR + beat * BEAT


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414
    R[i:i + len(sig)] += sig * gain * r * 1.414


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in ([-detune, 0, detune] if detune else [0]):
        ph = (t * freq * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / (3 if detune else 1)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- 樂器 ----------
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.16)
    click = hp(rng.standard_normal(n), 3000) * env_exp(n, 0.004) * 0.5
    return np.tanh((body + click) * 1.8) * 0.9


def clap():
    n = int(0.35 * SR)
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022, 0.034]):
        i = int(off * SR)
        e[i:] += env_exp(n - i, 0.012 if k < 3 else 0.12)
    return noise * e * 0.55


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    x = hp(rng.standard_normal(n), 7500, 4)
    return x * env_exp(n, 0.06 if open_ else 0.012) * (0.32 if open_ else 0.22)


def bass_note(m, length):
    n = int(length * SR); t = np.arange(n) / SR
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * saw(f, n)
    x = lp(x, 380) * env_exp(n, 0.18)
    a = np.minimum(1, np.arange(n) / (0.004 * SR))
    return np.tanh(x * a * 2.2) * 0.55


def pad_chord(ms, length, cutoff):
    n = int(length * SR)
    x = sum(saw(midi(m), n, detune=0.006) for m in ms) / len(ms)
    x = lp(x, cutoff)
    a = np.minimum(1, np.arange(n) / (0.35 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
    return x * a * 0.28


def pluck(m, length=0.22, bright=4200):
    n = int(length * SR)
    x = saw(midi(m), n, detune=0.004) + 0.4 * np.sign(np.sin(2 * np.pi * midi(m + 12) * np.arange(n) / SR))
    x = lp(x, bright) * env_exp(n, 0.07)
    return x * 0.22


def stab(ms, length=0.3):
    n = int(length * SR)
    x = sum(saw(midi(m), n, detune=0.01) for m in ms) / len(ms)
    x = lp(x, 3000) * env_exp(n, 0.1)
    return np.tanh(x * 2) * 0.3


def impact(length=2.5):
    n = int(length * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 6)) / SR) * env_exp(n, 0.8)
    crack = hp(rng.standard_normal(n), 1500) * env_exp(n, 0.05)
    tail = lp(rng.standard_normal(n), 900) * env_exp(n, 0.9) * 0.3
    return np.tanh((boom * 1.4 + crack * 0.8 + tail)) * 0.85


def riser(length):
    n = int(length * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # 逐段提高截止頻率模擬掃頻
    out = np.zeros(n); seg = int(0.05 * SR)
    for i in range(0, n, seg):
        fc = 300 + (t[min(i, n - 1)] / length) ** 2 * 9000
        out[i:i + seg] = bp(noise[i:i + seg], fc * 0.6, fc * 1.3 + 50, 1)
    f = 200 + (t / length) ** 2 * 1800
    tone = saw(1, n) * 0  # placeholder to keep shape
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (out * 1.2 + tone) * (t / length) ** 1.6 * 0.5


def whoosh(length=0.6):
    n = int(length * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 600, 6000)
    e = np.sin(np.pi * t / length) ** 2
    return x * e * 0.35


def blip(m, length=0.07):
    n = int(length * SR); t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * midi(m) * t)) * env_exp(n, 0.02) * 0.12


def glitch(length=0.25):
    n = int(length * SR); out = np.zeros(n); seg = int(0.018 * SR)
    for i in range(0, n, seg):
        if rng.random() < 0.6:
            f = rng.choice([midi(84), midi(91), midi(96), 2400, 3200])
            tt = np.arange(min(seg, n - i)) / SR
            out[i:i + len(tt)] = np.sign(np.sin(2 * np.pi * f * tt)) * 0.1
    return out * env_exp(n, 0.12)


# ---------- 編曲 ----------
# A 小調 i-VI-III-VII：Am F C G（每 2 小節換）
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [33, 29, 36, 31]


def chord_at(bar):
    return (bar // 2) % 4


K, C, CH, OH = kick(), clap(), hat(), hat(True)

for bar in range(BARS):
    ci = chord_at(bar)
    intro = bar < 4
    outro = bar >= 29
    full = 4 <= bar < 29

    # Pad：全曲，intro 時濾得很暗並逐步打開
    if bar % 2 == 0:
        cutoff = 600 + bar * 250 if intro else (1800 if not outro else 1200)
        add(pad_chord(CHORDS[ci], BAR * 2 + 0.3, cutoff), t_of(bar), 0.9 if not outro else 1.1)

    # Kick 四拍
    if full or (outro and bar < 30):
        for b in range(4):
            add(K, t_of(bar, b), 1.0)
    elif bar == 2 or bar == 3:  # intro 後段半拍 kick 帶進
        for b in range(0, 4, 2):
            add(K, t_of(bar, b), 0.55)

    # Hats
    if bar >= 1 and not (outro and bar >= 30):
        for b in range(4):
            add(OH if full else CH, t_of(bar, b + 0.5), 0.9 if full else 0.6, pan=0.25)
        if full:
            for s in range(16):
                if s % 2 == 1:
                    add(CH, t_of(bar, s * 0.25), 0.45 + 0.2 * (s % 4 == 3), pan=-0.3)

    # Clap 2 & 4
    if full:
        for b in (1, 3):
            add(C, t_of(bar, b), 0.9, pan=0.05)

    # Bass：tech house 反拍 + 切分
    if full:
        r = ROOTS[ci]
        for b, off in [(0.5, 0), (1.5, 0), (2.5, 0), (3.25, 12), (3.5, 0)]:
            add(bass_note(r + off, BEAT * 0.45), t_of(bar, b), 1.0)

    # Arp pluck：Ch1 起
    if 6 <= bar < 29:
        notes = CHORDS[ci] + [CHORDS[ci][0] + 12]
        bright = 2500 + (bar - 6) * 180
        for s in range(16):
            m = notes[(s * 3) % 4] + 12
            add(pluck(m, 0.2, min(bright, 7000)), t_of(bar, s * 0.25), 0.8 if s % 4 else 1.0,
                pan=0.4 if s % 2 else -0.4)

    # Lead stab：Ch2 起每小節兩次
    if 14 <= bar < 29:
        st = [m + 12 for m in CHORDS[ci]]
        add(stab(st), t_of(bar, 0), 0.9)
        add(stab(st, 0.2), t_of(bar, 2.75), 0.7)
        if bar >= 22:
            add(stab([m + 24 for m in CHORDS[ci]], 0.15), t_of(bar, 1.5), 0.5, pan=0.3)

# ---------- 音效設計（與畫面事件對齊） ----------
# 上升音效到 drop
add(riser(BAR * 2), t_of(2), 1.0)
add(riser(BAR), t_of(13), 0.8)
add(riser(BAR), t_of(21), 0.9)
add(riser(BAR), t_of(28), 1.0)
# 衝擊：Title / Ch2 / Ch3 / Outro
for b, g in [(4, 1.0), (14, 0.8), (22, 0.85), (29, 1.0)]:
    add(impact(), t_of(b), g)
# 子分鏡轉場 whoosh（Ch1 每 2 小節、Ch2 / Ch3 事件）
for b in [8, 10, 12, 16, 18, 20, 24, 26]:
    add(whoosh(), t_of(b) - 0.45, 0.9)
# Intro 開機打字聲
for i in range(24):
    add(blip(96 + (i * 7) % 12, 0.03), 0.5 + i * 0.09, 0.8, pan=rng.uniform(-0.5, 0.5))
# 數字計數器 blips：Ch2 (10 / 12)、Ch3 (50% / 26)
for start, cnt in [(t_of(14, 0.5), 14), (t_of(16, 0.5), 14), (t_of(22, 0.5), 18), (t_of(24, 0.5), 14)]:
    for i in range(cnt):
        add(blip(84 + i % 12, 0.04), start + i * 0.075, 0.7, pan=0.2)
# Glitch 點綴
for tt in [t_of(4) - 0.2, t_of(6), t_of(14) - 0.25, t_of(20), t_of(22) - 0.25]:
    add(glitch(), tt, 1.0, pan=-0.2)

# ---------- 混音 ----------
mix = np.stack([L, R])
# 簡易空間：stereo 交叉延遲（3/16 拍）
d = int(BEAT * 0.75 * SR)
wet = np.zeros_like(mix)
wet[0, d:] = mix[1, :-d] * 0.18
wet[1, d:] = mix[0, :-d] * 0.18
mix = mix + lp(wet, 4000)
# 總線：高通 + 軟削波 + 正規化
mix = hp(mix, 25)
mix = np.tanh(mix * 0.9)
mix = mix[:, : int(DUR * SR)]
# 淡出最後 2.5 秒
fade = int(2.5 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
mix = mix / np.max(np.abs(mix)) * 0.93

out = os.path.join(os.path.dirname(__file__), 'soundtrack.wav')
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out, f'{DUR:.2f}s')
