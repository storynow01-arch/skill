"""範本廣B 配樂：鋼琴（F 大調 I–vi–IV–V）＋輪轉印刷機節奏，100 BPM。
音效全部對準時間表（timeline.py 依內容算）：印刷機每拍一圈 → 剪紙、落紙、蓋章 → 打字機逐字＋換行鈴 → 圖示每點一個「蓋章」、
圓餅與畫圈的筆刷聲、打勾、滾數字 → 翻頁 → 第二版印刷機越來越快、摺報、丟上報紙堆、斷電 → 報童手搖鈴＋終止和弦。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad11.py。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
rng = np.random.default_rng(1111)


def n(d): return int(d * SR)
def nz(d): return rng.standard_normal(n(d))
def env(d, tau): return M.ex(n(d), tau)


def press_thump(w=1.0):
    d = 0.5; t = M.tt(n(d))
    boom = np.sin(2 * np.pi * np.cumsum(48 + 60 * np.exp(-t * 30)) / SR) * env(d, 0.12)
    clank = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1180, 1), (1730, .7), (2610, .5), (3420, .3)]) * env(d, 0.03)
    hiss = M.bp(nz(d), 2500, 9000) * env(d, 0.06)
    return np.tanh(boom * 1.6) * 0.8 + clank * 0.12 * w + hiss * 0.18 * w


def press_clack(w=1.0):
    d = 0.12; t = M.tt(n(d))
    return (M.hp(nz(d), 1800) * env(d, 0.012) * 0.5 + np.sin(2 * np.pi * 1450 * t) * env(d, 0.02) * 0.3) * w


def rumble(d, beat):
    t = M.tt(n(d))
    x = M.lp(nz(d), 140) * 0.6 + np.sin(2 * np.pi * 50 * t) * 0.15 + np.sin(2 * np.pi * 100 * t) * 0.05
    return x * (0.75 + 0.25 * np.sin(2 * np.pi * t / beat) ** 2)


def snip():
    d = 0.25; return M.hp(nz(d), 3000) * env(d, 0.03) * 0.6 + M.bp(nz(d), 800, 2500) * env(d, 0.06) * 0.4


def paper_slap(d=0.6, low=70):
    t = M.tt(n(d))
    body = np.sin(2 * np.pi * np.cumsum(low + 80 * np.exp(-t * 25)) / SR) * env(d, 0.09)
    return np.tanh(body * 1.8) * 0.7 + M.bp(nz(d), 600, 5000) * env(d, 0.025) * 0.6


def stamp():
    d = 0.5; t = M.tt(n(d))
    body = np.sin(2 * np.pi * np.cumsum(95 + 120 * np.exp(-t * 40)) / SR) * env(d, 0.07)
    return np.tanh(body * 2.2) * 0.75 + M.bp(nz(d), 300, 2200) * env(d, 0.02) * 0.5


def key_click(v=1.0):
    d = 0.14; t = M.tt(n(d)); f = 2100 + rng.uniform(-250, 250)
    return (M.bp(nz(d), 1800, 7000) * env(d, 0.008) * 0.8 + np.sin(2 * np.pi * f * t) * env(d, 0.012) * 0.25
            + np.sin(2 * np.pi * 170 * t) * env(d, 0.02) * 0.6) * v


def carriage_bell():
    d = 1.2; t = M.tt(n(d))
    return sum(np.sin(2 * np.pi * f * t) * a * env(d, dc) for f, a, dc in [(2093, 1, .5), (4186 * 1.003, .35, .25), (6279, .12, .12)]) * 0.25


def pen_scratch(d, rate=11):
    t = M.tt(n(d))
    am = 0.35 + 0.65 * np.abs(np.sin(np.pi * rate * t)) ** 2
    fade = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return M.bp(nz(d), 1600, 6500) * am * fade * 0.28


def flip_sound():
    d = 0.75; t = M.tt(n(d))
    return M.bp(nz(d), 400, 5000) * np.sin(np.pi * t / d) ** 1.5 * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 14 * t))) * 0.5


def crease():
    d = 0.5; N = n(d); x = np.zeros(N)
    for _ in range(70):
        i = int(rng.uniform(0, N - 400)); a = rng.uniform(0.2, 1)
        x[i:i + 300] += M.hp(rng.standard_normal(300), 2500) * np.exp(-np.arange(300) / 40) * a
    return x * np.linspace(1, 0.3, N) * 0.35


def hand_bell(f0=1320, d=1.6):
    t = M.tt(n(d))
    return sum(np.sin(2 * np.pi * f0 * r * t) * a * env(d, dc) for r, a, dc in
               [(1, 1, .9), (2.0, .5, .6), (2.42, .4, .45), (3.0, .25, .3), (4.53, .18, .2), (5.2, .1, .15)]) * 0.22


def powerdown(d=1.3):
    t = M.tt(n(d))
    return np.sin(2 * np.pi * np.cumsum(60 * np.exp(-t * 1.8)) / SR) * env(d, 0.5) * 0.35 + M.lp(nz(d), 300) * env(d, 0.3) * 0.15


F, Dm, Bb, C = 53, 50, 46, 48
CH = {F: [65, 69, 72], Dm: [62, 65, 69], Bb: [62, 65, 70], C: [64, 67, 72]}
PROG = [F, Dm, Bb, C]
MEL_A = [
    [(0, 72, 1), (1, 69, .5), (1.5, 72, .5), (2, 77, 1.5), (3.5, 76, .5)],
    [(0, 74, 1), (1, 69, .5), (1.5, 74, .5), (2, 77, 1), (3, 76, 1)],
    [(0, 74, .5), (.5, 72, .5), (1, 70, 1), (2, 74, 1), (3, 77, 1)],
    [(0, 76, 1.5), (1.5, 74, .5), (2, 72, 1), (3, 67, 1)],
]
MEL_B = MEL_A[:3] + [[(0, 76, 1), (1, 79, 1), (2, 77, 2)]]


def render(tl, wav_path):
    FPS = tl['fps']; BEAT = 60 / tl['bpm']; BAR = BEAT * 4
    MK = tl['marks']; has = tl['has']; TOTAL = tl['frames'] / FPS
    sec = lambda f: f / FPS
    N = int((TOTAL + 2) * SR)
    Lc = np.zeros(N); Rc = np.zeros(N)

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or i < 0: return
        s = sig[:N - i] * g
        Lc[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        Rc[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    def piano_bar(b, t0, mel, energy, octave=0):
        root = PROG[b % 4]
        for bp_, m, dl in mel[b % 4]:
            add(M.piano(m + octave, dl * BEAT * 1.6, 0.9 + 0.2 * energy), t0 + bp_ * BEAT, 0.9, 0.15)
            if energy > 0.7: add(M.piano(m + octave - 12, dl * BEAT * 1.4, 0.6), t0 + bp_ * BEAT, 0.5, 0.1)
        add(M.piano(root - 12, BEAT * 1.2, 0.9), t0, 0.85, -0.2)
        add(M.piano(root - 5 - 12 + (0 if b % 2 else 12), BEAT * 1.0, 0.8), t0 + 2 * BEAT, 0.7, -0.2)
        for bt in (1, 3):
            for m in CH[root]: add(M.piano(m - 12, BEAT * 0.35, 0.7), t0 + bt * BEAT, 0.35, -0.1)
        if energy > 0.4:
            add(M.bass(root - 12, BEAT * 0.9, 'sub'), t0, 0.35)
            add(M.bass(root - 12 + 7, BEAT * 0.9, 'sub'), t0 + 2 * BEAT, 0.3)

    land, end_read = sec(MK['land']), sec(MK['camOut'])
    # 1) 開場印刷機
    add(rumble(land + 0.5, BEAT) * np.linspace(0.4, 1, n(land + 0.5)), 0, 0.5)
    for f in tl['pressA']:
        add(press_thump(), sec(f), 0.85); add(press_clack(), sec(f + 9), 0.5, 0.3); add(press_clack(0.6), sec(f + 4.5), 0.25, -0.3)
    for bp_, m in [(0, 72), (1, 69), (1.5, 72), (2, 77)]:
        add(M.piano(m, 1.4, 0.7), max(0, sec(MK['cut']) - 0.9) + bp_ * BEAT * 0.6, 0.7, 0.1)
    add(snip(), sec(MK['cut']), 0.8); add(M.whoosh(0.9), sec(MK['cut']) + 0.3, 0.8)
    add(paper_slap(), land, 1.0); add(stamp(), sec(MK['stamp']), 1.1)
    # 2) 閱讀段：鋼琴主題；遠處印刷機輕輕喀喀當節拍器；專欄段落疊弦樂
    peak = (sec(MK.get('camChart', MK.get('camPie', MK['camOut']))), sec(MK.get('camCol', MK.get('camAds', MK['camOut']))))
    nb = max(1, int(np.ceil((end_read - land) / BAR)))
    for b in range(nb):
        t0 = land + b * BAR
        if t0 >= end_read: break
        energy = 0.75 if peak[0] - 0.05 <= t0 < peak[1] else (0.5 if t0 >= sec(MK['camHead']) else 0.3)
        piano_bar(b, t0, MEL_B if b % 8 == 7 else MEL_A, energy)
        for i in range(8): add(press_clack(0.5), t0 + i * BEAT / 2, 0.12 if i % 2 else 0.18, 0.4)
        if energy > 0.7: add(M.strings([m - 12 for m in CH[PROG[b % 4]]], BAR * 1.05), t0, 0.35)
    add(M.piano(60, 2.0, 0.8), end_read, 0.6); add(M.piano(64, 2.0, 0.8), end_read, 0.5); add(M.piano(72, 2.4, 0.9), end_read + BEAT, 0.6)
    for i, f in enumerate(tl['typeHead']): add(key_click(1.0), sec(f), 0.9, -0.1 + 0.02 * i)
    add(carriage_bell(), sec(tl['typeHead'][-1] + 6), 0.7, 0.2)
    if tl['typeDeck']:
        for i, f in enumerate(tl['typeDeck']): add(key_click(0.7), sec(f), 0.7, -0.1 + 0.015 * i)
        add(carriage_bell(), sec(tl['typeDeck'][-1] + 5), 0.6, 0.2)
    if has['picto']:
        for f in tl['picto']: add(stamp() * 0.5, sec(f), 0.45)
        for i in range(max(4, len(tl['picto']))): add(M.blip(84 + i % 5, 0.04), sec(tl['picto'][0]) + i * 0.12, 0.5)
    if has['pie']:
        add(pen_scratch(1.4, 6), sec(MK['pie']), 0.6); add(pen_scratch(0.9, 14), sec(MK['note']), 1.0); add(pen_scratch(0.9, 9), sec(MK['ring']), 1.0)
    if has['checklist']:
        for f in tl['checks']: add(pen_scratch(0.22, 20), sec(f), 1.2)
    if has['ad']:
        for i in range(10): add(M.blip(79 + (i % 3) * 2, 0.04), sec(MK['roll10']) + i * 0.12, 0.5)
        add(stamp(), sec(MK['roll10'] + 40), 0.6); add(pen_scratch(0.9, 9), sec(MK['ring10']), 1.0)
    # 3) 翻頁
    add(flip_sound(), sec(MK['flip']), 1.1); add(paper_slap(0.4, 110), sec(MK['flip'] + 36), 0.5)
    # 4) 第二版：鋼琴升八度、印刷機越來越快、摺報、丟
    p2 = sec(MK['p2'])
    for b in range(int((sec(MK['fold']) - p2) / BAR) + 1):
        t0 = p2 + b * BAR
        if t0 >= sec(MK['fold']): break
        piano_bar(b, t0, MEL_A, 0.6, 12)
    for f in tl['photos']: add(stamp(), sec(f), 0.8)
    span = MK['stack'] - MK['p2']
    for f in tl['pressB']:
        u = (f - MK['p2']) / span
        add(press_thump(0.6 + 0.6 * u), sec(f), 0.25 + 0.6 * u ** 1.2)
        if f >= MK['fold']:
            v = (f - MK['fold']) / max(1, MK['stack'] - MK['fold'])
            add(M.piano(72 + (7 if v > 0.5 else 4), 0.3, 0.6 + 0.6 * v), sec(f), 0.35 + 0.5 * v, 0.2)
    add(rumble(sec(span), BEAT) * np.linspace(0.1, 1, n(sec(span))), p2, 0.6)
    add(crease(), sec(MK['fold']), 0.8); add(crease(), sec(MK['crease']), 1.0)
    add(M.riser(sec(MK['stack'] - MK['toss'])), sec(MK['toss']), 0.6); add(M.whoosh(1.0), sec(MK['toss']) + 0.2, 0.9)
    add(paper_slap(0.8, 60), sec(MK['stack']), 1.3); add(powerdown(), sec(MK['stack']), 0.9)
    # 5) 報童手搖鈴＋終止和弦
    for i in range(9):
        add(hand_bell(1320 if i % 2 == 0 else 1336, 1.4), sec(MK['bell']) + i * 0.1, 0.9 - i * 0.05, 0.25 if i % 2 else -0.25)
    t_end = sec(MK['bell']) + 0.3
    for i, m in enumerate([53, 60, 65, 69, 72, 77]): add(M.piano(m, 4.5, 0.9), t_end + i * 0.07, 0.75, -0.2 + 0.08 * i)
    add(M.strings([65, 69, 72], 3.5), t_end, 0.3)
    add(hand_bell(1320, 2.4), sec(MK['bell2']), 0.9)
    add(pen_scratch(0.7, 7), sec(MK['underline']), 1.1)

    Ns = int(round(TOTAL * SR))
    mix = M.master_chain(np.stack([Lc, Rc])[:, :Ns])
    fd = int(1.2 * SR); mix[:, -fd:] *= np.linspace(1, 0, fd)
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
