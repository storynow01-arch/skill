"""1-1 三概念 10 秒試看音軌：配樂＋事件音效＋旁白／角色聲。"""
import os, sys, wave
import numpy as np
sys.path.insert(0, os.path.expanduser('~/.claude/skills/code-video-studio/scripts'))
import make_music as M   # noqa: E402
import build as BLD      # noqa: E402
from concept_audio import coin, jingle  # noqa: E402
SR = M.SR; DUR = 10.0; FPS = 30
CACHE = '.tts_cache'
def V(name, rate='+10%', pitch='+0Hz'): return {'name': name, 'rate': rate, 'pitch': pitch}
TEACH, NARR, KIDA, KIDB = V('zh-TW-YunJheNeural'), V('zh-TW-HsiaoChenNeural', '+12%'), V('zh-TW-YunJheNeural', '+15%', '+25Hz'), V('zh-TW-HsiaoYuNeural', '+15%', '+15Hz')
def thud(): n = int(.35 * SR); t = M.tt(n); return np.sin(2*np.pi*np.cumsum(90+120*np.exp(-t*30))/SR)*M.ex(n,.08)*.8
def buzz(): n = int(.3*SR); return M.sq(120, n, .5)*M.adsr(n,.005,.05)*.12
def ding(): n = int(.6*SR); t = M.tt(n); return (np.sin(2*np.pi*1568*t)+.5*np.sin(2*np.pi*2350*t))*M.ex(n,.25)*.18
def boing(): n = int(.4*SR); t = M.tt(n); return np.sin(2*np.pi*np.cumsum(300+250*np.sin(t*40)*np.exp(-t*6))/SR)*M.ex(n,.15)*.25
def whistle(): n = int(.6*SR); t = M.tt(n); return np.sin(2*np.pi*np.cumsum(500+900*t/.6)/SR)*M.adsr(n,.02,.1)*.15
def pop(): n = int(.08*SR); return M.bp(M.noise(n), 800, 4000)*M.ex(n,.02)*.5
def beep(f0=1800): n = int(.12*SR); return np.sin(2*np.pi*f0*M.tt(n))*M.adsr(n,.005,.04)*.15
def clicks(): o = np.zeros(int(.8*SR)); [o.__setitem__(slice(int(k*.1*SR), int(k*.1*SR)+len(pop())), o[int(k*.1*SR):int(k*.1*SR)+len(pop())]+pop()*.6) for k in range(7)]; return o
def make(name, genre, bpm, key, sfx, lines):
    L, R, add, beat, bar = M.arrange(genre, bpm, key, DUR, True, [0.01])
    mus = np.stack([L, R])[:, :int(DUR*SR)] * 0.8
    fx = np.zeros(int((DUR+2)*SR)); vo = np.zeros(int((DUR+2)*SR))
    for t, s, g in sfx: i = int(t*SR); fx[i:i+len(s)] += s[:len(fx)-i]*g
    for t, text, v in lines:
        x, _ = BLD.synth_line(text, CACHE, v); i = int(t*SR); vo[i:i+len(x)] += x[:len(vo)-i]
        a, b = i, i+len(x); mus[:, max(0, a-2400):b+4800] *= 0.4
    out = np.tanh(mus*0.9 + fx[:mus.shape[1]]*0.9) + vo[:mus.shape[1]]*1.15
    f = int(.5*SR); out[:, -f:] *= np.linspace(1, 0, f)
    out = out/(np.abs(out).max()+1e-9)*.92
    with wave.open(f'public/{name}.wav','wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out.T*32767).astype(np.int16).tobytes())
    print(name, genre, bpm)
# 1 物流中心
make('lesson_c1', 'marimba', 100, 'F',
     [(0.4, M.sq(392, int(.15*SR), .5)*.1, 1), (0.6, M.sq(330, int(.2*SR), .5)*.1, 1), (62/FPS, buzz(), 1), (84/FPS, M.whoosh(.4), .6),
      (112/FPS, thud(), 1), (150/FPS, M.whoosh(.5), .5), (188/FPS, clicks(), 1), (275/FPS, ding(), 1)],
     [(0.3, '兩間倉庫，路是通的，貨卻送不進去。', TEACH), (3.0, '先講好規則，雙方都同意，這就是通訊協定。', TEACH), (6.6, '大貨切成小箱，每一箱，就是封包。', TEACH)])
# 2 電腦小劇場
make('lesson_c2', 'comedy', 110, 'C',
     [(10/FPS, pop(), 1), (34/FPS, boing(), 1), (84/FPS, whistle(), .8), (118/FPS, thud(), 1), (160/FPS, whistle(), .6), (202/FPS, thud(), .9),
      (240/FPS, M.whoosh(.3), .8)] + [((244+k*3)/FPS, pop(), .8) for k in range(6)] + [(265/FPS, ding(), .8)],
     [(0.35, '嗨！檔案收到了嗎？', KIDA), (1.5, '你在說什麼啦？', KIDB), (3.0, '規則對上了，才聽得懂。', NARR), (6.75, '糟糕，卡住了！', KIDA), (8.35, '切成小箱，就是封包！', NARR)])
# 3 穿越網路線
make('lesson_c3', 'minimal', 120, 'Dm',
     [(0.9, M.riser(.8), .8), (1.6, M.impact(1.0), .5), (2.4, beep(1400), 1), (2.7, beep(1100), 1), (96/FPS, beep(2200), 1), (104/FPS, jingle(79), 1),
      (140/FPS, M.whoosh(.6), .7)] + [((160+k*10)/FPS, beep(700), .8) for k in range(4)] + [(205/FPS, M.impact(1.2), .9), (238/FPS, pop(), 1), (258/FPS, M.whoosh(.5), .8)],
     [(1.75, '資料要通過閘門，雙方的規則得先對上。', NARR), (5.0, '太大的資料，會塞住整條路。', NARR), (7.25, '所以它被切成一顆顆封包。', NARR)])
