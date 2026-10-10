"""範本廣G「證書的旅程」時間表：storyboard.json → 時間表（每一頁的字、蠟筆寫字格、翻頁、門、蓋章、貼上牆、鏡頭事件、音效）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（水彩繪本，一個跨頁一個場景，翻頁轉場）：
  開場：房間角落，一張會害羞的紙片主角（上面寫 hero，例如「證書」「入場券」「會員卡」）睡著 → 蠟筆寫出標題 → 醒來、飄起、飛向窗戶
  → 翻頁（書頁先動，紙片晚一拍被風帶過去）→ 每一頁一道門（1～4 道）：門開、紙片穿過、印章從天而降「咚」蓋一個章，
     章縮成小圓章收進紙片底下的格子；章旁的大字（或等式）用蠟筆寫出 → 最後一道門是高潮（章更大、紙花）
  → 最後一頁塗鴉牆：紙片被膠帶貼在正中央，名稱一格一字的塗鴉卡飛上來（字多改兩排或一張橫幅）、對話泡泡、標語、網址。
90 BPM、一拍 20 格、一小節 80 格；蓋章、翻頁落在拍點上；寫字時間依字數。
"""
import math

FPS, BPM, BEAT, BAR = 30, 90, 20, 80
TURN, SWOOP = 44, 8                 # 翻頁長度；紙片晚幾格才被風帶走
ERR = []
MAX_GATES = 4


