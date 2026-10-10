"""範本廣E 配樂與音效：木吉他民謠 100 BPM（一拍 18 格），隨一天變化，段落由時間表的 sections 決定：
  morning 清晨單把吉他分解＋鳥叫 → ride 交通車刷扣、貝斯、沙鈴（引擎聲）→ school 拍手、鈴鼓、口哨旋律（鐘響）
  → pool 最歡快（落水在拍點上）→ dusk 傍晚分解和弦＋弦樂墊 → night 泛音＋音樂盒、蟲鳴 → 關燈「喀」→ 溫暖的 G 和弦收尾。
每段從自己的起點開始數小節（起點都在拍點上，速度不斷）。音效全部對準時間表事件：開門、引擎、煞車、車門、鐘、跳水、
落水、划水、冷氣嗶、筆刷、關燈、名稱浮出的叮。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad13.py（固定 60 秒）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BEAT = 0.6            # 100 BPM
BAR = BEAT * 4
PEAK_CUT = 5.5      # 撥弦起音比整體響度突出太多：瞬間峰值壓低幾 dB（音色不變，只壓最尖的那幾毫秒）


def peak_limit(x, thr, look=0.015, smooth=0.006):
    """前瞻峰值限幅：在峰值前後 look 秒內把增益平滑壓到 thr 以下（不削波、不改音色）"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    g = minimum_filter1d(g, size=2 * int(look * SR) + 1)
    g = uniform_filter1d(g, size=int(smooth * SR) + 1)
    return x * g


