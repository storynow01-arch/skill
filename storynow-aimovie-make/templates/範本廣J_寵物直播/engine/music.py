"""範本廣J「寵物直播」配樂與音效：輕快 K-pop 四拍舞曲，120 BPM（一拍 15 格、一小節 60 格），F 大調 vi–IV–I–V。
段落全部讀時間表 secs（開播前 intro → 帶貨 verse → 揭曉 pre → 關鍵字 chorus → 展示 brk／trophy／cert → 高潮 climax → 下播 outro），
每個 16 分音符查「這一刻在哪一段」決定怎麼彈，所以段落不必對齊小節，片長隨內容伸縮。
音效全部對準時間表事件：倒數嗶、開播上行鈴、汪汪、商品落台咚、收銀機鏘＋下單叮咚、愛心啵啵啵、歪頭、鏡頭甩動咻、
霓虹燈滋滋、斜標章與展示衝擊、號角、歡呼、印章砰、直播結束下行鈴、翻面上行鈴。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad20.py（固定 60 秒 30 小節）；這裡時間全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BEAT = 0.5            # 120 BPM
BAR = BEAT * 4
S16 = BEAT / 4
PEAK_CUT = 2.0        # 衝擊、收銀機、拍手的瞬間真峰值比整體響度突出：只壓最尖的 2 dB（幾毫秒，音色不變），出片用預設限幅就過

# F 大調 vi–IV–I–V（原作）
CH = [(38, [62, 65, 69]), (34, [62, 65, 70]), (41, [60, 65, 69]), (36, [60, 64, 67])]
HOOK = [  # (16 分音符位置, 音高, 長度)；4 小節
    (0, 69, 2), (2, 72, 2), (4, 74, 4), (8, 72, 2), (10, 69, 2), (12, 72, 3),
    (16, 74, 2), (18, 77, 2), (20, 74, 4), (24, 72, 2), (26, 69, 2), (28, 67, 3),
    (32, 69, 2), (34, 72, 2), (36, 77, 4), (40, 76, 2), (42, 74, 2), (44, 72, 3),
    (48, 74, 2), (50, 72, 2), (52, 69, 4), (56, 67, 6),
]
FULL = ('chorus', 'trophy', 'climax')


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：收銀機、hat、拍手的高頻雜訊在取樣點之間會冒出額外的峰"""
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
    rng = np.random.default_rng(20)
    DUR = tl['frames'] / FPS
    N = int((DUR + 3) * SR)
    mus = np.zeros((2, N)); drm = np.zeros((2, N)); sfx = np.zeros((2, N))
    s = lambda fr: fr / FPS
    secs = [(name, s(fr)) for name, fr in tl['secs']]

    def sec_at(t):
        cur = secs[0][0]
        for name, t0 in secs:
            if t + 1e-6 >= t0: cur = name
        return cur

    def sec_start(t):
        st = 0.0
        for name, t0 in secs:
            if t + 1e-6 >= t0: st = t0
        return st

    def place(buf, x, t, g=1.0, pan=0.0):
        """把單聲道 x 放到秒數 t，pan -1 左 … 1 右"""
        i = int(round(t * SR))
        if i >= N or i < 0 or len(x) == 0: return
        x = x[:N - i] * g
        buf[0, i:i + len(x)] += x * np.cos((pan + 1) * np.pi / 4) * 1.414
        buf[1, i:i + len(x)] += x * np.sin((pan + 1) * np.pi / 4) * 1.414

    def place_st(buf, x, t, g=1.0, width=0.012):
        """寬聲場：右聲道延遲幾毫秒"""
        d = int(width * SR)
        place(buf, x, t, g * 0.75, -0.6)
        place(buf, np.concatenate([np.zeros(d), x]), t, g * 0.75, 0.6)

    def env(n, a, d):
        e = np.exp(-np.arange(n) / (d * SR))
        ai = max(1, int(a * SR))
        e[:ai] *= np.linspace(0, 1, ai)
        return e

    # ───────── 音效（numpy 合成，原作照搬） ─────────
    def sfx_register():
        """收銀機：機械「喀」兩下＋高音鈴「鏘」"""
        n = int(1.1 * SR); t = np.arange(n) / SR; x = np.zeros(n)
        for off in (0.0, 0.035):
            i = int(off * SR)
            x[i:] += M.hp(M.noise(n - i), 2500) * M.ex(n - i, 0.006) * 0.6
        i = int(0.07 * SR); tb = t[: n - i]; bell = np.zeros(n - i)
        for f, a, d in [(2093, 1.0, 0.55), (2794, 0.6, 0.4), (3520, 0.45, 0.3), (4699, 0.3, 0.22), (5274, 0.2, 0.15)]:
            bell += a * np.sin(2 * np.pi * f * tb) * np.exp(-tb / d)
        x[i:] += bell * 0.35
        return x * 0.8

    def sfx_dingdong():
        n = int(1.2 * SR); x = np.zeros(n)
        for off, f in ((0.0, 1318.5), (0.22, 1046.5)):
            i = int(off * SR); tb = np.arange(n - i) / SR
            x[i:] += (np.sin(2 * np.pi * f * tb) + 0.3 * np.sin(2 * np.pi * 2 * f * tb) * np.exp(-tb / 0.2)) * env(n - i, 0.003, 0.45)
        return x * 0.28

    def sfx_pop(f0=950):
        n = int(0.07 * SR); t = np.arange(n) / SR
        fr = f0 * np.exp(-t * 30) + 260
        return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.001, 0.025) * 0.5

    def sfx_pops(kk=3):
        out = np.zeros(int(0.5 * SR))
        for j in range(kk):
            p = sfx_pop(800 + 180 * j + rng.uniform(-60, 60)); i = int(j * 0.1 * SR)
            out[i:i + len(p)] += p
        return out

    def sfx_bark():
        """「汪！」：鋸齒波基頻上揚再下滑，兩個共振峰帶通＋一點氣音"""
        n = int(0.26 * SR); t = np.arange(n) / SR
        f0 = 430 + 260 * np.sin(np.pi * np.clip(t / 0.09, 0, 1)) * (t < 0.09) + np.where(t >= 0.09, 260 * np.exp(-(t - 0.09) * 18), 0)
        ph = np.cumsum(f0) / SR; src = 2 * (ph % 1) - 1
        v = M.bp(src, 700, 1300) * 1.2 + M.bp(src, 1700, 2600) * 0.7 + M.bp(M.noise(n), 900, 3000) * 0.25
        e = np.clip(t / 0.008, 0, 1) * np.exp(-np.maximum(t - 0.05, 0) / 0.06)
        return np.tanh(v * e * 3) * 0.55

    def sfx_cheer(dur=3.2):
        n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
        for _ in range(26):
            lo = rng.uniform(400, 1400)
            band = M.bp(M.noise(n), lo, lo * 2.2)
            x += band * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(2, 6) * t + rng.uniform(0, 6)))
        for _ in range(9):  # 「喔～」的人聲
            st = rng.uniform(0, min(1.2, dur * 0.4)); f = rng.uniform(380, 700); ln = rng.uniform(0.6, 1.4)
            i = int(st * SR); m = min(int(ln * SR), n - i)
            tb = np.arange(m) / SR
            fr = f * (1 + 0.25 * tb / ln) * (1 + 0.02 * np.sin(2 * np.pi * 6 * tb))
            w = np.cumsum(fr) / SR
            voice = (np.sin(2 * np.pi * w) + 0.4 * np.sin(4 * np.pi * w)) * np.sin(np.pi * tb / ln) ** 1.5
            x[i:i + m] += M.lp(voice, 2500) * 0.9
        e = np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 1.4, 0, 1)
        return x / 26 * 2.2 * e

    def sfx_stamp():
        n = int(0.9 * SR); t = np.arange(n) / SR
        body = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t * 40)) / SR) * np.exp(-t / 0.12)
        slap = M.bp(M.noise(n), 300, 3000) * np.exp(-t / 0.02)
        return np.tanh((body * 1.4 + slap * 0.8) * 1.5) * 0.8

    def sfx_neon():
        n = int(0.9 * SR); t = np.arange(n) / SR
        buzz = M.lp(2 * ((t * 100) % 1) - 1, 1600) * 0.25
        flick = np.ones(n)
        for a, b in ((0.0, 0.05), (0.12, 0.16), (0.24, 0.27)):
            flick[int(a * SR):int(b * SR)] = 0.1
        tick = M.hp(M.noise(n), 3000) * np.exp(-t / 0.01) * 0.5
        return (buzz * flick + tick) * np.clip((0.9 - t) / 0.3, 0, 1)

    def sfx_chime_up():
        out = np.zeros(int(1.4 * SR))
        for j, m in enumerate([77, 81, 84, 89]):
            x = M.piano(m, 1.0, 0.9); b = M.blip(m + 12, 0.08); x[:len(b)] += 0.4 * b
            i = int(j * 0.07 * SR); out[i:i + len(x)] += x
        return out

    def sfx_chime_down():
        out = np.zeros(int(2.0 * SR))
        for j, m in enumerate([84, 81, 77, 72]):
            x = M.piano(m, 1.4, 0.85); i = int(j * 0.12 * SR); out[i:i + len(x)] += x
        return out

    def lead(m, dur):
        n = int(dur * SR); t = np.arange(n) / SR
        f = M.midi(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.15, 0, 1))
        ph = np.cumsum(f) / SR
        x = np.where(ph % 1 < 0.5, 1.0, -1.0) * 0.5 + (2 * (ph % 1) - 1) * 0.5
        return M.lp(x, 3800) * M.adsr(n, 0.006, 0.06) * 0.17

    # ───────── 編曲：逐小節、逐 16 分音符查段落 ─────────
    kick = M.kick(1.0, 0.14, 50); clap = M.clap(); snr = M.snare(200, 0.1, 6000)
    hat = M.hat(False, 1.0); ohat = M.hat(True, 0.8)
    live = s(tl['live']); E = s(tl['end']['at']); C = s(tl['climax']); K0 = s(tl['kwStart'])
    final_t = max(E + BAR, (int((DUR - 4.2) / BAR + 1e-6)) * BAR)     # 最後的長和弦（下播後第一個整小節起、至少留 4 秒）
    drums_end = min(E + 2 * BAR, final_t)
    nbars = int(DUR / BAR) + 1
    intro_i = 0
    for b in range(nbars):
        t0 = b * BAR
        root, ch = CH[b % 4]
        sb = sec_at(t0)
        # 和弦
        if sb == 'intro' and t0 < live:
            place_st(mus, M.lp(M.pad(ch, min(2.05, live - t0 + 0.05), 900 + 900 * intro_i, 0.007, 0.2), 1400 + intro_i * 1500), t0, 0.9)
            intro_i += 1
        if sb == 'outro' or t0 >= E:
            if t0 < final_t:
                place_st(mus, M.epiano(ch, 2.0), t0, 1.0)
                place_st(mus, M.pad(ch, 2.05, 1500, 0.006, 0.4), t0, 0.5)
                place(mus, M.bass(root + 12, 1.9, 'sub'), t0, 0.8)
        for st in range(16):
            t = t0 + st * S16
            if t >= DUR: break
            sc = sec_at(t)
            if sc in ('intro', 'outro', 'brk'): continue
            full = sc in FULL
            # 切分合成器和弦（K-pop 常見的 stab）
            if st in ((0, 3, 6, 10, 12, 14) if (full or sc == 'cert') else (0, 6, 10)):
                place_st(mus, M.lp(M.supersaw(ch, S16 * 1.6), 4200), t, 0.55 if full else 0.42)
            if st == 0 and full:
                place_st(mus, M.pad([c + 12 for c in ch], 2.05, 3200, 0.01, 0.05), t, 0.35)
            # 貝斯
            pat = {0: 0, 3: 0, 6: 12, 8: 0, 10: 0, 11: 12, 14: 0} if (full or sc == 'cert') else {0: 0, 6: 0, 8: 0, 14: 0}
            if st in pat:
                place(mus, M.bass(root + 12 + pat[st], S16 * 1.7, 'saw' if full else 'sub'), t, 1.1)
            # 主旋律（每段副歌從頭唱）
            if full:
                hi = int(round((t - sec_start(t)) / S16)) % 64
                for p0, m, ln in HOOK:
                    if p0 == hi: place_st(mus, lead(m + 12, ln * S16 * 0.95), t, 1.0, 0.008)
            if sc == 'verse' and t >= live + BAR - 1e-6 and st % 2 == 0:
                m = [ch[0], ch[1], ch[2], ch[1]][(st // 2) % 4] + 12
                place(mus, M.pluck(m, 0.2, 5000, 0.06), t, 0.7, 0.35 if st % 4 else -0.35)
            if sc == 'cert' and st % 2 == 0:
                m = [ch[2], ch[1], ch[0], ch[1]][(st // 2) % 4] + 24
                place(mus, M.pluck(m, 0.18, 6000, 0.05), t, 0.5, 0.4 if st % 4 else -0.4)
        # 鼓
        for q in range(4):
            tq = t0 + q * BEAT
            if tq >= drums_end: break
            sq = sec_at(tq)
            if sq == 'intro':
                if tq >= live - BAR - 1e-6:          # 開播前一小節：拍手
                    for st in ((0,) if q < 3 else (0, 2)):
                        place(drm, clap, tq + st * S16, 0.6)
                continue
            if sq == 'brk': continue
            full = sq in FULL
            if sq == 'pre':
                if q in (0, 2): place(drm, kick, tq, 1.0)
            else:
                place(drm, kick, tq, 1.0)
            if q in (1, 3):
                place(drm, clap, tq, 0.9); place(drm, snr, tq, 0.4)
            place(drm, hat, tq + BEAT / 2, 0.9, 0.3)
            if full or sq == 'cert':
                place(drm, hat, tq + BEAT / 4, 0.45, -0.3); place(drm, hat, tq + 3 * BEAT / 4, 0.45, -0.3)
            if full and q == 3: place(drm, ohat, tq + BEAT / 2, 0.8, 0.2)
    # 進副歌前的拍手連打（關鍵字段前兩拍）
    for j in range(8):
        place(drm, clap, K0 - 2 * BEAT + j * S16, 0.35 + 0.05 * j)
    # 最後的長和弦
    place_st(mus, M.epiano([60, 65, 69, 72], max(2.0, DUR - final_t + 0.5)), final_t, 1.0)
    place_st(mus, M.pad([53, 60, 65, 69], max(2.0, DUR - final_t + 0.5), 1400, 0.006, 0.3), final_t, 0.6)

    # ───────── 過門與升降 ─────────
    rv = tl['reveal']
    place(sfx, M.riser(max(0.5, live - 0.3)), 0.3, 0.6)
    place(sfx, M.riser(2.0), s(rv['end']) - 2.0, 0.55)
    for e in tl['shows']:
        if e['kind'] != 'cert':
            place(sfx, M.riser(1.5), s(e['hit']) - 1.5, 0.7)
    place(sfx, M.riser(1.8), C - 1.8, 0.6)
    place(sfx, M.impact(2.0, 0.8), live, 0.55)
    if tl['d']['reveal']['tag']: place(sfx, M.impact(2.2, 0.9), s(rv['slam']), 0.6)
    place(sfx, M.impact(2.5, 1.0), C, 0.6)
    for fr in tl['whoosh']:
        place_st(sfx, M.whoosh(0.5), s(fr) - 0.12, 0.8)

    # ───────── 故事音效 ─────────
    for fr in tl['countdown']: place(sfx, M.blip(84, 0.12) * 2.2, s(fr), 1.0)
    place(sfx, sfx_chime_up(), live - 0.02, 0.9)
    for fr in tl['bark']:
        place(sfx, sfx_bark(), s(fr), 1.0, -0.1)
        place(sfx, sfx_bark() * 0.8, s(fr) + 0.22, 1.0, -0.1)   # 汪汪
    for a, _, _ in tl['stand']:
        place(sfx, M.tom(160, 0.18) * 0.6, s(a), 0.8)
        place(sfx, M.blip(91, 0.06) * 1.5, s(a) + 0.04, 1.0, 0.3)
    for o, _, a, _ in tl['orders']:
        place(sfx, sfx_register(), s(o), 0.85, 0.15)
        place(sfx, sfx_dingdong(), s(a), 0.8, -0.15)
    for fr in tl['hearts']: place(sfx, sfx_pops(3), s(fr), 0.75, 0.45)
    for fr in tl['tilt']:
        place(sfx, M.blip(79, 0.05) * 1.2, s(fr), 1.0)
        place(sfx, M.blip(86, 0.05) * 1.2, s(fr) + 0.07, 1.0)
    place(sfx, sfx_neon(), s(rv['sign']), 1.0, 0.4)
    place(sfx, sfx_neon(), s(rv['sign'] + 12), 0.7, 0.4)
    for e in tl['shows']:
        if e['kind'] == 'cert':
            if e.get('stamp'): place(sfx, sfx_stamp(), s(e['stampAt']), 1.0)
            else: place(sfx, M.tom(120, 0.3) * 0.8, s(e['stampAt']), 0.9)
        else:
            for sh in e['shake']: place(sfx, M.tom(220, 0.12) * 0.5, s(sh), 0.7, -0.2)
            place(sfx, M.impact(2.5, 1.0), s(e['hit']), 0.75)
            place(sfx, sfx_cheer(3.2), s(e['hit']) + 0.05, 0.45)
            place_st(mus, M.brass([65, 69, 72, 77], 1.6), s(e['hit']), 0.9)   # 號角
    place(sfx, sfx_cheer(min(4.4, E - C + 0.4)), C, 0.9)
    place(sfx, sfx_chime_down(), E, 0.9)
    place(sfx, sfx_neon(), s(tl['end']['sign']), 0.8, 0.4)
    place(sfx, sfx_chime_up(), s(tl['end']['logo']), 0.6)

    # ───────── 母帶 ─────────
    mix = mus * 0.9 + drm * 1.0 + sfx * 1.0
    mix = M.master_chain(mix)
    mix = mix / (true_peak_env(mix).max() + 1e-9)
    mix = peak_limit(mix, 10 ** (-PEAK_CUT / 20))   # 衝擊、收銀機、拍手的瞬間真峰值壓掉，出片用預設限幅就過
    n = int(round(DUR * SR)); mix = mix[:, :n]
    fo = int(1.4 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
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
