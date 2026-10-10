"""範本廣P「粗框醒目」配樂與音效：drum & bass 160 BPM E 小調（兩步鼓：大鼓在第 1 拍與第 3 拍後半、小鼓在第 2、4 拍、
16 分音符 hi-hat、每兩小節一個 reese 長低音、高八度撥弦琶音、每小節換和弦的墊底），
換章前一小節 riser、換章那拍 impact（對準畫面的招牌轉場）、最後一章前兩小節 riser＋重擊；
章內的按下（游標點擊）、彈出（視窗／按鈕跳出來）、拖曳（卡片被拖走、整個畫面被甩出）、倒帶（Ctrl+Z）、貼紙啪一聲、數字停住的「嗒」、印章都對準時間表的事件（同一份 timeline）。
段落：第一章（開始按鈕）只有墊底＋8 分音符 hi-hat → 第二章起 drum & bass 全編制 → 最後兩小節回到墊底，尾巴淡出。
make_ad.py 呼叫 render(tl, wav)。
原作：02_試做/廣告30風格/video/ad_audio.py 的 build('05')（'dnb', 160, 'Em', 各章 4 小節，固定 60 秒），
編曲是 make_music.arrange() 的 dnb 分支；這裡只把 drum & bass 用到的樂器、音效、混音照搬過來，段落與換章點全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 160
KEY = 'Em'
FXG = 1.0                     # 原作的音效強度（ADS['05'] 最後一欄）
INTRO_GAIN = 2.5              # 開場（第一章）只有墊底＋8 分音符 hi-hat，比全編制安靜很多：第一章長（7.5 秒）時響度範圍 11.8 LU，
                              # 出片的 loudnorm 退回動態模式、峰值衝到 −1.8 dBTP；墊底層拉高 8 dB（音色不變，只是混音音量）→ LRA 6.3、走線性模式。結尾兩小節不拉
AAC_LP = 16000                # 母帶先低通 16 kHz：16 分音符 hi-hat 在 16 kHz 以上的能量 AAC 編碼會丟掉並產生振鈴，出片峰值才穩定
PEAK_CUT = 0.5                # 母帶用真峰值（4 倍超取樣）正規化後只壓最尖的 0.5 dB（drum & bass 打擊樂密，盡量不壓）。
                              # 模擬出片（兩段式響度＋AAC）：0 → −3.3／−3.4 dBTP、0.5 → −3.6／−3.8 dBTP（示範／換文本）


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）"""
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


def ride_gain(x, win=3.0, amount=0.5, cap_db=4.0):
    """慢速音量騎乘：用 3 秒滑動 RMS 把安靜段（開場只有墊底）拉近全編制段，響度範圍（LRA）壓到 9 以下（出片 loudnorm 才走線性模式）。
    每秒變化很慢，聽起來是混音，不是壓縮器的抽吸。"""
    from scipy.ndimage import uniform_filter1d
    e = np.sqrt(uniform_filter1d((x ** 2).mean(axis=0), size=int(win * SR)) + 1e-12)
    ref = np.percentile(e[e > e.max() * 0.05], 80)
    g_db = np.clip(-20 * np.log10(e / ref) * amount, -cap_db, cap_db)
    g_db = uniform_filter1d(g_db, size=int(1.0 * SR))
    return x * 10 ** (g_db / 20)


def soft_attack(x, ms=2.5, hf_ms=12, hf=6500, g=1.0):
    """打擊樂起音整理：前 2.5 ms 短淡入，前 12 ms 的 6.5 kHz 以上瞬間收一點（g＝整體增益，同拍疊加時降一點）。
    原樣的瞬間起音會讓 AAC 編碼器在 7～8 kHz 產生預回音突波，聽感幾乎不變"""
    x = x.copy()
    n = int(ms / 1000 * SR); x[:n] *= np.linspace(0, 1, n)
    m = int(hf_ms / 1000 * SR)
    lo = M.lp(x, hf, 2)
    w = np.ones(len(x)); w[:m] = np.linspace(0, 1, m) ** 0.5
    return (lo + (x - lo) * w) * g


