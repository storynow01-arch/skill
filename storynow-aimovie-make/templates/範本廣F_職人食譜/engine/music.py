"""範本廣F 配樂與音效：慵懶 bossa nova（100 BPM、一拍 18 格、D 大調），段落由時間表的 sections 決定：
  intro 尼龍弦吉他獨奏 → groove 吉他切分＋低音提琴＋刷鼓＋電鋼琴（材料、步驟）→ soft 收起來準備進烤箱
  → oven 只剩低音心跳＋電鋼琴長音（計時器滴答）→ full「叮！」之後全開＋電鋼琴小旋律 → final Dmaj9 慢慢刷下收尾。
每段從自己的起點開始數小節（起點都在拍點上），和弦進行跨段連續。音效全部對準時間表事件：粉筆每一行、打勾、板擦、
道具落在木檯、剁蔥、敲蛋、倒牛奶、打蛋、撒香料、放莓果、全部倒進烤盤、烤箱門、計時器滴答、叮、開門、上菜、擺盤、小卡。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad15.py（固定 60 秒）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BEAT_F = 18
BAR_F = 72
BEAT = BEAT_F / FPS
PEAK_CUT = 4.0      # 撥弦、剁蔥、叮的起音比整體響度突出太多：瞬間峰值壓低幾 dB（音色不變，只壓最尖的那幾毫秒）


def peak_limit(x, thr, look=0.015, smooth=0.006):
    """前瞻峰值限幅：在峰值前後 look 秒內把增益平滑壓到 thr 以下（不削波、不改音色）"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    g = minimum_filter1d(g, size=2 * int(look * SR) + 1)
    g = uniform_filter1d(g, size=int(smooth * SR) + 1)
    return x * g


