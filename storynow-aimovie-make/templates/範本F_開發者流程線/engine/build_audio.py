"""配音（範本F／G 共用）：storyboard.json 每段 say → TTS → 量每段秒數 → timings.json → audio/narration.wav

配音選擇規則（2026-10-06，所有工作流與範本一致）：
  專案自己的 .env.local 有 GEMINI_API_KEY → Gemini Flash TTS（自動最新版；所有段落一次批次合成再用 whisper 對齊切回，
  過壞音檔關卡）；沒有 → edge-tts。voice 可加 "provider": "edge" 強制用 edge-tts。
  Gemini 聲音：voice.voice_id（設計過的 id）或 voice.gemini_voice（現成聲音名），都沒有就用 voice.description 設計一次，
  id 記在 <專案>/.gemini_voices.json；講話方式 voice.style。

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


# ── 配音引擎（規則：專案 .env.local 有金鑰才用 Gemini）──
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'engine', 'scripts')))
try:
    import gemini_tts as G
    USE_GEMINI = V.get('provider') != 'edge' and G.has_key(os.getcwd())
except ImportError:
    G, USE_GEMINI = None, False
print('配音：' + ('Gemini Flash TTS（專案 .env.local 有金鑰）' if USE_GEMINI else 'edge-tts（專案沒有 Gemini 金鑰）'))


def gemini_voice():
    if V.get('voice_id') or V.get('gemini_voice'): return V.get('voice_id') or V['gemini_voice']
    desc = V.get('description') or G.DEFAULT_DESCRIPTION
    store = '.gemini_voices.json'
    saved = json.load(open(store, encoding='utf-8')) if os.path.exists(store) else {}
    if desc not in saved:
        saved[desc] = G.design_voice(desc)
        json.dump(saved, open(store, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return saved[desc]


def seg_wav(i, spoken):
    tag = f"gemini|{GID}|{V.get('style', '')}" if USE_GEMINI else f"{V['name']}|{V['rate']}"
    h = hashlib.md5(f"{spoken}|{tag}".encode()).hexdigest()[:10]
    return f'audio/seg{i:02d}_{h}.wav'


GID = gemini_voice() if USE_GEMINI else ''
spokens = [tts_text(seg) for seg in SB['segments']]
if USE_GEMINI:
    todo = [(i, sp) for i, sp in enumerate(spokens, 1) if not os.path.exists(seg_wav(i, sp))]
    if todo:
        try:
            outs = G.synth_lines([sp for _, sp in todo], GID, style=V.get('style', G.DEFAULT_STYLE), workdir='audio')
        except G.Quota as e:
            sys.exit(f'⛔ Gemini 今日配額用完，明天重跑同一指令會接續：{e}')
        bad = []
        for (i, sp), data in zip(todo, outs):
            why = G.bad_audio(data, sp)       # 壞音檔關卡：壞的段落不進快取，重跑只重新要這幾段
            if why: bad.append(f'第 {i} 段：{why}'); continue
            raw = seg_wav(i, sp)[:-4] + '_raw.wav'
            open(raw, 'wb').write(data); to_wav(raw, seg_wav(i, sp)); os.remove(raw)
        if bad: sys.exit('⛔ Gemini 回傳的音檔異常（沒寫進快取，重跑同一指令會重新合成）：' + '；'.join(bad))

segs, t = [], V['lead']
for i, seg in enumerate(SB['segments'], 1):
    say, spoken = seg['say'], spokens[i - 1]
    wav = seg_wav(i, spoken)
    if not os.path.exists(wav):
        mp3 = wav[:-4] + '.mp3'
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
