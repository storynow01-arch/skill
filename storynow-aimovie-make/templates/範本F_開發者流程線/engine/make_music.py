"""範本F 配樂：輕柔電子 96 BPM（Fmaj7 → Am7 → Dm7 → B♭maj7，每兩小節換），numpy 合成。
節點點亮（有 "step" 的段落）各一聲逐步升高的提示音；transition／slogan 段落兩聲高音。
用旁白音量包絡（0.25 秒平均）做人聲閃避，最多壓低 70%。輸出 audio/final.wav（旁白＋配樂）。"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")
import json, os, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt

proj = sys.argv[1] if len(sys.argv) > 1 else '.'
os.chdir(proj)
SB = json.load(open('storyboard.json', encoding='utf-8'))
T = json.load(open('timings.json', encoding='utf-8'))
SR = 48000; DUR = T['total']; N = int(DUR * SR); BEAT = 60 / 96
rng = np.random.default_rng(1)
M = np.zeros(N)


def t_(d): return np.arange(int(SR * d)) / SR
def lp(x, f): return sosfilt(butter(4, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(4, f, 'high', fs=SR, output='sos'), x)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def add(s, at, g=1.0):
    i = int(at * SR)
    if 0 <= i < N: s = s[:N - i]; M[i:i + len(s)] += s * g


def kick():
    tt = t_(0.35); f = 50 + 80 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
def hat():
    tt = t_(0.05); return hp(rng.standard_normal(len(tt)), 8000) * np.exp(-tt * 80) * 0.25
def keys(ms, d):
    tt = t_(d); s = sum(np.sin(2 * np.pi * midi(m) * tt) + 0.3 * np.sin(4 * np.pi * midi(m) * tt) for m in ms) / len(ms)
    return s * np.minimum(1, tt / 0.02) * np.exp(-tt * 1.6) * 0.35
def pad(ms, d):
    tt = t_(d); s = sum(np.sin(2 * np.pi * midi(m) * tt * (1 + dt)) for m in ms for dt in (-0.002, 0.002)) / (2 * len(ms))
    return lp(s, 1500) * np.minimum(1, tt / 0.8) * np.minimum(1, (d - tt) / 0.8) * 0.3
def blip(m):
    tt = t_(0.4); return np.sin(2 * np.pi * midi(m) * tt) * np.exp(-tt * 10) * 0.4


CH = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [46, 50, 53, 57]]
bar = BEAT * 4
for b in range(int(DUR / bar) + 1):
    t0 = b * bar; c = CH[(b // 2) % 4]
    add(pad(c, bar * 1.05), t0, 0.9)
    for k in range(4):
        tb = t0 + k * BEAT
        if tb > DUR - 2.5: continue
        if b >= 1 and k % 2 == 0: add(kick(), tb, 0.55)
        if b >= 1: add(hat(), tb + BEAT / 2, 1.0)
        add(keys([c[k % 4] + 12], BEAT * 1.5), tb + (BEAT / 2 if k % 2 else 0), 0.5)

STEPNOTE = [72, 74, 76, 79, 81, 84]
for seg, sg in zip(SB['segments'], T['segs']):
    sc = seg['scene']
    if 'step' in sc: add(blip(STEPNOTE[sc['step'] % 6]), sg['start'], 1.0)
    if sc['type'] in ('transition', 'slogan'):
        add(blip(84), sg['start'], 0.8); add(blip(88), sg['start'] + 0.15, 0.6)
add(pad([53, 60, 64, 69], 4.0), DUR - 4.0, 1.2)

with wave.open('audio/narration.wav') as w:
    nar = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
win = int(SR * 0.25); cs = np.concatenate([[0], np.cumsum(np.abs(nar))])
idx = np.arange(N); envl = (cs[np.clip(idx + win // 2, 0, N)] - cs[np.clip(idx - win // 2, 0, N)]) / win
duck = 1 - 0.7 * np.clip(envl / (envl.max() * 0.25 + 1e-9), 0, 1)
music = M / (np.abs(M).max() + 1e-9) * 0.32 * duck
fade = np.ones(N); fade[-int(SR * 1.5):] = np.linspace(1, 0, int(SR * 1.5))
mix = nar + music * fade
mix = mix / max(1.0, np.abs(mix).max() / 0.89)
with wave.open('audio/final.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'配樂完成：audio/final.wav（{DUR} 秒）')
