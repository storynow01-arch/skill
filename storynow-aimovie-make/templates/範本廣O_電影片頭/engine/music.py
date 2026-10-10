"""範本廣O「電影片頭」配樂與音效：搖擺爵士大樂隊 140 BPM D 小調（walking bass、搖擺 ride、鋼琴切分和弦、銅管齊奏打點），
換章前一小節 riser、換章那拍 impact（對準畫面的剪紙轉場）、片尾章前兩小節 riser＋重擊；
章內的黑條滑入「咻」、剪紙卡落下的悶擊、剪紙圓彈出、數字停住的「嗒」、印章蓋下都對準時間表的事件（同一份 timeline）。
段落：第一章（片名卡）只有 walking bass＋ride＋長鋼琴和弦 → 第二章起全編制 → 最後兩小節回到鋼琴長和弦，尾巴淡出。
銅管打點每章從第 2 小節起「每兩小節一次」（第 2 小節第 4 拍後半搶拍＋第 3 小節頭重音），畫面的彈跳、印章、紅標都對準這兩下。
make_ad.py 呼叫 render(tl, wav)。
原作：02_試做/廣告30風格/video/ad_audio.py 的 build('04')（'bigband', 140, 'Dm', 各章 4 小節，固定 60 秒）與它的 bigband() 函式；
這裡只把搖擺大樂隊用到的樂器、音效、混音照搬過來，段落與換章點全部改讀時間表。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 140
KEY = 'Dm'
FXG = 0.7                     # 原作的音效強度（ADS['04'] 最後一欄）
INTRO_GAIN = 1.0              # 開場（第一章）只有 walking bass＋ride＋鋼琴長和弦的增益（實測後調整）
AAC_LP = 16000                # 母帶先低通 16 kHz：ride 與 hi-hat 在 16 kHz 以上的能量 AAC 編碼會丟掉並產生振鈴，出片峰值才穩定
PEAK_CUT = 1.0                # 母帶用真峰值（4 倍超取樣）正規化後只壓最尖的 1 dB（音色不變）


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
    """慢速音量騎乘：用 3 秒滑動 RMS 把安靜段拉近全編制段，響度範圍（LRA）壓到 9 以下（出片 loudnorm 才走線性模式）。
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


