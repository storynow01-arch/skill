"""storyboard.json → 旁白（edge-tts）→ 時間軸 → 配樂 → src/data/spec.json

用法（在專案資料夾內）：
    python <skill>/scripts/build.py storyboard.json [--style glass] [--no-tts] [--no-music]

兩種模式：
  mode = "teach"  場景長度由旁白決定（每句單獨合成 → 精準字幕與動畫 cue），配樂為底樂並自動閃避人聲
  mode = "promo"  場景長度由 bars（小節數）決定，所有切點對齊音樂節拍，無旁白
"""
import argparse, asyncio, hashlib, json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = json.load(open(os.path.join(HERE, '..', 'template', 'src', 'styles.json'), encoding='utf-8'))
PRON = json.load(open(os.path.join(HERE, 'pron_zh-TW.json'), encoding='utf-8'))
SR = 48000
_ZH = '零一二三四五六七八九'
_IPV4 = re.compile(r'(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])')
_DOT2 = re.compile(r'(?<![\d.])(\d{1,3})\.(\d{1,3})(?![\d.])')


def to_speech(text):
    """專業寫法 → TTS 唸法（IP 逐字唸、縮寫拆字母）。規則來自 pron_zh-TW.json。"""
    d = lambda s: ''.join(_ZH[int(c)] for c in s)
    text = _IPV4.sub(lambda m: '點'.join(d(g) for g in m.groups()), text)
    text = _DOT2.sub(lambda m: f'{d(m.group(1))}點{d(m.group(2))}', text)
    for term, say in sorted(PRON['詞典'].items(), key=lambda kv: -len(kv[0])):
        text = re.sub(rf'(?<![A-Za-z]){re.escape(term)}(?![A-Za-z0-9])', say, text)
    return text


async def _tts(text, mp3, voice, rate, pitch):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(mp3)


def synth_line(text, cache, voice):
    """一句 → 48k mono float32。以內容 hash 快取，改稿只重錄改過的句子。"""
    say = to_speech(text)
    h = hashlib.md5(f"{say}|{voice['name']}|{voice['rate']}|{voice['pitch']}".encode()).hexdigest()[:12]
    wav = os.path.join(cache, f'{h}.wav')
    if not os.path.exists(wav):
        mp3 = wav[:-4] + '.mp3'
        for attempt in range(3):
            try:
                asyncio.run(_tts(say, mp3, voice['name'], voice['rate'], voice['pitch'])); break
            except Exception as e:  # 網路偶發失敗重試
                if attempt == 2: raise
                print('  tts retry', e)
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', str(SR), wav])
    with wave.open(wav) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    # 修掉 TTS 前後的靜音，讓節奏由我們控制
    idx = np.where(np.abs(x) > 0.01)[0]
    if len(idx): x = x[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.08 * SR)]
    return x, say


