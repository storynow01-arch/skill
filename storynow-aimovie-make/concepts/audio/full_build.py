"""三概念完整 60 秒：旁白（曉臻 +15%）→ 各概念時間軸（對齊小節）→ 配樂＋音效＋旁白混音。
輸出：public/full_{A,B,C}.wav、src/concepts/timing.json"""
import json, os, sys, wave
import numpy as np

SK = os.path.expanduser('~/.claude/skills/code-video-studio/scripts')
sys.path.insert(0, SK)
import make_music as M   # noqa: E402
import build as BLD      # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SR = M.SR; FPS = 30
CACHE = os.path.join(HERE, '.tts_cache'); os.makedirs(CACHE, exist_ok=True)
VOICE = {'name': 'zh-TW-HsiaoChenNeural', 'rate': '+15%', 'pitch': '+0Hz'}

LINES = [('S1', '嘿，學弟妹！'), ('S2', '在海青資訊科，你的未來，自己寫。'), ('S3', '從第一行 C 語言，到用 Python 寫出 AI，'),
         ('S4', '讓電腦看懂畫面裡的每一樣東西，'), ('S5', '用 ESP32 做出會動、會亮的作品，'), ('S6', '還能親手寫程式，指揮機械手臂。'),
         ('S7', '學長姐一路比到世界舞台，累積十位國際國手，'), ('S8', '拿下十二面全國金牌，'), ('S9', '今年分區賽，更是金銀銅全包！'),
         ('S10', '畢業後，一樣能考上臺科大、雲科大、高科大。'), ('S11', '海青資訊科，等你來寫下一行。')]
# 每個場景的「畫面需要的最少秒數」權重（動畫越多越長）
WEIGHT = {'S1': 1.0, 'S2': 1.2, 'S3': 1.0, 'S4': 1.0, 'S5': 1.0, 'S6': 1.1, 'S7': 1.3, 'S8': 0.9, 'S9': 1.0, 'S10': 1.2, 'S11': 1.3}
CONCEPTS = {'A': ('chiptune', 150, 'C'), 'B': ('acoustic', 90, 'G'), 'C': ('phonk', 145, 'Em')}
TARGET = 60.0
LEAD = 0.5   # 場景開始到旁白開始


def voice_lines():
    out = {}
    for sid, text in LINES:
        x, _ = BLD.synth_line(text, CACHE, VOICE)
        out[sid] = (text, x)
        print(f'  {sid} {len(x) / SR:5.2f}s {text}')
    return out


def timeline(vo, bpm):
    """每場景 = max(旁白+前導+尾, 權重分配)，再吸附到整數小節，最後微調總長≈60 秒。"""
    bar = 60 / bpm * 4
    need = {sid: len(x) / SR + LEAD + 0.6 for sid, (_, x) in vo.items()}
    wsum = sum(WEIGHT.values())
    base = {sid: max(need[sid], TARGET * WEIGHT[sid] / wsum) for sid in need}
    bars = {sid: max(1, round(v / bar)) for sid, v in base.items()}
    for sid in bars:   # 保證旁白放得下
        while bars[sid] * bar < need[sid]: bars[sid] += 1
    # 總長調整到最接近 60 秒
    order = sorted(bars, key=lambda s: -WEIGHT[s])
    i = 0
    while abs(sum(bars.values()) * bar - TARGET) > bar / 2 and i < 200:
        s = order[i % len(order)]
        if sum(bars.values()) * bar > TARGET:
            if (bars[s] - 1) * bar >= need[s]: bars[s] -= 1
        else:
            bars[s] += 1
        i += 1
    t = 0.0; sc = []
    for sid, _ in LINES:
        d = bars[sid] * bar
        sc.append({'id': sid, 'from': round(t * FPS), 'dur': round((t + d) * FPS) - round(t * FPS), 'bars': bars[sid],
                   'voiceAt': round((t + LEAD) * FPS), 'voiceDur': round(len(vo[sid][1]) / SR * FPS), 'text': vo[sid][0]})
        t += d
    return sc, t, bar


