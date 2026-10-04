"""storyboard.json → 旁白（Gemini Flash TTS，自動用最新版）→ 時間軸 → 配樂 → src/data/spec.json

用法（在專案資料夾內）：
    python <skill>/scripts/build.py storyboard.json [--style glass] [--no-tts] [--no-music]

兩種模式：
  mode = "teach"  場景長度由旁白決定（每句單獨合成 → 精準字幕與動畫 cue），配樂為底樂並自動閃避人聲
  mode = "promo"  場景長度由 bars（小節數）決定，所有切點對齊音樂節拍，無旁白

旁白聲音（storyboard 的 "voice"／"voices"）：
  預設 provider = "gemini"：金鑰放專案資料夾 .env.local（GEMINI_API_KEY=…），模型 auto＝最新正式版 Flash TTS。
    {"description": "聲音描述（第一次自動設計，id 記在 .gemini_voices.json）", "style": "講話方式", "voice_id": "選填"}
    也可用 Gemini 現成聲音名：{"gemini_voice": "Achird"}
  所有句子先一次批次合成（一次請求約 2 分鐘的稿，省配額），再用 whisper 對齊切回每一句。
  provider = "edge"／"azure" 仍可用（備用）；沒有 GEMINI_API_KEY 時自動退回 edge-tts 並警告。
"""
import argparse, asyncio, hashlib, json, os, re, shutil, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
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


async def _tts(text, mp3, voice, rate, pitch, volume='+0%'):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume).save(mp3)


def _tts_azure(text, wav, v):
    """選用：Azure 語音（需環境變數 AZURE_SPEECH_KEY、AZURE_SPEECH_REGION）。
    支援 SSML 的 style（僅部分聲音有，例如 zh-CN-XiaoxiaoNeural；zh-TW 聲音沒有情緒風格）。"""
    import urllib.request
    key, region = os.environ['AZURE_SPEECH_KEY'], os.environ['AZURE_SPEECH_REGION']
    lang = '-'.join(v['name'].split('-')[:2])
    inner = f"<prosody rate='{v.get('rate', '+0%')}' pitch='{v.get('pitch', '+0Hz')}' volume='{v.get('volume', '+0%')}'>{text}</prosody>"
    if v.get('style'):
        inner = f"<mstts:express-as style='{v['style']}' styledegree='{v.get('styledegree', 1)}'>{inner}</mstts:express-as>"
    ssml = (f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='{lang}'>"
            f"<voice name='{v['name']}'>{inner}</voice></speak>")
    req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode('utf-8'),
                                 headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                                          'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm', 'User-Agent': 'storynow-aimovie'})
    open(wav, 'wb').write(urllib.request.urlopen(req, timeout=60).read())


FEMALE_HINT = ('Hsiao', 'Xiao', 'Ava', 'Emma', 'Jenny', 'Aria', 'female', '女')
DEFAULT_FEMALE = ("25 歲左右的台灣年輕女老師，說標準台灣華語（台灣口音），熱情開朗、親切有活力，咬字清楚，語速稍快，聲音明亮溫暖。")


def _gemini_ready():
    try:
        import gemini_tts as G
        G.api_key(os.getcwd())
        return True
    except SystemExit:
        return False


