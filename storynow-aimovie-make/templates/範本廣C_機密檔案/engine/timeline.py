"""範本廣C「機密檔案」時間表：storyboard.json → 時間表（事件格、打字機逐字、手寫、打勾、蓋章…）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定：俯拍深色木桌，檯燈亮 → 牛皮紙機密檔案被推進來、蓋「極機密」章、撕封條、翻開 → 任務簡報（打字機、紅筆畫圈與底線）
→ 目標地圖（紅色航線、圖釘）→ 線索：兩張拍立得（手寫說明）＋便利貼 → 偵探牆紅線 → 裝備清單（打勾）
→ 最後一份通知被紅筆鋼筆指著、音樂抽空、木柄印章落下「核准」→ 文件全部收回檔案夾、闔上 → 封面蓋上名稱章、打出標語與網址。
地圖、三個線索、裝備清單都可以省略（鏡頭與鋼筆自動跳過）。100 BPM、一拍 18 格；停留依字數（pace 字／半拍，預設 6）。
"""
import math

FPS, BPM, BEAT = 30, 100, 18
ERR = []


def cw(c):
    """字寬（em）：全形 1、半形 0.6（跟 remotion/src/parts.tsx 的 cellW 同一套：打字機字型半形等寬）"""
    return 1.0 if ord(c) >= 0x2E80 else 0.6


def em(s): return sum(cw(c) for c in str(s))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())


def fit(where, s, fs, maxw, optional=False):
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    w = em(s) * fs
    if w > maxw: ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw}；中文最多約 {int(maxw / fs)} 字、英數約 {int(maxw / fs / 0.6)} 個）')
    return str(s)