def mix(name, genre, bpm, key, sc, total, vo, sfx):
    L, R, add, beat, bar = M.arrange(genre, bpm, key, total, False, [sc[1]['from'] / FPS])
    music = np.stack([L, R])[:, :int(total * SR)]
    # 人聲閃避：旁白期間音樂壓到 35%
    duck = np.ones(music.shape[1])
    for s in sc:
        a = int(s['voiceAt'] / FPS * SR); b = a + int(s['voiceDur'] / FPS * SR)
        ramp = int(0.08 * SR)
        duck[max(0, a - ramp):b + ramp] = np.minimum(duck[max(0, a - ramp):b + ramp], 0.35)
    duck = np.convolve(duck, np.ones(2400) / 2400, mode='same')
    music *= duck
    N = music.shape[1]
    fx = np.zeros((2, N + SR * 3)); vox = np.zeros(N + SR * 3)
    for t, sig, g in sfx:
        if t < 0: continue
        i = int(t * SR); s = sig[:fx.shape[1] - i] * g; fx[:, i:i + len(s)] += s
    for s in sc:
        x = vo[s['id']][1]; i = int(s['voiceAt'] / FPS * SR); vox[i:i + len(x)] += x
    out = np.tanh(music * 0.85 + fx[:, :N] * 0.9) + vox[:N] * 1.15
    f = int(1.0 * SR); out[:, -f:] *= np.linspace(1, 0, f)
    out = out / (np.abs(out).max() + 1e-9) * 0.92
    with wave.open(os.path.join(HERE, 'public', f'full_{name}.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out.T * 32767).astype(np.int16).tobytes())


def sfx_for(name, sc, bar):
    S = {s['id']: s['from'] / FPS for s in sc}
    D = {s['id']: s['dur'] / FPS for s in sc}
    ev = []
    if name == 'A':
        from concept_audio import coin, jingle
        ev += [(S['S1'] + 1.2, coin(), 1), (S['S2'], M.impact(1.2), .6)]
        for k, sid in enumerate(['S3', 'S4', 'S5', 'S6']):
            ev += [(S[sid] + D[sid] * 0.45, jingle(72 + k * 2), 1), (S[sid] + D[sid] * 0.45, coin(), .7)]
        ev += [(S['S7'] + 0.6 + k * 0.5, M.impact(0.5) * .6, 1) for k in range(3)] + [(S['S7'] + 2.2, M.impact(1.6), .8)]
        ev += [(S['S8'] + 0.4 + k * 0.17, coin(), .55) for k in range(12)]
        ev += [(S['S9'] + 0.3 + k * 0.4, jingle(76 + k * 3), 1) for k in range(3)]
        ev += [(S['S10'] + 0.3, M.riser(1.0), .7), (S['S11'], M.impact(1.2), .7), (S['S11'] + 1.0, coin(), 1)]
    elif name == 'B':
        from concept_audio import scribble
        for sid in S:
            ev += [(S[sid] + 0.2, scribble(min(2.2, D[sid] * 0.6)), 1), (S[sid] - 0.3, M.whoosh(0.6), .35)]
        ev += [(S['S7'] + 1.5 + k * 0.12, M.whoosh(0.25), .3) for k in range(5)]
        ev += [(S['S9'] + 0.8 + k * 0.45, M.blip(79 + k * 4, 0.08), 1.2) for k in range(3)]
    else:
        from concept_audio import hit
        beat = bar / 4
        for s in sc:   # 每場景開頭與其後每兩拍一記打擊
            t0 = s['from'] / FPS; n = int((s['dur'] / FPS) / (beat * 2))
            ev += [(t0 + k * beat * 2, hit(), 1 if k == 0 else .55) for k in range(n)]
        ev += [(S['S2'], M.impact(1.2), .9), (S['S7'], M.impact(1.4), 1), (S['S10'] - 0.6, M.riser(0.6), 1), (S['S11'], M.impact(1.5), 1)]
    return ev


if __name__ == '__main__':
    vo = voice_lines()
    timing = {}
    for name, (genre, bpm, key) in CONCEPTS.items():
        sc, total, bar = timeline(vo, bpm)
        mix(name, genre, bpm, key, sc, total, vo, sfx_for(name, sc, bar))
        timing[name] = {'bpm': bpm, 'totalFrames': round(total * FPS), 'scenes': sc}
        print(f'{name} {genre} {bpm}bpm total {total:.2f}s  ' + ' '.join(f"{s['id']}:{s['bars']}" for s in sc))
    json.dump(timing, open(os.path.join(HERE, 'src', 'concepts', 'timing.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
