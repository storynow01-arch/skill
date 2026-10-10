"""範本廣L「新創快剪」配樂與音效：120 BPM 現代電子（A 小調 Am–F–C–G，一拍 15 格），每一段的事件都讀時間表 marks。
輸入框：暗的濾波琶音＋pad，每個字一下鍵盤聲，Enter 一下點擊
Hero：四拍底鼓（低通）、反拍 hat、sub 貝斯；兩行大字各一下重擊
build-up：每一項一下點擊、小鼓由八分加速到十六分、riser 一路到 DROP，最後半拍抽空；鑽進游標點一聲咻
DROP（到 CTA 前）：全編制（四拍 kick、hat、2／4 拍手、supersaw 和弦、reese 反拍低音、sine 低音）；
  DROP 大衝擊＋sub 下墜、每一項一下小衝擊；卡片軌道進場咻、每張卡停下一下點擊；
  指標牆進暗場一下衝擊、往下捲一下柔咻、每位數字鎖定一聲 blip、劃掉換數字一下衝擊；功能每個硬切柔咻＋點擊
CTA：大衝擊、pad 長和弦，游標按下按鈕一聲點擊＋blip＋電鋼琴和弦，底鼓到按下後一拍收掉，尾巴淡出
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 video/audio/adH3.py（固定 26 秒 13 小節）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
PEAK_CUT = 1.0        # 母帶先用真峰值（4 倍超取樣）正規化，再只壓最尖的 1 dB（衝擊、點擊的幾毫秒，音色不變）


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：hat、拍手、點擊的高頻在取樣點之間會冒出額外的峰"""
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
    MK = tl['marks']
    FR = tl['frames']
    DUR = FR / FPS
    N = int((DUR + 3) * SR)
    L = np.zeros(N); R = np.zeros(N)
    sec = lambda f: f / FPS

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N or i < 0: return
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    # ── 自製 UI 音效 ──
    def key_tick(seed):
        n = int(0.035 * SR); r = np.random.default_rng(seed)
        return M.bp(r.standard_normal(n), 2500, 9000) * M.ex(n, 0.006) * 0.22

    def ui_click():
        n = int(0.06 * SR); t = M.tt(n)
        x = np.sin(2 * np.pi * 2200 * t) * M.ex(n, 0.008) * 0.5 + M.hp(M.noise(n), 4000) * M.ex(n, 0.004) * 0.4
        return x * 0.35

    def soft_whoosh(length=0.35):
        n = int(length * SR); t = M.tt(n)
        return M.bp(M.noise(n), 900, 8000) * np.sin(np.pi * t / length) ** 3 * 0.18

    def sub_drop(length=1.2):
        n = int(length * SR); t = M.tt(n)
        f = 90 * np.exp(-t * 2.2) + 32
        return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2) * M.ex(n, 0.5) * 0.6

    K = M.kick(1.1, 0.18, 50)
    CL = M.clap()
    SN = M.snare(200, 0.09, 6000)
    HC = M.hat(False, 1.0)
    HO = M.hat(True, 0.8)
    prog = M.progression('Am')          # Am F C G

    enter, b1, drop, cta, click = MK['enter'], MK['b'][0], MK['drop'], MK['cta'], MK['click']
    nbeats = int(np.ceil(FR / 15))
    # ── 逐拍排律動（段落以格數判斷）──
    for bi in range(nbeats):
        fb = bi * 15
        t0 = sec(fb)
        r, ch = prog[(bi // 4) % 4]
        intro = fb < enter - 30
        hero = enter - 30 <= fb < b1
        build = b1 <= fb < drop
        full = drop <= fb < cta
        outro = fb >= cta
        cut = 900 if intro else 1800 if hero else 2600 if build else 4200 if full else 2400
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
        for i in range(4):     # 16 分琶音
            j = (bi % 4) * 4 + i
            add(M.pluck(arp[j % 4], 0.2, cut, 0.06), t0 + i * BEAT / 4, 0.42 if full else 0.55, 0.35 if j % 2 else -0.35)
        if (intro or hero or outro) and bi % 4 == 0:
            add(M.pad(ch, BAR + 0.3, 1400 if intro else 2200), t0, 0.7)
        if hero:
            add(M.lp(K, 2500), t0, 0.75)
            add(HC, t0 + BEAT / 2, 0.6, 0.2)
            add(M.bass(r - 12, BEAT * 0.45, 'sub'), t0 + BEAT / 2, 0.55)
        if build and fb < drop - 15:   # 鑽進游標點那一拍抽空
            add(K, t0, 0.8)
        if full:
            add(K, t0, 1.0)
            add(HO, t0 + BEAT / 2, 0.45, 0.25)
            add(HC, t0 + BEAT / 4, 0.35, -0.25)
            add(HC, t0 + 3 * BEAT / 4, 0.35, -0.25)
            if bi % 2 == 1: add(CL, t0, 0.8)
            add(M.bass(r - 12, BEAT * 0.48, 'reese'), t0 + BEAT / 2, 0.8)
            add(M.bass(r - 24, BEAT * 0.3, 'sine'), t0, 0.5)
            if bi % 4 == 0 or fb == drop:   # supersaw 和弦：每小節一次（DROP 落在小節中間時先補到小節尾）
                left = 4 - bi % 4
                add(M.supersaw([m + 12 for m in ch], BEAT * min(left, (cta - fb) / 15), BEAT), t0, 0.6)
        if outro and cta <= fb <= click + 15:
            add(K, t0, 0.7)
            add(HC, t0 + BEAT / 2, 0.4)

    # ── build-up：小鼓加速（前半八分、後半十六分），最後半拍抽空 ──
    blen = (drop - b1) / 15
    hits = []
    b = 0.0
    while b < blen - 0.5 - 1e-6:
        hits.append(b)
        b += 0.5 if b < blen / 2 else 0.25
    for j, h in enumerate(hits):
        add(SN, sec(b1) + h * BEAT, min(0.75, 0.25 + 0.5 * j / max(1, len(hits) - 1)), 0.1)
    add(M.riser(sec(drop - b1)), sec(b1), 0.7)
    for x in MK['b']:
        add(ui_click(), sec(x), 0.8)
    add(M.whoosh(0.5), sec(MK['dive']), 0.8)

    # ── Hero 兩下重擊、打字、Enter ──
    add(M.impact(2.0, 0.7), sec(MK['hero1']), 0.55)
    if MK['hero2'] != MK['hero1']:
        add(M.impact(1.6, 0.5), sec(MK['hero2']), 0.45)
    for i, f in enumerate(tl['typeAt']):
        add(key_tick(i + 7), sec(f), 0.9, -0.15 + 0.03 * (i % 5))
    add(ui_click(), sec(enter), 1.1)

    # ── DROP ──
    add(M.impact(2.5, 1.0), sec(drop), 0.95)
    add(sub_drop(1.4), sec(drop), 0.8)
    for x in MK['n'][1:]:
        add(M.impact(0.8, 0.4), sec(x), 0.35)

    # ── 產品線卡片 ──
    if 'rail' in MK:
        add(M.whoosh(0.6), sec(MK['rail']) - 0.15, 0.6)
        for x in MK['focus'][1:]:
            add(soft_whoosh(0.3), sec(x) - 0.15, 0.7)
            add(ui_click(), sec(x) + 0.05, 0.3)

    # ── 指標牆 ──
    if 'm' in MK:
        add(M.impact(1.5, 0.6), sec(MK['m'][0]), 0.5)
        for x in MK['m'][1:]:
            add(soft_whoosh(0.4), sec(x) - 0.2, 0.9)
        for lk in MK['locks']:
            for i, lf in enumerate(lk):
                add(M.blip(88 + (i % 2) * 5, 0.06), sec(lf), 0.6, 0.3)
        for z in MK['zero']:
            if z: add(M.impact(1.0, 0.5), sec(z), 0.4)

    # ── 功能 ──
    for x in MK.get('f', []):
        add(soft_whoosh(0.35), sec(x) - 0.17, 1.0)
        add(ui_click(), sec(x), 0.35)

    # ── CTA ──
    add(M.impact(2.8, 0.9), sec(cta), 0.85)
    add(M.pad([57, 64, 69, 72], sec(MK['end'] - cta) + 1.2, 2400), sec(cta), 0.9)
    add(ui_click(), sec(click), 1.2)
    add(M.blip(93, 0.12), sec(click) + 0.03, 0.6)
    add(M.epiano([69, 72, 76, 81], 2.5), sec(click), 0.5)

    # ── 母帶 ──
    Ns = int(DUR * SR)
    mix = M.master_chain(np.stack([L, R])[:, :Ns])
    mix = mix / (true_peak_env(mix).max() + 1e-9)
    if PEAK_CUT > 0:
        mix = peak_limit(mix, 10 ** (-PEAK_CUT / 20))
    fade = int(1.3 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
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