def _provider(voice):
    p = voice.get('provider', 'gemini')
    if p == 'gemini' and not _gemini_ready():
        if not getattr(_provider, 'warned', False):
            print('  ⚠ 找不到 GEMINI_API_KEY（專案 .env.local），這次改用 edge-tts')
            _provider.warned = True
        return 'edge'
    if p == 'azure' and not (os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_SPEECH_REGION')):
        print('  ⚠ 未設定 AZURE_SPEECH_KEY／AZURE_SPEECH_REGION，改用 edge-tts')
        return 'edge'
    return p


def _gemini_voice(voice, proj):
    """回傳 Gemini 的 voice（現成聲音名或設計過的 id）。只有描述時第一次自動設計，id 存在 <專案>/.gemini_voices.json"""
    import gemini_tts as G
    if voice.get('gemini_voice'): return voice['gemini_voice']
    if voice.get('voice_id'): return voice['voice_id']
    female = not voice.get('description') and any(h in voice.get('name', '') for h in FEMALE_HINT)
    desc = voice.get('description') or (DEFAULT_FEMALE if female else G.DEFAULT_DESCRIPTION)
    book_path = os.path.join(proj, '.gemini_voices.json')
    book = json.load(open(book_path, encoding='utf-8')) if os.path.exists(book_path) else {}
    k = hashlib.md5(desc.encode()).hexdigest()[:12]
    if k not in book:
        g = voice.get('gender') or ('female' if female or '女' in desc[:30] else 'male')
        book[k] = {'id': G.design_voice(desc, gender=g), 'description': desc}
        json.dump(book, open(book_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"  已設計 Gemini 聲音 {book[k]['id']}（{desc[:24]}…）")
    return book[k]['id']


def _tag(say, voice, provider):
    if provider == 'gemini':
        return f"{say}|gemini|{voice.get('_gid')}|{voice.get('style', '')}|{voice.get('_model')}"
    return f"{say}|{voice['name']}|{voice['rate']}|{voice['pitch']}|{voice.get('volume', '+0%')}|{voice.get('style', '')}|{provider}"


def _prep(voice, proj):
    """補上 Gemini 需要的欄位（聲音 id、實際模型）"""
    if '_gid' in voice or _provider(voice) != 'gemini': return voice
    import gemini_tts as G
    v = dict(voice)
    v.setdefault('style', G.DEFAULT_STYLE)
    v['_gid'] = _gemini_voice(v, proj)
    v['_model'] = G.resolve_model(v.get('model', 'auto'))
    return v


def _to_cache(wav_bytes, wav):
    tmp = wav[:-4] + '_raw.wav'
    open(tmp, 'wb').write(wav_bytes)
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', str(SR), wav])
    os.remove(tmp)


def prefetch_gemini(items, cache, proj):
    """items: [(text, voice)]。還沒快取的句子依聲音分組、批次合成（省配額），切回每句寫進快取。"""
    import gemini_tts as G
    groups = {}
    for text, voice in items:
        if _provider(voice) != 'gemini': continue
        voice = _prep(voice, proj)
        say = to_speech(text)
        wav = os.path.join(cache, hashlib.md5(_tag(say, voice, 'gemini').encode()).hexdigest()[:12] + '.wav')
        if os.path.exists(wav): continue
        groups.setdefault((voice['_gid'], voice['style'], voice['_model']), []).append((say, wav))
    for (gid, style, model), rows in groups.items():
        uniq = list(dict.fromkeys(rows))
        print(f'  Gemini 合成 {len(uniq)} 句（{model}，聲音 {gid}）…')
        try:
            outs = G.synth_lines([r[0] for r in uniq], gid, style=style, model=model, workdir=cache)
        except G.Quota as e:
            raise SystemExit(f'⛔ Gemini 今日配額用完；已完成的句子都在快取，明天重跑同一指令會接續。\n{e}')
        for (say, wav), data in zip(uniq, outs):
            _to_cache(data, wav)


def synth_line(text, cache, voice, proj='.'):
    """一句 → 48k mono float32。以內容 hash 快取，改稿只重錄改過的句子。"""
    say = to_speech(text)
    provider = _provider(voice)
    voice = _prep(voice, proj)
    h = hashlib.md5(_tag(say, voice, provider).encode()).hexdigest()[:12]
    wav = os.path.join(cache, f'{h}.wav')
    if not os.path.exists(wav):
        if provider == 'gemini':
            import gemini_tts as G
            _to_cache(G.synth_lines([say], voice['_gid'], style=voice['style'], model=voice['_model'],
                                    workdir=cache)[0], wav)
        elif provider == 'azure':
            raw = wav[:-4] + '_az.wav'
            _tts_azure(say, raw, voice)
            subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-ac', '1', '-ar', str(SR), wav])
        else:
            mp3 = wav[:-4] + '.mp3'
            for attempt in range(3):
                try:
                    asyncio.run(_tts(say, mp3, voice['name'], voice['rate'], voice['pitch'], voice.get('volume', '+0%'))); break
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




def _biquad_peak(f0, gain_db, q=0.9):
    import math
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f0 / SR; al = math.sin(w) / (2 * q)
    b = [1 + al * A, -2 * math.cos(w), 1 - al * A]; a = [1 + al / A, -2 * math.cos(w), 1 - al / A]
    return [x / a[0] for x in b], [x / a[0] for x in a]


def voice_chain(v):
    """旁白處理：高通 80Hz（去低頻轟聲）→ 3.5kHz 臨場感 +3dB → 輕壓縮 → 正規化"""
    from scipy.signal import butter, sosfilt, lfilter
    v = sosfilt(butter(2, 80 / (SR / 2), 'high', output='sos'), v)
    b, a = _biquad_peak(3500, 3.0); v = lfilter(b, a, v)
    k = np.exp(-1 / (0.08 * SR))
    env = lfilter([1 - k], [1, -k], np.abs(v)) + 1e-6
    th = 0.12; v = v * np.where(env > th, (th + (env - th) / 2.5) / env, 1.0)
    return (v / (np.max(np.abs(v)) + 1e-9) * 0.95).astype(np.float32)


def sidechain_duck(music_path, voice, out_path, depth=0.3):
    """依旁白音量包絡壓低音樂（真正的側鏈閃避：起音 40ms、釋放 400ms），輸出新的音樂檔。"""
    from scipy.signal import lfilter
    with wave.open(music_path) as w:
        ch = w.getnchannels(); m = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    m = m.reshape(-1, ch).T.copy()
    n = min(m.shape[1], len(voice))
    env = np.abs(voice[:n])
    att, rel = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.4 * SR))
    e = np.maximum(lfilter([1 - rel], [1, -rel], env), lfilter([1 - att], [1, -att], env))
    k = np.clip(e / 0.04, 0, 1)
    m[:, :n] *= 1 - (1 - depth) * k
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(m.T, -1, 1) * 32767).astype(np.int16).tobytes())


