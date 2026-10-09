"""範本廣B「日報號外」時間表：storyboard.json → 時間表（片長、每個事件第幾格、逐字打字、打勾、照片…）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定：輪轉機印報 → 抽出一份攤平、蓋「號外」→ 鏡頭在報紙上平移推近讀第一版（頭條打字 → 圖示統計 → 圓餅
→ 勾選專欄 → 分類廣告，四個專欄都可省略）→ 翻到第二版（三張網點照片）→ 摺起來丟上報紙堆 → 背面報頭＋紅筆畫線＋手搖鈴。
每段的停留依「畫面上要讀的字數」加拍數（pace 字／拍，預設 5）；所以內容越多片越長。100 BPM、一拍 18 格。
"""
import math

FPS, BPM, BEAT = 30, 100, 18
ERR = []


# ───── 字寬估算（跟 remotion/src/fit.ts 的 em() 同一套；Noto Serif TC） ─────
def cw(c):
    o = ord(c)
    if o >= 0x2E80 or c in '…・，。！？「」：；（）％': return 1.0
    if c == ' ': return 0.3
    if c in '.,:;/-·\'|': return 0.38
    if c == '%': return 0.85
    if c.isdigit(): return 0.6
    if c.isupper(): return 0.72
    if c.islower(): return 0.55
    return 0.65


def em(s): return sum(cw(c) for c in str(s))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())


def fit(where, s, fs, maxw, optional=False):
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    w = em(s) * fs
    if w > maxw: ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw}；中文最多約 {int(maxw / fs)} 字）')
    return str(s)


