"""範本廣C 配樂與音效：冷爵士偵探感（100 BPM）。低音提琴 walking bass（Dm9–B♭maj7–Gm7–A7♭9）、刷鼓＋ride、電鋼琴、鐵琴、
弱音小號主題（線索段落）；通知出現時音樂抽空、只剩低音與越來越快的時鐘滴答＋刷鼓滾奏，「核准」章蓋下全樂團爆發，
檔案闔上齊奏重音，最後 ba-DUM 收尾。拆封條、紙張滑動、打字機每個字（行尾叮＋回車）、手寫、迴紋針、圖釘、蓋章都對準時間表。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad12.py（固定 60 秒）；這裡段落位置全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
rng = np.random.default_rng(1212)
ex, nz, tt = M.ex, M.noise, M.tt


def key_click(v=1.0):
    n = int(0.09 * SR); t = tt(n)
    snap = M.hp(nz(n), 2500) * ex(n, 0.004) * 0.9
    body = np.sin(2 * np.pi * (170 + 40 * v) * t) * ex(n, 0.018) * 0.7
    slug = M.bp(nz(n), 900, 2400) * ex(n, 0.012) * 0.5
    ring = np.sin(2 * np.pi * 3100 * t) * ex(n, 0.03) * 0.06
    return (snap + body + slug + ring) * 0.55


def ding():
    n = int(1.2 * SR); t = tt(n)
    return sum(a * np.sin(2 * np.pi * 2093 * r * t) * ex(n, d) for r, a, d in [(1, 1, 0.7), (2.76, 0.4, 0.3), (5.4, 0.15, 0.12)]) * 0.22


def ratchet(length=0.3):
    out = np.zeros(int(length * SR) + 2000)
    for i in range(14):
        j = int(i / 14 * length * SR); out[j:j + 600] += M.hp(nz(600), 2000) * ex(600, 0.002) * 0.35
    return out


def paper_slide(length=0.55, bright=1.0):
    n = int(length * SR); t = tt(n)
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5
    return M.bp(nz(n), 900, 6500 * bright) * env * 0.35 + M.lp(nz(n), 500) * env * 0.25


def thud(f=85, g=1.0):
    n = int(0.5 * SR); t = tt(n)
    b = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-t * 30))) / SR) * ex(n, 0.09)
    return np.tanh((b + M.lp(nz(n), 1200) * ex(n, 0.02) * 0.6) * 1.5) * 0.6 * g


def stamp_hit(big=False):
    n = int((1.6 if big else 0.6) * SR); t = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t * 25)) / SR) * ex(n, 0.25 if big else 0.12)
    x = np.tanh((boom * 1.6 + M.bp(nz(n), 400, 5000) * ex(n, 0.015) + np.sin(2 * np.pi * 210 * t) * ex(n, 0.05) * 0.4) * 1.4) * 0.8
    if big: x = x + M.impact(1.6, 1.2)[:n] * 0.6
    return x


def rip(length=0.62):
    n = int(length * SR); out = np.zeros(n)
    for _ in range(90):
        j = int(rng.uniform(0, 0.9) * n); m = min(int(rng.uniform(0.004, 0.02) * SR), n - j)
        out[j:j + m] += M.bp(nz(m), 1500, 9000) * ex(m, 0.006) * rng.uniform(0.3, 1)
    env = np.clip(tt(n) / 0.05, 0, 1) * np.clip((length - tt(n)) / 0.1, 0, 1)
    return out * env * 0.6 + M.bp(nz(n), 2500, 7000) * env * 0.12


def pin_push():
    n = int(0.3 * SR); t = tt(n)
    return np.sin(2 * np.pi * 4200 * t) * ex(n, 0.02) * 0.25 + M.lp(nz(n), 900) * ex(n, 0.03) * 0.6 + np.sin(2 * np.pi * 140 * t) * ex(n, 0.04) * 0.4


def clip_snap():
    n = int(0.45 * SR); x = np.zeros(n)
    for off in (0, 0.06):
        j = int(off * SR); m = n - j
        x[j:] += M.hp(nz(m), 3000) * ex(m, 0.003) * 0.8 + np.sin(2 * np.pi * 2650 * tt(m)) * ex(m, 0.08) * 0.12
    return x * 0.6


def scribble(length, rate=9.0):
    n = max(1, int(length * SR)); t = tt(n)
    strokes = (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + np.sin(2 * np.pi * 2.3 * t) * 2)) ** 2
    edge = np.clip(t / 0.03, 0, 1) * np.clip((length - t) / 0.05, 0, 1)
    return M.bp(nz(n), 2500, 8000) * strokes * edge * 0.28


def clock_tick(hi):
    n = int(0.05 * SR); return M.bp(nz(n), 2500 if hi else 1800, 7000) * ex(n, 0.004) * 0.35


def lamp_click():
    n = int(0.2 * SR); return (M.hp(nz(n), 1500) * ex(n, 0.003) + np.sin(2 * np.pi * 900 * tt(n)) * ex(n, 0.01) * 0.3) * 0.7


def crash(length=2.6):
    n = int(length * SR); return M.hp(nz(n), 4500, 2) * ex(n, 0.9) * 0.35


def upright(m, dur):
    n = int(dur * SR); t = tt(n); f = M.midi(m)
    x = sum(a * np.sin(2 * np.pi * f * h * t) * ex(n, d) for h, a, d in [(1, 1, 0.6), (2, 0.5, 0.25), (3, 0.22, 0.12), (4, 0.1, 0.06)])
    return np.tanh((x + M.lp(nz(n), 300) * ex(n, 0.015) * 0.5) * 1.3) * np.clip((dur - t) / 0.04, 0, 1) * 0.5


def vibe(ms, dur):
    n = int(dur * SR); t = tt(n)
    x = sum(np.sin(2 * np.pi * M.midi(m) * t) + 0.1 * np.sin(2 * np.pi * M.midi(m) * 4 * t) * ex(n, 0.2) for m in ms) / len(ms)
    return x * ex(n, 1.4) * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)) * 0.22


def brush_swish(dur):
    n = int(dur * SR); t = tt(n)
    return M.bp(nz(n), 1800, 9000) * np.clip(t / 0.06, 0, 1) * ex(n, 0.18) * 0.22


def muted_tp(m, dur):
    n = int(dur * SR); t = tt(n); f = M.midi(m) * (1 + 0.003 * np.sin(2 * np.pi * 5 * t) * np.clip(t - 0.15, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = M.bp(sum(np.sin(ph * h) / h ** 0.9 for h in range(1, 9)), 700, 2600)
    return np.tanh(x * 1.6) * M.adsr(n, 0.03, 0.08) * 0.16


CH = [(38, [53, 57, 60, 64]), (46, [53, 57, 58, 62]), (43, [55, 58, 62, 65]), (45, [55, 58, 61, 64])]


def fold(m):
    while m > 50: m -= 12
    while m < 33: m += 12
    return m


def render(tl, wav_path):
    FPS = tl['fps']; BEAT = 60 / tl['bpm']; BAR = BEAT * 4
    EV, TYPE, HAND = tl['ev'], tl['type'], tl['hand']
    F = lambda fr: fr / FPS
    TOTAL = tl['frames'] / FPS
    N = int(round(TOTAL * SR))
    mus = np.zeros((2, N + SR * 4)); fx = np.zeros((2, N + SR * 4))

    def put(buf, t, sig, g=1.0, pan=0.0):
        i = int(t * SR)
        if i < 0 or i >= N: return
        s = sig[:buf.shape[1] - i] * g
        buf[0, i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        buf[1, i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    sw = BEAT * 0.64
    ride = M.hp(M.hat(True, 0.55), 3200)
    s_stamp, s_drop, s_closed, s_btn = F(EV['stamp']), F(EV['drop']), F(EV['closed']), F(EV['button'])
    clue_a = F(EV.get('map', EV.get('pol1', EV.get('sticky', EV['underline']))))
    clue_b = F(EV.get('pullback', EV.get('check', EV['letter'])))
    swell = F(EV.get('pullback', EV['letter'] - 72))
    for b in range(int(TOTAL / BAR) + 1):
        t0 = b * BAR
        if t0 >= s_btn: break
        r, ch = CH[b % 4]; nr = CH[(b + 1) % 4][0]
        third = 3 if b % 4 in (0, 2) else 4
        walk = [fold(r), fold(r + third), fold(r + 7), fold(nr + (1 if b % 2 else -1))]
        intro = t0 < BAR * 0.99
        dropped = s_drop - 0.01 <= t0 < s_stamp - 0.01
        shout = s_stamp - 0.01 <= t0 < s_closed - 0.01
        coda = t0 >= s_closed - 0.01
        if not intro:
            if dropped:
                for i in range(4): put(mus, t0 + i * BEAT, upright(38, BEAT * 0.95), 0.5 + 0.1 * i)
            else:
                for i, m in enumerate(walk): put(mus, t0 + i * BEAT, upright(m, BEAT * 0.92), 0.85)
                if b % 2 == 1 and not shout: put(mus, t0 + 3 * BEAT + sw, upright(walk[3] + 2, BEAT * 0.3), 0.4)
        if not intro and not dropped:
            for i in range(4):
                put(mus, t0 + i * BEAT, ride, 0.26 if not shout else 0.38, 0.35)
                if i % 2 == 1:
                    put(mus, t0 + i * BEAT + sw, ride, 0.18 if not shout else 0.3, 0.35)
                    put(mus, t0 + i * BEAT, brush_swish(BEAT * 0.9), 0.9 if not shout else 0.5, -0.25)
                    put(mus, t0 + i * BEAT, M.hat(), 0.5, -0.1)
            if shout:
                put(mus, t0, M.kick(0.6, 0.12), 0.7); put(mus, t0 + 2 * BEAT + sw, M.kick(0.5, 0.1), 0.5)
                put(mus, t0 + BEAT, M.snare(220, 0.08, 5000), 0.35); put(mus, t0 + 3 * BEAT, M.snare(220, 0.08, 5000), 0.35)
        if not intro and not dropped and not shout:
            if b >= 2:
                put(mus, t0 + BEAT + sw, M.epiano(ch, BEAT * 1.1), 0.5, -0.3)
                if b % 2 == 0: put(mus, t0 + 3 * BEAT, M.epiano(ch, BEAT * 0.7), 0.35, -0.3)
            if b % 4 == 1: put(mus, t0, vibe([m + 12 for m in ch], BAR), 0.9, 0.3)
        if clue_a - 0.01 <= t0 < clue_b and b % 4 in (3, 0) and not dropped:
            mel = [(0, 74, 0.5), (0.66, 77, 0.4), (1.0, 76, 0.5), (1.66, 74, 0.3), (2.0, 73, 1.4)] if b % 4 == 3 else \
                  [(0.66, 69, 0.4), (1.0, 72, 0.4), (1.66, 74, 0.4), (2.0, 77, 0.6), (3.0, 76, 0.9)]
            for st, m, d in mel: put(mus, t0 + st * BEAT, muted_tp(m, d * BEAT * 1.6), 1.0, 0.15)
        if coda: put(mus, t0 + BEAT + sw, M.epiano(ch, BEAT), 0.4, -0.3)
    # 拉遠時的銅管漸強（一小節）
    n = int(BAR * SR); put(mus, swell, M.brass([m + 12 for m in CH[3][1]], BAR) * np.linspace(0.2, 1, n), 0.45)
    # 爆發（章蓋下那一刻）＋之後的銅管齊奏
    for st, d, g in [(0, 1.8, 1.0), (2.64, 0.4, 0.7), (3.64, 0.9, 0.8), (4.64, 0.4, 0.7), (5.64, 0.4, 0.6)]:
        t = s_stamp + st * BEAT
        if t < s_closed:
            put(mus, t, M.brass([62, 65, 69, 72, 76] if st == 0 else [65, 69, 72, 77], d * (1 if st == 0 else BEAT * 1.4)), 0.8 * g)
            put(mus, t, M.brass([50, 57, 60, 64], d * (1 if st == 0 else BEAT * 1.4)), 0.5 * g)
    put(mus, s_stamp, upright(38, 1.2), 1.2); put(mus, s_stamp, crash(), 1.0, 0.2); put(mus, s_stamp, M.kick(1.0, 0.25), 1.0)
    put(mus, s_closed, M.brass([62, 65, 69, 72], 0.6), 0.7); put(mus, s_closed, upright(38, 0.6), 1.0); put(mus, s_closed, crash(1.5), 0.6, -0.2)
    put(mus, s_btn - BEAT * 0.36, M.brass([64, 69, 72], 0.18), 0.6); put(mus, s_btn - BEAT * 0.36, upright(45, 0.2), 0.8)
    put(mus, s_btn, M.brass([62, 65, 69, 72, 76], 1.6), 0.85); put(mus, s_btn, M.brass([50, 57, 60, 64], 1.6), 0.5)
    put(mus, s_btn, upright(38, 1.4), 1.1); put(mus, s_btn, M.kick(0.9, 0.2), 0.9); put(mus, s_btn, crash(1.8), 0.7)
    put(mus, s_btn, vibe([74, 77, 81, 84], 1.6), 0.8)
    # 時鐘滴答：開頭與抽空段（越來越快）
    for i in range(int(F(EV['folderLand']) / (BEAT / 2)) + 1): put(fx, i * BEAT / 2, clock_tick(i % 2 == 0), 0.8, 0.5)
    t = s_drop; i = 0; span = max(0.5, s_stamp - s_drop)
    while t < s_stamp - 0.12:
        put(fx, t, clock_tick(i % 2 == 0), 1.0 + (t - s_drop) / 3, 0.5)
        u = (t - s_drop) / span
        t += BEAT / (2 + 4 * max(0, u - 0.3) / 0.7); i += 1
    put(fx, s_stamp - BAR, M.riser(BAR - 0.08), 0.5)
    for j in range(24):
        tj = s_stamp - BAR + j * BAR / 24
        if tj < s_stamp - 0.1: put(mus, tj, M.snare(240, 0.05, 6000), 0.06 + 0.22 * j / 24, -0.2)

    # 畫面音效
    put(fx, F(EV['lamp']), lamp_click(), 1.0)
    put(fx, F(EV['folderIn']), paper_slide(1.0, 0.8), 1.0, -0.4); put(fx, F(EV['folderLand']), thud(70, 1.2), 1.0)
    put(fx, F(EV['secret']), stamp_hit(), 0.8, 0.1); put(fx, F(EV['rip']), rip(), 1.0, 0.2)
    put(fx, F(EV['flap']), M.whoosh(0.9), 1.0, -0.5); put(fx, F(EV['flap'] + 28), thud(110, 0.5), 1.0, -0.6)
    for k_ in ('doc1', 'map', 'pol1', 'pol2', 'check', 'letter'):
        if k_ in EV: put(fx, F(EV[k_]), paper_slide(0.7), 0.9, 0.3 if k_ in ('map', 'pol1') else -0.2)
    for k_ in ('pol1', 'pol2'):
        if k_ in EV: put(fx, F(EV[k_] + 20), thud(160, 0.25), 1.0)
    if 'circle' in EV and tl['d']['brief'].get('circle'): put(fx, F(EV['circle']), scribble(0.85, 4), 1.0)
    if tl['d']['brief'].get('underline'): put(fx, F(EV['underline']), scribble(0.5, 2), 1.0)
    if 'route' in EV: put(fx, F(EV['route']), scribble(1.6, 1.2), 0.8, 0.2); put(fx, F(EV['pinJP']), pin_push(), 1.0, 0.2)
    for k_, h in HAND.items(): put(fx, F(h['start']), scribble(F(h['end'] - h['start']), 7), 1.0, 0.1)
    for k_ in ('pol1', 'pol2', 'sticky'):
        if 'pin_' + k_ in EV: put(fx, F(EV['pin_' + k_]), pin_push(), 1.0, 0.2)
    if 'clip' in EV: put(fx, F(EV['clip']), clip_snap(), 1.0, -0.2)
    if 'sticky' in EV: put(fx, F(EV['sticky']), thud(220, 0.35), 1.0, 0.3); put(fx, F(EV['sticky']), M.whoosh(0.3), 0.6)
    for k_ in ('tick1', 'tick2'):
        if k_ in EV: put(fx, F(EV[k_]), scribble(0.35, 5), 1.3)
    if 'pullback' in EV: put(fx, F(EV['pullback']), M.whoosh(1.4), 0.6)
    put(fx, F(EV['stampLift']), M.whoosh(1.0), 0.4); put(fx, F(EV['stamp']), stamp_hit(True), 1.2)
    put(fx, F(EV['sweep']), M.whoosh(1.1), 1.0); put(fx, F(EV['sweep']), paper_slide(1.1), 0.8)
    put(fx, F(EV['close']), M.whoosh(0.9), 0.8, -0.4); put(fx, F(EV['closed']), thud(70, 1.3), 1.0)
    put(fx, F(EV['school']), stamp_hit(), 0.9)
    for key_, ty in TYPE.items():
        txt, st, step = ty['text'], ty['start'], ty['step']
        for i, c in enumerate(txt):
            v = rng.uniform(0.6, 1.0)
            put(fx, F(st + i * step), key_click(v), (0.5 if c in ' 　' else 0.85) * v, rng.uniform(-0.3, 0.3))
        end = st + len(txt) * step
        if key_ not in ('url', 'b1e', 'l1', 'label'):
            put(fx, F(end + 2), ding(), 0.9, 0.4); put(fx, F(end + 6), ratchet(), 0.8, 0.4)

    mix = M.master_chain(mus[:, :N]) * 0.55 + fx[:, :N] * 0.75
    fd = int(1.2 * SR); mix[:, -fd:] *= np.linspace(1, 0, fd) ** 1.5
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
