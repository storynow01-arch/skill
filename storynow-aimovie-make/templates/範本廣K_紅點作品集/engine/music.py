"""範本廣K「紅點作品集」配樂與音效：128 BPM 作品集快剪（F 小調 Fm–Db–Ab–Eb），每一段的拍點都讀時間表 beats。
開場：下墜音 → 落地重拍＋悶鼓＋撥弦 → 縮寫每一個字一下拍手＋上行撥弦 → 甩鏡咻
數字組合：四拍鼓組、sub 貝斯、16 分琶音，每組數字一下衝擊＋銅管；排成一行 riser＋supersaw；鑽進紅點 反向吸入＋咻
紅底（swap）：衝擊＋長 riser、數字滾動喀喀聲、越來越密的小鼓、reese 貝斯 → 劃掉咻＋小鼓 → 碎字掉落叮叮咚咚 → 後一個值蓋印章 → 留白吸氣
紅底（bridge，省略 swap 時）：衝擊＋短 riser＋小鼓滾奏 → 吸氣
DROP：大衝擊，全編制（四拍 kick、16 分 hat、supersaw、pad），大數字滾動喀喀，甩鏡咻；名稱一個一音往上爬＋拍手；吸回紅點反向吸入
LOGO：大衝擊、低音 kick、supersaw 長和弦、reese 貝斯 → 標語兩聲鐘 → 長和弦淡出
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/adH1.py（固定 15 秒 32 拍）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 128
BEAT = 60 / BPM
PEAK_CUT = 1.0        # 母帶先用真峰值（4 倍超取樣）正規化，再只壓最尖的 1 dB（衝擊、印章、拍手的幾毫秒，音色不變）；不壓也有 −3.5 dBTP，留 1 dB 餘裕


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：hat、拍手、喀聲的高頻雜訊在取樣點之間會冒出額外的峰"""
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


