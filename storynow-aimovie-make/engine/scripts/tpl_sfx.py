"""範本音效軌：讀 src/data/spec.json，依範本（A 遊戲／B 手稿／C 快剪／D 白板手繪／H 螢幕模擬）在場景與旁白 cue 上放音效 → public/tpl_sfx.wav
範本 D 另外產生 public/sfx_d/*.wav（馬克筆沙沙、上色啵、答對叮、答錯嗡），由 TemplateD 對準每一筆的時間播放。
範本 H：每個字按下去一聲鍵盤、點擊一聲滑鼠、Enter 重一點、泡泡一聲輕「啵」（時間＝build.py 排好的 keys／f，跟畫面同一份）。
用法：python tpl_sfx.py A|B|C|D|H   （在專案資料夾內執行）"""
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


def key_click(rng, heavy=False):
    """鍵盤：短促的雜訊＋一點高頻（每一聲略不同，聽起來才像真的在打字）"""
    n = int((.06 if heavy else .045) * SR); t = np.arange(n) / SR
    x = rng.normal(0, 1, n) * np.exp(-t * (110 if heavy else 170)) * .5 + np.sin(2 * np.pi * rng.uniform(1700, 2300) * t) * np.exp(-t * 260) * .22
    return np.convolve(x, np.ones(6) / 6, 'same') * (1.25 if heavy else rng.uniform(.75, 1.0)) * .32   # 太尖會把成片峰值頂過 −1 dBTP（最終品檢 F6）


def mouse_click(rng):
    n = int(.06 * SR); t = np.arange(n) / SR
    return (rng.normal(0, 1, n) * np.exp(-t * 220) * .4 + np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 300) * .35) * .38


def write_mono(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def whiteboard_sfx():
    """範本 D 的逐筆音效素材"""
    rng = np.random.default_rng(7)
    os.makedirs('public/sfx_d', exist_ok=True)
    n = int(8 * SR); env = np.zeros(n); t = 0                     # 馬克筆沙沙：帶通雜訊 × 不規則筆畫包絡
    while t < n:
        L = int(rng.uniform(.07, .22) * SR); e = np.sin(np.linspace(0, np.pi, L)) ** .6 * rng.uniform(.45, 1)
        env[t:t + L] = e[:n - t]; t += L + int(rng.uniform(0, .05) * SR)
    x = M.bp(M.noise(n), 1800, 7500) * env; write_mono('public/sfx_d/scribble.wav', x / np.max(np.abs(x)) * .5)
    n = int(.18 * SR); tt = np.arange(n) / SR                    # 上色「啵」
    y = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 18) + 380) / SR) * np.exp(-tt * 28) + M.bp(M.noise(n), 2000, 6000) * np.exp(-tt * 90) * .25
    write_mono('public/sfx_d/pop.wav', y / np.max(np.abs(y)) * .6)
    n = int(1.2 * SR); tt = np.arange(n) / SR                    # 答對「叮」
    y = sum(a * np.sin(2 * np.pi * fq * tt) * np.exp(-tt * d) for fq, a, d in [(1318.5, 1, 3.5), (2637, .35, 6), (1975.5, .3, 5)])
    write_mono('public/sfx_d/ding.wav', y / np.max(np.abs(y)) * .45)
    n = int(.45 * SR); tt = np.arange(n) / SR                    # 答錯「嗡」
    y = M.lp(np.sign(np.sin(2 * np.pi * 110 * tt)) * .5 + np.sin(2 * np.pi * 116 * tt) * .5, 1800) * np.minimum(1, (.45 - tt) * 20)
    write_mono('public/sfx_d/buzz.wav', y / np.max(np.abs(y)) * .4)


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
        elif tpl == 'H':   # 螢幕模擬：鍵盤、滑鼠、Enter、泡泡
            rng = np.random.default_rng(sum(map(ord, s['id'])))
            for a in p.get('actions', []):
                d = a.get('do')
                if d == 'type':
                    for k in a.get('keys', []): put(key_click(rng), t0 + k)
                elif d in ('click', 'focus'): put(mouse_click(rng), t0 + a['f'])
                elif d == 'tap': put(pop(), t0 + a['f'], .5)
                elif d == 'enter': put(key_click(rng, True), t0 + a['f'])
                elif d in ('callout', 'message'): put(pop(), t0 + a['f'], .35)
        elif tpl == 'D':   # 白板手繪：逐筆音效由 TemplateD 播放，這裡只放換場 whoosh
            if t0 > 0: put(M.whoosh(.8), t0 - 4, .45)
        else:   # C 快剪
            put(hit(), t0, 1)
            for c in s['cues'][1:]: put(hit(), t0 + c, .5)
            if typ == 'stat': put(M.impact(1.4), t0 + 6, .9)
            if typ == 'quiz': put(M.impact(1.0), C(s, p.get('revealCue'), int(s['dur'] * .6)), .8)
    if tpl == 'D': whiteboard_sfx()
    st = np.stack([out, out])[:, :int(spec['totalFrames'] / FPS * SR)] * .9
    with wave.open('public/tpl_sfx.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1).T * 32767).astype(np.int16).tobytes())
    print('tpl_sfx', tpl, spec['totalFrames'] / FPS)


if __name__ == '__main__':
    main()
