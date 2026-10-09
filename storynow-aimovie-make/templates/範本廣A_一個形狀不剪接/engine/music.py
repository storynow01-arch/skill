"""範本廣A 配樂：120 BPM 極簡電子節拍（Fm9 → D♭maj7 → A♭ → E♭ 循環）＋每次點擊／拖曳／切換的細小 UI 音效。
片長與音效時間全部來自時間表（timeline.py 依內容算出），所以內容多寡改變時，音效還是對準畫面事件。
make_ad.py 呼叫 render(tl, wav)。和弦依小節循環，最後一小節回到主和弦，結尾 1 秒淡出。"""
import os, sys, wave
import numpy as np

sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
import make_music as M   # skill 共用的合成音色（kick、pad、pluck、reverb、master_chain…）

SR = M.SR
rng = np.random.default_rng(42)


def put(buf, x, t, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x * g


def env(n, a=0.002, d=0.05):
    e = np.exp(-np.arange(n) / (d * SR))
    ia = max(1, int(a * SR)); e[:ia] *= np.linspace(0, 1, ia)
    return e


def ui_click(f0=2400):
    n = int(0.05 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f0 * t) * env(n, 0.0005, 0.006)
    body = np.sin(2 * np.pi * 900 * t) * env(n, 0.0005, 0.012) * 0.5
    nz = M.hp(rng.standard_normal(n), 3000) * env(n, 0.0002, 0.003) * 0.6
    return (tone + body + nz) * 0.5


def ui_tick():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 3600 * t) * env(n, 0.0003, 0.004) * 0.3


def ui_key():
    n = int(0.06 * SR); t = np.arange(n) / SR
    nz = M.bp(rng.standard_normal(n), 1800, 7000) * env(n, 0.0003, 0.008)
    thock = np.sin(2 * np.pi * 420 * t) * env(n, 0.0005, 0.015) * 0.6
    return (nz + thock) * 0.45


def ui_swoosh(L=0.28):
    n = int(L * SR); t = np.arange(n) / SR
    return M.bp(rng.standard_normal(n), 900, 5500) * np.sin(np.pi * t / L) ** 3 * 0.22


def ui_ding():
    n = int(0.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1760 * t) + 0.35 * np.sin(2 * np.pi * 2640 * t)) * env(n, 0.001, 0.12) * 0.16


def ui_chime():
    out = np.zeros(int(0.9 * SR))
    for m, dt in [(81, 0.0), (88, 0.09)]:
        n = int(0.7 * SR); t = np.arange(n) / SR
        x = np.sin(2 * np.pi * M.midi(m) * t) + 0.25 * np.sin(2 * np.pi * M.midi(m) * 2 * t)
        put(out, x * env(n, 0.001, 0.18) * 0.15, dt)
    return out


def ui_release():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (600 + 500 * np.exp(-t * 60)) * t) * env(n, 0.0005, 0.02) * 0.25


def ui_enter():
    x = ui_key() * 1.1; c = ui_click(1500) * 0.5; x[:len(c)] += c; return x


FX = {'click': ui_click, 'tick': ui_tick, 'key': ui_key, 'swoosh': ui_swoosh, 'ding': ui_ding, 'chime': ui_chime,
      'grab': lambda: ui_click(1700) * 0.8, 'release': ui_release, 'enter': ui_enter, 'scrub': lambda: ui_tick() * 0.45}

CH = [[53, 56, 60, 63, 67], [49, 53, 56, 60, 65], [56, 60, 63, 67, 72], [51, 55, 58, 62, 67]]   # Fm9 D♭maj7 A♭ E♭
ROOT = [41, 37, 44, 39]


def render(tl, wav_path):
    fps, bpm = tl['fps'], tl['bpm']
    beat = 60 / bpm; dur = tl['frames'] / fps; n = int(round(dur * SR))
    music, sfx = np.zeros(n), np.zeros(n)
    beats = int(np.ceil(dur / beat)); bars = int(np.ceil(beats / 4))
    chord = lambda bar: 0 if bar == bars - 1 else bar % 4            # 最後一小節回主和弦
    for b in range(beats):
        t = b * beat; bar = b // 4; pos = b % 4
        put(music, M.kick(0.8, 0.13, 50), t, 0.62)
        if pos in (1, 3): put(music, M.clap(), t, 0.42)
        for h in range(2): put(music, M.hat(False, 0.9 if h else 0.5), t + h * beat / 2, 0.5)
        if 2 <= bar < bars - 1:
            for s in (1, 3): put(music, M.shaker(), t + s * beat / 4, 0.35)
        put(music, M.bass(ROOT[chord(bar)], beat * 0.45, 'sub'), t + beat / 2, 0.55)
    for bar in range(bars):
        t = bar * 4 * beat; c = CH[chord(bar)]
        put(music, M.pad(c, 4 * beat, cutoff=1400, atk=0.08), t, 0.32)
        if 1 <= bar < bars - 1:
            notes = c + [c[1] + 12]
            for s in range(16):
                if s % 3 == 2: continue
                put(music, M.pluck(notes[(s * 2) % len(notes)] + 12, 0.16, 3600, 0.05), t + s * beat / 4, 0.32)
    for f, kind in tl['sfx']:
        put(sfx, FX[kind](), f / fps, 1.0)
    mix = M.reverb(music, wet=0.12) * 0.85 + M.reverb(sfx, wet=0.08) * 1.0
    st = M.master_chain(np.stack([mix, mix]))
    st = st / (np.max(np.abs(st)) + 1e-9) * 0.9
    fade = int(1.0 * SR); st[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    st[:, :int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    with wave.open(wav_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(st.T, -1, 1) * 32767).astype(np.int16).tobytes())
