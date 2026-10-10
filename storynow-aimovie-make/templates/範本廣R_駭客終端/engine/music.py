"""範本廣R「駭客終端」配樂與音效：tech house 126 BPM F 小調（四拍大鼓、第 2、4 拍拍手、反拍 open hi-hat、16 分音符反拍 closed hi-hat、
切分的 sub 低音、16 分音符撥弦琶音、每兩小節換和弦的墊底），換章前一小節 riser、換章那拍 impact（對準畫面的招牌轉場），
最後縮成 logo 視窗前兩小節 riser＋重擊；
章內的打字（每個字一聲鍵盤）、Enter、輸出行、數字停住、BIOS 開機嗶聲、ACCESS GRANTED 都對準時間表的事件（同一份 timeline）。
段落：第一章（開機自檢）只有墊底（低通較暗）＋反拍 hi-hat → 第二章起 tech house 全編制 → 最後兩小節回到墊底，尾巴淡出。
make_ad.py 呼叫 render(tl, wav)。
原作：02_試做/廣告30風格/video/ad_audio.py 的 build('09')（'techhouse', 126, 'Fm', 各章 4 小節，固定 60 秒，音效強度 0.9），
編曲是 make_music.arrange() 的 techhouse 分支；這裡只把 tech house 用到的樂器、音效、混音照搬過來，段落與換章點全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 126
KEY = 'Fm'
FXG = 0.9                     # 原作的音效強度（ADS['09'] 最後一欄）
INTRO_GAIN = 2.2              # 開場（第一章）只有墊底＋反拍 hi-hat，比全編制安靜很多：響度範圍太大時出片的 loudnorm 會退回動態模式，
                              # 墊底層拉高（音色不變，只是混音音量）讓響度範圍 < 9 LU。結尾兩小節不拉
AAC_LP = 16000                # 母帶先低通 16 kHz：hi-hat 在 16 kHz 以上的能量 AAC 編碼會丟掉並產生振鈴
PEAK_CUT = 0.0                # 前瞻真峰值限幅要壓幾 dB：起音整理＋同拍降一點之後已經夠低，不壓（0）。
                              # 模擬出片（兩段式響度＋AAC）：0 → −4.2／−4.4 dBTP、0.5 → −4.5／−4.6 dBTP（示範／換文本）；換文本峰值超標時才改成 0.3～0.5


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
    """慢速音量騎乘：用 3 秒滑動 RMS 把安靜段拉近全編制段，響度範圍（LRA）壓到 9 以下（出片 loudnorm 才走線性模式）。"""
    from scipy.ndimage import uniform_filter1d
    e = np.sqrt(uniform_filter1d((x ** 2).mean(axis=0), size=int(win * SR)) + 1e-12)
    ref = np.percentile(e[e > e.max() * 0.05], 80)
    g_db = np.clip(-20 * np.log10(e / ref) * amount, -cap_db, cap_db)
    g_db = uniform_filter1d(g_db, size=int(1.0 * SR))
    return x * 10 ** (g_db / 20)


def soft_attack(x, ms=2.5, hf_ms=12, hf=6500, g=1.0):
    """打擊樂起音整理：前 2.5 ms 短淡入，前 12 ms 的 6.5 kHz 以上瞬間收一點（g＝整體增益，同拍疊加時降一點）。
    原樣的瞬間起音會讓 AAC 編碼器產生預回音突波，聽感幾乎不變"""
    x = x.copy()
    n = int(ms / 1000 * SR); x[:n] *= np.linspace(0, 1, n)
    m = int(hf_ms / 1000 * SR)
    lo = M.lp(x, hf, 2)
    w = np.ones(len(x)); w[:m] = np.linspace(0, 1, m) ** 0.5
    return (lo + (x - lo) * w) * g


def techhouse(bpm, key, dur, starts):
    """make_music.arrange() 的 techhouse 分支（照搬；bed=False、沒有 swing）：starts＝各段開始秒數（第一個是 0）。
    全編制從第二章開始到最後兩小節前；換章那拍已有重擊，那一拍的大鼓、拍手降一點。"""
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
    T = lambda b, beat_pos: b * bar + beat_pos * beat
    cut = {round(s / beat) for s in starts[1:]}               # 換章那一拍（拍號）
    K = soft_attack(M.kick(), ms=1.5, hf_ms=6)
    CL = soft_attack(M.clap(), ms=1.0, hf_ms=8)
    CH = soft_attack(M.hat(), ms=1.0, hf_ms=4)
    OH = soft_attack(M.hat(True), ms=1.0, hf_ms=6)
    for b in range(nbars):
        t0 = b * bar
        if t0 > dur: break
        e = energy(t0 + 0.01)
        r, ch = prog[(b // 2) % 4]
        last = t0 > dur - 2 * bar
        ig = INTRO_GAIN if t0 < first - 0.01 else 1.0
        if b % 2 == 0: add(M.pad(ch, bar * 2 + .3, 700 + 1100 * e), t0, .9 * ig)
        if e:
            for k in range(4): add(K, T(b, k), drum_g * (0.6 if b * 4 + k in cut else 1.0))
            for k in (1, 3): add(CL, T(b, k), .85 * drum_g * (0.7 if b * 4 + k in cut else 1.0))
            for k in range(4): add(OH, T(b, k + .5), .8 * drum_g, .25)
            for s in range(1, 16, 2): add(CH, T(b, s / 4), .45 * drum_g, -.3)
            for bp_, o in [(.5, 0), (1.5, 0), (2.5, 0), (3.25, 12), (3.5, 0)]: add(M.bass(r - 12 + o, beat * .45), T(b, bp_))
            notes = ch + [ch[0] + 12]
            for s in range(16): add(M.pluck(notes[(s * 3) % 4] + 12), T(b, s / 4), .7, .4 if s % 2 else -.4)
        elif not last:
            for k in range(4): add(CH, T(b, k + .5), .5 * ig)
    return L, R


# ───── 範本加的音效（終端機）─────
def key_snd(i):
    """鍵盤：一個字一聲（短的帶通雜訊＋很輕的嗒，每個字音高略不同）"""
    n = int(0.03 * SR)
    lo, hi = 1800 + (i * 370) % 900, 6500 + (i * 530) % 1500
    nz = M.bp(M.noise(n), lo, hi) * M.ex(n, 0.005)
    tk = np.sin(2 * np.pi * (900 + (i * 130) % 400) * M.tt(n)) * M.ex(n, 0.004) * 0.25
    return (nz * 0.55 + tk)


def enter_snd():
    """Enter：比一般鍵重的「咚嗒」（低一點的板子聲＋按鍵聲）"""
    n = int(0.12 * SR)
    body = np.sin(2 * np.pi * np.cumsum(220 + 160 * np.exp(-M.tt(n) * 60)) / SR) * M.ex(n, 0.03) * 0.6
    nz = M.bp(M.noise(n), 1200, 5000) * M.ex(n, 0.008) * 0.7
    return body + nz


def beep_snd():
    """BIOS 開機嗶一聲（方波 1 kHz，小聲）"""
    n = int(0.16 * SR)
    x = M.sq(1000, n) * M.adsr(n, 0.003, 0.02)
    return M.lp(x, 4000) * 0.18


def granted_snd(key):
    """ACCESS GRANTED：重擊＋和弦撥弦往上琶音（主和弦）"""
    r, ch = M.progression(key)[0]
    out = soft_attack(M.impact(1.4, 0.7), ms=4, hf_ms=20, hf=5000) * 0.5
    for i, m in enumerate(ch + [ch[0] + 12, ch[1] + 12]):
        p = soft_attack(M.pluck(m + 12, 0.5, 5000, 0.18), ms=2)
        j = int(i * 0.045 * SR)
        out[j:j + len(p)] += p * 0.9
    return out


def render(tl, wav_path):
    FR = tl['frames']
    DUR = FR / FPS
    N = int(DUR * SR)
    beat = 60 / BPM; bar = beat * 4
    starts = [f / FPS for f in tl['sections']]                  # 各段開始秒數（各章開始＋縮成 logo 視窗那一刻），跟畫面同一份
    Lm, Rm = techhouse(BPM, KEY, DUR + 1, starts)
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
    # 範本加的：打字、Enter、輸出行、數字停住、開機嗶聲、ACCESS GRANTED、轉場的咻（同一份時間表；落在換章點上的降一點）
    SX = tl.get('sfx') or {}
    chf = set(tl['sections'])
    near = lambda f: any(abs(f - c) <= 2 for c in chf)
    for i, f in enumerate(SX.get('key', [])):
        add(f / FPS, key_snd(i), 0.16)
    en = soft_attack(enter_snd(), ms=1.0, hf_ms=4)
    for f in SX.get('enter', []):
        add(f / FPS, en, 0.32 * (0.6 if near(f) else 1))
    for i, f in enumerate(SX.get('line', [])):
        add(f / FPS, soft_attack(M.blip(96 + (i * 5) % 12, 0.03)), 0.22)
    for i, f in enumerate(SX.get('tick', [])):
        add(f / FPS, soft_attack(M.blip(88 + (i * 3) % 7, 0.035)), 0.3)
    for f in SX.get('pop', []):
        add(f / FPS, soft_attack(M.blip(84, 0.06), ms=1.5), 0.35)
    for f in SX.get('whoosh', []):
        add(f / FPS, M.whoosh(0.5), 0.3)
    for f in SX.get('beep', []):
        add(f / FPS + 0.05, beep_snd(), 1.0)
    gr = granted_snd(KEY)
    for f in SX.get('granted', []):
        add(f / FPS, gr, 0.55 * FXG)

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
