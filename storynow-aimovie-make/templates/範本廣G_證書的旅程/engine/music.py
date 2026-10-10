"""範本廣G「證書的旅程」配樂與音效：水彩繪本＋音樂盒，90 BPM（一拍 20 格、一小節 80 格）、F 大調。
段落由時間表決定（每小節看它落在哪一頁）：
  開場頁       音樂盒獨奏（紙片在房間角落睡覺 → 醒來「叮鈴」），第 3 小節起淡淡的墊音
  門的頁面     撥弦低音＋豎琴分解和弦＋沙鈴；第 2 道門起加入輕柔弦樂；最後一道門（高潮）弦樂變厚、旋律高八度＋豎琴
               蓋章前弦樂顫音漸強 → 「咚」＋小鈴鐺；高潮章前定音鼓滾奏＋反向鈸，章下去弦樂齊奏
  塗鴉牆       音樂盒主題回來＋弦樂，塗鴉卡一張張貼上（輕咚＋鈴聲上行）、小小掌聲
  收尾         弦樂＋音樂盒合奏的溫暖 F add9 大和弦，淡出
音效全部對準時間表事件：翻頁沙沙（右到左）、紙片被風帶走、門開、穿過門的亮晶晶、蓋章、貼上、蠟筆寫字、眨眼。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad16.py（固定 60 秒）；這裡時間全部改讀時間表，
小朋友笑聲（幼兒園專屬）改成小小掌聲；最後用前瞻峰值限幅壓掉最尖的起音（PEAK_CUT），出片用預設參數峰值就會過。"""
import os, sys, wave
import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
PEAK_CUT = 3.5      # 章聲、撥弦、鈴鐺的起音比整體響度突出太多：瞬間峰值壓低幾 dB（音色不變，只壓最尖的那幾毫秒）

# 每小節一個和弦：F Dm Bb C F Am Bb C
CH = {'F': (41, [65, 69, 72]), 'Dm': (38, [62, 65, 69]), 'Bb': (46, [62, 65, 70]), 'C': (36, [64, 67, 72]),
      'Am': (45, [64, 69, 72]), 'Gm': (43, [62, 67, 70])}
PROG = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C']
MEL_A = [  # (拍, midi, 長度拍)
    [(0, 84, 1), (1, 81, 1), (2, 77, 1), (3, 81, 1)],
    [(0, 86, 1.5), (1.5, 84, .5), (2, 81, 2)],
    [(0, 82, 1), (1, 81, 1), (2, 79, 1), (3, 82, 1)],
    [(0, 81, 2), (2, 79, 2)],
    [(0, 84, 1), (1, 81, 1), (2, 77, 1), (3, 81, 1)],
    [(0, 86, 1), (1, 88, 1), (2, 89, 2)],
    [(0, 86, 1), (1, 84, 1), (2, 82, 1), (3, 81, 1)],
    [(0, 79, 2), (2, 77, 1), (3, 79, 1)],
]


