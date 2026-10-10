"""範本廣M「特調剖面」配樂與音效：90 BPM 輕鬆 lounge（F 大調 Fmaj9–Am7–Dm9–Bbmaj7：電鋼琴切分和弦＋sub 低音＋刷鼓、沙鈴），
倒液體（杯子越滿聲音越高）、冰塊叮噹＋濺水、攪拌碰杯、氣泡嘶嘶、顏色反應閃光音、檸檬片「啵」、薄荷葉沙沙、吸管、蓋章、推鏡咻——
全部對準時間表的事件（同一份 timeline）。
段落：開場只有電鋼琴長和弦＋沙鈴 → 第一層開始進低音與鼓 → 高潮（顏色反應那一層，沒有就最後一層液體）全樂團＋弦樂墊＋顫音琴旋律，到「完成」→
「完成」後回到一般編制 → 黑板前 1 秒收成長和弦＋顫音琴琶音，尾巴淡出。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 video/audio/adH5.py（固定 30 秒）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 90
BEAT = 60 / BPM               # 0.6667 秒＝20 格
BAR = BEAT * 4                # 80 格
PEAK_CUT = 1.0                # 母帶先用真峰值（4 倍超取樣）正規化，再只壓最尖的 1 dB（冰塊叮、蓋章的幾毫秒，音色不變）


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：玻璃叮、氣泡爆裂的高頻在取樣點之間會冒出額外的峰"""
    from scipy.signal import resample_poly
    up = np.abs(resample_poly(x, os_, 1, axis=1)).max(axis=0)
    n = x.shape[1]
    return up[:n * os_].reshape(n, os_).max(axis=1)


