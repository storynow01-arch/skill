"""範本廣H 配樂與音效：125 BPM 電子舞曲漸強（techno），段落與音效時間全部讀時間表 tl（格數 ÷ 30 ＝ 秒）。
  開場只有低頻嗡嗡＋電路滴答 → 穿過封裝加 kick → 晶粒加反拍 hat → 晶圓加琶音、長音 sub → 城市加 clap、反拍貝斯，
  每座地標點亮一聲「叮」→ 衝向邏輯閘 riser＋上升 blip、最後一小節 16 分 kick → **完全靜音一拍**（母帶後再切，殘響也切掉）
  → drop：衝擊＋超鋸齒和弦＋reese 貝斯，神經網路每層一串 blip → 拉遠反向咻、寬闊 pad＋弦樂 → 名稱每個字一聲鐘、標語長鐘。
和弦（Am F C G）以 drop 為小節起點往前後排，drop 一定落在和弦第一拍。
make_ad.py 呼叫 render(tl, wav)。原作：02_試做/廣告30風格 audio/ad17.py（固定 60 秒）；這裡時間全部改讀時間表，
並在最後加前瞻峰值限幅（PEAK_CUT），用 make_ad.py 預設參數出片峰值就會過。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M

SR = M.SR
FPS = 30
BPM = 125
BEAT = 60 / BPM            # 0.48 秒
BAR = BEAT * 4             # 1.92 秒
PEAK_CUT = 2.5             # 衝擊、kick、超鋸齒的瞬間峰值比整體響度突出太多：只壓最尖的那幾毫秒（音色不變）


def peak_limit(x, thr, look=0.015, smooth=0.006):
    """前瞻峰值限幅：在峰值前後 look 秒內把增益平滑壓到 thr 以下（不削波、不改音色）"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    g = minimum_filter1d(g, size=2 * int(look * SR) + 1)
    g = uniform_filter1d(g, size=int(smooth * SR) + 1)
    return x * g