def line_voice(raw, base, voices):
    """逐句聲音：字串＝預設聲音；物件可指定角色（voices 裡的名字）或覆寫 rate／pitch／volume／style／provider。"""
    if isinstance(raw, str):
        return raw, base
    v = dict(base)
    who = raw.get('voice')
    if who in voices: v.update(voices[who])
    elif who: v['name'] = who
    for k in ('rate', 'pitch', 'volume', 'style', 'styledegree', 'provider', 'description', 'voice_id', 'gemini_voice', 'gender'):
        if k in raw: v[k] = raw[k]
    return raw['text'], v


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


IMG_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
VID_EXT = {'.mp4', '.mov', '.webm', '.m4v'}


def resolve_media(ref, media_dir, pub, missing, where):
    """把 storyboard 裡的 media 參照解析成 {src, ok, kind, focus}。
    ref 可以是：檔名、相對／絕對路徑、關鍵字（在 mediaDir 檔名裡搜尋），或 {file, focus, start}。
    找不到 → ok=False，場景會自動畫退回插畫，影片照常產出。"""
    if ref is None or ref == '':
        return {'ok': False}
    meta = ref if isinstance(ref, dict) else {'file': ref}
    key = str(meta.get('file', ''))
    cand = None
    for p in [key, os.path.join(media_dir or '', key)]:
        if key and os.path.isfile(p):
            cand = p; break
    if cand is None and media_dir and os.path.isdir(media_dir):
        kw = key.lower()
        for root, _, files in os.walk(media_dir):
            for fn in sorted(files):
                if kw and kw in fn.lower() and os.path.splitext(fn)[1].lower() in IMG_EXT | VID_EXT:
                    cand = os.path.join(root, fn); break
            if cand: break
    if cand is None:
        missing.append(f'{where}：「{key}」')
        return {'ok': False}
    ext = os.path.splitext(cand)[1].lower()
    os.makedirs(os.path.join(pub, 'media'), exist_ok=True)
    h = hashlib.md5(os.path.abspath(cand).encode()).hexdigest()[:10]
    if ext in VID_EXT:
        dst = f'media/{h}{ext}'
        if not os.path.exists(os.path.join(pub, dst)): shutil.copy(cand, os.path.join(pub, dst))
        kind = 'video'
    else:
        dst = f'media/{h}.jpg'
        if not os.path.exists(os.path.join(pub, dst)):
            try:
                from PIL import Image, ImageOps
                im = ImageOps.exif_transpose(Image.open(cand)).convert('RGB')
                im.thumbnail((2400, 2400)); im.save(os.path.join(pub, dst), quality=88)
            except Exception as e:   # Pillow 不在或圖壞掉 → 視為缺圖
                missing.append(f'{where}：「{key}」讀取失敗 {e}'); return {'ok': False}
        kind = 'image'
    return {'src': dst, 'ok': True, 'kind': kind, 'focus': meta.get('focus', [0.5, 0.5]), 'start': meta.get('start', 0)}


