"""範本音效軌：讀 src/data/spec.json，依範本（A 遊戲／B 手稿／C 快剪）在場景與旁白 cue 上放音效 → public/tpl_sfx.wav
用法：python tpl_sfx.py A|B|C   （在專案資料夾內執行）"""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_music as M  # noqa: E402

SR = M.SR; FPS = 30


def coin():
    a, b = int(.06 * SR), int(.22 * SR)
    return np.concatenate([M.sq(M.midi(83), a, .5) * .13, M.sq(M.midi(88), b, .5) * M.ex(b, .08) * .13])


def jingle(root=72):
    o = np.zeros(int(.5 * SR))
    for k, d in enumerate([0, 4, 7, 12]):
        n = int(.09 * SR); i = int(k * .07 * SR); o[i:i + n] += M.sq(M.midi(root + d), n, .5) * M.ex(n, .05) * .14
    return o


def fanfare():
    o = np.zeros(int(1.2 * SR))
    for k, m in enumerate([72, 76, 79, 84, 79, 84]):
        n = int(.16 * SR); i = int(k * .13 * SR); o[i:i + n] += M.sq(M.midi(m), n, .5) * M.ex(n, .1) * .13
    return o


def buzz():
    n = int(.25 * SR); return M.sq(110, n, .5) * M.adsr(n, .005, .05) * .1


def scribble(sec):
    n = int(sec * SR); x = M.bp(M.noise(n), 2500, 7000)
    return x * (0.5 + 0.5 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 7))) * M.adsr(n, .02, .05) * .1


def pop():
    n = int(.08 * SR); return M.bp(M.noise(n), 800, 4000) * M.ex(n, .02) * .45


def hit():
    return M.impact(.7) * .5


def main():
    tpl = (sys.argv[1] if len(sys.argv) > 1 else 'A').upper()
    spec = json.load(open('src/data/spec.json', encoding='utf-8'))
    N = int(spec['totalFrames'] / FPS * SR) + SR
    out = np.zeros(N)

    def put(sig, frame, g=1.0):
        i = int(frame / FPS * SR)
        if 0 <= i < N: s = sig[:N - i] * g; out[i:i + len(s)] += s

    def C(s, i, fb):
        c = s['cues']
        return s['from'] + (c[i] if i is not None and 0 <= i < len(c) else fb)

    for s in spec['scenes']:
        t0, p, typ = s['from'], s['props'], s['type']
        cm = p.get('cueMap') or []
        if tpl == 'A':
            if t0 > 0: put(M.blip(84, .05), t0)
            if typ == 'title': put(fanfare(), t0 + 6, .8)
            elif typ == 'scenario':
                for i, _ in enumerate(p.get('pills', [])):
                    put(buzz() if i == len(p['pills']) - 1 else coin(), C(s, cm[i] if i < len(cm) else None, 20 + i * 30))
            elif typ == 'definition': put(jingle(76), t0 + 6); put(jingle(84), C(s, cm[1] if len(cm) > 1 else None, 40), .8)
            elif typ == 'cards':
                for i, _ in enumerate(p.get('cards', [])): f = C(s, cm[i] if i < len(cm) else None, 20 + i * 30); put(coin(), f); put(jingle(72 + i * 2), f + 3, .6)
            elif typ == 'vs': put(M.whoosh(.4), t0 + 4, .8)
            elif typ == 'quiz': put(jingle(84), C(s, p.get('revealCue'), int(s['dur'] * .6)))
            elif typ == 'stat': put(fanfare(), t0 + 40, .7)
            elif typ in ('recap',): put(fanfare(), t0 + 4)
            elif typ == 'qaEnd': put(fanfare(), t0 + int(p.get('answerSec', 4) * FPS))
        elif tpl == 'B':
            put(M.whoosh(.6), t0 - 6, .35)
            put(scribble(min(2.4, s['dur'] / FPS * .5)), t0 + int(s['dur'] * .15))
            if typ in ('cards', 'definition', 'scenario'):
                for i, _ in enumerate(p.get('cards', p.get('sideNotes', p.get('pills', [])))): put(pop(), C(s, cm[i] if i < len(cm) else None, 20 + i * 30), .8)
            if typ in ('quiz',): put(scribble(.5), C(s, p.get('revealCue'), int(s['dur'] * .6)), 1.2)
            if typ == 'vs': put(pop(), t0 + 40, 1); put(pop(), t0 + 60, 1)
        else:   # C 快剪
            put(hit(), t0, 1)
            for c in s['cues'][1:]: put(hit(), t0 + c, .5)
            if typ == 'stat': put(M.impact(1.4), t0 + 6, .9)
            if typ == 'quiz': put(M.impact(1.0), C(s, p.get('revealCue'), int(s['dur'] * .6)), .8)
    st = np.stack([out, out])[:, :int(spec['totalFrames'] / FPS * SR)] * .9
    with wave.open('public/tpl_sfx.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1).T * 32767).astype(np.int16).tobytes())
    print('tpl_sfx', tpl, spec['totalFrames'] / FPS)


if __name__ == '__main__':
    main()