def render(tl, wav_path):
    DUR = tl['frames'] / FPS
    N = int(round(DUR * SR))
    L = np.zeros(N); R = np.zeros(N)
    sec = lambda f: f / FPS
    S = {k: sec(v) for k, v in tl['marks'].items()}
    PUSH_PASS = [sec(x) for x in tl['pushPass']]
    PULL_PASS = [sec(x) for x in tl['pullPass']]
    LAND = [sec(x) for x in tl['land']]
    BOARD_BEEPS = [sec(x) for x in tl['boardBeeps']]
    CITY_BEEPS = [sec(x) for x in tl['cityBeeps']]
    CHIP_BEEPS = [sec(x) for x in tl['chipBeeps']]
    NN_FIRE = [sec(x) for x in tl['nnFire']]
    NAME_CH = [sec(x) for x in tl['nameCh']]

    def add(x, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or i + len(x) <= 0: return
        if i < 0: x = x[-i:]; i = 0
        x = x[:N - i]
        gl = g * np.sqrt((1 - pan) / 2) * 1.414; gr = g * np.sqrt((1 + pan) / 2) * 1.414
        L[i:i + len(x)] += x * gl; R[i:i + len(x)] += x * gr

    bt = lambda b: b * BEAT
    sil = lambda t: S['silence'] - 0.005 <= t < S['drop']
    prog = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]  # Am F C G

    def chord_at(t):
        return prog[int(np.floor((t - S['drop'] + 1e-6) / BAR)) % 4]

    nbeats = int(DUR / BEAT) + 1

    # ───── 1. 低頻嗡嗡（全程，越往後越小）＋電路滴答 ─────
    t = np.arange(N) / SR
    hum = (np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 110 * t) * 0.25 + np.sin(2 * np.pi * 165.4 * t) * 0.08)
    hum *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * t)
    humenv = np.interp(t, [0, 1.5, S['city'], S['city'] + 2.7, S['silence'], S['drop'], S['pull'], S['board2'], DUR],
                       [0, 1, 0.8, 0.35, 0.5, 0.0, 0.0, 0.4, 0.3])
    hum = M.lp(hum, 300) * humenv * 0.22
    L += hum; R += hum

    rs = np.random.default_rng(17)
    for i in range(int(DUR / (BEAT / 4))):
        tt_ = i * BEAT / 4
        if sil(tt_):
            rs.random(); continue
        if rs.random() < (0.55 if tt_ < S['city'] else 0.3):
            n = int(0.012 * SR)
            clk = M.hp(rs.standard_normal(n), 4000) * M.ex(n, 0.0015)
            add(clk, tt_, 0.18 * (0.6 + 0.4 * rs.random()), rs.uniform(-0.7, 0.7))

    # ───── 2. 鼓組逐層加入 ─────
    KICK = M.kick(1.0, 0.2, 46)
    for b in range(nbeats):
        tb = bt(b)
        if tb < S['pkg'] - 0.01 or sil(tb): continue
        if tb >= S['board2'] + BAR * 2: continue
        g = 0.55 if tb < S['city'] else 0.8
        if S['gateRun'] <= tb < S['silence']: g = 0.85
        if S['pull'] <= tb < S['board2']: g = 0.6 if b % 2 == 0 else 0
        if tb >= S['board2']: g = 0.45 if b % 4 == 0 else 0
        if g: add(KICK, tb, g)
        # 靜音前最後幾拍鼓點加密（16 分）
        if S['silence'] - bt(3) - 0.01 <= tb < S['silence'] - 0.01:
            for s in (1, 2, 3):
                add(KICK, tb + bt(s / 4), 0.25 + 0.08 * s)
    # hat：反拍，晶粒段開始
    for b in range(nbeats):
        tb = bt(b) + bt(0.5)
        if tb < S['die'] or sil(tb) or tb >= S['board2']: continue
        add(M.hat(True, 0.9 if tb >= S['drop'] else 0.7), tb, 0.8, 0.25)
        if tb >= S['city']:
            add(M.hat(False), tb - bt(0.25), 0.6, -0.3)
    # clap：城市段起每 2、4 拍（拍數以 drop 為準）
    db = int(round(S['drop'] / BEAT))
    for b in range(nbeats):
        tb = bt(b)
        if (b - db) % 2 == 1 and (S['city'] <= tb < S['silence'] or S['drop'] <= tb < S['pull']):
            add(M.clap(), tb, 0.85)

    # ───── 3. 貝斯 ─────
    for b in range(nbeats * 2):
        tb = bt(b / 2)
        if tb < S['city'] or sil(tb) or tb >= S['pull']: continue
        root, _ = chord_at(tb)
        if b % 2 == 1:   # 反拍貝斯
            add(M.bass(root - 12, BEAT * 0.45, 'reese' if tb >= S['drop'] else 'sub'), tb, 0.9 if tb >= S['drop'] else 0.7)
    # 晶圓段先來一條長音 sub
    add(M.bass(45, (S['city'] - S['wafer']) * 0.95, 'sine'), S['wafer'], 0.45)

    # ───── 4. 琶音合成器（晶圓起，16 分音符，濾波漸開）─────
    ramp = max(4.0, S['drop'] - S['wafer'])
    for i in range(int(DUR / (BEAT / 4))):
        tb = i * BEAT / 4
        if tb < S['wafer'] - 0.01 or sil(tb) or tb >= S['board2']: continue
        root, ch = chord_at(tb)
        notes = ch + [ch[0] + 12]
        m = notes[[0, 1, 2, 3, 2, 1, 3, 2][i % 8]]
        bright = 1200 + min(1, (tb - S['wafer']) / ramp) * 4500
        g = 0.9 if tb < S['drop'] else 0.75
        if tb >= S['pull']: g = 0.5 * max(0, 1 - (tb - S['pull']) / 3)
        add(M.pluck(m + 12, 0.2, bright, 0.06), tb, g, 0.45 if i % 2 else -0.45)

    # ───── 5. riser → 完全靜音一拍 → drop ─────
    rl = S['silence'] - S['gateRun']
    add(M.riser(rl), S['gateRun'], 0.95)
    nb = 12
    for k in range(nb):   # 上升音高的 blip
        add(M.blip(72 + k, 0.06), S['gateRun'] + bt(1) + k * (rl - bt(1)) / nb, 0.6, (k % 2) * 0.6 - 0.3)
    add(M.impact(3.0, 1.3), S['drop'], 1.1)
    nbar = max(1, int(round((S['pull'] - S['drop']) / BAR)))
    for b in range(nbar):   # drop 超鋸齒和弦
        tb = S['drop'] + b * BAR
        root, ch = chord_at(tb)
        x = M.supersaw(ch + [ch[0] - 12], BAR, BEAT)
        add(x, tb, 1.45, -0.35); add(x, tb + 0.012, 1.3, 0.35)

    # ───── 6. 推進的「咻」、拉遠的反向咻 ─────
    for p in PUSH_PASS:
        add(M.whoosh(0.9), p - 0.55, 1.4, -0.2)
        add(M.blip(84, 0.08), p, 0.5)
    for p in PULL_PASS:
        add(M.whoosh(0.8)[::-1], p - 0.5, 1.2, 0.2)

    # ───── 7. 嗶（電子轉彎）、叮（地標點亮）、神經網路連鎖 ─────
    def beep(m=88, length=0.07):
        n = int(length * SR); tt_ = np.arange(n) / SR
        return np.sin(2 * np.pi * M.midi(m) * tt_) * M.ex(n, 0.025) * 0.35

    def ding(m=84):
        n = int(1.6 * SR); tt_ = np.arange(n) / SR; f = M.midi(m)
        x = (np.sin(2 * np.pi * f * tt_) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt_) * M.ex(n, 0.25) + 0.25 * np.sin(2 * np.pi * f * 5.4 * tt_) * M.ex(n, 0.08))
        return x * M.ex(n, 0.6) * 0.32

    for k, tb in enumerate(BOARD_BEEPS):
        add(beep(86 + (k % 3) * 3), tb, 0.8, -0.5 + k * 0.25)
    for k, tb in enumerate(CHIP_BEEPS):
        add(beep(84 + (k % 3) * 4, 0.06), tb, 0.6, (k % 3 - 1) * 0.5)
    for k, tb in enumerate(CITY_BEEPS):
        add(beep(91 + (k % 2) * 5), tb, 0.55, 0.4 if k % 2 else -0.4)
    DING_NOTES = [81, 84, 88, 86, 91, 93]
    for k, tb in enumerate(LAND):
        add(ding(DING_NOTES[k % 6]), tb, 1.0, -0.4 + 0.8 * k / max(1, len(LAND) - 1))
    for k, tb in enumerate(NN_FIRE):
        for j in range(3):
            add(M.blip(84 + k * 2 + j * 7, 0.07), tb + j * 0.03, 0.8, (j - 1) * 0.6)
        add(ding(96 + k), tb, 0.35, (k % 2) * 0.8 - 0.4)

    # ───── 8. 拉遠＋收尾：寬闊和弦 ─────
    for b in range(int((DUR - S['pull']) / BAR) + 1):
        tb = S['pull'] + b * BAR
        root, ch = chord_at(tb)
        ms = [root - 12] + ch + [ch[1] + 12]
        add(M.pad(ms, BAR * 1.15, 2600, 0.01, 0.25), tb, 1.6, -0.5); add(M.pad(ms, BAR * 1.15, 2400, 0.013, 0.3), tb + 0.02, 1.6, 0.5)
        add(M.strings(ch, BAR * 1.1), tb, 0.9)
        add(M.bass(root - 12, BAR * 0.95, 'sine'), tb, 0.5)
    # 名稱每個字一聲鐘（字多時音階往上爬）、標語一聲長鐘
    NAME_NOTES = [76, 79, 83, 88] if len(NAME_CH) <= 4 else [76, 79, 81, 83, 86, 88, 91, 93]
    for k, tb in enumerate(NAME_CH):
        add(ding(NAME_NOTES[k]), tb, 0.9 if len(NAME_CH) <= 4 else 0.75, -0.45 + 0.9 * k / max(1, len(NAME_CH) - 1))
    if tl['d']['slogan']:
        add(ding(88), S['slogan'], 0.8, -0.2); add(ding(95), S['slogan'] + 0.02, 0.5, 0.2)
    if tl['d']['url']:
        for j in range(3): add(M.blip(91 + j * 5, 0.05), S['web'] + j * 0.08, 0.45, (j - 1) * 0.5)
    add(M.impact(2.0, 0.6), S['board2'], 0.45)

    # ───── 母帶 ─────
    mix = np.stack([L, R])
    mix = M.master_chain(mix)
    mix = peak_limit(mix / (np.max(np.abs(mix)) + 1e-9), 10 ** (-PEAK_CUT / 20))   # 瞬間峰值壓掉，出片用預設限幅就過
    # 完全靜音一拍（母帶後再切，殘響也一起切掉）；靜音前 15ms 淡出、避免爆音
    a, b = int(S['silence'] * SR), int(S['drop'] * SR)
    fz = int(0.015 * SR); mix[:, a - fz:a] *= np.linspace(1, 0, fz)
    mix[:, a:b] = 0
    fo = int(1.3 * SR); mix[:, N - fo:] *= np.linspace(1, 0, fo) ** 1.5
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
    os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    import json, importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location('tl', os.path.join(here, 'timeline.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    render(m.build(json.load(open(sys.argv[1], encoding='utf-8'))), sys.argv[2] if len(sys.argv) > 2 else 'music.wav')
