"""純 numpy 合成配樂 — 10 種曲風，對應 styles.json 的 music.genre。

用法：
  python make_music.py --style cyber-neon --duration 60 --out public/music.wav
  python make_music.py --genre lofi --bpm 88 --key F --duration 62.4 --impacts 0 12.5 --whooshes 30.1 --out music.wav
  python make_music.py --style blueprint --duration 60 --bed      # 旁白底樂：鼓組收斂、無主旋律

參數：
  --impacts   衝擊音效時間（秒），同時把該處設為「段落起點」（前面自動加 riser）
  --whooshes  轉場 whoosh 時間
  --blips     數字計數 blip 起點（每個起點連打 14 下）
  --bed       教學模式：整體更輕，保留律動，讓旁白站前面
"""
import argparse, json, os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = os.path.join(HERE, '..', 'template', 'src', 'styles.json')
rng = np.random.default_rng(11)

NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


# ───────────────────────── DSP 基本件 ─────────────────────────
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def ex(n, tau): return np.exp(-np.arange(n) / (max(tau, 1e-4) * SR))
def lp(x, fc, o=2): return sosfilt(butter(o, min(fc, SR / 2 - 200) / (SR / 2), 'low', output='sos'), x)
def hp(x, fc, o=2): return sosfilt(butter(o, fc / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), min(hi, SR / 2 - 200) / (SR / 2)], 'band', output='sos'), x)
def noise(n): return rng.standard_normal(n)
def tt(n): return np.arange(n) / SR


def saw(f, n, det=0.0, voices=3):
    t = tt(n); out = np.zeros(n)
    ds = np.linspace(-det, det, voices) if det else [0]
    for d in ds:
        out += 2 * ((t * f * (1 + d) + rng.random()) % 1) - 1
    return out / len(ds)


def sq(f, n, duty=0.5): return np.where((tt(n) * f) % 1 < duty, 1.0, -1.0)
def tri(f, n): return 2 * np.abs(2 * ((tt(n) * f) % 1) - 1) - 1
def sine(f, n): return np.sin(2 * np.pi * f * tt(n))


def adsr(n, a=0.005, r=0.05):
    e = np.ones(n); ai = min(n, int(a * SR)); ri = min(n, int(r * SR))
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e


# ───────────────────────── 樂器 ─────────────────────────
def kick(punch=1.0, dec=0.16, f0=48):
    n = int(0.45 * SR); t = tt(n)
    f = f0 + 110 * punch * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(n, dec)
    click = hp(noise(n), 3000) * ex(n, 0.004) * 0.4 * punch
    return np.tanh((body + click) * 1.8) * 0.9


def snare(tone=180, dec=0.12, bright=5000):
    n = int(0.4 * SR)
    body = sine(tone, n) * ex(n, 0.05) * 0.5
    nz = bp(noise(n), 1200, bright) * ex(n, dec)
    return np.tanh((body + nz) * 1.4) * 0.55


def clap():
    n = int(0.35 * SR); nz = bp(noise(n), 900, 5000); e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022, 0.034]):
        i = int(off * SR); e[i:] += ex(n - i, 0.012 if k < 3 else 0.12)
    return nz * e * 0.5


def hat(open_=False, amp=1.0):
    n = int((0.22 if open_ else 0.05) * SR)
    return hp(noise(n), 7500, 4) * ex(n, 0.06 if open_ else 0.012) * (0.3 if open_ else 0.2) * amp


def shaker():
    n = int(0.09 * SR); e = np.sin(np.pi * np.arange(n) / n) ** 2
    return hp(noise(n), 5000) * e * 0.12


def tom(f=90, dec=0.5):
    n = int(1.2 * SR); t = tt(n)
    fr = f * (1 + 0.6 * np.exp(-t * 18))
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(n, dec)
    skin = lp(noise(n), 700) * ex(n, 0.06) * 0.6
    return np.tanh((body + skin) * 1.6) * 0.8