def render(tl, wav_path):
    rng = np.random.default_rng(1313)
    DUR = tl['frames'] / FPS
    N = int((DUR + 4) * SR)
    L = np.zeros(N); R = np.zeros(N)
    sec = lambda f: f / FPS
    LIM = [1e9]   # 目前段落的結束秒數：段落內的音符不排到下一段

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N or len(sig) == 0: return
        if i < 0: sig = sig[-i:]; i = 0
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    def addm(sig, t0, g=1.0, pan=0.0):
        if t0 < LIM[0] - 0.01: add(sig, t0, g, pan)

    # ───── 樂器 ─────
    def ks(m, dur=2.0, bright=0.5, decay=0.996, vel=1.0):
        """Karplus-Strong 撥弦"""
        f = M.midi(m); n = int(dur * SR)
        D = max(2, int(round(SR / f - 0.5)))
        exc = rng.standard_normal(D)
        exc = M.lp(exc, 1200 + 7000 * bright) if bright < 0.99 else exc
        x = np.zeros(n); x[:D] = exc
        a = np.zeros(D + 2); a[0] = 1; a[D] = -decay / 2; a[D + 1] = -decay / 2
        y = lfilter([1], a, x)
        y = y + 0.25 * M.lp(y, 900)
        y *= M.adsr(n, 0.001, 0.08)
        return y / (np.max(np.abs(y)) + 1e-9) * 0.22 * vel

    CH = {'G': [43, 47, 50, 55, 59, 67], 'C': [48, 52, 55, 60, 64], 'D': [50, 57, 62, 66],
          'Em': [40, 47, 52, 55, 59, 64], 'Am': [45, 52, 57, 60, 64], 'Cadd9': [48, 52, 55, 62, 64]}
    ROOT = {'G': 43, 'C': 48, 'D': 50, 'Em': 40, 'Am': 45, 'Cadd9': 48}
    PROG = {'morning': ['G', 'Cadd9', 'D', 'G', 'Em', 'C'], 'ride': ['G', 'D', 'Em', 'C', 'D'], 'school': ['G', 'D', 'Em', 'C'],
            'pool': ['G', 'D', 'C', 'D'], 'dusk': ['Em', 'C', 'G', 'D'], 'night': ['C', 'G', 'Am', 'D', 'D']}
    cache = {}

    def note(m, dur, bright):
        key = (m, round(dur, 2), round(bright, 2))
        if key not in cache: cache[key] = ks(m, dur, bright)
        return cache[key]

    def strum(chord, t, down=True, vel=1.0, spread=0.011, bright=0.55, dur=1.6, pan=-0.15):
        ns = CH[chord] if down else CH[chord][::-1][:4]
        for i, m in enumerate(ns):
            addm(note(m, dur, bright), t + i * spread, vel * (0.9 if down else 0.6), pan + (i - 2) * 0.04)

    def pick(chord, t0, vel=1.0, bright=0.45):
        ns = CH[chord]; b1 = ns[0]; b2 = ns[1] if len(ns) > 4 else ns[0] + 7
        top = ns[-3:]
        seq = [(b1, 1.0), (top[2], .6), (b2, .8), (top[1], .55), (b1, .9), (top[2], .6), (b2, .8), (top[0], .55)]
        for i, (m, v) in enumerate(seq):
            addm(note(m, 1.6, bright), t0 + i * BEAT / 2, 0.85 * v * vel, -0.25 if m < 52 else 0.2)

    def harmonic(m, dur=3.0):
        n = int(dur * SR); t = M.tt(n); f = M.midi(m)
        x = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t) * M.ex(n, 0.4)
        return x * M.ex(n, 1.3) * M.adsr(n, 0.003, 0.2) * 0.13

    def musicbox(m, dur=2.2):
        n = int(dur * SR); t = M.tt(n); f = M.midi(m)
        x = np.sin(2 * np.pi * f * t) * M.ex(n, 0.9) + 0.35 * np.sin(2 * np.pi * f * 3.01 * t) * M.ex(n, 0.25) \
            + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * M.ex(n, 0.08)
        return x * M.adsr(n, 0.001, 0.1) * 0.11

    def whistle(m, dur):
        n = int(dur * SR); t = M.tt(n); f = M.midi(m)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1)
        x = np.sin(2 * np.pi * np.cumsum(f * vib) / SR) + 0.05 * M.hp(M.noise(n), 3000)
        return x * M.adsr(n, 0.04, 0.12) * 0.07

    def ubass(m, dur):
        n = int(dur * SR); t = M.tt(n); f = M.midi(m)
        x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * M.ex(n, 0.15)
        return M.lp(x, 700) * M.ex(n, 0.5) * M.adsr(n, 0.004, 0.06) * 0.3

    def tamb():
        n = int(0.22 * SR)
        jing = M.bp(M.noise(n), 6000, 14000) * M.ex(n, 0.06)
        return (jing + M.bp(M.noise(n), 2000, 5000) * M.ex(n, 0.01) * 0.5) * 0.18

    def shaker():
        n = int(0.09 * SR); t = M.tt(n)
        return M.bp(M.noise(n), 4000, 11000) * np.sin(np.pi * t / 0.09) ** 2 * 0.08

    def clap(): return M.clap() * 0.55

    # ───── 音效 ─────
    def bird(t0, pan, kind=0):
        for j in range(rng.integers(2, 5)):
            n = int(0.09 * SR); t = M.tt(n)
            f0 = 3200 + 900 * kind + rng.uniform(-200, 200)
            sweep = f0 + 1600 * np.sin(np.pi * t / 0.09) * (1 if j % 2 == 0 else -0.5)
            x = np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.sin(np.pi * t / 0.09) ** 2
            x *= 1 + 0.5 * np.sin(2 * np.pi * 60 * t)
            add(x * 0.05, t0 + j * 0.12, 1.0, pan)

    def engine(t0, t1, profile):
        n = int((t1 - t0) * SR); t = M.tt(n) + t0
        rpm = np.array([profile(x)[0] for x in t[::480]]); vol = np.array([profile(x)[1] for x in t[::480]])
        rpm = np.interp(np.arange(n), np.arange(len(rpm)) * 480, rpm)
        vol = np.interp(np.arange(n), np.arange(len(vol)) * 480, vol)
        f = 32 + 38 * rpm
        ph = np.cumsum(f) / SR
        x = ((ph % 1) * 2 - 1) * 0.6 + 0.4 * np.sin(2 * np.pi * ph * 2)
        x = M.lp(x, 380) + M.lp(M.noise(n), 260) * 0.5
        x *= 1 + 0.25 * np.sin(2 * np.pi * ph * 0.5)
        return np.tanh(x * 1.4) * vol * 0.16

    def pssh(dur=0.7):
        n = int(dur * SR)
        return M.hp(M.noise(n), 2500) * M.ex(n, dur / 3) * M.adsr(n, 0.01, 0.1) * 0.12

    def bell_tone(m, dur=2.0):
        n = int(dur * SR); t = M.tt(n); f = M.midi(m); x = np.zeros(n)
        for r, a, d in [(1, 1, 1.6), (2.0, 0.5, 1.0), (2.76, 0.35, 0.6), (5.4, 0.2, 0.25), (0.5, 0.25, 1.8)]:
            x += a * np.sin(2 * np.pi * f * r * t) * M.ex(n, d)
        return x * M.adsr(n, 0.002, 0.2) * 0.1

    def splash():
        n = int(1.6 * SR); t = M.tt(n)
        body = M.lp(M.noise(n), 2200) * M.ex(n, 0.18)
        spray = M.bp(M.noise(n), 2500, 9000) * M.ex(n, 0.35) * 0.6
        thump = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 5) + 50) / SR) * M.ex(n, 0.12)
        return np.tanh((body + spray + thump * 0.8) * 1.2) * 0.42

    def bubble(t0, f0):
        n = int(0.07 * SR); t = M.tt(n)
        x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 3 * t / 0.07)) / SR) * M.ex(n, 0.025)
        add(x * 0.06, t0, 1.0, rng.uniform(-0.4, 0.4))

    def stroke_splash():
        n = int(0.35 * SR)
        return M.bp(M.noise(n), 700, 5000) * M.ex(n, 0.08) * M.adsr(n, 0.03, 0.05) * 0.12

    def click():
        n = int(0.06 * SR)
        return (M.hp(M.noise(n), 3000) * M.ex(n, 0.004) + np.sin(2 * np.pi * 1800 * M.tt(n)) * M.ex(n, 0.006) * 0.6) * 0.5

    def creak(dur=0.5):
        n = int(dur * SR); t = M.tt(n)
        f = 180 + 60 * np.sin(np.pi * t / dur)
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
        return M.bp(x, 300, 2500) * np.sin(np.pi * t / dur) * 0.03

    def beep():
        n = int(0.12 * SR)
        return np.sin(2 * np.pi * 2700 * M.tt(n)) * M.adsr(n, 0.003, 0.02) * 0.06

    def crickets(t0, t1, vol=1.0):
        n = int((t1 - t0) * SR); t = M.tt(n)
        x = np.zeros(n)
        for k, (fc, rate, ph) in enumerate([(4300, 14, 0), (4700, 11, 1.3), (3900, 17, 2.1)]):
            chirp = (np.sin(2 * np.pi * rate * t + ph) > 0.3).astype(float)
            group = (np.sin(2 * np.pi * 0.55 * t + ph * 2) > -0.2).astype(float)
            env = M.lp(chirp * group, 200)
            x += np.sin(2 * np.pi * fc * t) * env * (0.8 - 0.2 * k)
        fade = np.clip(t / 1.5, 0, 1)
        add(x * 0.018 * vol * fade, t0, 1.0, 0.35)
        add(np.roll(x, 3000) * 0.012 * vol * fade, t0, 1.0, -0.4)

    def scribble(dur):
        n = max(1, int(dur * SR)); t = M.tt(n)
        strokes = (np.sin(2 * np.pi * 3.1 * t) > 0.1) * (np.sin(2 * np.pi * 0.7 * t) > -0.4)
        return M.bp(M.noise(n), 2500, 7000) * M.lp(strokes.astype(float), 40) * 0.03

    R_ = tl['room']
    lampOff_s = sec(R_['lampOff'])

    # ───── 編曲：每段從自己的起點數小節 ─────
    secs = tl['sections'] + [[R_['chord'], 'end']]
    whistle_mel = [[(0, 74, 1), (1, 71, .5), (1.5, 74, .5), (2, 76, 1.5)],
                   [(0, 79, 1), (1, 76, .5), (1.5, 74, .5), (2, 71, 2)],
                   [(0, 72, 1), (1, 74, .5), (1.5, 76, .5), (2, 74, 1.8)]]
    pool_mel = [[(0, 79, .5), (.5, 81, .5), (1, 83, 1), (2, 81, .5), (2.5, 79, .5), (3, 76, 1)],
                [(0, 78, 1.5), (1.5, 81, .5), (2, 86, 2)],
                [(0, 84, .5), (.5, 83, .5), (1, 81, .5), (1.5, 79, .5), (2, 76, 2)]]
    lulls = [[76, 79, 84, 79], [74, 79, 83, 79], [72, 76, 81, 76], [74, 78, 81, 86], [86, 81, 78, 74]]
    for si, (s0, style) in enumerate(secs):
        if style == 'end' or si + 1 >= len(secs): continue
        a, z = sec(s0), min(sec(secs[si + 1][0]), DUR)
        LIM[0] = z
        b = 0
        while a + b * BAR < z - 0.05:
            t0 = a + b * BAR
            prog = PROG[style]; ch = prog[b % len(prog)]
            if style == 'morning':
                pick(ch, t0, 0.9 if b else 0.75)
            elif style == 'ride':
                for p, d, v in [(0, 1, 1.0), (1, 1, .55), (1.5, 0, .45), (2.5, 0, .5), (3, 1, .7), (3.5, 0, .5)]:
                    strum(ch, t0 + p * BEAT, d == 1, v * 0.85)
                addm(ubass(ROOT[ch], BEAT * 1.6), t0, 0.9); addm(ubass(ROOT[ch] + 7, BEAT * 1.6), t0 + 2 * BEAT, 0.7)
                for i in range(16): addm(shaker(), t0 + i * BEAT / 4, 0.8 + 0.4 * (i % 2 == 0), 0.4)
            elif style == 'school':
                for p, d, v in [(0, 1, 1.0), (1, 1, .6), (1.5, 0, .5), (2, 1, .8), (2.5, 0, .5), (3, 1, .7), (3.5, 0, .55)]:
                    strum(ch, t0 + p * BEAT, d == 1, v * 0.9)
                addm(ubass(ROOT[ch], BEAT * 1.6), t0, 0.9); addm(ubass(ROOT[ch] + 7, BEAT * 1.6), t0 + 2 * BEAT, 0.7)
                if b >= 1:
                    addm(clap(), t0 + BEAT, 0.7, 0.1); addm(clap(), t0 + 3 * BEAT, 0.7, 0.1)
                    for p, m, d in whistle_mel[(b - 1) % 3]: addm(whistle(m, d * BEAT), t0 + p * BEAT, 1.0, 0.15)
                for i in range(8): addm(tamb(), t0 + i * BEAT / 2, 0.6 + 0.4 * (i % 2), 0.45)
            elif style == 'pool':
                for i in range(8):
                    strum(ch, t0 + i * BEAT / 2, i % 2 == 0, (1.0 if i % 4 == 0 else .65) * 0.95, bright=0.7)
                for i in range(4): addm(M.kick(0.6, 0.12), t0 + i * BEAT, 0.45)
                addm(clap(), t0 + BEAT, 0.8, 0.1); addm(clap(), t0 + 3 * BEAT, 0.8, 0.1)
                for i in range(16): addm(tamb(), t0 + i * BEAT / 4, 0.35 + 0.45 * (i % 2 == 0), 0.45)
                addm(ubass(ROOT[ch], BEAT), t0, 1.0); addm(ubass(ROOT[ch] + 12, BEAT * .5), t0 + 1.5 * BEAT, .6)
                addm(ubass(ROOT[ch] + 7, BEAT), t0 + 2 * BEAT, .8); addm(ubass(ROOT[ch], BEAT * .5), t0 + 3.5 * BEAT, .6)
                for p, m, d in pool_mel[b % 3]:
                    addm(whistle(m, d * BEAT), t0 + p * BEAT, 1.1, 0.15)
                    addm(M.blip(m + 12, 0.25) * 0.5, t0 + p * BEAT, 0.5, -0.2)
            elif style == 'dusk':
                pick(ch, t0, 0.8, bright=0.35)
                addm(M.strings([m + 12 for m in CH[ch][-3:]], BAR * 1.05), t0, 0.35, 0)
                addm(ubass(ROOT[ch], BAR * 0.9), t0, 0.5)
            elif style == 'night':
                if t0 < lampOff_s:
                    for i, m in enumerate(CH[ch][-3:]):
                        addm(harmonic(m + 12, 3.0), t0 + i * BEAT * 1.33, 0.9, -0.3 + 0.3 * i)
                bb = b % 5
                for i, m in enumerate(lulls[bb]):
                    addm(musicbox(m), t0 + i * BEAT, 0.9, 0.2)
                addm(M.pad([m + 12 for m in CH[ch][-3:]], BAR * 1.1, cutoff=900), t0, 0.25)
            b += 1
    LIM[0] = 1e9

    # 最後的溫暖和弦：慢慢掃過去的 G＋音樂盒高音＋墊底
    tc = sec(R_['chord'])
    for i, m in enumerate(CH['G'] + [71, 74]):
        add(ks(m, 5.0, 0.4, 0.9985), tc + i * 0.055, 0.95, -0.3 + i * 0.08)
    add(M.pad([55, 59, 62, 67], 5.0, cutoff=1400, atk=0.6), tc - 0.2, 0.45)
    for i, m in enumerate([79, 83, 86, 91]): add(musicbox(m, 3.0), tc + 0.5 + i * 0.3, 0.8, 0.25)
    add(harmonic(67, 4.5), tc, 0.8)

    # ───── 音效對畫面 ─────
    first_change = sec(tl['sections'][1][0]) if len(tl['sections']) > 1 else 6.0
    for t, pan, kd in [(0.4, -0.5, 0), (1.3, 0.4, 1), (2.6, -0.2, 0), (3.5, 0.6, 1), (4.7, -0.6, 0), (5.6, 0.3, 1), (7.4, 0.5, 0), (9.0, -0.4, 1)]:
        if t < first_change + 1.5: bird(t, pan, kd)
    add(creak(0.55), sec(tl['marks']['doorOpen']), 1.0, -0.4)
    for e in tl['st']:
        if e['type'] == 'ride':
            a, s, g, arr = sec(e['busEnter']), sec(e['busStop']), sec(e['go']), sec(e['arrive'])

            def prof(t, a=a, s=s, g=g, arr=arr):
                if t < s: return 0.5 - 0.3 * (t - a) / (s - a), min(1, (t - a) / 0.8) * 0.9
                if t < g: return 0.15, 0.55
                if t < arr - 1.0:
                    u = (t - g) % 3.2 / 3.2
                    return 0.35 + 0.55 * min(1, (t - g) / 1.5) * (0.6 + 0.4 * u), 0.85
                if t < arr: return 0.4 - 0.25 * (t - (arr - 1)), 0.75
                return 0.15, max(0, 0.55 - (t - arr) * 0.35)
            add(engine(a, arr + 2.2, prof), a, 1.0, 0)
            add(pssh(0.8), s, 1.0, 0.2)
            add(pssh(0.4), sec(e['busDoor']), 0.8, 0.3); add(pssh(0.4), sec(e['doorClose']), 0.7, 0.3)
            add(pssh(0.8), arr, 1.0, 0.2); add(pssh(0.4), sec(e['alight']) - 0.15, 0.8, 0.3)
        elif e['type'] == 'building':
            for i, m in enumerate([71, 67, 69, 62, 62, 69, 71, 67]):
                add(bell_tone(m, 2.2), sec(e['bell']) + i * 0.42 + (0.25 if i >= 4 else 0), 1.0, 0.3)
        elif e['type'] == 'pool':
            add(M.whoosh(0.7) * 0.8, sec(e['jump']), 1.0, 0)
            add(splash(), sec(e['splash']), 1.0, 0)
            for i in range(14): bubble(sec(e['splash']) + 0.15 + i * 0.05 + rng.uniform(0, 0.03), 500 + rng.uniform(0, 600))
            f = e['surface'] + 10
            while f < e['climb']:
                add(stroke_splash(), sec(f), 1.0, rng.uniform(-0.3, 0.3)); f += 18
            add(stroke_splash(), sec(e['climb']), 1.4, 0.2)
    add(creak(0.5), sec(R_['dormDoor']), 1.0, -0.3)
    add(beep(), sec(R_['acOn']), 1.0, -0.2); add(beep(), sec(R_['acOn']) + 0.15, 0.8, -0.2)
    sd, lo = sec(R_['sitDesk'] + 20), sec(R_['lampOff'] - 20)
    if lo > sd: add(scribble(lo - sd), sd, 1.0, 0.25)
    add(click(), lampOff_s, 1.0, 0.1)
    crickets(sec(R_['sitDesk']) - 1.0, DUR + 1)
    for i in range(3): add(musicbox(91 + [0, 4, 7][i], 1.5), sec(R_['text']) + 0.9 + i * 0.7, 0.4, -0.3 + 0.3 * i)

    # ───── 混音輸出 ─────
    L = M.reverb(L, 0.18); R = M.reverb(R, 0.18)
    mix = np.stack([L, R])
    mix = M.compress(mix, 0.4, 2.5, 1.15)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    mix = peak_limit(mix / (np.max(np.abs(mix)) + 1e-9), 10 ** (-PEAK_CUT / 20))   # 撥弦瞬間峰值壓掉，出片用預設限幅就過
    n = int(round(DUR * SR)); mix = mix[:, :n]
    fade = int(1.3 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    pcm = (mix.T * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    render(m.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