def build(sb):
    ERR.clear()
    fo, br, mp, cl, ck, lt, en = (sb.get(k) or {} for k in ('folder', 'brief', 'map', 'clues', 'check', 'letter', 'end'))
    fit('folder.label 標籤頁（打字）', fo.get('label'), 40, 370)
    fit('folder.title 封面名稱', fo.get('title'), 46, 560)
    fit('folder.en 封面英文', fo.get('en'), 30, 560, True)
    fit('folder.secret 極機密章', fo.get('secret', '極機密'), 76, 230)
    fit('folder.file 右上檔號', fo.get('file'), 30, 460, True)
    fit('brief.head', br.get('head', '任務簡報'), 84, 1040)
    fit('brief.en', br.get('en', 'MISSION BRIEFING'), 40, 1040)
    a = fit('brief.a 第一行（打字）', br.get('a'), 48, 1020)
    b = fit('brief.b 第二行（打字）', br.get('b'), 48, 1020)
    if br.get('circle') and br['circle'] not in a: ERR.append(f'brief.circle「{br["circle"]}」要是 brief.a 裡的一段字（紅筆圈起來）')
    if br.get('underline') and br['underline'] not in b: ERR.append(f'brief.underline「{br["underline"]}」要是 brief.b 裡的一段字（紅筆畫底線）')
    if mp:
        fit('map.title', mp.get('title', '目標地圖'), 44, 420)
        fit('map.from 出發點', mp.get('from'), 32, 200); fit('map.to 目的地', mp.get('to'), 32, 240)
        fit('map.caption（打字）', mp.get('caption'), 56, 950)
    photos = [c for c in (cl.get('photos') or [])][:2] if cl else []
    note = (cl.get('note') or []) if cl else []
    for i, p in enumerate(photos):
        fit(f'clues.photos[{i}].text 手寫說明', p.get('text'), 44, 380)
        if p.get('pic', 'building') not in ('building', 'mountain', 'cup', 'book', 'star'):
            ERR.append(f'clues.photos[{i}].pic 只能是 building／mountain／cup／book／star')
    if len(note) > 2: ERR.append('clues.note 便利貼最多 2 行')
    for i, ln in enumerate(note): fit(f'clues.note[{i}] 便利貼', ln, 70, 270)
    if ck:
        fit('check.title（打字）', ck.get('title'), 56, 780)
        items = ck.get('items') or []
        if len(items) != 2: ERR.append('check.items 要剛好 2 項（逐條打勾）')
        for i, it in enumerate(items): fit(f'check.items[{i}]（打字）', it, 56, 680)
    fit('letter.title（打字）', lt.get('title'), 96, 760)
    fit('letter.en（打字）', lt.get('en'), 40, 760, True)
    fit('letter.line（打字）', lt.get('line'), 60, 720)
    fit('letter.stamp 核准章', lt.get('stamp', '核准'), 160, 330)
    fit('letter.stampEn', lt.get('stampEn', 'APPROVED'), 38, 330, True)
    fit('letter.foot 頁尾英文', lt.get('foot'), 30, 700, True)
    fit('end.name 封面名稱章', en.get('name'), 104, 440)
    fit('end.slogan（打字）', en.get('slogan'), 74, 1060)
    fit('end.url（打字）', en.get('url'), 48, 1060, True)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    pace = float(sb.get('pace', 6))
    hold = lambda *ss: max(0, math.ceil(nchars(*ss) / pace) - 2) * BEAT // 2
    E, TY, HD = {}, {}, {}

    def typed(key, text, start, step):
        TY[key] = {'text': str(text), 'start': start, 'step': step}
        return start + len(str(text)) * step

    E.update(lamp=6, folderIn=14, folderLand=44, secret=64, rip=78, flap=96, doc1=128)
    typed('label', fo['label'], 26, 2)
    t = typed('b1h', br.get('head', '任務簡報'), E['doc1'] + 22, 3)
    t = typed('b1e', br.get('en', 'MISSION BRIEFING'), t + 2, 1)
    t = typed('b1a', a, t + 6, 2)
    E['circle'] = t + 4
    t = typed('b1b', b, t + 4, 2)
    E['underline'] = max(t + 4, E['circle'] + 26)
    t = E['underline'] + 16 + hold(br.get('head'), a, b)
    if mp:
        E['map'] = t; E['route'] = t + 30; E['pinJP'] = E['route'] + 50
        t = typed('map', mp['caption'], E['route'] + 20, 3)
        t = max(t, E['pinJP']) + 10 + hold(mp.get('caption'), mp.get('from'), mp.get('to'))
    pins = []
    for i, p in enumerate(photos):
        k = f'pol{i + 1}'; E[k] = t
        s = t + 24; e = s + max(24, 3 * len(p['text']))
        HD[f'hand{i + 1}'] = {'text': p['text'], 'start': s, 'end': e}
        if i == 1: E['clip'] = s - 4
        pins.append((k, e + 4)); t = e + 10 + hold(p['text'])
    if note:
        E['sticky'] = t; s = t + 12; e = s + max(20, 3 * sum(len(x) for x in note))
        HD['hand3'] = {'text': ''.join(note), 'start': s, 'end': e}
        pins.append(('sticky', e + 4)); t = e + 14 + hold(*note)
    for k, at in pins: E['pin_' + k] = at
    if photos or note:
        E['pullback'] = t; t += 30
    if ck:
        E['check'] = t
        t = typed('c0', ck['title'], t + 22, 3)
        t = typed('c1', ck['items'][0], t + 6, 2); E['tick1'] = t + 4
        t = typed('c2', ck['items'][1], t + 10, 2); E['tick2'] = t + 4
        t = E['tick2'] + 16 + hold(ck['title'], *ck['items'])
    E['letter'] = E['drop'] = t
    t = typed('l0', lt['title'], t + 24, 4)
    if lt.get('en'): t = typed('l1', lt['en'], t + 2, 1)
    t = typed('l2', lt['line'], t + 4, 2)
    E['stampLift'] = t + 6 + hold(lt['title'], lt['line']); E['stamp'] = E['stampLift'] + 30
    E['sweep'] = E['stamp'] + 36; E['close'] = E['sweep'] + 30; E['closed'] = E['close'] + 30; E['school'] = E['closed'] + 16
    t = typed('slogan', en['slogan'], E['school'] + 10, 2)
    if en.get('url'): t = typed('url', en['url'], t + 4, 1)
    E['button'] = t + 24 + hold(en['slogan'])
    frames = E['button'] + 42

    texts = []
    def walk(v):
        if isinstance(v, str): texts.append(v)
        elif isinstance(v, dict): [walk(x) for x in v.values()]
        elif isinstance(v, list): [walk(x) for x in v]
    walk({k: v for k, v in sb.items() if k not in ('name', '_source')})
    has = {'map': bool(mp), 'pol1': len(photos) > 0, 'pol2': len(photos) > 1, 'sticky': bool(note), 'check': bool(ck)}
    stills = [E['secret'] + 10, E['flap'] + 20, E['underline'] + 14]
    for k in ('map', 'pol1', 'pol2', 'sticky', 'check'):
        if has[k]: stills.append(E[k] + 60)
    if 'pullback' in E: stills.append(E['pullback'] + 28)
    stills += [E['stampLift'] - 4, E['stamp'] + 14, E['closed'] + 6, frames - 4]
    return {'template': '廣C', 'name': sb.get('name', '機密檔案'), 'fps': FPS, 'bpm': BPM, 'beat': BEAT, 'frames': frames,
            'ev': E, 'type': TY, 'hand': HD, 'has': has, 'd': sb, 'pics': [p.get('pic', 'building') for p in photos], 'note': note,
            'stills': stills, 'poster': E['stamp'] + 20, 'overview': [E['underline'] + 14, stills[3] if len(stills) > 7 else E['letter'] + 40, E['stamp'] + 20],
            'allText': ''.join(texts) + '0123456789：｜・極機密核准封'}


if __name__ == '__main__':
    import json, sys
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print(tl['ev'])
