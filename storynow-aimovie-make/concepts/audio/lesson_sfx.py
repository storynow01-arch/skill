"""闖關遊戲教學版的音效軌：依 spec.json 的場景與旁白 cue，在遊戲事件上放音效。"""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.expanduser('~/.claude/skills/code-video-studio/scripts'))
import make_music as M  # noqa: E402
from concept_audio import coin, jingle  # noqa: E402

SR = M.SR; FPS = 30
spec = json.load(open('src/data/spec.json', encoding='utf-8'))
N = int(spec['totalFrames'] / FPS * SR) + SR
out = np.zeros(N)
def put(sig, frame, g=1.0):
    i = int(frame / FPS * SR)
    if 0 <= i < N: s = sig[:N - i] * g; out[i:i + len(s)] += s
def buzz():
    n = int(0.25 * SR); return M.sq(110, n, .5) * M.adsr(n, .005, .05) * .1
def fanfare():
    o = np.zeros(int(1.2 * SR))
    for k, m in enumerate([72, 76, 79, 84, 79, 84]):
        n = int(0.16 * SR); i = int(k * 0.13 * SR); o[i:i + n] += M.sq(M.midi(m), n, .5) * M.ex(n, .1) * .13
    return o
cue = lambda s, i, fb: s['cues'][i] if i is not None and 0 <= i < len(s['cues']) else fb
for s in spec['scenes']:
    t0, p, typ = s['from'], s['props'], s['type']
    if s['from'] > 0: put(M.blip(84, .05), t0, 1)
    if typ == 'title': put(fanfare(), t0 + 6, .8)
    elif typ == 'scenario':
        for i, _ in enumerate(p['pills']):
            f = t0 + cue(s, (p.get('cueMap') or [None] * 9)[i], 20 + i * 30)
            put(buzz() if i == len(p['pills']) - 1 else coin(), f, 1)
    elif typ == 'definition':
        put(jingle(76), t0 + 6, 1); put(jingle(84), t0 + cue(s, (p.get('cueMap') or [None, None])[1], 40), .8)
    elif typ == 'cards':
        for i, _ in enumerate(p['cards']):
            f = t0 + cue(s, (p.get('cueMap') or [None] * 9)[i], 20 + i * 30); put(coin(), f, 1); put(jingle(72 + i * 2), f + 3, .6)
    elif typ == 'vs':
        put(M.whoosh(.4), t0 + 4, .8); put(M.whoosh(.4), t0 + cue(s, (p.get('cueMap') or [0, None])[1], 40), .8)
    elif typ == 'quiz':
        put(jingle(84) * 1.2 + 0, t0 + cue(s, p.get('revealCue'), int(s['dur'] * .6)), 1)
    elif typ == 'recap': put(fanfare(), t0 + 4, 1)
    elif typ == 'qaEnd': put(fanfare(), t0 + int(p.get('answerSec', 4) * FPS), 1)
out = out[:int(spec['totalFrames'] / FPS * SR)]
st = np.stack([out, out]) * 0.9
with wave.open('public/lesson_sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1).T * 32767).astype(np.int16).tobytes())
print('sfx ok', len(out) / SR)