def dnb(bpm, key, dur, starts):
    """make_music.arrange() 的 dnb 分支（照搬；bed=False）：starts＝各章開始秒數（第一個是 0）。
    全編制從第二章開始到最後兩小節前；換章那拍已有重擊，那一拍的大鼓降一點。"""
    beat = 60 / bpm; bar = beat * 4
    nbars = int(np.ceil(dur / bar)) + 1
    N = int((dur + 3) * SR)
    L = np.zeros(N); R = np.zeros(N)
    prog = M.progression(key)

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or i < 0: return
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

    first = starts[1] if len(starts) > 1 else min(dur * 0.12, 4 * bar)

    def energy(t):
        """0＝開場／結尾（稀疏），1＝主段。第二章之前與最後 2 小節為 0。"""
        if t < first - 0.01: return 0
        if t > dur - 2 * bar: return 0
        return 1

    drum_g = 1.0
    T = lambda b, beat_pos: b * bar + beat_pos * beat          # dnb 沒有 swing
    cbar = {int(round(s / bar)) for s in starts}               # 各章開始的小節
    K = soft_attack(M.kick(), ms=1.5, hf_ms=6)
    SN = soft_attack(M.snare(190, .14, 7000), g=0.9)
    CH = soft_attack(M.hat(), ms=1.0, hf_ms=4)
    for b in range(nbars):
        t0 = b * bar
        if t0 > dur: break
        e = energy(t0 + 0.01)
        r, ch = prog[b % 4]
        last = t0 > dur - 2 * bar
        ig = INTRO_GAIN if t0 < first - 0.01 else 1.0
        add(M.pad(ch, bar + .2, 1200, 0.01, 0.2), t0, .6 * ig)
        if e:
            for s in (0, 10): add(K, T(b, s / 4), drum_g * (0.6 if s == 0 and b in cbar else 1.0))   # 換章那拍已有重擊：大鼓降一點
            for s in (4, 12): add(SN, T(b, s / 4), .9 * drum_g)
            for s in range(16): add(CH, T(b, s / 4), (.3 + .2 * (s % 2 == 0)) * drum_g, .3)
            if b % 2 == 0: add(M.bass(r - 12, bar * 2, 'reese'), t0, .8)
            for s in (0, 3, 6, 8, 11, 14): add(M.pluck(ch[s % 3] + 24, .15, 6000, .05), T(b, s / 4), .4, .4)
        elif not last:
            for s in range(0, 16, 2): add(CH, T(b, s / 4), .4 * ig)
    return L, R


def pop_snd(f0=520, f1=1100, length=0.07):
    """彈出：短促往上滑的正弦（視窗、按鈕跳出來）"""
    n = int(length * SR); t = M.tt(n)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * M.ex(n, 0.025) * 0.5


def click_snd():
    """按下：游標點擊（短的高頻雜訊＋一聲小嗒）"""
    n = int(0.05 * SR)
    nz = M.bp(M.noise(n), 2000, 9000) * M.ex(n, 0.004) * 0.6
    tk = np.sin(2 * np.pi * 1800 * M.tt(n)) * M.ex(n, 0.008) * 0.3
    return nz + tk


def rewind_snd(length=0.8):
    """倒帶：音高快速往下掉的磁帶聲（Ctrl+Z）"""
    n = int(length * SR); t = M.tt(n)
    f = 1500 * np.exp(-t * 3.2) + 120
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    x = M.lp(x, 3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t))
    nz = M.bp(M.noise(n), 800, 5000) * 0.15
    env = np.minimum(1, t / 0.03) * np.exp(-t * 1.4)
    return (x + nz) * env * 0.5