def split_caption(text, mx=24):
    """超過 mx 字的旁白切成多頁字幕：優先在句號/問號，其次逗號/頓號斷開。"""
    if len(text) <= mx:
        return [text]
    parts = re.split(r'(?<=[。？！；])', text)
    parts = [x for x in parts if x]
    out = []
    for part in parts:
        while len(part) > mx:
            cut = max((part.rfind(c, 0, mx + 1) for c in '，、：—'), default=-1)
            cut = cut + 1 if cut >= mx // 3 else mx
            out.append(part[:cut]); part = part[cut:]
        if part:
            if out and len(out[-1]) + len(part) <= mx: out[-1] += part
            else: out.append(part)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard'); ap.add_argument('--style'); ap.add_argument('--no-tts', action='store_true')
    ap.add_argument('--no-music', action='store_true'); ap.add_argument('--project', default='.')
    a = ap.parse_args()
    proj = os.path.abspath(a.project)
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    style = a.style or sb.get('style', 'cyber-neon')
    if style not in STYLES: sys.exit(f'未知風格 {style}，可用：{", ".join(STYLES)}')
    fps = sb.get('fps', 30); mode = sb.get('mode', 'teach')
    voice = {'name': 'zh-TW-YunJheNeural', 'rate': '+18%', 'pitch': '+4Hz', **sb.get('voice', {})}
    gap = sb.get('lineGap', 0.28); lead = sb.get('lead', 0.35); tail = sb.get('tail', 0.55)
    bpm = sb.get('bpm') or STYLES[style]['music']['bpm']
    bar = 60 / bpm * 4

    pub = os.path.join(proj, 'public'); cache = os.path.join(proj, '.tts_cache')
    os.makedirs(pub, exist_ok=True); os.makedirs(cache, exist_ok=True)

    t = 0.0; scenes = []; caps = []; duck = []; voice_parts = []; impacts = []; whooshes = []; blips = []
    for i, sc in enumerate(sb['scenes']):
        start = t; cues = []
        lines = sc.get('lines', []) if mode == 'teach' and not a.no_tts else []
        if mode == 'promo' or not lines:
            if mode == 'promo' and 'bars' not in sc and 'sec' in sc:   # 以秒指定 → 吸附到該曲速的整數小節
                sc = {**sc, 'bars': max(1, round(sc['sec'] / bar))}
            dur = sc['bars'] * bar if 'bars' in sc else sc.get('sec', 4.0)
            if lines == [] and mode == 'teach' and sc.get('lines') and a.no_tts:  # 無 TTS 預覽：用字數估時
                tt = start + lead
                for ln in sc['lines']:
                    d = len(ln) / 5.2
                    cues.append(round((tt - start) * fps)); caps.append({'text': ln, 'from': round(tt * fps), 'to': round((tt + d) * fps)})
                    tt += d + gap
                dur = max(dur, tt - start + tail)
        else:
            tt = start + lead
            for ln in lines:
                if re.fullmatch(r'[.…。\s]+', ln):   # 「……」＝停頓（讓學生想），不發音、不上字幕
                    cues.append(round((tt - start) * fps)); tt += sb.get('pauseSec', 2.0); continue
                x, say = synth_line(ln, cache, voice)
                d = len(x) / SR
                voice_parts.append((tt, x))
                cues.append(round((tt - start) * fps))
                pages = split_caption(ln, sb.get('capMax', 24))
                n_all = sum(len(x) for x in pages); t0 = tt
                for pg in pages:                     # 長句分頁，時間依字數比例分配
                    t1 = t0 + d * len(pg) / n_all
                    caps.append({'text': pg, 'from': round(t0 * fps), 'to': round(t1 * fps)}); t0 = t1
                duck.append([round(tt * fps), round((tt + d) * fps)])
                print(f'  {sc["id"]}  {d:5.2f}s  {ln}')
                tt += d + gap
            dur = max(sc.get('minSec', 0), tt - start - gap + tail)
        if sc.get('impact'): impacts.append(start)
        elif i > 0: whooshes.append(start)
        for b in sc.get('blips', []): blips.append(start + b)
        scenes.append({'id': sc['id'], 'type': sc['type'], 'from': round(start * fps), 'dur': 0, 'accent': sc.get('accent'),
                       'code': sc.get('code', 0), 'hud': sc.get('hud'), 'props': sc.get('props', {}), 'cues': cues})
        t = start + dur
    total = t
    # 以整數 frame 重算每段長度，避免累積誤差
    for k, s in enumerate(scenes):
        end = scenes[k + 1]['from'] if k + 1 < len(scenes) else round(total * fps)
        s['dur'] = end - s['from']
    total_frames = round(total * fps)

    voice_file = None
    if voice_parts:
        v = np.zeros(int((total + 1) * SR), np.float32)
        for st, x in voice_parts:
            i0 = int(st * SR); v[i0:i0 + len(x)] += x
        v = v[: int(total * SR)]
        v = v / (np.max(np.abs(v)) + 1e-9) * 0.95
        with wave.open(os.path.join(pub, 'voice.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((v * 32767).astype(np.int16).tobytes())
        voice_file = 'voice.wav'

    music_file = None
    if not a.no_music:
        cmd = [sys.executable, os.path.join(HERE, 'make_music.py'), '--style', style, '--duration', f'{total:.3f}',
               '--out', os.path.join(pub, 'music.wav'), '--bpm', str(bpm)]
        if impacts: cmd += ['--impacts'] + [f'{x:.3f}' for x in impacts]
        if whooshes: cmd += ['--whooshes'] + [f'{x:.3f}' for x in whooshes]
        if blips: cmd += ['--blips'] + [f'{x:.3f}' for x in blips]
        if mode == 'teach': cmd.append('--bed')
        subprocess.check_call(cmd)
        music_file = 'music.wav'

    spec = {'style': style, 'mode': mode, 'fps': fps, 'width': 1920, 'height': 1080, 'totalFrames': total_frames,
            'hud': sb.get('hud'), 'music': music_file, 'voice': voice_file,
            'musicVolume': sb.get('musicVolume', 0.5 if mode == 'teach' else 1.0), 'duckTo': sb.get('duckTo', 0.14),
            'duck': duck, 'impacts': [round(x * fps) for x in impacts], 'captions': caps if sb.get('captions', True) else [],
            'scenes': scenes}
    os.makedirs(os.path.join(proj, 'src', 'data'), exist_ok=True)
    json.dump(spec, open(os.path.join(proj, 'src', 'data', 'spec.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'\nspec → src/data/spec.json   style={style}  mode={mode}  {total:.2f}s ({total_frames}f)  scenes={len(scenes)}')
    for s in scenes:
        print(f'  {s["id"]:<4} {s["type"]:<14} {s["from"] / fps:6.2f}s  +{s["dur"] / fps:5.2f}s')


if __name__ == '__main__':
    main()
