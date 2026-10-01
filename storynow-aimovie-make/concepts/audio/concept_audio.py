"""三個概念試看的音軌：配樂（各自曲風）＋ 對準畫面事件的音效 ＋ 學長姐旁白。"""
import os, sys, wave
import numpy as np

SK = os.path.expanduser('~/.claude/skills/code-video-studio/scripts')
sys.path.insert(0, SK)
import make_music as M          # noqa: E402
import build as BLD             # noqa: E402

SR = M.SR
DUR = 10.0
CACHE = os.path.join(os.path.dirname(__file__), '.tts_cache'); os.makedirs(CACHE, exist_ok=True)
VOICE = {'name': 'zh-TW-YunJheNeural', 'rate': '+10%', 'pitch': '+4Hz'}
PUB = os.path.join(os.path.dirname(__file__), 'public')
BEAT_C = 60 / 145


def scribble(length):
    n = int(length * SR); x = M.bp(M.noise(n), 2500, 7000)
    env = (0.5 + 0.5 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 7))) * M.adsr(n, 0.02, 0.05)
    return x * env * 0.12


def jingle(root=72):
    out = np.zeros(int(0.5 * SR))
    for k, o in enumerate([0, 4, 7, 12]):
        n = int(0.09 * SR); i = int(k * 0.07 * SR)
        out[i:i + n] += M.sq(M.midi(root + o), n, .5) * M.ex(n, .05) * .14
    return out


def coin():
    n1, n2 = int(0.06 * SR), int(0.22 * SR)
    return np.concatenate([M.sq(M.midi(83), n1, .5) * .13, M.sq(M.midi(88), n2, .5) * M.ex(n2, .08) * .13])


def hit():
    return M.impact(0.7) * 0.55


def make(name, genre, bpm, key, events, lines):
    L, R, add, beat, bar = M.arrange(genre, bpm, key, DUR, False, [0.01])
    for t, sig, g in events:
        add(sig, t, g)
    for t, text in lines:
        x, _ = BLD.synth_line(text, CACHE, VOICE)
        add(x * 1.25, t, 1.0)
    mix = np.stack([L, R])[:, :int(DUR * SR)]
    mix = np.tanh(M.hp(mix, 28) * 0.9)
    f = int(0.6 * SR); mix[:, -f:] *= np.linspace(1, 0, f)
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
    with wave.open(os.path.join(PUB, f'concept_{name}.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
    print('concept', name, genre, bpm)


if __name__ == '__main__':
    # A 闖關遊戲：投幣、轉場、四次技能解鎖、魔王過關
    arr = [(96 + (i + 1) * 24 + i * 12) / 30 for i in range(4)]
    make('A', 'chiptune', 150, 'C',
         [(1.6, coin(), 1), (2.0, M.whoosh(0.4), .6)] + [(t, jingle(72 + i * 2), 1) for i, t in enumerate(arr)] +
         [(t, coin(), .8) for t in arr] + [(8.2, M.impact(1.5), .7)] + [(8.55 + k * 0.07, M.blip(84 + k % 12), .7) for k in range(12)],
         [(2.9, '嘿，學弟妹，準備好了嗎？'), (8.3, '十位國手，等你接關！')])

    # B 創客手稿：鉛筆沙沙聲跟著筆走、紙張滑入
    make('B', 'acoustic', 90, 'G',
         [(6 / 30, scribble(50 / 30), 1), (104 / 30, scribble(46 / 30), 1), (210 / 30, scribble(26 / 30), 1), (244 / 30, scribble(30 / 30), 1),
          (196 / 30, M.whoosh(0.5), .7), (228 / 30, M.whoosh(0.5), .6)],
         [(0.4, '嘿，學弟妹！'), (8.45, '你的未來，自己寫。')])

    # C 動態字體：每個重拍一記打擊、碎裂與穿越用大衝擊
    slams = [0, 1, 2, 3, 3.5, 4, 7, 10, 13, 14, 16, 19, 19.5, 20, 21, 22]
    make('C', 'phonk', 145, 'Em',
         [(b * BEAT_C, hit(), 1) for b in slams] + [(5 * BEAT_C, M.impact(1.2), .9), (15.2 * BEAT_C, M.riser(0.4), 1), (23 * BEAT_C, M.impact(1.5), 1)],
         [(19 * BEAT_C, '你的未來，自己寫！')])