def bigband(bpm, key, dur, starts):
    """原作 ad_audio.py 的 bigband()（照搬）：starts＝各章開始秒數（第一個是 0）。
    全編制從第二章開始到最後兩小節前；銅管打點改成「每章自己的第 2、4、6…小節」（原作每章 4 小節、章頭都在偶數小節，等於同一件事）。"""
    beat = 60 / bpm; bar = beat * 4
    N = int((dur + 3) * SR); L = np.zeros(N); R = np.zeros(N)
    prog = M.progression(key)

    def add(sig, t0, g=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= N or i < 0: return
        s = sig[:N - i] * g
        L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
        R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4) * 1.414
    sw = beat * 0.66                                      # 搖擺：反拍落在三連音第三個
    ride = soft_attack(M.hp(M.hat(True, 0.6), 3000)); CHh = soft_attack(M.hat())
    K = soft_attack(M.kick(0.5, 0.1), ms=1.5, hf_ms=6); S = soft_attack(M.snare(220, 0.08, 4000), g=0.9)
    nb = int(np.ceil(dur / bar)) + 1
    first = starts[1] if len(starts) > 1 else 4 * bar
    cbar = [int(round(s / bar)) for s in starts]           # 各章開始的小節
    for b in range(nb):
        t0 = b * bar
        if t0 > dur: break
        r, ch = prog[(b // 2) % 4]
        full = first - 0.01 <= t0 <= dur - 2 * bar
        ig = INTRO_GAIN if t0 < first - 0.01 else 1.0
        loc = b - max([c for c in cbar if c <= b] or [0])   # 章內第幾小節
        walk = [r, r + 4 if (b % 2 == 0) else r + 3, r + 7, r + 9 if b % 2 == 0 else r + 10]
        for i, m in enumerate(walk):                      # walking bass 每拍一音
            add(M.bass(m - 12, beat * 0.9, 'sub'), t0 + i * beat, 0.55 * ig)
        for i in range(4):                                # ride：1 2& 3 4& 搖擺
            add(ride, t0 + i * beat, 0.32 * ig, 0.3)
            if i % 2 == 1: add(ride, t0 + i * beat + sw, 0.22 * ig, 0.3)
            if i % 2 == 1: add(CHh, t0 + i * beat, 0.25 * ig, -0.2)
        if full:
            add(K, t0, 0.5 * (0.6 if b in cbar else 1.0)); add(S, t0 + 3 * beat + sw, 0.28)   # 換章那拍已有重擊：大鼓降一點
            add(M.epiano([m + 12 for m in ch], beat * 1.2), t0 + beat + sw, 0.22, -0.3)   # 鋼琴切分和弦
            add(M.epiano([m + 12 for m in ch], beat * 0.8), t0 + 2 * beat + sw, 0.18, -0.3)
            if loc % 2 == 1:                              # 銅管齊奏打點（每章第 2、4…小節尾搶拍＋下一小節頭重音）
                add(M.brass([m + 12 for m in ch], beat * 0.45), t0 + 3 * beat + sw, 0.42 * 0.92, 0.1)   # 跟小鼓同拍落下：降一點
                add(M.brass([m + 12 for m in ch], beat * 1.4), t0 + 4 * beat, 0.5 * (0.7 if b + 1 in cbar else 1.0), 0.1)   # 落在換章重擊上：降一點
        else:
            add(M.epiano([m + 12 for m in ch], bar * 0.9), t0, 0.2 * ig, -0.3)
    return M.reverb(L, 0.14), M.reverb(R, 0.14)


def render(tl, wav_path):
    FR = tl['frames']
    DUR = FR / FPS
    N = int(DUR * SR)
    beat = 60 / BPM; bar = beat * 4
    starts = [c['beat'] * beat for c in tl['chapters']]          # 各章開始秒數（落在小節頭，跟畫面同一份）
    Lm, Rm = bigband(BPM, KEY, DUR + 1, starts)
    mus = M.master_chain(np.stack([Lm, Rm])[:, :N]) * 0.6

    # ───── 音效 ─────
    fx = np.zeros(N + SR * 3)

    def add(t, s, g=1.0):
        i = int(round(t * SR))
        if i < 0 or i >= len(fx): return
        m = max(0, min(len(s), len(fx) - i)); fx[i:i + m] += s[:m] * g
    # 原作：開頭重擊、換章前一小節 riser＋換章重擊、片尾前兩小節 riser＋重擊
    IM = lambda L, w: soft_attack(M.impact(L, w), ms=4, hf_ms=20, hf=5000)   # 重擊起音整理（同拍還有大鼓與銅管）
    add(0, IM(2.0, 1.0) * 0.55 * FXG)
    for t in starts[1:-1]:
        add(t - bar, M.riser(bar) * 0.3 * FXG)
        add(t, IM(1.6, 0.9) * 0.5 * FXG)
    logo = starts[-1]
    add(logo - 2 * bar, M.riser(2 * bar) * 0.3 * FXG)
    add(logo, IM(2.5, 1.0) * 0.7 * FXG)
    # 範本加的：章內事件（黑條滑入、剪紙落下、圓彈出、數字停住、印章）
    SX = tl.get('sfx') or {}
    wh = M.whoosh(0.35)
    for f in SX.get('whoosh', []):
        add(f / FPS - 0.12, wh, 0.16)
    th = soft_attack(M.tom(110, 0.22), ms=2)
    for f in SX.get('thump', []):
        add(f / FPS, th, 0.22)
    for i, f in enumerate(SX.get('pop', [])):
        add(f / FPS, soft_attack(M.blip(79 + (i * 4) % 9, 0.07)), 0.5)
    for i, f in enumerate(SX.get('tick', [])):
        add(f / FPS, soft_attack(M.blip(91 + (i * 3) % 7, 0.035)), 0.35)
    st = soft_attack(M.impact(0.9, 0.6)) * 0.5
    sn = soft_attack(M.snare(200, 0.1, 3500)) * 0.25; st[:len(sn)] += sn
    for f in SX.get('stamp', []):
        add(f / FPS, st, 0.42)   # 印章常跟銅管重音同拍：降一點

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