def render(tl, wav_path):
    DUR = tl['frames'] / FPS
    N = int(DUR * SR)
    mixL = np.zeros(N + SR * 4)
    mixR = np.zeros(N + SR * 4)
    sec = lambda b: b * BEAT

    def put(x, t, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= N or i < 0: return
        x = x[: len(mixL) - i]
        mixL[i:i + len(x)] += x * g * (1 - max(0, pan))
        mixR[i:i + len(x)] += x * g * (1 + min(0, pan))

    def fall(length):
        """下墜音：音高一路往下的正弦＋氣音"""
        n = int(length * SR); t = M.tt(n)
        f = 1400 * np.exp(-t / length * 2.6) + 90
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / length) ** 0.5 * 0.18
        air = M.bp(M.noise(n), 1500, 7000) * np.sin(np.pi * t / length) * 0.12
        return tone + air

    def stamp():
        """印章：低頻悶擊＋木頭敲擊"""
        n = int(0.5 * SR); t = M.tt(n)
        body = np.sin(2 * np.pi * np.cumsum(70 + 160 * np.exp(-t * 30)) / SR) * M.ex(n, 0.12)
        wood = M.bp(M.noise(n), 600, 2400) * M.ex(n, 0.025)
        return np.tanh((body * 1.6 + wood * 1.2)) * 0.9

    def tick(hi=False):
        n = int(0.03 * SR)
        return M.bp(M.noise(n), 3000 if hi else 1800, 9000) * M.ex(n, 0.006) * 0.5

    def chime(m):
        n = int(2.2 * SR); t = M.tt(n); f = M.midi(m)
        x = np.sin(2 * np.pi * f * t) * M.ex(n, 0.9) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * M.ex(n, 0.3)
        return x * 0.16

    def revswell(length):
        """吸入音：反向衝擊（越來越大，最後突然斷掉）"""
        return M.impact(length, 0.8)[::-1] * 0.5

    prog = M.progression('Fm')   # Fm Db Ab Eb
    ROOTS = [r for r, _ in prog]
    CHORDS = [c for _, c in prog]
    chord = lambda b: CHORDS[int(b // 4) % 4]

    def drums(b0, b1, full=False):
        b = b0
        while b < b1 - 1e-6:
            put(M.kick(1.1 if full else 0.9), sec(b), 0.95)
            put(M.hat(), sec(b + 0.5), 0.35 if full else 0.25, 0.3)
            if full:
                put(M.hat(amp=0.6), sec(b + 0.25), 0.18, -0.3)
                put(M.hat(amp=0.6), sec(b + 0.75), 0.18, -0.3)
            if int(round(b)) % 2 == 1:
                put(M.clap(), sec(b), 0.55 if full else 0.4)
            b += 1

    def bassline(b0, b1, kind='sub', g=0.7):
        b = b0
        while b < b1 - 1e-6:
            r = ROOTS[int(b // 4) % 4] - 12
            for off in ((0, 0.5) if kind == 'sub' else (0,)):
                if b + off < b1 - 1e-6: put(M.bass(r, BEAT * 0.45, kind), sec(b + off), g)
            b += 1

    S = tl['beats']
    by = {}
    for s in S: by.setdefault(s['kind'], []).append(s)
    A = by['open'][0]
    RED = (by.get('swap') or by.get('bridge'))[0]
    LOGO = by['logo'][0]
    boom = RED['boom']

    # ── 開場：下墜、落地、縮寫 ──
    land = A['land']
    put(fall(sec(land)), 0.0, 1.0)
    put(M.kick(1.3, 0.25, 40), sec(land), 1.1)
    put(M.tom(70, 0.5), sec(land), 0.6)
    put(M.reverb(M.pluck(77, 0.6, 6000, 0.25), 0.4), sec(land), 0.5)
    scale = [0, 3, 7, 12, 15, 19, 24, 27]
    pans = (-0.4, 0.4, -0.2, 0.2)
    for i, b in enumerate(A['letters']):
        put(M.clap(), sec(b), 0.7, pans[i % 4])
        put(M.pluck(65 + scale[i % 8], 0.3, 5200, 0.1), sec(b), 0.9)
        put(M.kick(0.8), sec(b), 0.6)
    # 縮寫打完到下一段之間：輕輕的 hat 撐住
    b = A['letters'][-1] + 1
    while b < A['b'] - 0.5:
        put(M.hat(amp=0.7), sec(b), 0.2, 0.3); b += 0.5
    if A.get('out') == 'whip':
        put(M.whoosh(0.35), sec(A['b'] - 0.25) - 0.05, 1.3)
    else:
        put(M.riser(sec(A['b'] - A['letters'][-1])), sec(A['letters'][-1]), 0.5)
        put(revswell(sec(1.0)), sec(A['dive']), 0.9)
        put(M.whoosh(0.5), sec(A['dive'] + 0.5), 1.2)

    # ── 數字組合：律動＋每組一下 ──
    for B in by.get('counts', []):
        b0, dive = B['a'], B['dive']
        drums(b0, dive)
        bassline(b0, dive)
        for h in B['h']:
            put(M.impact(1.2, 0.45), sec(h), 0.55)
            put(M.brass(chord(h), BEAT * 1.4), sec(h), 0.55)
        arp = [0, 7, 12, 15, 19, 15, 12, 7]
        i = 0
        while b0 + i * 0.25 < dive - 1e-6:
            b = b0 + i * 0.25
            put(M.pluck(chord(b)[0] + arp[i % 8], 0.18, 3800, 0.05), sec(b), 0.45, 0.35 if i % 2 else -0.35)
            i += 1
        asm = B['assemble']
        put(M.riser(sec(1.5)), sec(asm - 1.5), 0.7)
        put(M.supersaw(chord(asm), BEAT * 1.0), sec(asm), 0.6)
        put(revswell(sec(1.0)), sec(dive), 0.9)
        put(M.whoosh(0.5), sec(dive + 0.5), 1.2)

    # ── 紅底：建立期待 ──
    red, gap = RED['a'], RED['gap']
    put(M.impact(1.5, 0.6), sec(red), 0.6)
    put(M.riser(sec(boom - red)), sec(red), 0.9)
    if RED['kind'] == 'swap':
        b = red
        while b < RED['rollEnd']:   # 滾動的喀喀聲
            put(tick(int(b * 8) % 2 == 0), sec(b), 0.8)
            b += 0.125
        strike = RED['strike']
        i = 0
        b = red
        while b < strike - 1e-6:    # 越來越密的小鼓
            put(M.snare(), sec(b), min(0.6, 0.3 + i * 0.05)); b += 0.5; i += 1
        b = strike
        while b < gap - 1e-6:
            put(M.snare(), sec(b), 0.45); b += 0.25
        bassline(red, strike, 'reese', 0.5)
        put(M.whoosh(0.3), sec(strike), 1.4)
        put(M.snare(220, 0.2, 7000), sec(strike) + 0.12, 0.6)
        nd = max(1, len(tl['d']['swap']['from']))
        for i in range(min(8, nd)):        # 碎字掉落：叮叮咚咚
            put(M.blip(84 - i * 3, 0.08), sec(RED['drop'] + i * 0.08), 1.6)
            put(tick(), sec(RED['drop'] + i * 0.08 + 0.05), 0.6)
        put(stamp(), sec(RED['zero']), 1.2)
        put(M.kick(1.2), sec(RED['zero']), 0.8)
        b = RED['zero'] + 1                # 停留時 kick 輕輕數拍子
        while b < gap - 1e-6:
            put(M.kick(0.7), sec(b), 0.5); b += 1
    else:
        b = red
        while b < gap - 1e-6:
            put(M.snare(), sec(b), 0.4); b += 0.25
    put(revswell(sec(boom - gap)), sec(gap), 0.7)   # 留白（只有吸氣音）

    # ── DROP：大數字＋名稱 ──
    stats = by.get('stat', [])
    names = by.get('names', [])
    full_end = names[0]['collapse'] if names else LOGO['a']
    put(M.impact(2.5, 1.2), sec(boom), 1.0)
    if full_end > boom + 0.5:
        drums(boom, full_end, full=True)
        bassline(boom, full_end, 'sub', 0.85)
        b = boom
        while b < full_end - 1e-6:
            bar_end = min(full_end, (int(b // 4) + 1) * 4)
            ch = chord(b)
            s_ = b
            while s_ < bar_end - 1e-6:
                put(M.supersaw(ch, BEAT * 0.9, BEAT), sec(s_), 0.55); s_ += 1
            put(M.pad(ch, sec(bar_end - b), 2400), sec(b), 0.5)
            b = bar_end
    for s in stats:
        if s['a'] > boom: put(M.impact(1.2, 0.6), sec(s['a']), 0.6)
        b = s['a']
        while b < s['a'] + (1.25 if s['i'] == 0 else 1.0):
            put(tick(True), sec(b), 0.7); b += 0.125
        if s.get('outWhip'): put(M.whoosh(0.35), sec(s['b'] - 0.25) - 0.05, 1.3)
    for E in names:
        sc = [0, 3, 5, 7, 10, 12, 15, 17, 19]
        for i, b in enumerate(E['n']):   # 名稱：一路往上爬的音階
            put(M.pluck(72 + sc[i], 0.25, 6000, 0.08), sec(b), 0.8, -0.4 if i % 2 else 0.4)
            put(M.clap(), sec(b), 0.35)
        put(revswell(sec(E['b'] - E['collapse'])), sec(E['collapse']), 1.0)

    # ── LOGO 重擊 ──
    lg, sl, end = LOGO['a'], LOGO['slogan'], LOGO['b']
    put(M.impact(3.5, 1.5), sec(lg), 1.2)
    put(M.kick(1.5, 0.3, 38), sec(lg), 1.0)
    put(M.reverb(M.supersaw([65, 68, 72, 77], 2.8), 0.5, 0.9), sec(lg), 0.75)
    put(M.bass(41, 2.5, 'reese'), sec(lg), 0.7)
    put(M.hat(True), sec(lg), 0.5)
    put(M.reverb(chime(77), 0.5, 0.9), sec(sl), 0.9)
    put(M.reverb(chime(84), 0.5, 0.9), sec(sl + 0.5), 0.7)
    if end - lg > 5:   # 字多停得久：長和弦墊住到片尾
        put(M.pad([53, 60, 65, 68, 72], sec(end - lg - 2) + 1.5, 1800), sec(lg + 2), 0.45)

    # ── 母帶 ──
    mix = np.stack([mixL, mixR])
    mix = M.master_chain(mix)
    mix = mix / (true_peak_env(mix).max() + 1e-9)
    mix = peak_limit(mix, 10 ** (-PEAK_CUT / 20))   # 衝擊、印章、拍手的瞬間真峰值壓掉，出片用預設限幅就過
    mix = mix[:, :N]
    fade = int(1.2 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    mix = mix / (true_peak_env(mix).max() + 1e-9) * 0.9
    pcm = (mix.T * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    render(mod.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