def render(tl, wav_path):
    FR = tl['frames']
    DUR = FR / FPS
    N = int(DUR * SR)
    beat = 60 / BPM; bar = beat * 4
    starts = [c['beat'] * beat for c in tl['chapters']]          # 各章開始秒數（落在小節頭，跟畫面同一份）
    Lm, Rm = dnb(BPM, KEY, DUR + 1, starts)
    mus = M.master_chain(np.stack([Lm, Rm])[:, :N]) * 0.6

    # ───── 音效 ─────
    fx = np.zeros(N + SR * 3)

    def add(t, s, g=1.0):
        i = int(round(t * SR))
        if i < 0 or i >= len(fx): return
        m = max(0, min(len(s), len(fx) - i)); fx[i:i + m] += s[:m] * g
    # 原作：開頭重擊、換章前一小節 riser＋換章重擊、logo 前兩小節 riser＋重擊
    IM = lambda L, w: soft_attack(M.impact(L, w), ms=4, hf_ms=20, hf=5000)   # 重擊起音整理（同拍還有大鼓）
    add(0, IM(2.0, 1.0) * 0.55 * FXG)
    for t in starts[1:-1]:
        add(t - bar, M.riser(bar) * 0.3 * FXG)
        add(t, IM(1.6, 0.9) * 0.5 * FXG)
    logo = starts[-1]
    add(logo - 2 * bar, M.riser(2 * bar) * 0.3 * FXG)
    add(logo, IM(2.5, 1.0) * 0.7 * FXG)
    # 範本加的：章內事件與轉場動作（同一份時間表；落在換章點上的降一點）
    SX = tl.get('sfx') or {}
    chf = {c['from'] for c in tl['chapters']}
    near = lambda f: any(abs(f - c) <= 2 for c in chf)
    for i, f in enumerate(SX.get('pop', [])):
        add(f / FPS, soft_attack(pop_snd(480 + (i * 70) % 280, 1000 + (i * 90) % 400), ms=1.5), 0.32 * (0.6 if near(f) else 1))
    ck = soft_attack(click_snd(), ms=1.0, hf_ms=4)
    for f in SX.get('press', []):
        add(f / FPS, ck, 0.5)
    wh = M.whoosh(0.45)
    for f in SX.get('drag', []):
        add(f / FPS, wh, 0.35)
    for f in SX.get('whoosh', []):
        add(f / FPS, M.whoosh(0.6), 0.3)
    sl = soft_attack(M.snare(240, 0.05, 5000), g=0.5)
    for f in SX.get('slap', []):
        add(f / FPS, sl, 0.35)
    th = soft_attack(M.tom(110, 0.2), ms=2)
    for f in SX.get('thump', []):
        add(f / FPS, th, 0.25)
    for i, f in enumerate(SX.get('tick', [])):
        add(f / FPS, soft_attack(M.blip(88 + (i * 3) % 7, 0.035)), 0.35)
    stp = soft_attack(M.impact(0.9, 0.6)) * 0.5
    stp[:int(0.4 * SR)] += soft_attack(M.snare(200, 0.1, 3500)) * 0.25
    for f in SX.get('stamp', []):
        add(f / FPS, stp, 0.4)
    bu = soft_attack(M.impact(0.8, 0.4), ms=3, hf_ms=12)
    for f in SX.get('burst', []):
        add(f / FPS, bu, 0.18)
    rw = rewind_snd()
    for f in SX.get('rewind', []):
        add(f / FPS, rw, 0.5)

    # ───── 母帶 ─────
    out = mus + fx[:N] * 0.8
    if AAC_LP: out = np.stack([M.lp(ch, AAC_LP, 4) for ch in out])
    out = ride_gain(out)
    out = out / (true_peak_env(out).max() + 1e-9)
    if PEAK_CUT > 0:
        out = peak_limit(out, 10 ** (-PEAK_CUT / 20))
    f = int(1.4 * SR); out[:, -f:] *= np.linspace(1, 0, f)
    out = out / (true_peak_env(out).max() + 1e-9) * 0.9
    pcm = (np.clip(out, -1, 1).T * 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    render(mod.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