def walk_media(obj, media_dir, pub, missing, where):
    """遞迴處理 props 裡所有名為 media 的欄位"""
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k == 'media':
                obj[k] = resolve_media(v, media_dir, pub, missing, where)
            else:
                walk_media(v, media_dir, pub, missing, where)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk_media(v, media_dir, pub, missing, f'{where}[{i}]')


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
    voice = {'provider': 'gemini', 'name': 'zh-TW-YunJheNeural', 'rate': '+18%', 'pitch': '+4Hz', **sb.get('voice', {})}
    gap = sb.get('lineGap', 0.28); lead = sb.get('lead', 0.35); tail = sb.get('tail', 0.55)
    bpm = sb.get('bpm') or (sb.get('music') or {}).get('bpm') or STYLES[style]['music']['bpm']
    bar = 60 / bpm * 4

    pub = os.path.join(proj, 'public'); cache = os.path.join(proj, '.tts_cache')
    os.makedirs(pub, exist_ok=True); os.makedirs(cache, exist_ok=True)

    media_dir = sb.get('mediaDir')
    if media_dir and not os.path.isabs(media_dir):
        media_dir = os.path.join(os.path.dirname(os.path.abspath(a.storyboard)), media_dir)
    missing = []
    if mode == 'teach' and not a.no_tts:      # Gemini：整支片的句子先批次合成（一次請求約 2 分鐘稿）
        os.makedirs(cache, exist_ok=True)
        items = []
        for sc in sb['scenes']:
            for raw in sc.get('lines', []):
                ln, lv = line_voice(raw, voice, sb.get('voices', {}))
                if not re.fullmatch(r'[.…。\s]+', ln): items.append((ln, lv))
        prefetch_gemini(items, cache, proj)
    t = 0.0; scenes = []; caps = []; duck = []; voice_parts = []; impacts = []; whooshes = []; blips = []; vlines = []
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
                    ln = ln if isinstance(ln, str) else ln['text']
                    d = len(ln) / 5.2
                    cues.append(round((tt - start) * fps)); caps.append({'text': ln, 'from': round(tt * fps), 'to': round((tt + d) * fps)})
                    tt += d + gap
                dur = max(dur, tt - start + tail)
        else:
            tt = start + lead
            for raw in lines:
                ln, lv = line_voice(raw, voice, sb.get('voices', {}))
                if re.fullmatch(r'[.…。\s]+', ln):   # 「……」＝停頓（讓學生想），不發音、不上字幕
                    cues.append(round((tt - start) * fps)); tt += sb.get('pauseSec', 2.0); continue
                x, say = synth_line(ln, cache, lv, proj)
                d = len(x) / SR
                voice_parts.append((tt, x))
                vlines.append({'scene': sc['id'], 'text': ln, 'say': say, 'from': round(tt, 3), 'to': round(tt + d, 3)})
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
            if sb.get('snapBars'):   # 範本：場景長度補足到整數小節，切點對拍
                import math
                dur = math.ceil(dur / bar - 0.05) * bar
        if sc.get('impact'): impacts.append(start)
        elif i > 0: whooshes.append(start)
        for b in sc.get('blips', []): blips.append(start + b)
        props = json.loads(json.dumps(sc.get('props', {})))
        walk_media(props, media_dir, pub, missing, sc['id'])
        scenes.append({'id': sc['id'], 'type': sc['type'], 'from': round(start * fps), 'dur': 0, 'accent': sc.get('accent'),
                       'code': sc.get('code', 0), 'hud': sc.get('hud'), 'props': props, 'cues': cues})
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
        v = voice_chain(v)
        with wave.open(os.path.join(pub, 'voice.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((v * 32767).astype(np.int16).tobytes())
        voice_file = 'voice.wav'

    music_file = None
    if not a.no_music:
        cmd = [sys.executable, os.path.join(HERE, 'make_music.py'), '--style', style, '--duration', f'{total:.3f}',
               '--out', os.path.join(pub, 'music.wav'), '--bpm', str(bpm)]
        mus = sb.get('music') or {}          # 範本可覆寫曲風：{"genre": "phonk", "bpm": 145, "key": "Em"}
        if mus.get('genre'): cmd += ['--genre', mus['genre']]
        if mus.get('key'): cmd += ['--key', mus['key']]
        if impacts: cmd += ['--impacts'] + [f'{x:.3f}' for x in impacts]
        if whooshes: cmd += ['--whooshes'] + [f'{x:.3f}' for x in whooshes]
        if blips: cmd += ['--blips'] + [f'{x:.3f}' for x in blips]
        if mode == 'teach': cmd.append('--bed')
        subprocess.check_call(cmd)
        music_file = 'music.wav'
        if voice_file and sb.get('sidechain', True):   # 用旁白包絡做側鏈閃避，取代逐格音量
            sidechain_duck(os.path.join(pub, 'music.wav'), v, os.path.join(pub, 'music_ducked.wav'), sb.get('duckDepth', 0.3))
            music_file = 'music_ducked.wav'
            duck = []

    spec = {'style': style, 'mode': mode, 'fps': fps, 'width': 1920, 'height': 1080, 'totalFrames': total_frames,
            'hud': sb.get('hud'), 'music': music_file, 'voice': voice_file,
            'musicVolume': sb.get('musicVolume', 0.5 if mode == 'teach' else 1.0), 'duckTo': sb.get('duckTo', 0.14),
            'duck': duck, 'impacts': [round(x * fps) for x in impacts], 'captions': caps if sb.get('captions', True) else [],
            'scenes': scenes, 'voiceLines': vlines, 'bpm': bpm, 'narrator': sb.get('narrator')}
    os.makedirs(os.path.join(proj, 'src', 'data'), exist_ok=True)
    json.dump(spec, open(os.path.join(proj, 'src', 'data', 'spec.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if missing:
        print('\n⚠ 缺照片（這些位置會自動改用插畫，影片照常產出）：')
        for m in missing: print('   ', m)
    print(f'\nspec → src/data/spec.json   style={style}  mode={mode}  {total:.2f}s ({total_frames}f)  scenes={len(scenes)}')
    for s in scenes:
        print(f'  {s["id"]:<4} {s["type"]:<14} {s["from"] / fps:6.2f}s  +{s["dur"] / fps:5.2f}s')


if __name__ == '__main__':
    main()