def chip_noise(dec=0.05, hi=False):
    n = int(0.2 * SR); x = np.repeat(np.sign(noise(n // 8 + 1)), 8)[:n]
    if hi: x = hp(x, 5000)
    return x * ex(n, dec) * 0.25


def bass(m, dur, kind='sub'):
    n = int(dur * SR); f = midi(m)
    if kind == 'sub':
        x = np.tanh((sine(f, n) + 0.4 * saw(f, n)) * 2)
        x = lp(x, 400)
    elif kind == 'reese':
        x = lp(saw(f, n, 0.012, 4), 700)
    elif kind == 'saw':
        x = lp(saw(f, n, 0.004), 1400) * ex(n, 0.25)
    elif kind == 'tri':
        x = tri(f, n)
    else:
        x = sine(f, n)
    return x * adsr(n, 0.004, 0.03) * 0.5


def pad(ms, dur, cutoff=1800, det=0.006, atk=0.35):
    n = int(dur * SR)
    x = sum(saw(midi(m), n, det) for m in ms) / len(ms)
    return lp(x, cutoff) * adsr(n, atk, 0.4) * 0.25


def pluck(m, dur=0.22, bright=4200, dec=0.07):
    n = int(dur * SR)
    x = saw(midi(m), n, 0.004) + 0.3 * sq(midi(m + 12), n)
    return lp(x, bright) * ex(n, dec) * 0.2


def epiano(ms, dur):
    n = int(dur * SR); t = tt(n); x = np.zeros(n)
    for m in ms:
        f = midi(m)
        x += (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * ex(n, 0.3)) * ex(n, 1.2)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return x / len(ms) * trem * adsr(n, 0.01, 0.2) * 0.4


def piano(m, dur, vel=1.0):
    n = int(dur * SR); t = tt(n); f = midi(m); x = np.zeros(n)
    for h, a, d in [(1, 1, 1.5), (2, 0.45, 0.8), (3, 0.25, 0.5), (4, 0.12, 0.3), (5, 0.06, 0.2)]:
        x += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * ex(n, d)
    x += hp(noise(n), 2000) * ex(n, 0.004) * 0.05
    return x * adsr(n, 0.002, 0.08) * 0.22 * vel


def guitar(m, dur=0.9):
    n = int(dur * SR); t = tt(n); f = midi(m); x = np.zeros(n)
    for h in range(1, 8):
        x += (1 / h) * np.sin(2 * np.pi * f * h * t) * ex(n, 0.9 / h ** 0.8)
    return x * adsr(n, 0.002, 0.05) * 0.16


def supersaw(ms, dur, pump_beat=None):
    n = int(dur * SR)
    x = sum(saw(midi(m), n, 0.018, 5) for m in ms) / len(ms)
    x = lp(x, 5200) * adsr(n, 0.01, 0.1)
    if pump_beat:
        ph = (tt(n) % pump_beat) / pump_beat
        x *= 0.25 + 0.75 * np.clip(ph * 3, 0, 1)
    return x * 0.24


def strings(ms, dur):
    n = int(dur * SR)
    x = sum(saw(midi(m), n, 0.008, 5) for m in ms) / len(ms)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt(n))
    return lp(x * vib, 2600) * adsr(n, 0.5, 0.6) * 0.3


def brass(ms, dur):
    n = int(dur * SR); t = tt(n)
    cut = 600 + 2800 * (1 - np.exp(-t * 8))
    x = sum(saw(midi(m), n, 0.005) for m in ms) / len(ms)
    y = np.zeros(n); seg = int(0.02 * SR)
    for i in range(0, n, seg):
        y[i:i + seg] = lp(x[i:i + seg], cut[i])
    return np.tanh(y * 1.5) * adsr(n, 0.04, 0.3) * 0.3


def impact(length=2.5, weight=1.0):
    n = int(length * SR); t = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 6)) / SR) * ex(n, 0.8 * weight)
    crack = hp(noise(n), 1500) * ex(n, 0.05)
    tail = lp(noise(n), 900) * ex(n, 0.9) * 0.3
    return np.tanh(boom * 1.4 + crack * 0.8 + tail) * 0.85


def riser(length):
    n = int(length * SR); t = tt(n); nz = noise(n); out = np.zeros(n); seg = int(0.05 * SR)
    for i in range(0, n, seg):
        fc = 300 + (t[min(i, n - 1)] / length) ** 2 * 9000
        out[i:i + seg] = bp(nz[i:i + seg], fc * 0.6, fc * 1.3 + 50, 1)
    tone = np.sin(2 * np.pi * np.cumsum(200 + (t / length) ** 2 * 1800) / SR) * 0.25
    return (out * 1.2 + tone) * (t / length) ** 1.6 * 0.45


