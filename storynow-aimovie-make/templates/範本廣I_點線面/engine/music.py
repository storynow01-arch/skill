"""範本廣I「點線面」配樂與音效：極簡打擊、逐維加法，120 BPM（一拍 15 格、一小節 60 格）。
0D 點＝只有節拍器滴答；1D 線＝加低音線；2D 面＝加和弦墊；3D 體＝加鼓組；4D 時間＝加旋律與全編制；
收回成點＝樂器一層層退場，最後只剩滴答一聲。每一層從時間表 secs 的該維開始（省略的維度沿用下一段的開始）。
音效全部對準時間表事件：彈出、拉線、每一筆的刷聲、閃光快門、鋪色「啪」、細節 blip、分身咻、展開圖每摺一面「啪」、
組裝「喀」、列印嗡嗡、全景衝擊、鑽進鏡頭咻、片中片演員彈跳／疊起喀／燈泡叮／轉圈咻、拉回咻、收回吸入、名稱衝擊、句點落下叮。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad18.py（固定 60 秒）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BEAT = 0.5            # 120 BPM
BAR = BEAT * 4
PEAK_CUT = 8.0        # 衝擊、快門、kick 的瞬間峰值比整體響度突出：只壓最尖的那幾毫秒（音色不變），出片用預設限幅就過


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：刷聲、hat、喀聲的高頻雜訊在取樣點之間會冒出 +3～5 dB 的峰"""
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
    rng = np.random.default_rng(18)
    DUR = tl['frames'] / FPS
    N = int((DUR + 3) * SR)
    L = np.zeros(N); R = np.zeros(N)
    s = lambda fr: fr / FPS
    sec = {k: s(v) for k, v in tl['secs'].items()}
    m = tl['marks']; fx = tl['sfx']; d = tl['d']
    dims = {e['n']: e for e in d['dims']}
    film = d['film']

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N or i < 0: return
        x = sig[:N - i] * g
        L[i:i + len(x)] += x * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(x)] += x * np.sin((pan + 1) * np.pi / 4) * 1.414

    # ───────── 自製音效 ─────────
    def tt(n): return np.arange(n) / SR
    def env(n, tau): return np.exp(-np.arange(n) / (tau * SR))

    def tick(accent=False):
        n = int(0.09 * SR); t = tt(n)
        f = 2350 if accent else 1750
        x = np.sin(2 * np.pi * f * t) * env(n, 0.012) + 0.5 * np.sin(2 * np.pi * f * 1.51 * t) * env(n, 0.006)
        x += M.hp(rng.standard_normal(n), 3000) * env(n, 0.002) * 0.6
        return x * 0.5

    def sweep(length=0.32, up=True):
        """畫線的「刷」：麥克筆劃過紙面"""
        n = int(length * SR); t = tt(n); nz = rng.standard_normal(n); out = np.zeros(n); seg = int(0.02 * SR)
        for i in range(0, n, seg):
            p = t[min(i, n - 1)] / length
            fc = 1800 + (p if up else 1 - p) * 4200
            out[i:i + seg] = M.bp(nz[i:i + seg], fc * 0.7, fc * 1.4, 1)
        e = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 0.7 * np.exp(-t * 2)
        return out * e * 0.9

    def flap():
        """面翻摺的「啪」：紙板拍下"""
        n = int(0.25 * SR); t = tt(n)
        crack = M.hp(rng.standard_normal(n), 1200) * env(n, 0.012)
        body = np.sin(2 * np.pi * np.cumsum(220 * np.exp(-t * 30) + 110) / SR) * env(n, 0.05)
        return np.tanh(crack * 1.4 + body * 0.9) * 0.7

    def click():
        """組裝的「喀」：兩下卡榫聲＋金屬短響"""
        n = int(0.18 * SR); t = tt(n); x = np.zeros(n)
        for dd, g in [(0, 1.0), (0.028, 0.7)]:
            i = int(dd * SR); mm = n - i
            x[i:] += M.bp(rng.standard_normal(mm), 1500, 5000) * env(mm, 0.006) * g
        x += np.sin(2 * np.pi * 2650 * t) * env(n, 0.03) * 0.25
        return x * 0.8

    def pop():
        n = int(0.25 * SR); t = tt(n)
        f = 900 * np.exp(-t * 18) + 260
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.07) * 0.6

    def shutter():
        n = int(0.5 * SR); t = tt(n); x = np.zeros(n)
        for dd, g in [(0, 1.0), (0.09, 0.8)]:
            i = int(dd * SR); mm = n - i
            x[i:] += M.bp(rng.standard_normal(mm), 800, 6000) * env(mm, 0.01) * g
        whine = np.sin(2 * np.pi * np.cumsum(3000 + 2500 * t) / SR) * env(n, 0.25) * 0.08
        return x * 0.9 + whine

    def buzz(length):
        """列印噴頭的嗡嗡聲（步進馬達）"""
        n = int(length * SR); t = tt(n)
        f = 330 + 40 * np.sin(2 * np.pi * 5 * t)
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + M.hp(rng.standard_normal(n), 4000) * 0.15
        e = np.clip(t / 0.05, 0, 1) * np.clip((length - t) / 0.3, 0, 1)
        return M.lp(x, 2600) * e * 0.22

    def boing(mm=72):
        n = int(0.3 * SR); t = tt(n)
        f = M.midi(mm) * (1 + 0.6 * np.exp(-t * 25)) * (1 + 0.03 * np.sin(2 * np.pi * 14 * t))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.1) * 0.35

    def ding(mm=88):
        n = int(1.4 * SR); t = tt(n); f = M.midi(mm)
        x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * env(n, 0.2)
        return x * env(n, 0.5) * 0.3

    def suck(length=2.0):
        """收回：反向的衝擊（逐漸變大後瞬間停）"""
        x = M.impact(length, 0.8)[::-1]
        n = len(x); t = tt(n)
        return x * (t / length) ** 2 * 0.8

    prog = M.progression('C')            # C 大調 I-V-vi-IV，每小節換一個（以片頭為第 0 小節）
    chord_at = lambda t: prog[int(t / BAR + 1e-6) % 4]
    last = s(m['last'])
    nbeats = int(round(last / BEAT))

    # 1) 節拍器：從頭到尾（點段最大聲，之後退到背景）
    for b in range(nbeats + 1):
        t = b * BEAT
        acc = b % 4 == 0
        g = 0.55 if t < sec['line'] else (0.32 if t < sec['motion'] else (0.22 if t < sec['collapse'] else 0.4))
        if b == nbeats: g, acc = 0.75, True
        add(tick(acc), t, g, 0.15)

    # 2) 低音線：1D（線）起，到最後一拍前退場
    for b in range(nbeats):
        t = b * BEAT
        if t < sec['line'] - 1e-6 or t >= last - BEAT: continue
        r, _ = chord_at(t); bb = b % 4
        if t < sec['motion']:
            pat = {0: 1.4, 2: 0.45, 3: 0.45}
            if bb in pat: add(M.bass(r - 12, pat[bb] * BEAT, 'sub'), t, 0.3)
        elif t < sec['collapse']:
            for h in range(2):
                oc = 12 if (bb * 2 + h) % 4 == 3 else 0
                add(M.bass(r - 12 + oc, 0.42 * BEAT, 'sub'), t + h * BEAT / 2, 0.3)
        elif bb in (0, 2):
            add(M.bass(r - 12, 1.6 * BEAT, 'sub'), t, 0.3)

    # 3) 和弦墊：2D（面）起，到名稱後 2 小節退場
    pad_end = min(last, sec['logo'] + 2 * BAR)
    t = sec['plane']
    while t < pad_end - 0.1:
        bar_end = (int(t / BAR + 1e-6) + 1) * BAR
        _, ch = chord_at(t)
        g = 0.75 if t < sec['motion'] else (0.8 if t < sec['collapse'] else 0.6)
        add(M.pad(ch, bar_end - t + 0.3, 1500 if t < sec['motion'] else 2400), t, g, -0.1)
        t = bar_end

    # 4) 鼓組：3D（體）起，到句點落下退場；4D 是高潮（四拍 kick、16 分 hat、反拍開 hat）
    K = M.kick(0.9, 0.16); CL = M.clap(); HH = M.hat(); OH = M.hat(True, 0.7)
    land = s(m['land'])
    for b in range(nbeats):
        tb = b * BEAT
        if tb < sec['solid'] - 1e-6 or tb >= land: continue
        bb = b % 4
        climax = sec['motion'] <= tb < sec['collapse']
        if bb in (0, 2) or climax: add(K, tb, 0.7 if bb in (0, 2) else 0.45)
        if bb in (1, 3): add(CL, tb, 0.42 if climax else 0.3, 0.05)
        steps = 4 if climax else 2
        for h in range(steps):
            add(HH, tb + h * BEAT / steps, 0.16 if h % 2 else 0.22, -0.35)
        if climax and bb == 3 and (b // 4) % 2 == 1: add(OH, tb + 0.5 * BEAT, 0.2, 0.3)
    if sec['solid'] < sec['motion'] - 2 * BEAT:          # 進高潮前的鼓花
        t0 = sec['motion'] - 2 * BEAT
        for i in range(8): add(M.tom(140 - i * 9, 0.25), t0 + i * BEAT / 4, 0.32, -0.4 + i * 0.1)

    # 5) 旋律與全編制：4D（動起來）到收回
    motif = [0, 4, 7, 12, 11, 7, 9, 7]
    t = sec['motion']; j = 0
    while t < sec['collapse'] - 0.1:
        bar_end = min(sec['collapse'], (int(t / BAR + 1e-6) + 1) * BAR)
        r, ch = chord_at(t)
        nst = int(round((bar_end - t) / (BEAT / 4)))
        for i in range(nst):
            mm = ch[i % 3] + 12 + (12 if i % 8 >= 6 else 0)
            add(M.pluck(mm, 0.2), t + i * BEAT / 4, 0.33, 0.35 if i % 2 else -0.35)
        for i, iv in enumerate(motif):
            if t + i * BEAT / 2 >= bar_end - 0.05: break
            if j % 2 == 1 and i >= 6: break
            add(M.piano(r + 24 + iv, 0.6), t + i * BEAT / 2, 0.55, 0.1)
        add(M.brass([x + 12 for x in ch], BEAT * 0.5), t, 0.5, 0.0)
        if bar_end - t > 2.6 * BEAT: add(M.brass([x + 12 for x in ch], BEAT * 0.4), t + 2.5 * BEAT, 0.35, 0.0)
        add(M.strings([x + 12 for x in ch], bar_end - t + 0.1), t, 0.32, 0.2)
        t = bar_end; j += 1

    # ───────── 畫面事件音效 ─────────
    add(pop(), s(tl['head']['pop']), 0.9)
    add(sweep(0.9), s(tl['head']['drag']), 1.1, -0.4)
    for i, fr in enumerate(fx['sweep']): add(sweep(0.34, i % 2 == 0), s(fr), 0.75, -0.3 + 0.06 * (i % 10))
    if 1 in dims: add(shutter(), s(dims[1]['flash']), 1.0)
    if 2 in dims:
        add(flap(), s(dims[2]['fill']), 1.0); add(M.impact(1.2, 0.5), s(dims[2]['fill']), 0.25)
    for i, fr in enumerate(fx['blip']): add(M.blip(84 + [0, 4, 7, 12, 16, 19, 24][i % 7], 0.08), s(fr), 1.3, -0.4 + 0.12 * (i % 7))
    for fr in fx['whoosh']: add(M.whoosh(0.6), s(fr), 0.9)
    for i, fr in enumerate(fx['flap']): add(flap(), s(fr), 0.9, -0.3 + 0.15 * i)
    for fr in fx['click']: add(click(), s(fr), 0.95)
    if 3 in dims:
        e = dims[3]
        add(buzz(s(e['print1'] - e['print0']) + 0.4), s(e['print0']), 0.9, 0.3)
    hit = s(m['hit'])
    add(M.riser(2.0), hit - 2.0, 0.55)
    add(M.impact(2.5, 1.0), hit, 0.85)
    if film:
        add(M.whoosh(0.9), s(m['dive']) - 0.15, 1.1)
        for i, fr in enumerate(film['actors']): add(boing(72 + [0, 4, 7, 12][i]), s(fr), 0.6, -0.3 + 0.2 * i)
        for fr in film['stack']: add(click(), s(fr), 0.6)
        add(click(), s(film['slate']), 0.8)
        add(ding(84), s(film['bulb']), 0.7); add(ding(91), s(film['bulb']) + 0.12, 0.4)
        add(M.whoosh(0.5), s(film['spin']), 0.8)
        add(M.whoosh(0.9), s(m['out']) + 0.6, 1.0)
    logo = s(m['logo'])
    add(suck(2.0), logo - 2.0, 0.6)
    add(M.impact(2.0, 0.7), logo, 0.6)
    add(pop(), land, 0.7); add(ding(96), land, 0.45)
    for fr in d['end']['texts']:
        if fr is not None: add(sweep(0.45), s(fr), 0.45)
    add(ding(84), last, 0.25)

    # ───────── 母帶 ─────────
    mix = np.vstack([L, R])
    mix = M.master_chain(mix)
    mix = mix / (true_peak_env(mix).max() + 1e-9)
    mix = peak_limit(mix, 10 ** (-PEAK_CUT / 20))   # 衝擊、kick、雜訊的瞬間真峰值壓掉，出片用預設限幅就過
    n = int(round(DUR * SR)); mix = mix[:, :n]
    fade = int(1.0 * SR)
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
