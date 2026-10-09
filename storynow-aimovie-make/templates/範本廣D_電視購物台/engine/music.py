"""範本廣D 配樂＋罐頭音效：搖擺大樂隊購物台配樂（138.46 BPM＝每拍 13 格、降 B 大調 I–vi–ii–V，第四區起升半音），
加上：測試音、轉台、登登登揭曉、銅管、錢幣叮噹、收銀機鏘、掌聲、觀眾「哇～」、劃掉價格的「唰」、鼓滾奏、倒數滴答、電話鈴、跳起來的「啵～」、小鳥。
所有事件時間來自時間表（timeline.py 依內容排，省略的商品區就沒有它的音效）。make_ad.py 呼叫 render(tl, wav)。
原作：02_試做/廣告30風格 audio/ad19.py（固定 60 秒）。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
rng = np.random.default_rng(19)


def tt(n): return np.arange(n) / SR
def ex(n, tau): return M.ex(n, tau)


def coin(pitch=0):
    out = np.zeros(int(0.7 * SR))
    for f0, dt in [(1975.5, 0.0), (2637.0, 0.07)]:
        f0 *= 2 ** (pitch / 12); n = int(0.6 * SR); t = tt(n)
        x = sum(a * np.sin(2 * np.pi * f0 * h * t) for h, a in [(1, 1), (2.76, 0.4), (5.4, 0.2)]) * ex(n, 0.18)
        i = int(dt * SR); out[i:i + n] += x[:len(out) - i]
    return out * 0.22


def register():
    n = int(1.1 * SR); t = tt(n)
    clunk = M.lp(M.noise(n), 900) * ex(n, 0.03) * 0.8
    bell = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(1568, 1), (3136, 0.5), (4700, 0.25), (2350, 0.3)]) * ex(n, 0.35)
    bell[:int(0.05 * SR)] = 0
    drawer = np.zeros(n); d0 = int(0.12 * SR); dn = int(0.25 * SR)
    drawer[d0:d0 + dn] = M.bp(M.noise(dn), 1500, 5000) * np.sin(np.pi * np.arange(dn) / dn) * 0.4
    return (clunk + bell * 0.35 + drawer) * 0.6


def applause(dur=2.6, dens=900):
    n = int(dur * SR); x = np.zeros(n)
    clap = M.bp(M.noise(int(0.012 * SR)), 900, 5000) * ex(int(0.012 * SR), 0.003)
    for _ in range(int(dens * dur)):
        i = int(rng.uniform(0, n - len(clap))); x[i:i + len(clap)] += clap * rng.uniform(0.3, 1.0)
    return x * np.minimum(1, tt(n) / 0.15) * np.clip((dur - tt(n)) / (dur * 0.6), 0, 1) * 0.18


def crowd_wow(dur=1.5, up=True):
    n = int(dur * SR); t = tt(n); x = np.zeros(n)
    for v in range(14):
        f0 = rng.uniform(170, 330)
        cont = 1 + (0.22 if up else -0.12) * np.sin(np.pi * np.clip(t / dur * 1.3, 0, 1)) + rng.uniform(-0.03, 0.03)
        ph = np.cumsum(f0 * cont * (1 + 0.01 * np.sin(2 * np.pi * rng.uniform(4, 7) * t))) / SR
        st = rng.uniform(0, 0.08)
        x += (2 * (ph % 1) - 1) * np.clip((t - st) / 0.12, 0, 1) * np.clip((dur - t) / (dur * 0.55), 0, 1)
    a = M.bp(x, 650, 1300) + M.bp(x, 2300, 3000) * 0.35 + M.bp(M.noise(n), 500, 3000) * 0.08 * np.clip((dur - t) / dur, 0, 1)
    return a / 14 * 0.9


def swish():
    n = int(0.32 * SR); nz = M.noise(n); out = np.zeros(n); seg = int(0.01 * SR)
    for i in range(0, n, seg):
        fc = 1500 + 7000 * (i / n); out[i:i + seg] = M.bp(nz[i:i + seg], fc * 0.7, fc * 1.3, 1)
    return out * np.sin(np.pi * tt(n) / 0.32) ** 0.7 * 0.9


def tick(hi=True):
    n = int(0.08 * SR); t = tt(n)
    return (np.sin(2 * np.pi * (2600 if hi else 1900) * t) + M.hp(M.noise(n), 3000) * 0.4) * ex(n, 0.012) * 0.45


def phone_ring(dur=1.4):
    n = int(dur * SR); t = tt(n)
    tone = np.sin(2 * np.pi * 1180 * t) + 0.7 * np.sin(2 * np.pi * 1420 * t) + 0.3 * np.sin(2 * np.pi * 3100 * t)
    return M.lp(tone * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * t))), 6000) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1) * 0.16


def boing():
    n = int(0.5 * SR); t = tt(n)
    f = 220 + 380 * t / 0.5 + 40 * np.sin(2 * np.pi * 14 * t) * ex(n, 0.2)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(n, 0.25) * 0.35


def tweet():
    out = np.zeros(int(0.5 * SR))
    for k in range(3):
        n = int(0.09 * SR); t = tt(n)
        x = np.sin(2 * np.pi * np.cumsum(3200 + 1600 * np.sin(np.pi * t / 0.09)) / SR) * np.sin(np.pi * t / 0.09)
        i = int(k * 0.13 * SR); out[i:i + n] += x
    return out * 0.15


def party_horn():
    out = np.zeros(int(0.9 * SR))
    for k, (f, d) in enumerate([(466, 0.14), (698, 0.55)]):
        n = int(d * SR); t = tt(n)
        x = M.lp(M.sq(f * (1 + 0.006 * np.sin(2 * np.pi * 6 * t)), n), 3500) * M.adsr(n, 0.01, 0.06)
        i = int(k * 0.2 * SR); out[i:i + n] += x
    return out * 0.16


def tv_switch():
    n = int(0.18 * SR); return M.hp(M.noise(n), 1200) * ex(n, 0.06) * 0.35


def test_tone(dur):
    n = int(dur * SR); t = tt(n)
    return np.sin(2 * np.pi * 1000 * t) * np.clip((dur - t) / 0.02, 0, 1) * np.clip(t / 0.01, 0, 1) * 0.12


def snare_roll(dur):
    n = int(dur * SR); x = np.zeros(n); S = M.snare(220, 0.05, 5000); t = 0.0
    while t < dur:
        i = int(t * SR); s = S[:n - i]; x[i:i + len(s)] += s * (0.25 + 0.75 * (t / dur) ** 1.5)
        t += 0.11 - 0.07 * (t / dur)
    return x * 0.6


def cymbal(dur=2.2):
    n = int(dur * SR); return M.hp(M.noise(n), 4500) * ex(n, 0.7) * 0.3


CHORDS = [(46, [58, 62, 65, 67]), (43, [55, 58, 62, 65]), (48, [58, 60, 63, 67]), (41, [57, 60, 63, 65])]


def render(tl, wav_path):
    FPS = tl['fps']; BF = tl['beatFrames']; BEAT = BF / FPS; BAR = BEAT * 4
    TOTAL = tl['frames'] / FPS
    m = tl['m']; Z = {z['type']: z['ev'] for z in tl['zones']}
    N = int(TOTAL * SR) + SR
    MUS = np.zeros((2, N)); FX = np.zeros((2, N))

    def put(buf, sig, t0, g=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N: return
        if i < 0: sig = sig[-i:]; i = 0
        s = sig[:N - i] * g
        buf[0, i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        buf[1, i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    def mus(sig, t0, g=1.0, pan=0.0): put(MUS, sig, t0, g, pan)
    def fx(sig, frame, g=1.0, pan=0.0): put(FX, sig, frame / FPS, g, pan)
    fr = lambda f: f / FPS
    P = Z['price']
    shift_at = tl['zones'][3]['ev']['start'] if len(tl['zones']) > 3 else 10 ** 9   # 第四區起升半音
    cnt = Z.get('countdown')

    def section(f):
        if f < m['on']: return 'tacet'
        if f < P['orig']: return 'full'
        if f < P['roll']: return 'light'
        if f < P['zero']: return 'tacet'
        if cnt and cnt['start'] <= f < cnt['out']: return 'count'
        if f < m['end']: return 'full'
        return 'end'

    ride = M.hp(M.hat(True, 0.6), 3000); CHH = M.hat(); K = M.kick(0.5, 0.1); SN = M.snare(220, 0.08, 4000)
    sw = BEAT * 0.66
    t_on = fr(m['on'])
    for b in range(int(np.ceil((TOTAL - t_on) / BAR)) + 1):
        t0 = t_on + b * BAR
        if t0 >= TOTAL: break
        ks = 1 if t0 * FPS >= shift_at - 1 else 0
        r, ch = CHORDS[b % 4]; r += ks; ch = [x + ks for x in ch]
        nxt = CHORDS[(b + 1) % 4][0] + ks
        walk = [r, r + 4 if b % 4 in (0, 3) else r + 3, r + 7, nxt + 1]
        for i in range(4):
            tb = t0 + i * BEAT; sec = section(tb * FPS)
            if sec in ('tacet', 'end'): continue
            if sec == 'count':
                mus(M.bass(r - 12, BEAT * 0.5, 'sub'), tb, 0.6); mus(K, tb, 0.45); continue
            mus(M.bass(walk[i] - 12, BEAT * 0.9, 'sub'), tb, 0.55); mus(ride, tb, 0.3, 0.3)
            if i % 2 == 1: mus(ride, tb + sw, 0.22, 0.3); mus(CHH, tb, 0.22, -0.2)
            if sec == 'full':
                if i in (0, 2): mus(K, tb, 0.42)
                if i in (1, 3): mus(SN, tb, 0.22)
                if i == 1: mus(M.epiano([x + 12 for x in ch], BEAT * 1.0), tb + sw, 0.2, -0.3)
                if i == 2: mus(M.epiano([x + 12 for x in ch], BEAT * 0.7), tb + sw, 0.16, -0.3)
                if i == 3 and b % 2 == 1: mus(M.brass([x + 12 for x in ch], BEAT * 0.4), tb + sw, 0.36, 0.15)
            elif i == 0:
                mus(M.epiano([x + 12 for x in ch], BAR * 0.9), tb, 0.14, -0.3)

    def fanfare(t0, ks=0, g=0.5):
        for mm, bb, d in [(70, 0, 0.3), (74, 0.5, 0.3), (77, 1.0, 0.3), (82, 1.66, 0.9), (79, 2.66, 0.3), (82, 3.0, 1.0)]:
            mus(M.brass([mm + ks, mm + ks - 4, mm + ks - 9], BEAT * d * 1.6), t0 + bb * BEAT, g, 0.1)

    def tada(frame, ks=0, g=1.0):
        t0 = frame / FPS
        for j in range(3): mus(M.brass([65 + ks, 70 + ks], BEAT * 0.25), t0 - BEAT * (1 - j / 3), 0.38 * g, 0.1)
        mus(M.brass([70 + ks, 74 + ks, 77 + ks, 82 + ks], BEAT * 3.5), t0, 0.62 * g, 0.1)
        mus(cymbal(2.0), t0, 0.8 * g, -0.2); mus(M.kick(0.9, 0.2), t0, 0.7 * g)

    def stab(frame, ks=0, g=0.5):
        t0 = frame / FPS
        mus(M.brass([70 + ks, 74 + ks, 77 + ks], BEAT * 0.5), t0, g, 0.1); mus(M.kick(0.8, 0.12), t0, 0.5)

    ksh = lambda f: 1 if f >= shift_at - 1 else 0
    # 開場、price
    fx(test_tone(fr(m['on']) - 0.02), 0, 1.0); fx(tv_switch(), m['on'] - 3, 1.0); fx(M.impact(1.8, 0.9), m['on'], 0.5)
    mus(cymbal(), fr(m['on']), 0.7); fanfare(fr(m['on']), 0, 0.5)
    fx(M.whoosh(0.5), m['logoFly'] - 4, 0.6); fx(boing(), m['hostIn'], 0.9); fx(party_horn(), m['hello'], 0.9, -0.2)
    stab(P['orig'], 0, 0.55); fx(M.impact(1.2, 0.6), P['orig'], 0.3); fx(M.whoosh(0.45), P['board'] - 6, 0.55, 0.4)
    for f in P['lock']: fx(tick(), f, 0.7, 0.3)
    for j, mm in enumerate([46, 45, 44]): mus(M.brass([mm, mm + 7], BEAT * (0.5 if j < 2 else 2.2)), fr(P['shock']) + j * BEAT * 0.66, 0.55)
    fx(crowd_wow(1.4, False), P['shock'] + 6, 0.55)
    mus(snare_roll(fr(P['zero'] - P['roll'])), fr(P['roll']), 0.9); fx(M.riser(fr(P['zero'] - P['roll'])), P['roll'], 0.4)
    fx(boing(), P['wave'] - 6, 0.5); fx(swish(), P['slash'] - 3, 1.0, 0.3); fx(M.whoosh(0.6), P['drop'], 0.6)
    tada(P['zero']); fx(M.impact(2.2, 1.0), P['zero'], 0.55); fx(crowd_wow(1.6, True), P['zero'] + 4, 0.9); fx(applause(3.0), P['zero'] + 10, 1.0)
    fx(party_horn(), P['free'], 0.8, 0.3); stab(P['free'], 0, 0.45)
    if 'more' in P: stab(P['more'], 0, 0.6); fx(boing(), P['more'], 0.8)
    for z in tl['zones'][1:]: fx(M.whoosh(0.55), z['ev']['start'] - 4, 0.7)
    if 'bonus' in Z:
        B = Z['bonus']; tada(B['plus'], ksh(B['plus']), 0.6); fx(M.whoosh(0.4), B['card'] - 5, 0.5, 0.4)
        for k2 in range(8): fx(tick(k2 % 2 == 0), B['card'] + int(k2 * (B['card24'] - B['card']) / 8), 0.35, 0.3)
        fx(register(), B['card24'], 1.0, 0.2)
        for k2 in range(10): fx(coin(rng.uniform(-2, 3)), B['card24'] + 6 + k2 * 6, 0.65, rng.uniform(-0.6, 0.6))
        fx(crowd_wow(1.3, True), B['card24'] + 6, 0.6)
    if 'tags' in Z:
        tg = Z['tags']['tags']
        for j, f in enumerate(tg):
            fx(M.whoosh(0.3), f - 8, 0.4); stab(f, ksh(f), 0.4); fx(coin(j * 2), f + 2, 0.9, 0.2)
            if j == len(tg) - 1: fx(register(), f + 16, 0.55, 0.3)
        fx(applause(2.0, 600), tg[-1] + 20, 0.7)
    if 'gifts' in Z:
        G = Z['gifts']; ks = ksh(G['start'])
        fx(tweet(), G['bird'], 1.0, 0.4); fx(tweet(), G['bird'] + 20, 0.8, 0.2)
        stab(G['early'], ks, 0.55); fx(party_horn(), G['early'] + 4, 0.6)
        fx(coin(1), G['box1'], 0.8); stab(G['box1'], ks, 0.35); fx(coin(4), G['box2'], 0.8); stab(G['box2'], ks, 0.35)
        fx(tick(), G['both'], 0.6); tada(G['double'], ks, 0.9); fx(crowd_wow(1.5, True), G['double'] + 4, 0.85); fx(applause(2.4), G['double'] + 10, 0.9)
    if 'chips' in Z:
        C = Z['chips']; stab(C['spTitle'], ksh(C['start']), 0.45)
        for j, f in enumerate(C['chips']): fx(M.blip(84 + j * 3, 0.12) * 3, f, 0.8); fx(coin(j * 2 + 1), f + 2, 0.5)
    if cnt:
        for j, f in enumerate(cnt['ticks']): fx(tick(j % 2 == 0), f, 0.9, 0.2 if j % 2 else -0.2)
        fx(M.riser(fr(cnt['out'] - cnt['act'])), cnt['act'], 0.45); stab(cnt['act'], ksh(cnt['act']), 0.5)
    C = Z['call']; ks = ksh(C['start'])
    fx(phone_ring(1.3), C['start'], 1.0, -0.2); fx(phone_ring(1.3), C['start'] + 52, 0.8, -0.2)
    tada(C['call'], ks, 0.7); fanfare(fr(C['num']), ks, 0.45); fx(register(), C['num'] + 26, 0.6); fx(coin(3), C['web'], 0.7)
    te = fr(m['end'])
    mus(M.brass([70 + ks, 74 + ks, 77 + ks, 82 + ks], 2.6), te, 0.7, 0.1); mus(M.brass([46 + ks, 58 + ks], 2.6), te, 0.5)
    mus(cymbal(2.6), te, 1.0); mus(M.kick(1.0, 0.25), te, 0.8)
    fx(M.impact(2.4, 1.0), m['end'], 0.5); fx(crowd_wow(1.6, True), m['end'] + 4, 0.8); fx(applause(2.4, 1100), m['end'] + 6, 1.1)
    fx(party_horn(), m['end'] + 12, 0.6, -0.3)

    NN = int(round(TOTAL * SR))
    mix = M.master_chain(MUS[:, :NN]) * 0.62 + M.reverb(FX[:, :NN], 0.1) * 0.9
    mix = np.tanh(mix * 1.05)
    fade = int(1.2 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    mix = mix / np.max(np.abs(mix)) * 0.9
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