def build(sb):
    ERR.clear()
    pp, hd, bk, p2 = sb.get('paper') or {}, sb.get('head') or {}, sb.get('back') or {}, sb.get('page2') or {}
    # ── 欄位檢查（上限＝版面寬度；報紙單位 2400×3400） ──
    fit('paper.name 報名', pp.get('name'), 300, 1280)
    fit('paper.en 英文報名', pp.get('en'), 64, 600)
    fit('paper.edition 報眉中間', pp.get('edition'), 64, 1000)
    fit('paper.extra 印章字', pp.get('extra', '號外'), 176, 380)
    fit('paper.sub 英文副標', pp.get('sub'), 64, 2200, True)
    fit('paper.earA 左上框大字', pp.get('earA'), 100, 400)
    fit('paper.earB 左上框小字', pp.get('earB'), 70, 400)
    fit('head.kicker 頭條小標', hd.get('kicker'), 80, 1400)
    lines = hd.get('lines') or []
    if not 1 <= len(lines) <= 2: ERR.append('head.lines 要 1～2 行')
    for i, ln in enumerate(lines[:2]):
        if em(ln) > 6.2: ERR.append(f'head.lines 第 {i + 1} 行「{ln}」太長（中文最多約 6 字；數字算 0.6 字）')
    fit('head.deck 副標（打字）', hd.get('deck'), 92, 1400, True)
    secs = [k for k in ('picto', 'pie', 'checklist', 'ad') if sb.get(k)]
    if not secs: ERR.append('picto／pie／checklist／ad 至少要一個')
    if 'picto' in secs:
        s = sb['picto']
        fit('picto.tag', s.get('tag', '數據'), 66, 170); fit('picto.title', s.get('title'), 84, 780)
        fit('picto.label', s.get('label'), 70, 1100); fit('picto.value', s.get('value'), 210, 440)
        fit('picto.under', s.get('under'), 64, 430, True)
        if not 0 <= int(s.get('filled', 0)) <= 10: ERR.append('picto.filled 要 0～10（10 個小人塗紅幾個）')
    if 'pie' in secs:
        s = sb['pie']
        fit('pie.title', s.get('title'), 70, 900)
        for i, ln in enumerate((s.get('lines') or [])[:2]): fit(f'pie.lines[{i}]', ln, 72, 420)
        fit('pie.big', s.get('big'), 124, 420)
        if not 0 < float(s.get('fraction', 0)) <= 1: ERR.append('pie.fraction 要 0～1（圓餅紅色占多少）')
    if 'checklist' in secs:
        s = sb['checklist']
        fit('checklist.tag', s.get('tag'), 66, 1080); fit('checklist.title', s.get('title'), 100, 1120)
        items = s.get('items') or []
        if not 2 <= len(items) <= 4: ERR.append('checklist.items 要 2～4 項')
        for i, it in enumerate(items): fit(f'checklist.items[{i}]', it, 92, 820)
    if 'ad' in secs:
        s = sb['ad']
        fit('ad.tag', s.get('tag', '分類廣告'), 66, 960); fit('ad.mark', s.get('mark'), 120, 130)
        for i, ln in enumerate((s.get('lines') or [])[:2]): fit(f'ad.lines[{i}]', ln, 72, 690)
        if not str(s.get('number', '')).isdigit() or len(str(s.get('number'))) > 4: ERR.append('ad.number 要 1～4 位數字（會滾動）')
        fit('ad.unit', s.get('unit'), 92, 280)
    fit('page2.strip 第二版報眉', p2.get('strip'), 64, 1000)
    fit('page2.kicker', p2.get('kicker'), 80, 1400)
    words = p2.get('words') or []
    if len(words) != 3: ERR.append('page2.words 要剛好 3 個（三張照片的標題）')
    if sum(em(w) for w in words) * 250 + 2 * 180 > 2200: ERR.append('page2.words 三個合計太長（合計中文最多約 7 字）')
    for i, w in enumerate(words): fit(f'page2.words[{i}]', w, 130, 700)
    fit('page2.deck', p2.get('deck'), 92, 960)
    fit('page2.line 第二版底框', p2.get('line'), 68, 2150)
    fit('back.strip', bk.get('strip'), 72, 1000); fit('back.en', bk.get('en'), 64, 1200, True)
    fit('back.name 背面大名', bk.get('name'), 400, 2200)
    fit('back.slogan', bk.get('slogan'), 130, 2200); fit('back.web', bk.get('web'), 110, 2200, True)
    fit('back.full', bk.get('full'), 80, 2200, True)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    pace = float(sb.get('pace', 5))
    hold = lambda *ss: max(0, math.ceil(nchars(*ss) / pace) - 2) * BEAT // 2   # 每 pace 字半拍（大字報讀得快；前兩個半拍算在動作時間裡）
    q = lambda x: int(round(x / 9) * 9)                                          # 對齊八分音符
    M, L = {}, {}
    M['cut'] = 45; M['land'] = 81; M['stamp'] = 105; M['camHead'] = 123
    head = ''.join(lines)
    M['typeHead'] = M['camHead'] + 30
    L['typeHead'] = [M['typeHead'] + 5 * i for i in range(len(head))]
    t = L['typeHead'][-1] + 10
    deck = hd.get('deck') or ''
    M['camDeck'] = t
    M['typeDeck'] = t + 18
    L['typeDeck'] = [M['typeDeck'] + 3 * i for i in range(len(deck))]
    t = q((L['typeDeck'][-1] if deck else M['typeDeck']) + 12 + hold(head, deck, hd.get('kicker')))
    if 'picto' in secs:
        s = sb['picto']; M['camChart'] = t; M['picto'] = t + 33
        n = int(s.get('filled', 0)); L['picto'] = [M['picto'] + 4 * i for i in range(max(1, n))]
        t = q(L['picto'][-1] + 18 + hold(s.get('title'), s.get('label'), s.get('value'), s.get('under')))
    if 'pie' in secs:
        s = sb['pie']; M['camPie'] = t; M['pie'] = t + 30; M['note'] = M['pie'] + 36; M['ring'] = M['note'] + 26
        t = q(M['ring'] + 24 + hold(s.get('title'), *(s.get('lines') or []), s.get('big')))
    if 'checklist' in secs:
        s = sb['checklist']; M['camCol'] = t; M['check'] = t + 33
        L['checks'] = [M['check'] + 18 * i for i in range(len(s['items']))]
        t = q(L['checks'][-1] + 18 + hold(s.get('tag'), s.get('title'), *s['items']))
    if 'ad' in secs:
        s = sb['ad']; M['camAds'] = t; M['roll10'] = t + 30; M['ring10'] = M['roll10'] + 42
        t = q(M['ring10'] + 24 + hold(*(s.get('lines') or []), s.get('number'), s.get('unit')))
    M['camOut'] = t; M['flip'] = t + 18; M['p2'] = M['flip'] + 39; M['photo'] = M['p2'] + 24
    L['photos'] = [M['photo'] + 21 * i for i in range(3)]
    M['camOut2'] = q(L['photos'][-1] + 18 + hold(p2.get('kicker'), p2.get('deck'), *words))
    M['fold'] = M['camOut2'] + 24; M['crease'] = M['fold'] + 27; M['toss'] = M['crease'] + 12; M['stack'] = M['toss'] + 33
    M['bell'] = M['stack'] + 18; M['underline'] = M['stack'] + 30; M['bell2'] = M['underline'] + 36
    frames = M['underline'] + 45 + hold(bk.get('slogan'), bk.get('name'))
    L['pressA'] = list(range(0, M['land'], BEAT))
    pb, x = [], M['p2'] / FPS
    span = (M['stack'] - M['p2']) / FPS
    while x < M['stack'] / FPS - 0.02:
        pb.append(round(x * FPS, 2)); u = (x - M['p2'] / FPS) / span; x += 0.42 * (1 - u) ** 1.6 + 0.07
    L['pressB'] = pb

    texts = []
    def walk(v):
        if isinstance(v, str): texts.append(v)
        elif isinstance(v, dict): [walk(x) for x in v.values()]
        elif isinstance(v, list): [walk(x) for x in v]
        elif isinstance(v, (int, float)): texts.append(str(v))
    walk({k: v for k, v in sb.items() if k not in ('name', '_source')})
    mid = lambda a, b: int((a + b) / 2)
    stills = [70, M['stamp'] + 14, L['typeHead'][-1] + 8]
    for k, a, b in [('picto', 'camChart', None), ('pie', 'camPie', None), ('checklist', 'camCol', None), ('ad', 'camAds', None)]:
        if k in secs:
            nxt = min([v for kk, v in M.items() if v > M[a] and kk in ('camPie', 'camCol', 'camAds', 'camOut')])
            stills.append(nxt - 6)
    stills += [M['camOut2'] - 6, M['fold'] + 18, M['stack'] + 50, frames - 4]
    return {'template': '廣B', 'name': sb.get('name', '日報號外'), 'fps': FPS, 'bpm': BPM, 'beat': BEAT, 'frames': frames,
            'marks': M, **L, 'has': {k: (k in secs) for k in ('picto', 'pie', 'checklist', 'ad')}, 'd': sb,
            'stills': stills, 'poster': L['typeHead'][-1] + 30,
            'overview': [M['stamp'] + 20, M['camOut2'] - 6, M['stack'] + 50],
            'allText': ''.join(texts) + '0123456789%×・　PINGRONGDAILY'}


if __name__ == '__main__':
    import json, sys
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print({k: v for k, v in tl['marks'].items()})