def peak_limit(x, thr, look=0.015, smooth=0.006):
    """前瞻峰值限幅：在峰值前後 look 秒內把增益平滑壓到 thr 以下（不削波、不改音色）"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    g = minimum_filter1d(g, size=2 * int(look * SR) + 1)
    g = uniform_filter1d(g, size=int(smooth * SR) + 1)
    return x * g


def render(tl, wav_path):
    rng = np.random.default_rng(1616)
    BEATF, BARF = tl['beatFrames'], tl['barFrames']
    beat = BEATF / FPS
    bar = BARF / FPS
    DUR = tl['frames'] / FPS
    N = int((DUR + 4) * SR)
    L = np.zeros(N); R = np.zeros(N)
    TURNS, STAMPS, NG = tl['turns'], tl['stamps'], len(tl['stamps'])
    FINAL = tl['final']
    f2s = lambda f: f / FPS
    tt, ex, midi = M.tt, M.ex, M.midi

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N: return
        if i < 0:
            sig = sig[-i:]; i = 0
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    def addpan(sig, t0, g, pan0, pan1):
        """聲像隨時間移動（翻頁從右到左）"""
        i = int(round(t0 * SR))
        if i >= N: return
        s = sig[:N - i] * g
        p = np.linspace(pan0, pan1, len(s))
        L[i:i + len(s)] += s * np.cos((p + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((p + 1) * np.pi / 4) * 1.414

    # ───────────── 樂器 ─────────────
    def musicbox(m, dur=1.6, vel=1.0):
        """音樂盒：金屬簧片＝基音＋不諧和泛音快速衰減＋一點機械喀嗒"""
        n = int(dur * SR); t = tt(n); f = midi(m)
        x = np.sin(2 * np.pi * f * t) * ex(n, 0.9)
        x += 0.22 * np.sin(2 * np.pi * f * 2.0 * t) * ex(n, 0.35)
        x += 0.10 * np.sin(2 * np.pi * f * 5.43 * t) * ex(n, 0.06)
        x += 0.05 * np.sin(2 * np.pi * f * 8.9 * t) * ex(n, 0.03)
        click = M.hp(M.noise(n), 4000) * ex(n, 0.002) * 0.08
        return (x + click) * M.adsr(n, 0.001, 0.05) * 0.2 * vel

    def bell(m, dur=2.0, vel=1.0):
        """小鈴鐺／鐵琴"""
        n = int(dur * SR); t = tt(n); f = midi(m); x = np.zeros(n)
        for h, a, d in [(1, 1, 1.1), (2.76, 0.45, 0.45), (5.4, 0.25, 0.18), (8.93, 0.12, 0.08)]:
            x += a * np.sin(2 * np.pi * f * h * t) * ex(n, d)
        return x * M.adsr(n, 0.001, 0.1) * 0.16 * vel

    def harp(m, dur=1.4, vel=1.0):
        n = int(dur * SR); t = tt(n); f = midi(m); x = np.zeros(n)
        for h in range(1, 7):
            x += (0.9 / h ** 1.3) * np.sin(2 * np.pi * f * h * t) * ex(n, 1.2 / h ** 0.7)
        return x * M.adsr(n, 0.003, 0.08) * 0.13 * vel

    def pizz(m, dur=0.6, vel=1.0):
        """撥弦（Karplus-Strong，低音用）"""
        n = int(dur * SR); f = midi(m); D = max(2, int(round(SR / f)))
        exc = np.zeros(n); burst = M.lp(M.noise(D), 2500); exc[:D] = burst
        a = np.zeros(D + 2); a[0] = 1; a[D] = -0.496; a[D + 1] = -0.496
        y = lfilter([1], a, exc)
        y = M.lp(y, 1800) * ex(n, 0.35)
        y = y / (np.max(np.abs(y)) + 1e-9)
        return y * M.adsr(n, 0.002, 0.08) * 0.28 * vel

    def softstrings(ms, dur, cutoff=2200, atk=0.6):
        n = int(dur * SR)
        x = sum(M.saw(midi(m), n, 0.007, 5) for m in ms) / len(ms)
        vib = 1 + 0.003 * np.sin(2 * np.pi * 5.2 * tt(n))
        return M.lp(x * vib, cutoff) * M.adsr(n, atk, 0.8) * 0.26

    def thump(weight=1.0):
        """溫和的章聲「咚」：木頭＋橡皮，低頻短、不炸"""
        n = int(0.6 * SR); t = tt(n)
        body = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 30)) / SR) * ex(n, 0.13 * weight)
        wood = np.sin(2 * np.pi * 210 * t) * ex(n, 0.035) * 0.5
        nz = M.lp(M.noise(n), 1400) * ex(n, 0.02) * 0.6
        return np.tanh((body + wood + nz) * 1.5) * 0.7

    def rustle(length=1.4):
        """翻頁沙沙聲：紙張摩擦（帶通雜訊＋碎裂顆粒）"""
        n = int(length * SR); t = tt(n)
        env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5
        grain = np.abs(M.noise(n // 300 + 2)); grain = np.repeat(grain, 300)[:n]
        grain = M.lp(grain, 60) * 2.2 + 0.4
        crack = (rng.random(n) > 0.9993) * rng.random(n) * 3
        crack = lfilter([1], [1, -0.985], crack)
        x = M.bp(M.noise(n), 1500, 7500) * grain + M.hp(crack * M.noise(n), 2500) * 0.6
        snap = np.zeros(n); i = int(length * 0.72 * SR)       # 翻到底「啪」一下（很輕）
        snap[i:] = M.bp(M.noise(n - i), 600, 4000) * ex(n - i, 0.03) * 1.2
        return (x * env + snap) * 0.22

    def wind(length=1.4, lo=300, hi=1400):
        """紙片飄動的小風聲"""
        n = int(length * SR); t = tt(n); nz = M.noise(n); out = np.zeros(n); seg = int(0.03 * SR)
        for i in range(0, n, seg):
            u = t[min(i, n - 1)] / length
            fc = lo + (hi - lo) * np.sin(np.pi * u)
            out[i:i + seg] = M.bp(nz[i:i + seg], fc * 0.7, fc * 1.4, 1)
        return out * np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2 * 0.5

    def sparkle(base=89, steps=(0, 4, 7, 12, 16)):
        """穿過門的亮晶晶"""
        n = int(1.8 * SR); x = np.zeros(n)
        for k, s in enumerate(steps):
            i = int(k * 0.045 * SR); b = bell(base + s, 1.2, 0.8 - k * 0.08)
            x[i:i + len(b)] += b[:n - i]
        return x

    def claps(seed, n=7, spread=0.5):
        """小小掌聲：幾個人拍手（各自時間錯開一點、音色亮暗不同）"""
        r = np.random.default_rng(seed)
        out = np.zeros(int((spread + 0.4) * SR))
        for k in range(n):
            for j in range(3):
                c = M.clap() * r.uniform(0.25, 0.5)
                c = M.bp(c, r.uniform(700, 1100), r.uniform(4000, 7000))
                i = int((j * r.uniform(0.13, 0.18) + r.uniform(0, 0.06)) * SR)
                if i < len(out): out[i:i + len(c)] += c[:len(out) - i]
        return out * 0.35

    def crayon(length):
        """蠟筆在紙上寫字：一筆一筆的沙沙"""
        n = int(length * SR)
        strokes = np.zeros(n); k = 0.0
        while k < length:
            d = rng.uniform(0.06, 0.14); i0 = int(k * SR); i1 = min(n, int((k + d) * SR))
            if i1 > i0: strokes[i0:i1] = np.sin(np.pi * np.linspace(0, 1, i1 - i0)) * rng.uniform(0.6, 1)
            k += d + rng.uniform(0.02, 0.06)
        x = M.bp(M.noise(n), 2500, 8000) * strokes
        return x * 0.09

    def tremolo_rise(length, ms):
        """蓋章前：弦樂顫音漸強"""
        n = int(length * SR); t = tt(n)
        x = sum(M.saw(midi(m), n, 0.006, 3) for m in ms) / len(ms)
        trem = 0.6 + 0.4 * np.sin(2 * np.pi * 12 * t)
        return M.lp(x, 2400) * trem * (t / length) ** 2 * 0.22

    def revcym(length):
        n = int(length * SR); t = tt(n)
        return M.hp(M.noise(n), 5000) * (t / length) ** 3 * 0.18

    def timp_roll(length, m=41):
        n = int(length * SR); x = np.zeros(n); k = 0.0
        while k < length:
            u = k / length
            h = M.tom(midi(m), 0.4)[:int(0.4 * SR)] * (0.15 + 0.85 * u ** 2)
            i = int(k * SR); x[i:i + len(h)] += h[:n - i] * 0.35
            k += 0.055
        return x

    # ───────────── 段落：每小節看它（中點）落在哪一頁 ─────────────
    def section(b):
        fm = b * BARF + BARF // 2
        if fm < TURNS[0]: return 'intro'
        if fm >= TURNS[NG]: return 'wall'
        page = max(i for i in range(NG) if fm >= TURNS[i])      # 第幾道門的頁面
        if NG > 1 and page == NG - 1: return 'climax'
        return 'strings' if page >= 1 else 'groove'

    nb = int(np.ceil(FINAL / BARF))
    tF = f2s(FINAL)
    groove_count = 0

    def melody_bar(b, gain, octave=0, inst=musicbox, pan=0.15):
        for (bp, m, d) in MEL_A[b % 8]:
            t0 = b * bar + bp * beat
            if t0 < tF - 0.05: add(inst(m + octave, max(1.2, d * beat * 2)), t0, gain, pan)

    for b in range(nb):
        sec = section(b)
        r, ch = CH[PROG[b % 8]]
        t0 = b * bar
        if sec == 'intro':
            melody_bar(b, 1.0)
            add(musicbox(ch[0] - 12, 1.4, 0.5), t0 + 2 * beat, 0.6, -0.3)    # 低一點的伴奏音
            if b >= 2: add(M.pad([m - 12 for m in ch], bar + 0.4, 900, 0.004, 0.8), t0, 0.35)
            continue
        # 門的頁面與塗鴉牆：撥弦低音＋豎琴分解和弦
        add(pizz(r, 0.7), t0, 0.9, -0.1)
        if t0 + 2 * beat < tF: add(pizz(r + 7, 0.6), t0 + 2 * beat, 0.7, -0.1)
        arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[0] + 12, ch[1] + 12]
        for s, m in enumerate(arp):
            ts = t0 + s * beat / 2
            if ts < tF - 0.05: add(harp(m, 1.2, 0.8 if s % 2 else 1.0), ts, 0.55 if sec != 'wall' else 0.4, 0.35 if s % 2 else -0.05)
        if sec in ('strings', 'climax'):
            add(softstrings([m - 12 for m in ch] + [ch[0]], bar + 0.5, 1500 + 900 * (sec == 'climax'), 0.5), t0, 0.7 + 0.35 * (sec == 'climax'), -0.2)
        if sec == 'climax':
            add(softstrings([ch[2] + 12], bar + 0.4, 2600, 0.3), t0, 0.35, 0.3)
        if sec != 'wall' and b % 2 == 0:
            for k in range(8):
                if t0 + k * beat / 2 < tF: add(M.shaker(), t0 + k * beat / 2, 0.35 if k % 2 else 0.2, 0.4)
        # 旋律
        if sec == 'groove':
            melody_bar(b, 0.85)
        elif sec == 'strings':
            melody_bar(b, 0.8)
            m0 = MEL_A[b % 8][0]
            add(bell(m0[1] + 12, 1.5, 0.6), t0 + m0[0] * beat, 0.5, 0.4)
        elif sec == 'climax':
            melody_bar(b, 0.8, 12)
            melody_bar(b, 0.5, 0, harp, -0.2)
        else:
            melody_bar(b, 1.0)
            add(softstrings([m - 12 for m in ch], bar + 0.5, 1400, 0.7), t0, 0.55, -0.2)

    # 收尾：溫暖大和弦（弦樂＋音樂盒＋墊音），F add9
    rest = DUR - tF + 1.0
    voic = [41, 48, 53, 57, 60, 67, 69, 72]
    add(softstrings(voic, rest, 2400, 0.25), tF, 1.6, 0)
    add(M.pad([53, 57, 60, 67], rest, 1500, 0.005, 0.4), tF, 0.7)
    add(pizz(29 + 12, 1.2), tF, 1.2)
    add(M.tom(midi(41), 0.9), tF, 0.35)
    for k, m in enumerate([77, 81, 84, 89, 91, 93, 96]):
        add(musicbox(m, 2.5, 0.9), tF + 0.16 * k, 0.9, -0.3 + 0.1 * k)
    for k, m in enumerate([89, 84, 81, 77]):
        if tF + 2.0 + 0.4 * k < DUR - 0.8: add(musicbox(m, 3.0, 0.8), tF + 2.0 + 0.4 * k, 0.8, 0.2)
    add(bell(101, 3, 0.7), tF, 0.6, 0.3)

    # ───────────── 音效（對畫面） ─────────────
    # 醒來：鈴鐺上行＋飄起來、飛向窗戶的小風
    add(sparkle(84, (0, 4, 7, 12)), f2s(tl['wake']), 0.9, -0.2)
    add(wind(1.2, 300, 900), f2s(tl['float'][0]), 0.6, -0.2)
    add(wind(1.0, 500, 1300), f2s(tl['toWindow'][0]), 0.6, 0.4)
    # 翻頁：沙沙從右到左＋紙片被帶走的風
    for T in TURNS:
        addpan(rustle(1.6), f2s(T) - 0.1, 1.0, 0.6, -0.6)
        addpan(wind(1.5, 350, 1500), f2s(T + tl['swoopDelay']), 0.75, 0.4, -0.4)
    # 飛向門、門打開、穿過門
    for i, (fo, go, gp) in enumerate(zip(tl['fly'], tl['gateOpen'], tl['gatePass'])):
        addpan(wind(1.2, 400, 1600), f2s(fo), 0.6, -0.5, 0.4)
        add(harp(72 + 2 * (i % 3), 1.0) + harp(79 + 2 * (i % 3), 1.0), f2s(go), 0.7, 0.2)     # 門「咿」開
        add(sparkle(86 + 2 * (i % 3)), f2s(gp), 0.9, 0.2)
    # 蓋章：前兩拍顫音、咚、小鈴鐺；最後一道門（高潮）加定音鼓滾奏與反向鈸
    for i, S in enumerate(STAMPS):
        ts = f2s(S)
        r, ch = CH[PROG[(S // BARF) % 8]]
        if i < NG - 1 or NG == 1:
            add(tremolo_rise(2 * beat, [ch[0], ch[2]]), ts - 2 * beat, 0.8, 0.1)
            add(thump(1.0), ts, 1.0)
            add(bell(96, 2.0), ts + 0.03, 0.9, 0.25)
            add(bell(101, 1.5), ts + 0.2, 0.6, 0.35)
        else:
            add(timp_roll(4 * beat), ts - 4 * beat, 0.9)
            add(revcym(4 * beat), ts - 4 * beat, 1.0, 0.1)
            add(tremolo_rise(4 * beat, [ch[0], ch[1], ch[2] + 12]), ts - 4 * beat, 1.0)
            add(thump(1.5), ts, 1.4)
            add(M.tom(midi(41), 0.8), ts, 0.6)
            for k, m in enumerate([89, 93, 96, 101]):
                add(bell(m, 2.2), ts + 0.03 + 0.07 * k, 0.8, -0.3 + 0.2 * k)
            add(softstrings([53, 60, 65, 69, 72], 2.5, 3000, 0.02), ts, 0.9)
    # 最後一頁：貼上（輕咚）、塗鴉卡貼上（噗＋鈴上行）、掌聲、害羞
    add(thump(0.6), f2s(tl['pin']), 0.6)
    add(wind(1.2, 400, 1300), f2s(TURNS[NG] + tl['swoopDelay'] + 20), 0.5, 0)
    DR = tl['draws']
    up = [84, 88, 91, 96, 100, 103, 108]
    for k, d in enumerate(DR):
        pan = -0.4 + 0.8 * k / max(1, len(DR) - 1)
        add(thump(0.35), f2s(d), 0.35, pan)
        add(bell(up[min(k, len(up) - 1)] - (12 if len(DR) > 5 and k < 3 else 0), 1.6), f2s(d) + 0.02, 0.8 if len(DR) <= 4 else 0.6, pan)
    for k, c in enumerate(tl['claps']):
        add(claps(c * 7 + k), f2s(c), 0.55 if k != 1 else 0.4, (-0.3, 0.3, 0)[k % 3])
    add(musicbox(93, 1.2, 0.6), f2s(tl['shy']), 0.6, 0.3); add(musicbox(96, 1.2, 0.6), f2s(tl['shy']) + 0.12, 0.6, 0.3)
    # 眨眼：極輕的「啵」
    for b_ in tl['blinks']:
        add(musicbox(101, 0.3, 0.25), f2s(b_), 0.35, 0.3)
    # 蠟筆寫字
    for a, b_ in tl['writes'].values():
        add(crayon(f2s(b_ - a)), f2s(a), 1.0, 0.2)

    # ───────────── 母帶 ─────────────
    mix = np.vstack([L, R])
    mix = M.master_chain(mix)
    mix = peak_limit(mix / (np.max(np.abs(mix)) + 1e-9), 10 ** (-PEAK_CUT / 20))   # 瞬間峰值壓掉，出片用預設限幅就過
    n = int(round(DUR * SR))
    mix = mix[:, :n]
    fade = int(1.3 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    render(m.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
