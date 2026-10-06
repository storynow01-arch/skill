"""配音（範本F／G 共用）：storyboard.json 每段 say → edge-tts → 量每段秒數 → timings.json → audio/narration.wav

storyboard 相關欄位：
  "voice": {"name": "zh-TW-YunJheNeural", "rate": "+8%", "gap": 0.18, "lead": 0.4, "tail": 1.8}
  "pron":  {"5.5": "五點五", "grill-with-docs": "grill with docs"}   # 只改配音稿，字幕仍用原文
  每段 "say"（字幕原文），可另給 "tts"（這一段的配音稿，優先於 pron）
字幕按標點切成小句；每句時間＝字元位置 ÷ 句長 × 該段秒數。
同一段文字與聲音設定不變就沿用 audio/ 裡的快取，不重新呼叫 TTS。"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")
import asyncio, hashlib, json, os, re, subprocess, sys, wave
import edge_tts

proj = sys.argv[1] if len(sys.argv) > 1 else '.'
os.chdir(proj)
SB = json.load(open('storyboard.json', encoding='utf-8'))
V = {'name': 'zh-TW-YunJheNeural', 'rate': '+8%', 'gap': 0.18, 'lead': 0.4, 'tail': 1.8, **SB.get('voice', {})}
PRON = SB.get('pron', {})
os.makedirs('audio', exist_ok=True)


def tts_text(seg):
    if 'tts' in seg: return seg['tts']
    s = seg['say']
    for a, b in PRON.items(): s = s.replace(a, b)
    return s


def to_wav(src, dst):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ar', '48000', '-ac', '1', dst], check=True)


def dur(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()


def phrases(text):
    out = []
    for m in re.finditer(r'[^，。？！：；、—]+[，。？！：；、—]*', text):
        seg = m.group().strip('，。？！：；、 —')
        if seg: out.append((seg, m.start(), m.end()))
    return out


segs, t = [], V['lead']
for i, seg in enumerate(SB['segments'], 1):
    say, spoken = seg['say'], tts_text(seg)
    h = hashlib.md5(f"{spoken}|{V['name']}|{V['rate']}".encode()).hexdigest()[:10]
    mp3, wav = f'audio/seg{i:02d}_{h}.mp3', f'audio/seg{i:02d}_{h}.wav'
    if not os.path.exists(wav):
        asyncio.run(edge_tts.Communicate(spoken, V['name'], rate=V['rate']).save(mp3))
        to_wav(mp3, wav)
    d = dur(wav)
    ph = [{'text': p, 'a': round(t + a / len(say) * d, 3), 'b': round(t + b / len(say) * d, 3)} for p, a, b in phrases(say)]
    for k in range(len(ph) - 1): ph[k]['b'] = ph[k + 1]['a']
    if ph: ph[-1]['b'] = round(t + d, 3)
    segs.append({'i': i, 'start': round(t, 3), 'dur': round(d, 3), 'text': say, 'wav': wav, 'phrases': ph})
    t += d + V['gap']
total = round(t - V['gap'] + V['tail'], 2)
json.dump({'total': total, 'segs': segs}, open('timings.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 旁白軌：每段放到自己的起點
inputs, filt = [], []
for k, sg in enumerate(segs):
    inputs += ['-i', sg['wav']]; ms = int(sg['start'] * 1000)
    filt.append(f'[{k}]adelay={ms}|{ms}[d{k}]')
filt.append(''.join(f'[d{k}]' for k in range(len(segs))) + f'amix=inputs={len(segs)}:normalize=0,apad=whole_dur={total},atrim=0:{total}[m]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[m]', '-ar', '48000', 'audio/narration.wav'], check=True)
print(f'配音完成：{len(segs)} 段，總長 {total} 秒')
for sg in segs: print(f"  {sg['i']:>2}  {sg['start']:>6.2f}s  {sg['dur']:.2f}s  {sg['text'][:24]}")