def render(tl, wav_path):
    rng = np.random.default_rng(1515)
    DUR = tl['frames'] / FPS
    N = int((DUR + 8) * SR)
    L = np.zeros(N); R = np.zeros(N)
    EV, W, SEC = tl['ev'], tl['w'], tl['sections']

    def s2n(sec): return int(sec * SR)
    def f2n(f): return int(f / FPS * SR)

    def put(x, at_n, gain=1.0, pan=0.0):
        if at_n >= N or len(x) == 0: return
        if at_n < 0: x = x[-at_n:]; at_n = 0
        x = x[: N - at_n] * gain
        gl = np.sqrt((1 - pan) / 2) * 1.414; gr = np.sqrt((1 + pan) / 2) * 1.414
        L[at_n:at_n + len(x)] += x * gl; R[at_n:at_n + len(x)] += x * gr

    # ───────────── 樂器 ─────────────
    def nylon(m, dur=1.6, bright=2600, vel=1.0):
        """Karplus-Strong 撥弦（尼龍弦：激發先低通、回授衰減快一點）"""
        n = s2n(dur); f = M.midi(m); d = max(2, int(round(SR / f)))
        exc = np.zeros(n); burst = M.lp(rng.standard_normal(d), bright)
        exc[:d] = burst * np.hanning(d) ** 0.5
        g = 0.996
        a = np.zeros(d + 2); a[0] = 1; a[d] = -g * 0.5; a[d + 1] = -g * 0.5
        y = lfilter([1], a, exc)
        y = M.lp(y, 3200)
        return y * M.adsr(n, 0.002, 0.12) * 0.55 * vel

    def strum(ms, dur=1.4, spread=0.012, vel=1.0, up=False):
        order = ms[::-1] if up else ms
        n = s2n(dur + spread * len(ms)); x = np.zeros(n)
        for i, m in enumerate(order):
            y = nylon(m, dur, vel=vel * (0.85 + 0.15 * rng.random()))
            o = s2n(i * spread); x[o:o + len(y)] += y[: n - o]
        return x / np.sqrt(len(ms))

    def thumb(m, dur=0.9, vel=1.0): return nylon(m, dur, bright=1400, vel=1.2 * vel)

    def upright(m, dur):
        n = s2n(dur); t = M.tt(n); f = M.midi(m)
        x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * M.ex(n, 0.15) + 0.12 * np.sin(6 * np.pi * f * t) * M.ex(n, 0.08)
        x += M.lp(rng.standard_normal(n), 900) * M.ex(n, 0.012) * 0.4
        return np.tanh(x * 1.3) * M.ex(n, 0.9) * M.adsr(n, 0.004, 0.06) * 0.42

    def rhodes(ms, dur, vel=1.0):
        n = s2n(dur); t = M.tt(n); x = np.zeros(n)
        for m in ms:
            f = M.midi(m)
            x += (np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * t) * M.ex(n, 0.25))) * M.ex(n, 1.6)
            x += 0.15 * np.sin(2 * np.pi * 7 * f * t) * M.ex(n, 0.03)
        trem = 1 + 0.18 * np.sin(2 * np.pi * 4.2 * t)
        return x / len(ms) * trem * M.adsr(n, 0.004, 0.25) * 0.3 * vel

    def brush_tap(amp=1.0, long=False):
        n = s2n(0.22 if long else 0.08)
        return M.bp(rng.standard_normal(n), 2500, 9000) * M.ex(n, 0.09 if long else 0.025) * 0.16 * amp

    def brush_swirl(dur):
        n = s2n(dur); t = M.tt(n)
        env = 0.55 + 0.45 * np.sin(2 * np.pi * t / (BEAT * 2)) ** 2
        return M.bp(rng.standard_normal(n), 1800, 7000) * env * M.adsr(n, 0.05, 0.1) * 0.035

    def rim(amp=1.0):
        n = s2n(0.06); t = M.tt(n)
        return (np.sin(2 * np.pi * 1700 * t) + 0.6 * np.sin(2 * np.pi * 820 * t)) * M.ex(n, 0.012) * 0.18 * amp

    # ───────────── 和弦（D 大調 bossa 進行，8 小節一輪）─────────────
    D_ = 38
    CH = [(D_, [50, 54, 57, 61]), (D_, [50, 54, 57, 61, 64]), (D_ + 2, [52, 55, 59, 62]), (D_ + 7, [52, 55, 57, 61]),
          (D_ + 4, [54, 57, 61, 64]), (D_ + 9, [53, 57, 59, 63]), (D_ + 2, [52, 55, 59, 62, 66]), (D_ + 7, [55, 59, 61, 64])]
    GPAT = [(0, 1.0), (3, 0.8), (6, 0.9), (10, 0.85), (13, 0.8)]
    VOL = {'intro': (0.8, 0, 0, 0), 'groove': (0.85, 1.0, 1.0, 0.6), 'soft': (0.55, 0.7, 0.3, 0.0),
           'oven': (0.0, 0.55, 0.0, 0.45), 'full': (1.05, 1.15, 1.25, 1.0)}
    order = sorted([(f, name) for name, f in SEC.items()])
    gb = 0                                   # 跨段連續的小節數（決定和弦）
    for si, (s0, name) in enumerate(order):
        if name == 'final': break
        z = order[si + 1][0]
        gv, bv, dv, rv = VOL[name]
        b = 0
        while s0 + b * BAR_F < z - 2:
            t0f = s0 + b * BAR_F
            lim = f2n(z)                     # 段落內的音不排到下一段
            root, ch = CH[gb % 8]
            t0 = f2n(t0f)

            def pp(x, at, g=1.0, pan=0.0):
                if at < lim - 400: put(x, at, g, pan)
            if gv > 0:
                for pos, v in GPAT:
                    if (gb % 2 == 0 and pos < 8) or (gb % 2 == 1 and pos >= 8):
                        p8 = pos % 8
                        pp(strum(ch, 1.0 if p8 != 6 else 1.3, vel=v), t0 + s2n(p8 * BEAT / 2), 0.55 * gv, -0.3)
                pp(thumb(root + 12, 1.0), t0, 0.5 * gv, -0.25)
                pp(thumb(root + 19, 1.0), t0 + s2n(2 * BEAT), 0.45 * gv, -0.25)
            if bv > 0:
                if name == 'oven':
                    for q in range(4): pp(upright(root, 0.5), t0 + s2n(q * BEAT), 0.5 * bv * (1 if q % 2 == 0 else 0.6), 0)
                else:
                    for beat, iv, d in [(0, 0, 1.4), (1.5, 0, 0.45), (2, 7, 1.4), (3.5, 7, 0.45)]:
                        pp(upright(root + iv, d), t0 + s2n(beat * BEAT), 0.75 * bv, 0.05)
            if dv > 0:
                pp(brush_swirl(min(BAR_F, z - t0f) / FPS + 0.1), t0, dv, 0)
                for s16 in range(16):
                    acc = 1.0 if s16 % 4 == 0 else (0.75 if s16 % 2 == 0 else 0.45)
                    pp(brush_tap(acc), t0 + s2n(s16 * BEAT / 4), 0.7 * dv, 0.35 if s16 % 2 else -0.35)
                for beat in ([1.5, 3] if gb % 2 == 0 else [0.5, 2, 3.5]):
                    pp(rim(), t0 + s2n(beat * BEAT), 0.55 * dv, 0.2)
            if rv > 0:
                if name == 'oven':
                    pp(rhodes([m + 12 for m in ch[:3]], 2.4), t0, 0.5 * rv, 0.4)
                elif gb % 4 == 2 or name == 'full':
                    pp(rhodes([m + 12 for m in ch], 2.2), t0 + s2n(0.5 * BEAT), 0.55 * rv, 0.4)
            b += 1; gb += 1

    # 叮之後的電鋼琴小旋律（到收尾和弦前為止）
    MEL = [(0, 78, 1), (1, 76, 0.5), (1.5, 74, 1.5), (4, 73, 1), (5, 71, 0.5), (5.5, 69, 2), (8, 74, 1), (9, 76, 0.5),
           (9.5, 78, 1.5), (12, 81, 1), (13, 79, 0.5), (13.5, 76, 2.5)]
    for beat, m, d in MEL:
        at = SEC['full'] + beat * BEAT_F
        if at < SEC['final'] - 4: put(rhodes([m], min(d * BEAT + 0.8, (SEC['final'] - at) / FPS + 0.6), 1.2), f2n(at), 0.6, 0.25)

    # 收尾和弦：Dmaj9 慢慢刷下（吉他＋電鋼琴＋低音），弦樂墊底響到淡出
    fin = f2n(SEC['final'])
    TAIL = max(3.0, DUR - SEC['final'] / FPS + 0.5)
    FIN = [50, 54, 57, 61, 64, 69]
    put(strum(FIN, TAIL, spread=0.045, vel=1.1), fin, 0.95, -0.25)
    put(rhodes([62, 66, 69, 73, 76], TAIL, 1.1), fin, 0.75, 0.35)
    put(upright(D_, min(4.0, TAIL)), fin, 0.9, 0)
    tail = M.strings([50, 57, 61, 64, 66, 69], TAIL + 0.9) * np.linspace(1, 0.55, s2n(TAIL + 0.9))
    put(tail, fin + s2n(0.1), 0.9, 0)
    put(rhodes([74, 78, 81], min(5.0, TAIL), 0.8), fin + s2n(2 * BEAT), 0.45, 0.3)
    put(brush_tap(1.0, long=True), fin, 1.2, 0)
    sw = M.bp(rng.standard_normal(s2n(1.2)), 1500, 8000) * np.linspace(0, 1, s2n(1.2)) ** 2 * 0.09
    put(sw, f2n(EV['dingf']) - len(sw), 1.0, 0)          # 叮之前的刷鼓漸強

    # ───────────── 音效 ─────────────
    def chalk(frames):
        n = f2n(frames) + s2n(0.05); x = np.zeros(n); i = 0
        while i < n - s2n(0.03):
            L_ = min(s2n(0.05 + 0.12 * rng.random()), n - i)
            env = np.sin(np.pi * np.arange(L_) / L_) ** 0.7
            x[i:i + L_] += M.bp(rng.standard_normal(L_), 1800, 7500) * env * (0.7 + 0.5 * rng.random())
            if rng.random() < 0.12:
                t = np.arange(L_) / SR
                x[i:i + L_] += np.sin(2 * np.pi * (2400 + 600 * rng.random()) * t) * env * 0.08
            i += L_ + s2n(0.02 + 0.05 * rng.random())
        return x * 0.12

    def chalk_tick():
        a = chalk(3); b = chalk(4)
        x = np.zeros(len(a) + len(b) + s2n(0.04)); x[:len(a)] += a; x[s2n(0.08):s2n(0.08) + len(b)] += b * 1.2
        return x * 1.3

    def eraser(frames):
        n = f2n(frames); t = M.tt(n)
        env = np.abs(np.sin(2 * np.pi * t * 2.6)) ** 0.6 * M.adsr(n, 0.03, 0.08)
        return M.bp(rng.standard_normal(n), 250, 2200) * env * 0.12

    def wood_thud(w=1.0):
        n = s2n(0.35); t = M.tt(n)
        x = np.sin(2 * np.pi * 115 * t) * M.ex(n, 0.06) + M.lp(rng.standard_normal(n), 900) * M.ex(n, 0.025) * 0.8
        return x * 0.32 * w

    def chop():
        n = s2n(0.3); t = M.tt(n)
        x = np.sin(2 * np.pi * 170 * t) * M.ex(n, 0.04) * 0.9
        x += M.bp(rng.standard_normal(n), 1500, 6000) * M.ex(n, 0.01) * 1.2
        x += np.sin(2 * np.pi * 3100 * t) * M.ex(n, 0.02) * 0.15
        return x * 0.38

    def crack():
        n = s2n(0.45); x = np.zeros(n)
        for j in range(5):
            o = s2n(j * 0.012 + 0.004 * rng.random()); L_ = s2n(0.02)
            x[o:o + L_] += M.bp(rng.standard_normal(L_), 1800, 7000) * M.ex(L_, 0.004) * (1 - j * 0.15)
        o = s2n(0.14); L_ = s2n(0.25); t = M.tt(L_)
        x[o:o + L_] += np.sin(2 * np.pi * (300 + 500 * np.exp(-t * 20)) * t) * M.ex(L_, 0.05) * 0.25
        return x * 0.5

    def pour(frames):
        n = f2n(frames)
        x = M.bp(rng.standard_normal(n), 400, 3000) * (0.5 + 0.5 * M.lp(np.abs(rng.standard_normal(n)), 8))
        for _ in range(int(frames * 0.9)):
            o = int(rng.random() * (n - s2n(0.05))); L_ = s2n(0.03); tt_ = M.tt(L_)
            f0 = 500 + 700 * rng.random()
            x[o:o + L_] += np.sin(2 * np.pi * f0 * (1 + 2 * tt_) * tt_) * M.ex(L_, 0.008) * 0.6
        return x * M.adsr(n, 0.08, 0.2) * 0.12

    def whisk(frames):
        """打蛋器刮碗：一圈一圈的沙沙聲＋細細的金屬碰碗"""
        n = f2n(frames); t = M.tt(n)
        env = (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * t * (0.62 * FPS / (2 * np.pi)) ))) * M.adsr(n, 0.05, 0.1)
        x = M.bp(rng.standard_normal(n), 2000, 8000) * env * 0.09
        for j in range(int(frames / 10)):
            c = clink(3200 + 400 * rng.random(), 0.05, 0.25); o = f2n(j * 10 + 3)
            x[o:o + len(c)] += c[: max(0, n - o)]
        return x

    def clink(base=2100, dec=0.35, w=1.0):
        n = s2n(dec * 2.5); t = M.tt(n); x = np.zeros(n)
        for r, a in [(1, 1), (1.62, 0.6), (2.48, 0.4), (3.9, 0.25)]:
            x += a * np.sin(2 * np.pi * base * r * t) * M.ex(n, dec / r ** 0.5)
        return x * 0.09 * w

    def sprinkle(dur=0.45):
        n = s2n(dur); x = np.zeros(n)
        for _ in range(40):
            o = int(rng.random() * (n - 200)); L_ = 160
            x[o:o + L_] += M.hp(rng.standard_normal(L_), 4000) * M.ex(L_, 0.0008) * (0.5 + rng.random())
        return x * 0.25

    def paper():
        n = s2n(0.18); t = M.tt(n)
        return M.bp(rng.standard_normal(n), 2000, 9000) * np.sin(np.pi * t / t[-1]) ** 2 * 0.1

    def door_close():
        x = wood_thud(1.8); n = s2n(0.9); y = np.zeros(n); y[:len(x)] += x
        c = clink(430, 0.25, 1.2)[:n]; y[:len(c)] += c
        t = M.tt(n); y += np.sin(2 * np.pi * 62 * t) * M.ex(n, 0.12) * 0.4
        return y

    def door_open():
        n = s2n(0.7); t = M.tt(n)
        f = 380 + 260 * t / t[-1]
        creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
        y = M.bp(creak, 600, 3000) * np.sin(np.pi * t / t[-1]) * 0.05
        y[s2n(0.5):] += wood_thud(1.0)[: n - s2n(0.5)]
        return y

    def tick(hi=True):
        n = s2n(0.06); t = M.tt(n)
        return (np.sin(2 * np.pi * (3200 if hi else 2500) * t) + M.hp(rng.standard_normal(n), 3000) * 0.6) * M.ex(n, 0.006) * 0.28

    def ding():
        n = s2n(3.0); t = M.tt(n); f = 2093; x = np.zeros(n)
        for r, a, d in [(1, 1, 1.6), (2.76, 0.5, 0.6), (5.4, 0.25, 0.3), (8.93, 0.12, 0.12)]:
            x += a * np.sin(2 * np.pi * f * r * t) * M.ex(n, d)
        x += M.hp(rng.standard_normal(n), 4000) * M.ex(n, 0.003) * 0.5
        return x * 0.22 * (1 + 0.05 * np.sin(2 * np.pi * 6 * t))

    def plate_down():
        n = s2n(1.2); y = np.zeros(n)
        th = wood_thud(1.2); y[:len(th)] += th
        c = clink(1180, 0.45, 1.6); y[:min(n, len(c))] += c[:n]
        c2 = clink(1180, 0.3, 0.7); o = s2n(0.09); y[o:o + len(c2)] += c2[: n - o]
        return y

    def whoosh(d=0.6): return M.whoosh(d) * 0.6

    # 粉筆字、打勾、板擦
    for id_, (at, du) in W.items():
        if tl['lines'][id_]['kind'] == 'tick': put(chalk_tick(), f2n(at), 1.0, -0.5)
        else: put(chalk(du), f2n(at), 1.0, -0.55)
    for at, du in tl['erase']:
        put(eraser(du), f2n(at), 1.0, -0.45)

    # 道具落在料理檯
    for p in tl['props']:
        pan = min(0.7, max(-0.2, (p['x'] - 960) / 1200))
        if p['kind'] == 'tag': put(paper(), f2n(p['at']), 1.0, pan)
        elif p['kind'] == 'tent': put(paper(), f2n(p['at']), 1.0, pan); put(wood_thud(0.6), f2n(p['at']) + s2n(0.05), 1.0, pan)
        elif p['kind'] == 'cloche': put(clink(760, 0.7, 1.5), f2n(p['at']), 1.0, pan); put(wood_thud(0.7), f2n(p['at']), 1.0, pan)
        elif p['kind'] == 'spice': put(clink(1500 + 200 * p['seed'], 0.18, 0.7), f2n(p['at']), 1.0, pan); put(wood_thud(0.4), f2n(p['at']), 1.0, pan)
        elif p['kind'] in ('cup', 'saucer', 'cake'): put(clink(2300 if p['kind'] == 'cup' else 1900, 0.25, 1.0), f2n(p['at']), 1.0, pan); put(wood_thud(0.5), f2n(p['at']), 1.0, pan)
        else: put(wood_thud(0.8), f2n(p['at']), 1.0, pan)
        if p['kind'] == 'cut':
            for f in p['hits']: put(chop(), f2n(f), 1.0, pan)
        elif p['kind'] == 'bowl': put(crack(), f2n(p['crack']), 1.0, pan)
        elif p['kind'] == 'cup': put(pour(p['pour'][1] - p['pour'][0]), f2n(p['pour'][0]), 1.0, pan)
        elif p['kind'] == 'whisk': put(whisk(p['mix'][1] - p['mix'][0]), f2n(p['mix'][0]), 1.0, pan)
        elif p['kind'] == 'cake':
            put(wood_thud(0.35), f2n(p['berry'][1]), 1.0, pan); put(clink(2600, 0.12, 0.5), f2n(p['berry'][1]), 1.0, pan)
    if 'sprinkle' in EV: put(sprinkle(), f2n(EV['sprinkle'][0]), 1.0, 0.4)

    # 烤盤 → 烤箱 → 計時器 → 叮 → 上菜
    put(wood_thud(0.8), f2n(EV['dish_in']), 1.0, 0.2)
    put(whoosh(0.7), f2n(EV['gather']), 1.0, 0)
    put(wood_thud(1.5), f2n(EV['oven_in'][1]), 1.0, 0.5)
    put(whoosh(0.45) * 0.6, f2n(EV['push'][0]), 1.0, 0.5)
    put(door_close(), f2n(EV['door_close']), 1.0, 0.5)
    put(wood_thud(0.6), f2n(EV['timer_in'][1]), 1.0, -0.1)
    for q in range(6): put(tick(q % 2 == 0) * 0.4, f2n(EV['twist'][0]) + s2n(q * 0.05), 1.0, -0.1)
    for i, f in enumerate(EV['ticks']):
        put(tick(i % 2 == 0), f2n(f), 1.0, -0.1); put(tick(False) * 0.35, f2n(f + 9), 1.0, -0.1)
    put(ding(), f2n(EV['dingf']), 1.0, 0)
    put(door_open(), f2n(EV['door_open']), 1.0, 0.5)
    put(whoosh(0.5) * 0.7, f2n(EV['plate_out'][0]), 1.0, 0.2)
    put(plate_down(), f2n(EV['plate_out'][1]), 1.0, 0.1)
    put(whoosh(0.6), f2n(EV['oven_out'][0]), 1.0, 0.6)
    put(pour(EV['plating'][1] - EV['plating'][0]) * 0.6, f2n(EV['plating'][0]), 1.0, 0.1)
    put(sprinkle(0.9), f2n(EV['garnish'][0]), 1.0, 0.1)
    if 'card_in' in EV:
        put(paper(), f2n(EV['card_in'][0]), 1.0, 0.5); put(wood_thud(0.5), f2n(EV['card_in'][1]), 1.0, 0.5)

    # ───────────── 母帶 ─────────────
    mix = np.stack([L, R])
    mix = M.reverb(mix, wet=0.22)
    mix = M.compress(mix, thresh=0.4, ratio=2.5, makeup=1.15)
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    mix = peak_limit(mix / (np.max(np.abs(mix)) + 1e-9), 10 ** (-PEAK_CUT / 20))   # 瞬間峰值壓掉，出片用預設限幅就過
    n = int(round(DUR * SR)); mix = mix[:, :n]
    fade = s2n(1.3)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
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