def whoosh(length=0.6):
    n = int(length * SR)
    return bp(noise(n), 600, 6000) * np.sin(np.pi * tt(n) / length) ** 2 * 0.32


def blip(m, length=0.05):
    n = int(length * SR)
    return sq(midi(m), n) * ex(n, 0.02) * 0.1


# ───────────────────────── 和聲 ─────────────────────────
def progression(key):
    minor = key.endswith('m')
    root = NOTE[key.rstrip('m')] + 48  # C3 附近
    if minor:   # i - VI - III - VII
        degs = [(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')]
    else:       # I - V - vi - IV
        degs = [(0, 'M'), (7, 'M'), (9, 'm'), (5, 'M')]
    out = []
    for d, q in degs:
        r = root + d
        if r > 55: r -= 12
        out.append((r, [r + 12, r + 12 + (3 if q == 'm' else 4), r + 19]))
    return out


# ───────────────────────── 曲風編曲 ─────────────────────────
def arrange(genre, bpm, key, dur, bed, sections):
    beat = 60 / bpm; bar = beat * 4
    nbars = int(np.ceil(dur / bar)) + 1
    N = int((dur + 3) * SR)
    L = np.zeros(N); R = np.zeros(N)
    prog = progression(key)

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or i < 0: return
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    def energy(t):
        """0 = intro/outro（稀疏），1 = 主段。第一個段落點之前與最後 2 小節為 0。"""
        first = sections[0] if sections else min(dur * 0.12, 4 * bar)
        if t < first - 0.01: return 0
        if t > dur - 2 * bar: return 0
        return 1

    drum_g = 0.55 if bed else 1.0
    lead_on = not bed
    sw = {'lofi': 0.12, 'acoustic': 0.1}.get(genre, 0.0)   # swing（拍的比例）

    def T(b, beat_pos):
        """小節 b、拍位置 beat_pos 的秒數（含 swing：反拍 8 分音符延後）"""
        frac = beat_pos % 1
        s = sw * beat if abs(frac - 0.5) < 1e-6 else 0
        return b * bar + beat_pos * beat + s

    K = kick(); Kl = kick(0.6, 0.12); S = snare(); Sl = lp(snare(200, 0.1, 3500), 3000); CL = clap()
    CH = hat(); OH = hat(True)

    for b in range(nbars):
        t0 = b * bar
        if t0 > dur: break
        e = energy(t0 + 0.01)
        r, ch = prog[(b // 2) % 4] if genre not in ('chiptune', 'dnb') else prog[b % 4]
        last = t0 > dur - 2 * bar

        if genre == 'techhouse':
            if b % 2 == 0: add(pad(ch, bar * 2 + .3, 700 + 1100 * e), t0, .9)
            if e:
                for k in range(4): add(K, T(b, k), drum_g)
                for k in (1, 3): add(CL, T(b, k), .85 * drum_g)
                for k in range(4): add(OH, T(b, k + .5), .8 * drum_g, .25)
                for s in range(1, 16, 2): add(CH, T(b, s / 4), .45 * drum_g, -.3)
                for bp_, o in [(.5, 0), (1.5, 0), (2.5, 0), (3.25, 12), (3.5, 0)]: add(bass(r - 12 + o, beat * .45), T(b, bp_))
                if lead_on:
                    notes = ch + [ch[0] + 12]
                    for s in range(16): add(pluck(notes[(s * 3) % 4] + 12), T(b, s / 4), .7, .4 if s % 2 else -.4)
            elif not last:
                for k in range(4): add(CH, T(b, k + .5), .5)

        elif genre == 'minimal':
            if b % 2 == 0: add(pad(ch, bar * 2 + .3, 900 + 700 * e, 0.004, 0.8), t0, .8)
            if e:
                for k in range(4): add(Kl if bed else K, T(b, k), .9 * drum_g)
                for k in (1, 3): add(hp(Sl, 800), T(b, k), .35 * drum_g)
                for s in range(16): add(CH, T(b, s / 4), (.25 + .2 * (s % 4 == 2)) * drum_g, .3)
                for bp_ in (.5, 1.75, 2.5, 3.5): add(bass(r - 12, beat * .3), T(b, bp_), .9)
                if lead_on or b % 2 == 0:
                    for s in (0, 3, 6, 10, 13): add(pluck(ch[s % 3] + 12, .18, 2600, .05), T(b, s / 4), .6, .5 if s % 2 else -.5)
            elif not last:
                for s in (0, 3, 6, 10, 13): add(pluck(ch[s % 3] + 12, .18, 1800, .05), T(b, s / 4), .4)

        elif genre == 'lofi':
            add(epiano(ch + [ch[0] + 14], bar * 0.98), t0, .9)
            if e or not last:
                pat_k = [0, 2.5] if e else [0]
                for k in pat_k: add(lp(K, 2000), T(b, k), .8 * drum_g)
                if e:
                    for k in (1, 3): add(Sl, T(b, k), .6 * drum_g)
                    for k in range(8): add(lp(CH, 6000), T(b, k / 2), .5 * drum_g, .2)
                    add(bass(r - 12, beat * 1.8, 'sine'), T(b, 0), .9); add(bass(r - 12 + 7, beat * 1.5, 'sine'), T(b, 2.5), .7)
            if lead_on and e and b % 2 == 1:
                for k, o in enumerate([7, 5, 3, 0]): add(piano(ch[0] + 12 + o, .6, .7), T(b, k * .75 + .5), .7, .3)

        elif genre == 'synthwave':
            if b % 2 == 0: add(pad(ch, bar * 2 + .3, 1500 + 1200 * e, 0.01), t0, .8)
            if e:
                for k in range(4): add(K, T(b, k), drum_g)
                for k in (1, 3): add(snare(170, .25, 6000), T(b, k), .8 * drum_g)
                for k in range(8): add(CH, T(b, k / 2), .4 * drum_g)
                for k in range(8): add(bass(r - 12 + (12 if k % 2 else 0), beat * .45, 'saw'), T(b, k / 2), .9)
                if lead_on:
                    for s in range(8): add(pluck(ch[s % 3] + 24, .25, 5000, .1), T(b, s / 2), .45, .5 if s % 2 else -.5)
            elif not last:
                for k in range(8): add(bass(r - 12, beat * .45, 'saw'), T(b, k / 2), .5)

        elif genre == 'dnb':
            add(pad(ch, bar + .2, 1200, 0.01, 0.2), t0, .6)
            if e:
                for s in (0, 10): add(K, T(b, s / 4), drum_g)
                for s in (4, 12): add(snare(190, .14, 7000), T(b, s / 4), .9 * drum_g)
                for s in range(16): add(CH, T(b, s / 4), (.3 + .2 * (s % 2 == 0)) * drum_g, .3)
                if b % 2 == 0: add(bass(r - 12, bar * 2, 'reese'), t0, .8)
                if lead_on:
                    for s in (0, 3, 6, 8, 11, 14): add(pluck(ch[s % 3] + 24, .15, 6000, .05), T(b, s / 4), .4, .4)
            elif not last:
                for s in range(0, 16, 2): add(CH, T(b, s / 4), .4)

        elif genre == 'futurebass':
            if e:
                add(supersaw(ch + [ch[0] + 24], bar, beat), t0, .9)
                for s in (0, 6): add(K, T(b, s / 4), drum_g)
                add(clap(), T(b, 2), drum_g); add(snare(200, .15), T(b, 2), .5 * drum_g)
                for s in range(0, 16, 2): add(CH, T(b, s / 4), .35 * drum_g, .2)
                add(bass(r - 12, bar * .95, 'sub'), t0, .8)
                if lead_on:
                    for s in (0, 1.5, 3, 3.5): add(pluck(ch[int(s * 2) % 3] + 24, .2, 7000, .08), T(b, s), .5, -.3)
            else:
                add(supersaw(ch, bar, None) * .5, t0, .7)

        elif genre == 'pianopulse':
            for k in range(8): add(piano(ch[k % 3] + (12 if k % 4 == 3 else 0), .5, .7 + .3 * (k % 2 == 0)), T(b, k / 2), .9, (-.3, .3)[k % 2])
            add(piano(r - 12, bar, .9), t0, .9)
            if e:
                for k in (0, 2): add(lp(Kl, 1500), T(b, k), .8 * drum_g)
                for k in range(8): add(shaker(), T(b, k / 2 + .25), .8 * drum_g, .4)
                if b % 2 == 0: add(strings(ch, bar * 2), t0, .45)

        elif genre == 'acoustic':
            pat = [0, 2, 1, 2, 0, 2, 1, 2]
            notes = [r, ch[1] - 12 + 12, ch[2]]
            for k in range(8): add(guitar(notes[pat[k]] if k % 4 else r, 1.0), T(b, k / 2), .9, (-.25, .25)[k % 2])
            if e:
                for k in (0, 2.5): add(lp(Kl, 1200), T(b, k), .7 * drum_g)
                for k in (1, 3): add(lp(bp(noise(int(.25 * SR)), 600, 4000) * ex(int(.25 * SR), .09), 5000) * .4, T(b, k), .8 * drum_g)
                add(bass(r - 12, beat * 1.8, 'sine'), T(b, 0), .8); add(bass(r - 5, beat * 1.8, 'sine'), T(b, 2), .6)

        elif genre == 'chiptune':
            if e:
                for k in (0, 2): add(np.tanh(sine(55, int(.12 * SR)) * 3) * ex(int(.12 * SR), .05) * .6, T(b, k), drum_g)
                for k in (1, 3): add(chip_noise(.07), T(b, k), drum_g)
                for k in range(8): add(chip_noise(.015, True), T(b, k / 2), .6 * drum_g)
                for k in range(8): add(bass(r - 12 + (12 if k % 2 else 0), beat * .45, 'tri') * .9, T(b, k / 2))
            arp = ch + [ch[0] + 12]
            for s in range(16): add(sq(midi(arp[s % 4] + 12), int(beat / 4 * SR), .25) * ex(int(beat / 4 * SR), .08) * .07, T(b, s / 4), 1 if e else .6, .2)
            if lead_on and e:
                mel = [0, 2, 4, 7, 4, 2, 0, -1] if b % 2 == 0 else [4, 5, 7, 9, 7, 5, 4, 2]
                for k, o in enumerate(mel):
                    n_ = int(beat / 2 * SR); add(sq(midi(ch[0] + 12 + o), n_, .5) * adsr(n_, .002, .02) * .07, T(b, k / 2), 1, -.2)

        elif genre == 'marimba':
            # 木琴輕快：馬林巴琴琶音（正弦＋泛音快衰減）、沙鈴、輕邊擊、木質低音
            def mar(m, d=0.35):
                n = int(d * SR); t_ = tt(n); fr = midi(m)
                return (np.sin(2 * np.pi * fr * t_) + 0.35 * np.sin(2 * np.pi * 4 * fr * t_) * ex(n, .03)) * ex(n, .18) * .22
            pat = [0, 2, 1, 2, 0, 1, 2, 1]
            notes = [ch[0], ch[1], ch[2]]
            for k in range(8): add(mar(notes[pat[k]] + 12), T(b, k / 2), .9, (-.3, .3)[k % 2])
            if lead_on and e and b % 2 == 1:
                for k, o in enumerate([7, 9, 12, 9]): add(mar(ch[0] + 12 + o, .3), T(b, 2 + k * .5), .7)
            if e:
                for k in (0, 2): add(lp(Kl, 1400), T(b, k), .6 * drum_g)
                for k in (1, 3): add(hp(Sl, 1500) * .5, T(b, k), .5 * drum_g)
                for k in range(8): add(shaker(), T(b, k / 2 + .25), .7 * drum_g, .3)
                add(bass(r - 12, beat * .9, 'sine'), T(b, 0), .8); add(bass(r - 5, beat * .9, 'sine'), T(b, 2), .6)

        elif genre == 'comedy':
            # 喜劇：oom-pah 撥奏低音、烏克麗麗刷弦、鐘琴旋律
            def pizz(m, d=0.22):
                n = int(d * SR); return lp(saw(midi(m), n), 1800) * ex(n, .06) * .3
            def uke(ms):
                o = np.zeros(int(0.5 * SR))
                for j, m in enumerate(ms):
                    g_ = guitar(m, 0.45); i = int(j * 0.012 * SR); o[i:i + len(g_)] += g_[:len(o) - i]
                return o * 1.2
            for k in (0, 2): add(pizz(r - 12), T(b, k), 1)
            for k in (1, 3): add(uke([ch[0], ch[1], ch[2], ch[0] + 12]), T(b, k), .9, .2)
            if e:
                for k in (0, 2): add(lp(Kl, 1200), T(b, k), .5 * drum_g)
                for k in range(8): add(shaker(), T(b, k / 2 + .25), .5 * drum_g, -.3)
            if lead_on and e:
                for k, o in enumerate([0, 4, 7, 4, 9, 7, 4, 2] if b % 2 == 0 else [0, 2, 4, 5, 7, 5, 4, 0]):
                    n_ = int(beat / 2 * SR)
                    add((np.sin(2 * np.pi * midi(ch[0] + 24 + o) * tt(n_)) + 0.4 * np.sin(2 * np.pi * midi(ch[0] + 36 + o) * tt(n_))) * ex(n_, .12) * .08, T(b, k / 2), 1, .3)

        elif genre == 'phonk':
            # Phonk：808 長音滑降、Trap 滾奏 Hi-hat、牛鈴旋律、第 3 拍拍手（半拍感）
            if e:
                for s16 in (0, 7, 10):
                    n8 = int(beat * (1.6 if s16 == 0 else 0.7) * SR); tt8 = tt(n8)
                    f808 = midi(r - 12) * (1 + 0.6 * np.exp(-tt8 * 30)) * (1 - 0.06 * (s16 == 10) * tt8 / max(tt8[-1], 1e-3))
                    x808 = np.tanh(np.sin(2 * np.pi * np.cumsum(f808) / SR) * 3.0) * adsr(n8, 0.002, 0.08) * 0.55
                    add(x808, T(b, s16 / 4), 1.0)
                add(clap(), T(b, 2), drum_g); add(snare(220, .1, 8000), T(b, 2), .6 * drum_g)
                for s16 in range(16):
                    add(CH, T(b, s16 / 4), (.35 + .2 * (s16 % 2 == 0)) * drum_g, .25)
                if b % 2 == 1:   # 小節尾 32 分音符滾奏
                    for k in range(6): add(CH, T(b, 3.25 + k / 8), .4 * drum_g, -.25)
                if lead_on:
                    mel = [0, 3, 7, 3, 10, 7, 3, 0]
                    for k, o in enumerate(mel):
                        nb = int(beat / 2 * SR)
                        cow = (sq(midi(ch[0] + 12 + o), nb, .5) + sq(midi(ch[0] + 12 + o) * 1.48, nb, .5)) * ex(nb, .07) * .06
                        add(lp(cow, 3500), T(b, k / 2), 1, (-.3, .3)[k % 2])
            else:
                add(pad(ch, bar, 900, 0.01, 0.3), t0, .5)
                for k in range(4): add(CH, T(b, k + .5), .4)

        elif genre == 'cinematic':
            if b % 2 == 0: add(strings(ch + [r], bar * 2 + .4), t0, .9 if e else .6)
            if e:
                for s in (0, 3, 6, 8, 12, 14): add(tom(80 if s in (0, 8) else 120, .4), T(b, s / 4), (.9 if s in (0, 8) else .5) * drum_g, (-.3, .3)[s % 2])
                for s in range(16): add(lp(saw(midi(ch[s % 3]), int(beat / 4 * SR)), 1800) * ex(int(beat / 4 * SR), .05) * .12, T(b, s / 4), .9, (-.4, .4)[s % 2])
                add(bass(r - 12, bar * .95, 'sub'), t0, .7)
            else:
                add(bass(r - 12, bar, 'sine'), t0, .5)

    return L, R, add, beat, bar



# ───────────────────────── 母帶處理（混音升級） ─────────────────────────
def reverb(x, wet=0.16, room=0.82, damp=3800):
    """Schroeder 殘響：4 組並聯梳狀＋2 組串聯全通；送出前先高通，低頻不糊。"""
    from scipy.signal import lfilter
    send = hp(x, 300)
    out = np.zeros_like(send)
    for d_ms, g in [(29.7, room), (37.1, room * 0.98), (41.1, room * 0.96), (43.7, room * 0.94)]:
        d = int(d_ms / 1000 * SR); a = np.zeros(d + 1); a[0] = 1; a[d] = -g
        out += lfilter([1], a, send, axis=-1)
    for d_ms, g in [(5.0, 0.7), (1.7, 0.7)]:
        d = int(d_ms / 1000 * SR); b = np.zeros(d + 1); a = np.zeros(d + 1)
        b[0] = -g; b[d] = 1; a[0] = 1; a[d] = -g
        out = lfilter(b, a, out, axis=-1)
    return x + lp(out, damp) * wet / 4


def env_follow(x, att=0.005, rel=0.12):
    """包絡追蹤（RMS 近似），回傳 0~1 的振幅包絡"""
    from scipy.signal import lfilter
    r = np.abs(x)
    a_r = np.exp(-1 / (rel * SR))
    return lfilter([1 - a_r], [1, -a_r], r)


def compress(x, thresh=0.35, ratio=3.0, makeup=1.25):
    """匯流排壓縮：超過門檻的部分依比例壓下"""
    lvl = env_follow(np.max(np.abs(x), axis=0) if x.ndim == 2 else x, rel=0.15) + 1e-6
    gain = np.where(lvl > thresh, (thresh + (lvl - thresh) / ratio) / lvl, 1.0)
    return x * gain * makeup


def master_chain(mix):
    mix = reverb(mix)
    mix = compress(mix)
    return np.tanh(mix * 1.1) / np.tanh(1.1)   # 柔性限幅


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--style'); ap.add_argument('--genre'); ap.add_argument('--bpm', type=float); ap.add_argument('--key')
    ap.add_argument('--duration', type=float, required=True)
    ap.add_argument('--impacts', type=float, nargs='*', default=[])
    ap.add_argument('--whooshes', type=float, nargs='*', default=[])
    ap.add_argument('--blips', type=float, nargs='*', default=[])
    ap.add_argument('--bed', action='store_true')
    ap.add_argument('--no-master', action='store_true')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    m = {}
    if a.style:
        m = json.load(open(STYLES, encoding='utf-8'))[a.style]['music']
    genre = a.genre or m.get('genre', 'techhouse'); bpm = a.bpm or m.get('bpm', 120); key = a.key or m.get('key', 'Am')
    dur = a.duration
    L, R, add, beat, bar = arrange(genre, bpm, key, dur, a.bed, sorted(a.impacts))

    heavy = genre in ('techhouse', 'synthwave', 'dnb', 'futurebass', 'cinematic', 'minimal')
    sfx = 0.45 if a.bed else 1.0
    for t in a.impacts:
        if t > 0.5 and heavy: add(riser(min(bar, t)), t - min(bar, t), .9 * sfx)
        add(impact(2.5, 1.2 if genre == 'cinematic' else 1.0) * (1 if heavy else .5), t, sfx)
    for t in a.whooshes: add(whoosh(), t - 0.45, .9 * sfx)
    for t in a.blips:
        for i in range(14): add(blip(84 + i % 12), t + i * 0.075, .7 * sfx, .2)

    mix = np.stack([L, R])
    d = int(beat * 0.75 * SR)
    wet = np.zeros_like(mix); wet[0, d:] = mix[1, :-d] * .18; wet[1, d:] = mix[0, :-d] * .18
    mix = mix + lp(wet, 4000)
    if genre in ('lofi', 'acoustic'):
        mix = lp(mix, 6500)
        crackle = (rng.random(mix.shape[1]) > 0.9994) * rng.standard_normal(mix.shape[1]) * 0.25 + noise(mix.shape[1]) * 0.004
        mix += lp(crackle, 5000)
    mix = hp(mix, 28)
    mix = (np.tanh(mix * 0.9) if a.no_master else master_chain(mix))[:, :int(dur * SR)]
    fade = int(min(2.5, dur * 0.1) * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    fi = int(0.02 * SR); mix[:, :fi] *= np.linspace(0, 1, fi)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with wave.open(a.out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print(f'music → {a.out}  [{genre} {bpm}bpm {key}{" bed" if a.bed else ""}] {dur:.2f}s')


if __name__ == '__main__':
    main()