def cw(c): return 1.0 if ord(c) >= 0x2E80 else (0.3 if c == ' ' else 0.6)
def em(s): return sum(cw(c) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def qb(f): return int(math.ceil(f / BEAT) * BEAT)
def clamp(v, a, b): return max(a, min(b, v))


def fit(where, s, fs, maxw, optional=True):
    """固定字級的欄位：超過寬度就記錯誤（中文 1 字＝1 字級寬、英數 0.6、空白 0.3）"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    s = str(s)
    w = em(s) * fs
    if w > maxw:
        ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw} 像素；中文最多約 {int(maxw / fs)} 字、英數約 {int(maxw / fs / 0.6)} 個）')
    return s


def auto(where, s, fs, lo, maxw, optional=True):
    """字級可在 lo～fs 之間自動縮的欄位（印章、紙片、泡泡、標語）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    size = min(fs, maxw / max(0.1, em(s)))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / lo)} 字、英數約 {int(maxw / lo / 0.6)} 個）')
        size = lo
    return s, int(size)


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))
    hold = lambda *s: max(0, math.ceil(nchars(*s) / pace) - 3) * BEAT // 2
    W, ROWS = {}, {}

    # ───────────── 欄位檢查（上限＝跨頁 1680×900 上各區塊的寬度）─────────────
    hero, hsize = auto('hero 紙片主角上的字', sb.get('hero'), 34, 26, 210, False)
    op = sb.get('open') or {}
    kicker = fit('open.kicker 開場左上小字', op.get('kicker'), 50, 900)
    title = fit('open.title 開場大標', op.get('title'), 92, 900, False)
    side = op.get('side') or []
    if isinstance(side, str): side = [side]
    if len(side) > 2: ERR.append(f'open.side 開場右上小字最多 2 行（現在 {len(side)} 行）')
    side = [fit(f'open.side[{i}] 開場右上第 {i + 1} 行', x, (56, 60)[i], (750, 630)[i]) for i, x in enumerate(side[:2])]

    gates_in = sb.get('gates') or []
    if not 1 <= len(gates_in) <= MAX_GATES:
        ERR.append(f'gates 門要 1～{MAX_GATES} 道（現在 {len(gates_in)} 道）')
    gates = []
    names = '一二三四'
    for i, g in enumerate(gates_in[:MAX_GATES]):
        last = i == len(gates_in[:MAX_GATES]) - 1
        k = f'gates[{i}]'
        seal = g.get('seal') or []
        if isinstance(seal, str): seal = [seal]
        if not 1 <= len(seal) <= 2: ERR.append(f'{k}.seal 印章上的字要 1～2 行（現在 {len(seal)} 行）')
        rect = g.get('shape', 'rect' if last else 'round') == 'rect'
        sz = []
        for j, x in enumerate(seal[:2]):
            _, s = auto(f'{k}.seal[{j}] 印章第 {j + 1} 行', x, 48 if rect else 38, 30 if rect else 26, 190 if rect else 150, False)
            sz.append(s)
        ssize = min(sz) if sz else 38
        mini = str(g.get('mini') or next((c for c in ''.join(map(str, seal)) if not c.isspace()), '章'))
        if em(mini) > 1.25: ERR.append(f'{k}.mini 小圓章「{mini}」只能 1 個中文字或 2 個英數')
        say = fit(f'{k}.say 進門前左上的一句話', g.get('say'), 62, 760)
        eq = g.get('eq') or []
        if isinstance(eq, str): eq = [eq]
        sign = g.get('sign')
        sign, signsize = auto(f'{k}.sign 左邊小屋的招牌', sign, 48, 36, 560)
        big = g.get('big') or ''
        if eq:
            if say: ERR.append(f'{k}：say 和 eq 只能二選一（兩個都在頁面上方）')
            if sign: ERR.append(f'{k}：有 sign（小屋）時不能用 eq（紙片停在小屋上方會擋到等式）')
            if len(eq) > 3: ERR.append(f'{k}.eq 等式最多 3 段（現在 {len(eq)} 段）')
            eq = [str(x) for x in eq[:3]]
            row = '＝'.join(eq) + ('＝' + str(big) if big else '')
            if em(row) * 64 > 1520:
                ERR.append(f'{k}.eq＋big 等式「{row}」太長（約 {em(row) * 64:.0f}＞1520 像素；整條中文最多約 23 字）')
            big = str(big)
            label = ''
        else:
            if say and sign: ERR.append(f'{k}：有 sign（小屋）時不能用 say（紙片停在左上會擋到字）')
            big = fit(f'{k}.big 蓋章後寫出的大字', big, 76, 720)
            label = fit(f'{k}.label 大字上方小字', g.get('label', f'第{names[i]}關' if big else ''), 46, 700)
        gates.append({'seal': [str(x) for x in seal[:2]], 'ssize': ssize, 'rect': rect, 'mini': mini, 'say': say, 'eq': eq,
                      'sign': sign, 'signsize': signsize, 'big': big, 'label': label, 'climax': last})

    wl = sb.get('wall') or {}
    wname = str(wl.get('name') or '')
    if not wname: ERR.append('缺欄位 wall.name 最後牆上的名稱')
    chars = [c for c in wname if not c.isspace()]
    mode = 'row' if len(chars) <= 6 else ('rows' if len(chars) <= 10 else 'banner')
    if mode == 'banner':
        _, bsize = auto('wall.name 名稱（超過 10 字改成一張橫幅）', wname, 96, 56, 900)
    else:
        bsize = 96
    bubble, busize = auto('wall.bubble 紙片的對話泡泡', wl.get('bubble'), 54, 36, 300)
    slogan, ssz = auto('wall.slogan 標語', wl.get('slogan'), 70, 52, 1400)
    url = fit('wall.url 網址或電話', wl.get('url'), 44 if mode == 'row' else 38, 1200 if mode == 'row' else 900)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───────────── 牆上塗鴉卡排版（跨頁座標）─────────────
    cards = []
    if mode == 'row':
        n = len(chars); sp = min(230, 920 / n); sc = min(1.0, sp / 230)
        for i, c in enumerate(chars):
            cards.append({'ch': c, 'x': round(840 + (i - (n - 1) / 2) * sp), 'y': 600, 's': round(sc, 3)})
    elif mode == 'rows':
        a = math.ceil(len(chars) / 2); rows = [chars[:a], chars[a:]]
        sp = min(200, 900 / a); sc = min(0.8, sp / 230)
        for r, rc in enumerate(rows):
            for i, c in enumerate(rc):
                cards.append({'ch': c, 'x': round(840 + (i - (len(rc) - 1) / 2) * sp), 'y': (570, 748)[r], 's': round(sc, 3)})

    # ───────────── 排時間 ─────────────
    def write(id, at, per, lo, hi, text):
        d = clamp(int(per * em(text) + 8), lo, hi)       # 寫字長度依字寬（英數算 0.6 字）
        W[id] = [at, at + d]
        return at + d

    # 開場：房間角落（標題寫完就醒來；右上小字在它醒來、飄起來時寫出，紙片抬頭看）
    t = 10
    if kicker: t = write('kicker', t, 3.5, 16, 36, kicker) + 2
    t = write('title', t, 5, 24, 52, title)
    wake = max(70, t + 8)
    t = wake + 6
    for i, s in enumerate(side):
        if s: t = write(f'side{i}', t, 3.5, 16, 40, s) + 2
    flt = [wake + 16, wake + 42]
    towin = [max(wake + 42, t - 10), max(wake + 42, t - 10) + 22]
    turns = [qb(max(towin[1], t + hold(kicker, title, *side)))]

    # 每一道門
    G = []
    for i, g in enumerate(gates):
        T = turns[-1]
        t = T + 28                               # 書頁翻到一半就開始寫（新頁面先出現在右半邊）
        if g['say']: t = write(f'g{i}say', t, 2.6, 16, 36, g['say'])
        for j, x in enumerate(g['eq']): t = write(f'g{i}eq{j}', t, 2.2, 12, 30, ('＝' if j else '') + x) + 2
        if g['sign']: t = write(f'g{i}sign', t, 2.5, 18, 40, g['sign'])
        op_ = max(T + 50, t - 16)                # 門打開（紙片 T+54 到門前停好）
        fly = op_ + 6
        ps = op_ + 30                            # 穿過門
        S = qb(ps + 36)                          # 蓋章（拍點上；紙片 ps+26 到印章下等著、擔心臉）
        if g['climax'] and len(gates) > 1: S = qb(ps + 52)   # 高潮多等一拍：定音鼓滾奏、反向鈸
        e = S + 16
        if g['big']:
            key = f'g{i}eqz' if g['eq'] else f'g{i}big'
            e = write(key, S + 16, 2.6, 16, 36, ('＝' if g['eq'] else '') + g['big'])
        nxt = qb(max(S + 58, e + 4 + hold(g['say'], g['big'], g['sign'], *g['eq'])))
        G.append({'open': op_, 'fly': fly, 'pass': ps, 'stamp': S})
        turns.append(nxt)

    # 最後一頁：塗鴉牆
    T = turns[-1]
    pin = T + 60
    if mode == 'banner':
        draws = [pin + 18]
    else:
        step = 12 if len(cards) <= 4 else 9
        draws = [pin + 18 + step * i for i in range(len(cards))]
    t = draws[-1] + 8
    shy = t
    if bubble: write('bubble', t, 3, 14, 28, bubble)
    t2 = write('slogan', t + 4, 2.4, 20, 50, slogan) + 4 if slogan else t + 16
    if url: t2 = write('url', t2, 1.6, 16, 30, url)
    final = qb(max(t2 + 2, (W['bubble'][1] if bubble else t) + 6))
    frames = final + 44 + min(16, hold(slogan, url, bubble, wname))
    claps = [pin + 10, shy + 4, final + 6]

    blinks = sorted({wake + 40} | {g['open'] - 16 for g in G} | {pin + 40, final + 30} | ({frames - 20} if frames - final > 60 else set()))

    # ───────────── 抽格 ─────────────
    stills = [W['title'][1] - 6, wake + 30, towin[1]]
    for g in G: stills += [g['open'] + 14, g['stamp'] + 4, g['stamp'] + 34]
    stills += [turns[0] + 20, pin + 6, draws[-1] + 8, final, frames - 4]
    stills = sorted(set(min(frames - 1, max(0, s)) for s in stills))
    while len(stills) > 16: stills.pop(len(stills) // 2)

    texts = [hero, kicker, title, *side, wname, bubble, slogan, url]
    for g in gates: texts += [*g['seal'], g['mini'], g['say'], *g['eq'], g['big'], g['label'], g['sign']]
    return {'template': '廣G', 'name': sb.get('name', '證書的旅程'), 'fps': FPS, 'bpm': BPM, 'beatFrames': BEAT, 'barFrames': BAR,
            'frames': frames, 'turns': turns, 'turnLen': TURN, 'swoopDelay': SWOOP,
            'stamps': [g['stamp'] for g in G], 'gateOpen': [g['open'] for g in G], 'gatePass': [g['pass'] for g in G],
            'fly': [g['fly'] for g in G], 'wake': wake, 'float': flt, 'toWindow': towin, 'pin': pin, 'draws': draws,
            'claps': claps, 'shy': shy, 'final': final, 'blinks': blinks, 'writes': W,
            'd': {'hero': hero, 'heroSize': hsize, 'kicker': kicker, 'title': title, 'side': side, 'gates': gates,
                  'wall': {'name': wname, 'mode': mode, 'cards': cards, 'bannerSize': bsize, 'bubble': bubble, 'bubbleSize': busize,
                           'slogan': slogan, 'sloganSize': ssz, 'url': url, 'urlSize': 44 if mode == 'row' else 38}},
            'stills': stills, 'poster': G[-1]['stamp'] + 30,
            'overview': [turns[0] - 30, G[len(G) // 2]['stamp'] + 30 if len(G) > 1 else G[0]['stamp'] + 30, final + 20],
            'allText': ''.join(texts) + '＝0123456789z'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print('  翻頁', tl['turns'])
    print('  門開／穿過／蓋章', tl['gateOpen'], tl['gatePass'], tl['stamps'])
    print('  醒來', tl['wake'], '貼上牆', tl['pin'], '塗鴉卡', tl['draws'], '收尾', tl['final'])
    print('  牆上名稱', tl['d']['wall']['mode'], len(tl['d']['wall']['cards']), '格')
    print('  寫字', tl['writes'])
