"""範本廣N「數位故障」配樂與音效：phonk 110 BPM A 小調（808 長音滑降、Trap 滾奏 Hi-hat、牛鈴旋律、第 3 拍拍手＋小鼓的半拍感），
換章前一小節 riser、換章那拍 impact（對準畫面的撕裂轉場）、收尾章前兩小節 riser＋重擊；
章內的解碼鎖定「嗶」、修復完成的雙音、轉台／錯誤視窗彈出的數位雜訊都對準時間表的事件（同一份 timeline）。
段落：第一章（開場解碼）只有長和弦墊底＋反拍 Hi-hat → 第二章起 phonk 全編制 → 最後兩小節回到長和弦，尾巴淡出。
make_ad.py 呼叫 render(tl, wav)。
原作：02_試做/廣告30風格/video/ad_audio.py 的 build('02')（'phonk', 110, 'Am', 各章 4 小節，固定 60 秒），
編曲是 make_music.arrange() 的 phonk 分支；這裡只把 phonk 用到的樂器、音效、混音照搬過來，段落與換章點全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 110
KEY = 'Am'
FXG = 1.0                     # 原作的音效強度（ADS['02'] 最後一欄）
INTRO_GAIN = 4.0             # 開場（第一章）只有長和弦墊底：原作的音量比全編制低 16 LU（響度範圍 17），出片的 loudnorm 會退回動態模式，
                              # 所以墊底層整體拉高 12 dB（實測 LRA 17 → 7.4）（音色不變，只是混音音量）；結尾兩小節不拉
AAC_LP = 16000                # 母帶先低通 16 kHz：方波牛鈴、Trap Hi-hat、數位雜訊在 16 kHz 以上的能量 AAC 編碼會丟掉並產生振鈴，
                              # 實測讓 AAC 後的真峰值多冒 1～2 dB 而且每次不同；先濾掉（人耳幾乎聽不到）出片峰值才穩定
PEAK_CUT = 1.0                # 母帶用真峰值（4 倍超取樣）正規化後只壓最尖的 1 dB（收尾與開場重擊的起音幾毫秒，音色不變）。
                              # 搭配 soft_attack（拍手＋小鼓起音整理）實際出片：示範 −4.7、換文本 −3.8 dBTP


def true_peak_env(x, os_=4):
    """每個取樣點的「真峰值」（4 倍超取樣後取絕對值最大）：方波牛鈴、Hi-hat 的高頻在取樣點之間會冒出額外的峰"""
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
    """慢速音量騎乘：用 3 秒滑動 RMS 把安靜段（開場只有長和弦）拉近全編制段，響度範圍（LRA）壓到 9 以下。
    LRA 超過 9 時出片的 loudnorm 會退回動態模式，峰值改由 alimiter 決定、餘裕太小；壓到 9 以下才走線性模式。
    每秒變化很慢，聽起來是混音，不是壓縮器的抽吸。"""
    from scipy.ndimage import uniform_filter1d
    e = np.sqrt(uniform_filter1d((x ** 2).mean(axis=0), size=int(win * SR)) + 1e-12)
    ref = np.percentile(e[e > e.max() * 0.05], 80)
    g_db = np.clip(-20 * np.log10(e / ref) * amount, -cap_db, cap_db)
    g_db = uniform_filter1d(g_db, size=int(1.0 * SR))
    return x * 10 ** (g_db / 20)


def soft_attack(x, ms=2.5, hf_ms=12, hf=6500, g=0.85):
    """拍手＋小鼓的起音整理：前 2.5 ms 短淡入，前 12 ms 的 6.5 kHz 以上瞬間收一點，整體 −1.4 dB（兩個同拍落下）。
    原樣的瞬間起音會讓 AAC 編碼器在 7～8 kHz 產生預回音突波（實測一下拍手從 −6.9 dB 跳到 −2.3 dBTP），聽感幾乎不變"""
    x = x.copy()
    n = int(ms / 1000 * SR); x[:n] *= np.linspace(0, 1, n)
    m = int(hf_ms / 1000 * SR)
    lo = M.lp(x, hf, 2)
    w = np.ones(len(x)); w[:m] = np.linspace(0, 1, m) ** 0.5     # 起音段用低通版本，慢慢接回原音
    return (lo + (x - lo) * w) * g


def phonk(bpm, key, dur, sections):
    """make_music.arrange() 的 phonk 分支（照搬；bed=False）：sections＝第二章起每一章的開始秒數"""
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

    def energy(t):
        """0＝開場／結尾（稀疏），1＝主段。第一個段落點（第二章）之前與最後 2 小節為 0。"""
        first = sections[0] if sections else min(dur * 0.12, 4 * bar)
        if t < first - 0.01: return 0
        if t > dur - 2 * bar: return 0
        return 1

    drum_g = 1.0
    T = lambda b, beat_pos: b * bar + beat_pos * beat         # phonk 沒有 swing
    CH = M.hat()
    for b in range(nbars):
        t0 = b * bar
        if t0 > dur: break
        e = energy(t0 + 0.01)
        r, ch = prog[(b // 2) % 4]
        # Phonk：808 長音滑降、Trap 滾奏 Hi-hat、牛鈴旋律、第 3 拍拍手（半拍感）
        if e:
            for s16 in (0, 7, 10):
                n8 = int(beat * (1.6 if s16 == 0 else 0.7) * SR); tt8 = M.tt(n8)
                f808 = M.midi(r - 12) * (1 + 0.6 * np.exp(-tt8 * 30)) * (1 - 0.06 * (s16 == 10) * tt8 / max(tt8[-1], 1e-3))
                x808 = np.tanh(np.sin(2 * np.pi * np.cumsum(f808) / SR) * 3.0) * M.adsr(n8, 0.002, 0.08) * 0.55
                add(x808, T(b, s16 / 4), 1.0)
            add(soft_attack(M.clap()), T(b, 2), drum_g); add(soft_attack(M.snare(220, .1, 8000)), T(b, 2), .6 * drum_g)
            for s16 in range(16):
                add(CH, T(b, s16 / 4), (.35 + .2 * (s16 % 2 == 0)) * drum_g, .25)
            if b % 2 == 1:   # 小節尾 32 分音符滾奏
                for k in range(6): add(CH, T(b, 3.25 + k / 8), .4 * drum_g, -.25)
            mel = [0, 3, 7, 3, 10, 7, 3, 0]
            for k, o in enumerate(mel):
                nb = int(beat / 2 * SR)
                cow = (M.sq(M.midi(ch[0] + 12 + o), nb, .5) + M.sq(M.midi(ch[0] + 12 + o) * 1.48, nb, .5)) * M.ex(nb, .07) * .06
                add(M.lp(cow, 3500), T(b, k / 2), 1, (-.3, .3)[k % 2])
        else:
            ig = INTRO_GAIN if t0 < (sections[0] if sections else 0) else 1.0
            add(M.pad(ch, bar, 900, 0.01, 0.3), t0, .5 * ig)
            for k in range(4): add(CH, T(b, k + .5), .4 * ig)
    return L, R


def render(tl, wav_path):
    FR = tl['frames']
    DUR = FR / FPS
    N = int(DUR * SR)
    beat = 60 / BPM; bar = beat * 4
    starts = [c['beat'] * beat for c in tl['chapters']]          # 各章開始秒數（落在拍上，跟畫面同一份）
    Lm, Rm = phonk(BPM, KEY, DUR + 1, starts[1:])
    mus = M.master_chain(np.stack([Lm, Rm])[:, :N]) * 0.6

    # ───── 音效 ─────
    fx = np.zeros(N + SR * 3)

    def add(t, s, g=1.0):
        i = int(round(t * SR))
        if i < 0 or i >= len(fx): return
        m = max(0, min(len(s), len(fx) - i)); fx[i:i + m] += s[:m] * g
    # 原作：開頭重擊、換章前一小節 riser＋換章重擊、logo 前兩小節 riser＋重擊
    add(0, M.impact(2.0, 1.0) * 0.55 * FXG)
    for t in starts[1:-1]:
        add(t - bar, M.riser(bar) * 0.3 * FXG)
        add(t, M.impact(1.6, 0.9) * 0.5 * FXG)
    logo = starts[-1]
    add(logo - 2 * bar, M.riser(2 * bar) * 0.3 * FXG)
    add(logo, M.impact(2.5, 1.0) * 0.7 * FXG)
    # 範本加的：章內事件（解碼鎖定嗶聲、修復完成雙音、轉台／錯誤彈出的數位雜訊、章內小重擊）
    SX = tl.get('sfx') or {}
    for i, f in enumerate(SX.get('tick', [])):
        add(f / FPS, M.blip(84 + (i * 5) % 12, 0.05), 0.9)
    for f in SX.get('ok', []):
        add(f / FPS, M.blip(88, 0.06), 1.1); add(f / FPS + 0.07, M.blip(95, 0.08), 1.1)
    for f in SX.get('static', []):
        add(f / FPS, M.chip_noise(0.09, True), 0.55)
    for f in SX.get('hit', []):
        add(f / FPS, M.impact(0.9, 0.5), 0.18)

    # ───── 母帶 ─────
    out = mus + fx[:N] * 0.8
    if AAC_LP: out = np.stack([M.lp(ch, AAC_LP, 4) for ch in out])
    out = ride(out)
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