def peak_limit(x, thr, look=0.015, smooth=0.006):
    """前瞻真峰值限幅：在峰值前後 look 秒內把增益平滑壓到 thr 以下（不削波、不改音色）"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = true_peak_env(x)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    g = minimum_filter1d(g, size=2 * int(look * SR) + 1)
    g = uniform_filter1d(g, size=int(smooth * SR) + 1)
    return x * g


def ride(x, win=3.0, amount=0.5, cap_db=4.0):
    """慢速音量騎乘：用 3 秒滑動 RMS 把安靜段（開場只有電鋼琴）拉近高潮段，響度範圍（LRA）壓到 9 以下。
    LRA 超過 9 時出片的 loudnorm 會退回動態模式，峰值改由 alimiter 決定（實測 −2.3 dBTP，餘裕太小）；
    壓到 9 以下才走線性模式，峰值照真峰值母帶算。每秒變化很慢，聽起來是混音，不是壓縮器的抽吸。"""
    from scipy.ndimage import uniform_filter1d
    e = np.sqrt(uniform_filter1d((x ** 2).mean(axis=0), size=int(win * SR)) + 1e-12)
    ref = np.percentile(e[e > e.max() * 0.05], 80)
    g_db = np.clip(-20 * np.log10(e / ref) * amount, -cap_db, cap_db)
    g_db = uniform_filter1d(g_db, size=int(1.0 * SR))
    return x * 10 ** (g_db / 20)


# ───── 自製聲音（照原作）─────
def vibe(m, dur=1.4, vel=1.0):
    """顫音琴：正弦＋第 4 泛音，慢顫音"""
    n = int(dur * SR); t = M.tt(n); f = M.midi(m)
    x = np.sin(2 * np.pi * f * t) * M.ex(n, 0.9) + 0.22 * np.sin(2 * np.pi * f * 4 * t) * M.ex(n, 0.12)
    x *= 1 + 0.18 * np.sin(2 * np.pi * 5.2 * t)
    return x * M.adsr(n, 0.002, 0.1) * 0.18 * vel


def glass_tink(f0=2400, dec=0.5, amp=1.0):
    """玻璃叮：不和諧泛音"""
    n = int(dec * 3 * SR); t = M.tt(n); x = np.zeros(n)
    for r, a, d in [(1, 1, dec), (2.32, 0.6, dec * 0.6), (4.1, 0.35, dec * 0.35), (6.3, 0.2, dec * 0.2)]:
        x += a * np.sin(2 * np.pi * f0 * r * t + r) * M.ex(n, d)
    x += M.hp(M.noise(n), 4000) * M.ex(n, 0.004) * 0.4
    return x * 0.12 * amp


def thud(f=110, dec=0.12):
    n = int(0.4 * SR); t = M.tt(n)
    body = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t * 40))) / SR) * M.ex(n, dec)
    return (body + M.lp(M.noise(n), 600) * M.ex(n, 0.03) * 0.4) * 0.35


def pour(dur, fill0, fill1, amp=1.0, seed=1):
    """倒液體：帶通噪音＋咕嘟小氣泡；杯子越滿共鳴越高"""
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = M.tt(n); nz = r.standard_normal(n); out = np.zeros(n); seg = int(0.04 * SR)
    for i in range(0, n, seg):
        p = fill0 + (fill1 - fill0) * (i / n)
        fc = 500 + p * 1400
        out[i:i + seg] = M.bp(nz[i:i + seg], fc * 0.5, fc * 1.8, 1)
    am = 0.75 + 0.25 * np.sin(2 * np.pi * 7.3 * t) * np.sin(2 * np.pi * 2.1 * t)
    env = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    x = out * am * env * 0.5
    for _ in range(int(dur * 14)):   # 咕嘟
        t0 = r.uniform(0.05, max(0.06, dur - 0.1)); f = r.uniform(380, 900) * (1 + fill1 * 0.6)
        m = int(0.05 * SR); tt_ = M.tt(m)
        b = np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * tt_ / 0.05)) / SR) * M.ex(m, 0.012) * 0.22
        j = int(t0 * SR); x[j:j + m] += b[:max(0, n - j)]
    return x * amp


def splash(amp=1.0, seed=3):
    r = np.random.default_rng(seed)
    n = int(0.35 * SR)
    x = M.bp(r.standard_normal(n), 1200, 9000) * M.ex(n, 0.06) * 0.35
    x = x + thud(160, 0.05)[:n] * 0.5
    return x * amp


def fizz(dur, amp=1.0, seed=9):
    """氣泡嘶嘶：高頻噪音＋稀疏爆裂聲"""
    r = np.random.default_rng(seed)
    n = int(dur * SR); t = M.tt(n)
    x = M.hp(r.standard_normal(n), 5000) * 0.06
    imp = np.zeros(n)
    idx = r.integers(0, n, int(dur * 220))
    imp[idx] = r.uniform(-1, 1, len(idx))
    x += M.hp(imp, 3000) * 0.5
    env = np.clip(t / 0.3, 0, 1) * np.exp(-t / (dur * 0.55))
    return x * env * amp


def pop():
    """檸檬片「啵」：音高快速下滑"""
    n = int(0.12 * SR); t = M.tt(n)
    f = 950 * np.exp(-t * 28) + 260
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * M.ex(n, 0.03)
    return x * 0.5


def rustle(seed=4):
    r = np.random.default_rng(seed)
    n = int(0.18 * SR); t = M.tt(n)
    return M.bp(r.standard_normal(n), 2500, 8000) * np.sin(np.pi * t / 0.18) ** 2 * 0.18


def stamp():
    return M.kick(1.1, 0.18, 55) * 0.7


# (根音, 和弦音) 一小節一個：F 大調 lounge
CH = [
    (41, [57, 60, 64, 67]),   # Fmaj9 色彩
    (45, [55, 60, 64, 67]),   # Am7
    (38, [53, 57, 60, 64]),   # Dm9
    (46, [57, 62, 65, 69]),   # Bbmaj7
]


def render(tl, wav_path):
    MK = tl['marks']
    ST = tl['steps']
    FR = tl['frames']
    DUR = FR / FPS
    N = int(DUR * SR)
    L = np.zeros(N + SR * 4); R = np.zeros(N + SR * 4)
    fr = lambda f: f / FPS

    def add(sig, t0, g=1.0, pan=0.0, buf=None):
        A, B = buf if buf else (L, R)
        i = int(round(t0 * SR))
        if i < 0 or i >= len(A): return
        s = sig[:len(A) - i] * g
        A[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        B[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    # ───── 樂曲 ─────
    K = M.kick(0.55, 0.14, 50)
    SN = M.hp(M.snare(240, 0.07, 3500), 400)
    HH = M.hat(False, 0.7)
    SH = M.shaker()
    first, drop, reveal, logo = MK['first'], MK['drop'], MK['reveal'], MK['logo']
    full_from = drop - (drop % 20)            # 全樂團從高潮那一拍開始（落在拍上）
    nbars = int(np.ceil(DUR / BAR)) + 1
    for b in range(nbars):
        t0 = b * BAR
        if t0 >= DUR: break
        root, ch = CH[b % 4]
        tf = t0 * FPS
        intro = tf + 80 <= first
        outro = tf >= logo - 30
        # 電鋼琴：切分和弦
        if intro or outro:
            add(M.epiano(ch, BAR * 1.05), t0, 0.6 if intro else 0.4, -0.25)
            if intro:
                for i in range(8): add(SH, t0 + i * BEAT / 2, 0.12, -0.35)
        else:
            add(M.epiano(ch, BEAT * 1.4), t0, 0.26, -0.25)
            add(M.epiano(ch, BEAT * 1.1), t0 + BEAT * 1.5, 0.2, -0.25)
            add(M.epiano(ch, BEAT * 1.6), t0 + BEAT * 2.5, 0.22, -0.25)
        # 每一拍：低音、鼓（「全樂團」以拍為單位判斷，高潮不必落在小節線）
        for i in range(4):
            bf = tf + i * 20
            if bf >= FR: break
            tb = t0 + i * BEAT
            if intro or bf < first - 20: continue
            full = full_from <= bf < reveal
            if outro:
                if i == 0: add(M.bass(root, BEAT * 1.4, 'sub'), tb, 0.5)
                continue
            pat = {0: (root, 1.4), 2: (root + 12, 0.9)}
            if i in pat: add(M.bass(pat[i][0], BEAT * pat[i][1], 'sub'), tb, 0.62 if full else 0.5)
            if i in (0, 2): add(M.bass(root + 7, BEAT * 0.45, 'sub'), tb + BEAT * 1.5, 0.62 if full else 0.5)
            if i in (0, 2) or (full and i == 3 and b % 2 == 1):
                add(K, tb, 0.55 if full else 0.42)
            if i in (1, 3):
                add(SN, tb, 0.24 if full else 0.16, 0.1)
            add(HH, tb + BEAT * 0.5, 0.18, 0.3)                    # 反拍腳踏鈸
            for s in range(4):                                     # 沙鈴十六分
                add(SH, tb + s * BEAT / 4, 0.1 if s % 2 else 0.16, -0.35)
            # 高潮段：柔和弦樂墊底＋顫音琴旋律（每拍一段，跟著和弦）
            if full:
                if i == 0 or bf == full_from:
                    add(M.pad([m + 12 for m in ch], BEAT * (4 - i) * 1.1, 2200, atk=0.25), tb, 0.32, 0.0)
                mel = ([(0, 72), (0.75, 74)], [(0.5, 76)], [(0.5, 79)], [(0, 77)])[i] if b % 2 == 0 else ([(0, 76)], [(0, 74), (0.5, 72)], [(0.5, 69)], [(0.25, 72)])[i]
                for bt, m in mel: add(vibe(m, 1.3), tb + bt * BEAT, 0.9, 0.35)
    # 結尾長和弦＋顫音琴琶音
    tL = fr(logo)
    for i, m in enumerate([65, 69, 72, 76, 79, 84]):
        add(vibe(m, 2.6, 0.9), tL + i * 0.09, 0.8, -0.3 + i * 0.12)
    add(M.pad([53, 57, 60, 64, 67], 3.6, 1800, atk=0.4), tL - 0.2, 0.3)
    mus = M.master_chain(np.stack([L[:N], R[:N]])) * 0.55

    # ───── 音效（對準畫面事件）─────
    FX = np.zeros((2, N + SR * 3))
    fx = lambda sig, t0, g=1.0, pan=0.0: add(sig, t0, g, pan, (FX[0], FX[1]))
    fx(thud(120, 0.1), fr(MK['glassLand']), 1.0)
    fx(glass_tink(2100, 0.6), fr(MK['glassLand']), 0.9)
    tot = sum(s['vol'] for s in ST) or 1
    cum = 0.0
    seed = 1
    for s in ST:
        kd = s['kind']
        if kd in ('liquid', 'soda', 'float'):
            a, b = s['pour']
            f0 = cum / 300; cum += s['vol']; f1 = cum / 300
            g = {'liquid': 0.85, 'soda': 0.75, 'float': 0.6}[kd]
            fx(pour(fr(b - a), f0, f1, 1.0, seed), fr(a + 4), g, 0.15)
            if kd == 'soda':
                fx(fizz(5.5, 1.0, seed + 20), fr(a + 10), 1.0, 0.2)
            seed += 1
        elif kd == 'ice':
            for i, f in enumerate(s['ice']):
                fx(glass_tink(2600 + i * 170, 0.35, 1.0), fr(f + 4), 1.0, -0.2 + i * 0.08)
                if s.get('disp', 0) > 0: fx(splash(0.8, 10 + i), fr(f + 4), 0.9)
            cum += s['count'] * s.get('disp', 0)
        elif kd == 'stir':
            a, b = s['stir']
            for i, f in enumerate(range(a, b, 10)):
                fx(glass_tink(3300 + (i % 2) * 400, 0.18, 0.7), fr(f), 0.8, 0.1 * (-1) ** i)
        elif kd == 'garnish':
            fx(pop(), fr(s['lemon']), 0.9)
            for f in s['mint']: fx(rustle(f), fr(f), 1.0, 0.3)
            fx(M.whoosh(0.3), fr(s['straw'] - 6), 0.5)
            fx(glass_tink(3800, 0.15, 0.6), fr(s['straw']), 0.7)
    r0, r1 = MK['riser']
    if r1 - r0 >= 20: fx(M.riser(fr(r1 - r0)), fr(r0), 0.28)
    fx(M.impact(1.8, 0.6), fr(drop), 0.22)
    fx(fizz(3.0, 0.7, 12), fr(drop), 0.6, -0.2)
    if MK.get('react') is not None:
        for i, m in enumerate([84, 88, 91, 96]):               # 顏色反應的閃光音
            fx(vibe(m, 1.0, 0.8), fr(MK['react']) + i * 0.07, 0.6, 0.4)
    if MK.get('stamp') is not None:
        fx(stamp(), fr(MK['stamp']), 0.9)
    fx(M.whoosh(0.8), fr(MK['truck']), 0.6)

    # ───── 母帶 ─────
    mix = mus + FX[:, :N] * 0.8
    mix[:, :480] *= np.linspace(0, 1, 480)
    mix = ride(mix)
    mix = mix / (true_peak_env(mix).max() + 1e-9)
    if PEAK_CUT > 0:
        mix = peak_limit(mix, 10 ** (-PEAK_CUT / 20))
    fo = int(1.2 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
    mix = mix / (true_peak_env(mix).max() + 1e-9) * 0.9
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    render(mod.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
