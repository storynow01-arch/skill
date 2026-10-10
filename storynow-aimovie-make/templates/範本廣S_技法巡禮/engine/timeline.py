"""範本廣S「技法巡禮」時間表：storyboard.json → 時間表（每一章第幾格開始、章內每個動作落在第幾拍、換章轉場、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（動態設計作品集 showreel 的「技法巡禮」：深藍墨底＋電光藍＋螢光珊瑚＋暖白，128 BPM tech house，一拍 14.0625 格；
每一章炫一種動態設計手法、右上角標出技法名，章與章之間的轉場各不相同）：
  chapters 依序列出要用的章（3～8 章；第一章必須是 open、最後一章必須是 logo，中間從 6 種技法任選、順序可換、可省略）：
    open    KINETIC TYPE      中央細線畫開 → 三個幾何形狀依拍點彈出、螺旋收攏、每拍硬切大字 → 爆開成名稱大字（上下切片位移）＋英文縮寫描邊飛入再填色
    type    TYPE DECONSTRUCT  兩行字逐字砸入 → 合併成一行、中間一顆珊瑚圓點 → 描邊／填色波浪、切片、翻轉、重點字以外退暗 → 炸散，圓點放大
    data    DATA VISUALIZATION 2～4 個數據面板橫向排列，每個面板甩鏡到下一個（環形圖、堆疊柱、吃角子老虎數字、粒子聚成點陣數字）
    grid    SWISS GRID SYSTEM 12 欄格線畫出 → 3～9 張卡片依拍點滑入 → 波浪翻面 → 每拍重排版面（輪流放大一張）→ 聚焦一張
    iso     2.5D ISOMETRIC    2D 平面圖 → 整個世界轉 45° 壓扁長出高度變等角場景（平面畫法，不是真 3D）→ 2～4 個標註引線
    lines   LINES & PATHS     晶片描邊 → 走線依拍點點亮、2～6 個標籤沿線抵達 → 通電、脈衝沿線跑 → 描線畫出英文字標
    morph   SHAPE MORPH       右側色塊每段由下往上換色，圖示依拍點一個變一個；左側每段換一組字
    logo    LOGO LOCKUP       全片元素螺旋收斂、同心環收縮、每拍硬切一個詞 → 重擊出 logo lockup 定格
  換章：每個換章點一種招牌轉場（斜向色條 bars／珊瑚圓點圓形擦除 dot／方格磚翻蓋 tiles／鏡頭穿越卡片 through／液態波浪 wave／
  橫向切片位移 slices／圖形放大穿越 zoom），依相鄰章自動輪流（type 之後用 dot、grid 之後用 through、進 logo 用 zoom），每章可用 transition 指定。
  畫面最下方 180 px 只有靜止的四角框線。
章數與字數決定片長（每章長度進位到整小節＝4 拍＝1.875 秒）。
"""
import math
import re

FPS, BPM = 30, 128
B = FPS * 60 / BPM          # 一拍 14.0625 格
BAR = 4 * B
W, H = 1920, 1080
ERR = []
TYPES = ['open', 'type', 'data', 'grid', 'iso', 'lines', 'morph', 'logo']
TECH = {'open': 'KINETIC TYPE', 'type': 'TYPE DECONSTRUCT', 'data': 'DATA VISUALIZATION', 'grid': 'SWISS GRID SYSTEM',
        'iso': '2.5D ISOMETRIC', 'lines': 'LINES & PATHS', 'morph': 'SHAPE MORPH', 'logo': 'LOGO LOCKUP'}
TYPE_ZH = {'open': '開場（字體動態）', 'type': '字體拆解', 'data': '數據視覺化', 'grid': '瑞士格線', 'iso': '2.5D 等角',
           'lines': '線條與路徑', 'morph': '形狀變形', 'logo': 'LOGO 定格'}
# 換章轉場：值＝[從換章點前幾格開始, 換章點後幾格結束)（原作各轉場的長度）
TRANS = {'bars': (-12, 11), 'dot': (-14, 14), 'tiles': (-13, 15), 'through': (-10, 16), 'wave': (-16, 12), 'slices': (-9, 12),
         'zoom': (-12, 15)}
TRANS_ROT = ['bars', 'slices', 'wave', 'tiles', 'dot']       # 沒有指定、也沒有專屬轉場時依序輪流（不和上一個重複）
# 範本自己的介面字（動態設計作品集的通用字樣；storyboard 的 labels 可覆寫，設成 "" 就不顯示）
CHROME = {'reel': 'MOTION REEL', 'words': 'MOTION DESIGN SHOW REEL', 'marquee': 'SHOWREEL', 'typeSub': 'TYPE  /  DECONSTRUCT  /  REBUILD',
          'grid': 'GRID SYSTEM', 'iso': '從 2D 到', 'circuit': 'CIRCUIT / PATH', 'morph': 'SHAPE / MORPH'}
ICONS = ['plane', 'globe', 'mountain', 'cup', 'badge', 'house', 'heart', 'bag', 'trophy']
NUM_RE = r'[0-9][0-9.,:/%+\-]*'
DOTCH = set('0123456789.,:/%+-')


def cw(c, latin=0.6):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss):   # 讀字量：中文 1、英數 0.5
    return sum((1.0 if ord(c) >= 0x2E80 else 0.5) for s in ss for c in str(s or '') if not c.isspace())
def up4(n): return int(math.ceil(n / 4 - 1e-6)) * 4


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6, ls=0.0, lines=1):
    """字級可在 lo～fs 之間自動縮（ls＝字距 em）：縮到 lo 還放不下就記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    w = em(s, latin) + ls * len(s)
    cap = maxw * (lines if lines == 1 else lines * 0.88)
    size = min(fs, cap / max(0.1, w))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(cap / (lo * (1 + ls)))} 字、英數約 {int(cap / (lo * (latin + ls)))} 個）')
        size = lo
    return s, int(size)


def number(where, s, maxn, need=True):
    s = str(s if s is not None else '').strip()
    if not s:
        if need: ERR.append(f'缺欄位 {where}（數字，只用文本有的數字）')
        return ''
    if not re.fullmatch(NUM_RE, s): ERR.append(f'{where}「{s}」要是數字（可含 . , : / % + -；只用文本有的數字）')
    if len(s) > maxn: ERR.append(f'{where}「{s}」最多 {maxn} 個字元')
    return s


def lst(x):
    if x is None: return []
    if isinstance(x, (str, dict)): return [x]
    return list(x)


def need(where, items, lo, hi, what):
    if not lo <= len(items) <= hi: ERR.append(f'{where} {what}要 {lo}～{hi} 個（現在 {len(items)} 個）')
    return items[:hi]


def warp_inv(pts, ob):
    """原作拍點 → 實際拍點（pts＝[[原作拍, 實際拍], …]，分段線性；超出最後一點 1:1）"""
    for (o0, a0), (o1, a1) in zip(pts, pts[1:]):
        if ob <= o1: return a0 + (ob - o0) * (a1 - a0) / (o1 - o0)
    o, a = pts[-1]
    return a + ob - o


# ───────────────────────── 每一種章 ─────────────────────────
# 每個 builder 回傳 (d, 拍數, 音效 {種類: [拍]}, 抽格拍點, 畫面字, 錨點 [x, y])
def ch_open(c, w, rb, lab, ctx):
    title = str(c.get('title') or '').strip()
    if not title: ERR.append(f'缺欄位 {w}.title 名稱大字')
    if len(title) > 8: ERR.append(f'{w}.title 名稱大字「{title}」最多 8 個字（中文 1～6 字最好看）')
    tS = min(300, 1560 / max(0.5, em(title, 0.62)))
    if tS < 120: ERR.append(f'{w}.title 名稱大字「{title}」太寬（中文最多約 8 字、英數約 20 個）')
    tS = max(120, tS)
    xs, x = [], 960 - em(title, 0.62) * tS / 2
    for ch in title:
        wd = cw(ch, 0.62) * tS
        xs.append([round(x + wd / 2, 1), round(wd, 1)]); x += wd
    mark = str(c.get('mark') or '').strip()
    if len(mark) > 12: ERR.append(f'{w}.mark 英文縮寫「{mark}」最多 12 個字元')
    mS = min(168, 1500 / max(1, len(mark) * 0.9)) if mark else 168
    if mark and mS < 80: ERR.append(f'{w}.mark 英文縮寫「{mark}」太長（最多約 12 個字元）')
    kicker, kS = fit(f'{w}.kicker 上方小字', c.get('kicker'), 26, 18, 1500, latin=0.62, ls=0.7)
    left, lS = fit(f'{w}.tag 細線左端小標', c.get('tag'), 18, 14, 560, latin=0.62, ls=0.33)
    right, rS = fit('labels.reel 細線右端小標', lab['reel'], 18, 14, 560, latin=0.62, ls=0.33)
    words = [x for x in str(lab['words'] or '').split() if x][:4]
    for j, x in enumerate(words):
        if em(x, 0.8) * 280 > 1800: ERR.append(f'labels.words 第 {j + 1} 個詞「{x}」太長（約 8 個字母）')
    Hh = max(6, math.ceil(rb(title, mark) * 0.7 + rb(kicker, left) * 0.4 + 1))
    L = up4(6 + Hh)
    Hh = L - 6
    warp = [[0, 0], [4, 2], [8, 4], [14, 4 + Hh], [16, 6 + Hh]]
    a = lambda ob: warp_inv(warp, ob)
    ev = {'pop': [a(1), a(2), a(3)], 'cut': [a(4.0), a(5), a(6), a(7)] if words else [], 'burst': [a(8)],
          'whoosh': [a(9)] if mark else [], 'blip': [a(12)] if mark else []}
    d = {'title': list(title), 'titleX': xs, 'titleSize': int(tS), 'mark': list(mark), 'markSize': int(mS), 'kicker': kicker,
         'kickerSize': kS, 'tag': left, 'tagSize': lS, 'reel': right, 'words': words, 'warp': warp}
    return d, L, ev, [a(2.5), a(6), a(10.5), a(13), L - 0.6], title + mark + kicker + left + right + ''.join(words), [960, 500]


def ch_type(c, w, rb, lab, ctx):
    r1 = str(c.get('line1') or '').strip()
    r2 = str(c.get('line2') or '').strip()
    if not r1: ERR.append(f'缺欄位 {w}.line1 第一行')
    if not r2: ERR.append(f'缺欄位 {w}.line2 第二行（兩行合併成一行，中間是圓點）')
    for nm, r in (('line1 第一行', r1), ('line2 第二行', r2)):
        if len(r) > 6: ERR.append(f'{w}.{nm}「{r}」最多 6 個字（逐字砸入，中文 2～5 字最好看）')
    n1, n2 = len(r1), len(r2)
    cell = min(250, 1500 / max(1, n1, n2))
    N = n1 + n2 + (1 if n2 else 0)
    sp1 = min(190, 1640 / max(1, N))
    hi = str(c.get('hi') or '')
    HI = [i for i, ch in enumerate(r1 + r2) if ch in hi and not ch.isspace()]
    sub, sS = fit('labels.typeSub 小標', lab['typeSub'], 22, 16, 1400, latin=0.62, ls=0.64)
    R2 = math.ceil(n1 * 0.5)
    M = R2 + math.ceil(n2 * 0.5) if n2 else R2
    Hh = max(6, math.ceil(rb(r1, r2) + 3))
    L = up4(M + Hh + 2)
    Hh = L - M - 2
    dotX = 960 + (n1 - (N - 1) / 2) * sp1 if n2 else 960 + (n1 - 1) / 2 * sp1 + sp1 * 0.75
    beats = {'r2': R2, 'm': M, 'fill1': M + 1, 'slice': M + 2, 'flip': M + 3, 'dim': M + 4, 'fill2': M + Hh - 1, 'boom': M + Hh}
    ev = {'thump': [i * 0.5 for i in range(n1)] + [R2 + i * 0.5 for i in range(n2)], 'whoosh': [M, M + 3], 'blip': [M + 2],
          'burst': [M + Hh]}
    d = {'r1': list(r1), 'r2': list(r2), 'hi': HI, 'cell': round(cell, 1), 'sp': round(sp1, 1), 'n': N, 'sub': sub, 'subSize': sS,
         'dotX': round(dotX, 1), 'b': beats, 'marquee': f'{r1}・{r2}' if r2 else r1}
    return d, L, ev, [M - 0.5, M + 2.5, M + 4.5, L - 0.7], r1 + r2 + sub + '・', [round(dotX), 480]


PANEL_KINDS = ['ring', 'bars', 'slot', 'dots']


def panel(x, w, j, rb):
    kind = str(x.get('kind') or PANEL_KINDS[j % 4])
    if kind not in PANEL_KINDS: ERR.append(f'{w}.kind 只能是 {"、".join(PANEL_KINDS)}（現在「{kind}」）'); kind = 'ring'
    p = {'kind': kind}
    txt = ''
    if kind == 'ring':
        n = number(f'{w}.n 大數字', x.get('n'), 7)
        unit = str(x.get('unit') or '')
        if len(unit) > 3: ERR.append(f'{w}.unit 單位「{unit}」最多 3 字')
        big = min(250, (820 - (em(unit) * 0.6 * 250 if unit else 0)) / max(0.5, em(n, 0.7)))
        if big < 120: ERR.append(f'{w} 大數字＋單位「{n}{unit}」太寬（約 5 位數＋1 字單位）')
        pct = 1.0
        try:
            if unit == '%' and 0 <= float(n) <= 100: pct = float(n) / 100
        except ValueError: pass
        tag, tgS = fit(f'{w}.tag 小標框', x.get('tag'), 28, 22, 760, ls=0.14)
        head, hS = fit(f'{w}.head 數字下方一行', x.get('head'), 60, 36, 820)
        center, cS = fit(f'{w}.center 環中央大字', x.get('center'), 60, 34, 380)
        csub, csS = fit(f'{w}.centerSub 環中央小字', x.get('centerSub'), 32, 22, 380)
        n2 = number(f'{w}.n2 第二個數字', x.get('n2'), 6, need=False)
        u2 = str(x.get('unit2') or '')
        pre2, p2S = fit(f'{w}.pre2 第二個數字前的字', x.get('pre2'), 44, 30, 820 - (em(n2, 0.7) + em(u2, 0.7)) * 120 - 20)
        pct2 = None
        try:
            if n2 and u2 == '%' and 0 <= float(n2) <= 100: pct2 = float(n2) / 100
        except ValueError: pass
        note, nS = fit(f'{w}.note 最下方說明', x.get('note'), 38, 26, 820)
        p.update(n=n, unit=unit, big=int(max(120, big)), pct=pct, tag=tag, tagSize=tgS, head=head, headSize=hS, center=center,
                 centerSize=cS, centerSub=csub, centerSubSize=csS, n2=n2, unit2=u2, pre2=pre2, pre2Size=p2S, pct2=pct2, note=note, noteSize=nS)
        txt = n + unit + tag + head + center + csub + n2 + u2 + pre2 + note
    elif kind == 'bars':
        n = number(f'{w}.n 大數字', x.get('n'), 6)
        unit = str(x.get('unit') or '')
        if len(unit) > 2: ERR.append(f'{w}.unit 單位「{unit}」最多 2 字')
        uw = em(unit) * 170 * 0.52 + 16 if unit else 0
        big = min(330, (860 - uw) / max(0.5, em(n, 0.72)))
        if big < 130: ERR.append(f'{w} 大數字＋單位「{n}{unit}」太寬（約 4 位數＋2 字單位）')
        us = min(170, big * 0.52)
        tag, tgS = fit(f'{w}.tag 小標框', x.get('tag'), 28, 22, 760, ls=0.14)
        head, hS = fit(f'{w}.head 數字上方一行', x.get('head'), 80, 44, 860)
        note, nS = fit(f'{w}.note 數字下方說明', x.get('note'), 38, 26, 860)
        try:
            v = float(n.replace(',', ''))
            slabs = int(v) if v == int(v) and 6 <= v <= 30 else 24
        except ValueError:
            slabs = 24
        p.update(n=n, unit=unit, big=int(max(130, big)), unitSize=int(us), tag=tag, tagSize=tgS, head=head, headSize=hS, note=note,
                 noteSize=nS, slabs=slabs)
        txt = n + unit + tag + head + note
    elif kind == 'slot':
        n = number(f'{w}.n 吃角子老虎數字', x.get('n'), 6)
        unit = str(x.get('unit') or '')
        if len(unit) > 2: ERR.append(f'{w}.unit 單位「{unit}」最多 2 字')
        head, hS = fit(f'{w}.head 上方大字', x.get('head'), 120, 64, 1500, ls=0.1)
        hi = str(x.get('hi') or '')
        note, nS = fit(f'{w}.note 下方說明', x.get('note'), 46, 30, 1600)
        stamp = str(x.get('stamp') or '')
        if len(stamp) > 2: ERR.append(f'{w}.stamp 圓形印章「{stamp}」最多 2 字')
        nd = max(1, len(n))
        bw = min(200, (1640 - (em(unit) * 130 + 20 if unit else 0)) / nd)
        tot = nd * bw + (em(unit) * 130 * bw / 200 + 20 if unit else 0)
        x0 = 960 - tot / 2
        hw = em(head) * (1 + 0.1) * hS
        stx = min(1720, 960 + hw / 2 + 150)
        p.update(n=n, unit=unit, head=head, headSize=hS, hi=hi, note=note, noteSize=nS, stamp=stamp, bw=round(bw, 1), x0=round(x0, 1),
                 stampX=round(stx), stampSize=140 if len(stamp) < 2 else 90)
        txt = n + unit + head + note + stamp
    else:   # dots
        n = number(f'{w}.n 點陣數字', x.get('n'), 4)
        bad = [ch for ch in n if ch not in DOTCH]
        if bad: ERR.append(f'{w}.n 點陣數字「{n}」只能用 0～9 . , : / % + -')
        unit = str(x.get('unit') or '')
        u2 = str(x.get('unit2') or '')
        if len(unit) > 2: ERR.append(f'{w}.unit 單位「{unit}」最多 2 字')
        if len(u2) > 3: ERR.append(f'{w}.unit2 直排珊瑚小字「{u2}」最多 3 字')
        nd = max(1, len(n))
        dsp = min(44, 820 / (nd * 6))
        dw = nd * 6 * dsp - dsp
        ux = 250 + dw + 40
        room = 1800 - ux - (150 if u2 else 0)
        us = min(300, room / max(0.6, em(unit))) if unit else 0
        if unit and us < 120: ERR.append(f'{w} 點陣數字＋單位「{n}{unit}」太寬（約 4 位數＋1 字單位）')
        tag, tgS = fit(f'{w}.tag 小標框', x.get('tag'), 28, 22, 1400, ls=0.14)
        head, hS = fit(f'{w}.head 上方一行', x.get('head'), 60, 36, 1400)
        note, nS = fit(f'{w}.note 下方說明', x.get('note'), 42, 28, 1400)
        p.update(n=n, unit=unit, unit2=list(u2), dsp=round(dsp, 1), ux=round(ux), unitSize=int(max(120, us)) if unit else 0,
                 u2x=round(ux + em(unit) * max(120, us) + 30) if unit else round(ux), tag=tag, tagSize=tgS, head=head, headSize=hS,
                 note=note, noteSize=nS)
        txt = n + unit + u2 + tag + head + note
    return p, txt


def ch_data(c, w, rb, lab, ctx):
    PS = need(f'{w}.panels', lst(c.get('panels')), 2, 4, '數據面板')
    out, txt, at = [], '', 0
    for j, x in enumerate(PS):
        p, t = panel(x or {}, f'{w}.panels[{j}]', j, rb)
        nb = max(4, math.ceil(rb(t) * 0.75 + 1))
        p['at'] = at; p['nb'] = nb
        at += nb
        out.append(p); txt += t
        ctx['echo'] += [f"{p.get('n', '')}{p.get('unit', '')}"] if p.get('n') else []
    L = up4(at)
    if out: out[-1]['nb'] += L - at
    ev = {'whoosh': [p['at'] - 0.4 for p in out[1:]], 'tick': [], 'stamp': []}
    for p in out:
        nd = len(re.sub(r'[^0-9]', '', p.get('n', '')))
        base = p['at'] + (6 / B if p['at'] else 0)
        if p['kind'] in ('ring', 'bars'): ev['tick'] += [p['at'] + (30 + 8 * min(i, 1)) / B - (6 / B if p['at'] else 0) for i in range(min(nd, 2))]
        elif p['kind'] == 'slot':
            ev['tick'] += [p['at'] + (12 + 7 * i) / B - (6 / B if p['at'] else 0) for i in range(nd)]
            if p.get('stamp'): ev['stamp'].append(p['at'] + (3 * B - 2) / B - (6 / B if p['at'] else 0))
        else: ev['tick'] += [p['at'] + 26 / B - (6 / B if p['at'] else 0)]
        del base
    stl = [p['at'] + min(p['nb'], 4) - 0.6 for p in out]
    return {'panels': out}, L, ev, stl, txt + '0123456789', [960, 480]


def grid_rects(n):
    X0, Y0, AW, AH, G = 120, 220, 1680, 650, 18
    cols = 2 if n == 4 else 3
    rows = math.ceil(n / cols)
    cwd, rh = (AW - (cols - 1) * G) / cols, (AH - (rows - 1) * G) / rows
    L0 = [[X0 + (i % cols) * (cwd + G), Y0 + (i // cols) * (rh + G), cwd, rh] for i in range(n)]
    R = 2 if n <= 5 else 3
    c4, r4 = (AW - 3 * G) / 4, (AH - (R - 1) * G) / R
    cell = lambda c, r, sw=1, sh=1: [X0 + c * (c4 + G), Y0 + r * (r4 + G), sw * c4 + (sw - 1) * G, sh * r4 + (sh - 1) * G]

    def feat(f, fc, fr):
        free = [cell(c, r) for r in range(R) for c in range(4) if not (fc <= c <= fc + 1 and fr <= r <= fr + 1)]
        q, out = 0, []
        for i in range(n):
            if i == f: out.append(cell(fc, fr, 2, 2))
            else: out.append(free[q]); q += 1
        return out
    pos = [(0, 0), (2, 1), (2, 0), (0, 1), (1, 0)] if R == 3 else [(0, 0), (2, 0), (1, 0), (0, 0), (2, 0)]
    return L0, feat, pos, cols, rows, (c4, r4)


def ch_grid(c, w, rb, lab, ctx):
    IT = need(f'{w}.items', lst(c.get('items')), 3, 9, '卡片')
    n = len(IT)
    L0, feat, pos, cols, rows, small = grid_rects(max(3, n))
    items, txt = [], ''
    for j, x in enumerate(IT):
        x = {'name': x} if isinstance(x, str) else (x or {})
        nm = str(x.get('name') or '')
        if not nm: ERR.append(f'缺欄位 {w}.items[{j}].name 卡片名稱')
        mw = min(small[0], L0[0][2]) - 56
        if em(nm) * 30 > mw: ERR.append(f'{w}.items[{j}].name 卡片名稱「{nm}」太長（中文最多約 {int(mw / 30)} 字）')
        note = str(x.get('note') or '')
        nfs = max(18, min(small[1] * 0.3, mw / max(1, len(nm)), 92) * 0.36)
        if em(note) * nfs > small[0] - 48: ERR.append(f'{w}.items[{j}].note 卡片說明「{note}」太長（中文最多約 {int((small[0] - 48) / nfs)} 字）')
        col = str(x.get('color') or ('blue' if j % 4 == 1 else 'coral' if j % 4 == 3 else 'ink'))
        if col not in ('ink', 'blue', 'coral'): ERR.append(f'{w}.items[{j}].color 只能是 ink、blue、coral'); col = 'ink'
        items.append({'name': nm, 'note': note, 'g': ['ink', 'blue', 'coral'].index(col)})
        txt += nm + note
    head, hS = fit(f'{w}.head 標題', c.get('head'), 60, 40, 1200)
    focus = int(c.get('focus', (n - 1) // 2 if n else 0))
    if not 0 <= focus < max(1, n): ERR.append(f'{w}.focus 要是 0～{n - 1}（第幾張卡片，從 0 算）'); focus = 0
    tag = f"{lab['grid']} / {n:02d}" if lab['grid'] else ''
    F1 = rows + 1
    Hf = 2
    F = min(3, n)
    total = lambda: F1 + Hf + 2 + F + 3
    while total() - 1 < rb(txt) * 0.55: Hf += 1
    while up4(total()) > total() and F < min(5, n): F += 1
    Hf += up4(total()) - total()
    Ls = F1 + Hf + 2
    O = Ls + F
    L = O + 3
    order = [i for i in range(n) if i != focus]
    feats = [order[(k * 2) % len(order)] if order else focus for k in range(F - 1)] + [focus]
    lays = [{'at': Ls + k, 'L': feat(f, *pos[k % len(pos)])} for k, f in enumerate(feats)]
    fr = lays[-1]['L'][focus]
    d = {'items': items, 'head': head, 'headSize': hS, 'tag': tag, 'focus': focus, 'L0': L0, 'lays': lays, 'cols': cols,
         'b': {'flip1': F1, 'flip2': F1 + Hf, 'out': O}, 'focusRect': [round(v, 1) for v in fr]}
    ev = {'whoosh': [1 + r for r in range(rows)] + [F1, F1 + Hf], 'blip': [Ls + k for k in range(F)], 'pop': [O]}
    ctx['echo'] += [i['name'] for i in items if em(i['name']) <= 4][:2]
    return d, L, ev, [F1 - 0.3, F1 + 1.2, Ls + F - 0.5, L - 0.6], txt + head + tag + '+0123456789', [960, 540]


def ch_iso(c, w, rb, lab, ctx):
    IT = [str(x) for x in need(f'{w}.items', lst(c.get('items')), 2, 4, '標註')]
    head, hS = fit(f'{w}.head 標題', c.get('head'), 72, 48, 840, False)
    sub, sS = fit(f'{w}.sub 標題下一行（珊瑚色）', c.get('sub'), 34, 26, 840)
    MW = [560, 600, 640, 520]
    notes = []
    for j, s in enumerate(IT):
        t, z = fit(f'{w}.items[{j}] 標註', s, 40, 30, MW[j])
        notes.append({'text': t, 'size': z})
    iso = str(lab['iso'] or '')
    n = len(IT)
    Hh = max(4, math.ceil(rb(head, sub, *IT) * 0.5))
    L = up4(8 + Hh)
    Hh = L - 8
    warp = [[0, 0], [4, 2], [8, 5], [8 + max(4, n), 5 + Hh], [16, 8 + Hh]]
    a = lambda ob: warp_inv(warp, ob)
    ev = {'pop': [a(0.7), a(1.0), a(1.4), a(1.9)], 'whoosh': [a(4)], 'blip': [a(8 + j) for j in range(n)]}
    d = {'head': head, 'headSize': hS, 'sub': sub, 'subSize': sS, 'notes': notes, 'iso': iso, 'warp': warp}
    return d, L, ev, [a(3), a(7), a(8 + n) - 0.2, L - 0.6], head + sub + ''.join(IT) + iso + '0123456789.D', [1120, 560]


def ch_lines(c, w, rb, lab, ctx):
    TP = [str(x) for x in need(f'{w}.items', lst(c.get('items')), 2, 6, '標籤')]
    tops = []
    for j, s in enumerate(TP):
        t, z = fit(f'{w}.items[{j}] 標籤', s, 44, 32, 440)
        tops.append({'text': t, 'size': z})
    head, hS = fit(f'{w}.head 標題', c.get('head'), 60, 40, 1250, False)
    chip = str(c.get('chip') or '')
    chS = min(130, 200 / max(0.5, em(chip, 0.75))) if chip else 130
    if chip and chS < 56: ERR.append(f'{w}.chip 晶片上的字「{chip}」太長（英數約 4 個、中文 2 字）')
    mark = str(c.get('mark') if c.get('mark') is not None else ctx.get('mark', ''))
    mS = min(340, 1600 / max(0.5, em(mark, 0.85))) if mark else 0
    if mark and mS < 120: ERR.append(f'{w}.mark 描線字標「{mark}」太長（英數約 14 個）')
    n = len(TP)
    P = 2 + n
    Hh = max(0, math.ceil(rb(head, *TP) * 0.6) - n)
    P += Hh
    L = up4(P + (8 if mark else 6))
    extra = L - P - (8 if mark else 6)
    rows = math.ceil(n / 2)
    ly = {1: [470], 2: [330, 610], 3: [250, 470, 690]}[max(1, rows)]
    d = {'items': tops, 'head': head, 'headSize': hS, 'chip': chip, 'chipSize': int(chS), 'mark': mark, 'markSize': int(mS),
         'tag': lab['circuit'], 'ly': ly, 'b': {'at': [2 + j for j in range(n)], 'p': P + extra, 'logo': bool(mark)}}
    P2 = P + extra
    ev = {'blip': [2 + j + 0.85 for j in range(n)], 'whoosh': [P2], 'tick': [P2 + j for j in range(1, 4)]}
    if mark: ev['burst'] = [P2 + 6 + 8 / B]
    return d, L, ev, [1 + n * 0.6, P2 - 0.3, P2 + (6.8 if mark else 3), L - 0.6], head + ''.join(TP) + chip + mark + lab['circuit'], [960, 470]


def ch_morph(c, w, rb, lab, ctx):
    GS = need(f'{w}.groups', lst(c.get('groups')), 1, 4, '段')
    out, txt, at, k = [], '', 0, 0
    for j, x in enumerate(GS):
        x = x or {}
        tag, tS = fit(f'{w}.groups[{j}].tag 色塊小標', x.get('tag'), 34, 26, 800)
        TL = [str(s) for s in lst(x.get('title'))]
        if not TL: ERR.append(f'缺欄位 {w}.groups[{j}].title 大標（1～2 行）')
        if len(TL) > 2: ERR.append(f'{w}.groups[{j}].title 大標最多 2 行')
        tl = [fit(f'{w}.groups[{j}].title[{i}] 大標', s, 78, 54, 840) for i, s in enumerate(TL[:2])]
        IT = [str(s) for s in lst(x.get('items'))]
        if len(IT) > 3: ERR.append(f'{w}.groups[{j}].items 項目最多 3 條')
        its = [fit(f'{w}.groups[{j}].items[{i}] 項目', s, 38, 28, 780) for i, s in enumerate(IT[:3])]
        ic = [str(s) for s in lst(x.get('icon'))] or [ICONS[k % len(ICONS)], ICONS[(k + 1) % len(ICONS)]]
        for s in ic:
            if s not in ICONS: ERR.append(f'{w}.groups[{j}].icon 只能是 {"、".join(ICONS)}（現在「{s}」）')
        ic = [s for s in ic if s in ICONS][:2] or ['badge']
        k += len(ic)
        nb = max(4, math.ceil(rb(tag, *TL, *IT) * 0.7 + 1))
        out.append({'tag': tag, 'tagSize': tS, 'title': [{'text': a, 'size': b} for a, b in tl],
                    'items': [{'text': a, 'size': b} for a, b in its], 'icons': ic, 'at': at, 'nb': nb})
        at += nb
        txt += tag + ''.join(TL) + ''.join(IT)
    L = up4(at + 1)
    if out: out[-1]['nb'] += L - at
    shapes, morph = [out[0]['icons'][0] if out else 'badge'], []
    for g in out:
        for i, s in enumerate(g['icons']):
            if g is out[0] and i == 0: continue
            shapes.append(s); morph.append(g['at'] + (0 if i == 0 else max(1, g['nb'] // 2)))
    shapes.append('circle'); morph.append(L - 1)
    if out and len(out[0]['icons']) == 1: pass
    d = {'groups': out, 'shapes': shapes, 'morph': morph, 'tag': lab['morph']}
    ev = {'whoosh': [g['at'] for g in out[1:]], 'blip': morph[:-1], 'pop': [L - 1]}
    return d, L, ev, [g['at'] + min(g['nb'], 4) - 0.7 for g in out] + [L - 0.4], txt + lab['morph'] + '—0123456789.', [1400, 490]


def ch_logo(c, w, rb, lab, ctx):
    name, nS = fit(f'{w}.name 名稱', c.get('name'), 84, 54, 1100, False)
    en, eS = fit(f'{w}.en 名稱上方英文', c.get('en'), 22, 16, 1100, latin=0.62, ls=0.55)
    slogan, sS = fit(f'{w}.slogan 標語', c.get('slogan'), 50, 34, 1100, ls=0.16)
    url, uS = fit(f'{w}.url 網址', c.get('url'), 34, 24, 1100 - em(c.get('tel'), 0.6) * 34 - 36, latin=0.6)
    tel = str(c.get('tel') or '')
    WD = [str(x) for x in lst(c.get('words'))]
    if len(WD) > 4: ERR.append(f'{w}.words 硬切大字最多 4 個（現在 {len(WD)} 個）')
    for j, s in enumerate(WD[:4]):
        if em(s) * 230 * 1.09 > 1800: ERR.append(f'{w}.words[{j}] 硬切大字「{s}」太長（中文最多約 7 字）')
    WD = WD[:4]
    Hh = max(4, len(WD) + 1)
    R = max(6, math.ceil(rb(name, slogan) * 0.8 + rb(en, url, tel) * 0.3 + 1))
    L = Hh + R                      # 最後一章不必進位到整小節（後面沒有轉場）
    d = {'name': name, 'nameSize': nS, 'en': en, 'enSize': eS, 'slogan': slogan, 'sloganSize': sS, 'url': url, 'tel': tel,
         'urlSize': uS, 'words': WD, 'hit': Hh, 'w0': Hh - len(WD)}
    ev = {'cut': [Hh - len(WD) + i for i in range(len(WD))], 'logo': [Hh]}
    return d, L, ev, [Hh - 1.5, Hh + 0.4, Hh + 2.5, L - 0.3], name + en + slogan + url + tel + ''.join(WD) + '・', [960, 500]


BUILDERS = {'open': ch_open, 'type': ch_type, 'data': ch_data, 'grid': ch_grid, 'iso': ch_iso, 'lines': ch_lines, 'morph': ch_morph,
            'logo': ch_logo}


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rb = lambda *ss: nchars(*ss) / pace * FPS / B                  # 讀完要幾拍
    lab = {**CHROME, **(sb.get('labels') or {})}
    CHS = lst(sb.get('chapters'))
    types = [str((x or {}).get('type') or '') for x in CHS]
    if not 3 <= len(CHS) <= 8: ERR.append(f'chapters 要 3～8 章（現在 {len(CHS)} 章；示範 25～35 秒約 5～6 章）')
    if not types or types[0] != 'open': ERR.append('chapters 第一章必須是 open（開場 KINETIC TYPE）')
    if not types or types[-1] != 'logo': ERR.append('chapters 最後一章必須是 logo（LOGO LOCKUP）')
    for i, ty in enumerate(types):
        if ty not in TYPES: ERR.append(f'chapters[{i}].type 只能是 {"、".join(TYPES)}（現在「{ty}」）')
        elif ty in ('open', 'logo') and 0 < i < len(types) - 1: ERR.append(f'chapters[{i}] {ty} 只能放在第一章／最後一章')
    op = next((x for x in CHS if (x or {}).get('type') == 'open'), {}) or {}
    ctx = {'echo': [], 'mark': str(op.get('mark') or '')}
    S, txt, stl_b = [], '', []
    sfx = {k: [] for k in ('pop', 'cut', 'burst', 'whoosh', 'blip', 'thump', 'tick', 'stamp', 'logo')}
    t, prev, rot = 0, '', 0
    for i, x in enumerate(CHS[:8]):
        x = x or {}
        ty = types[i]
        if ty not in BUILDERS: continue
        w = f'chapters[{i}]（{ty}）'
        d, nb, ev, st, tx, anc = BUILDERS[ty](x, w, rb, lab, ctx)
        tr = ''
        if i > 0:
            pty = types[i - 1]
            tr = str(x.get('transition') or '')
            if not tr:
                if pty == 'grid': tr = 'through'
                elif pty == 'type': tr = 'dot'
                elif ty == 'logo': tr = 'zoom'
                else:
                    while TRANS_ROT[rot % len(TRANS_ROT)] == prev: rot += 1
                    tr = TRANS_ROT[rot % len(TRANS_ROT)]; rot += 1
            if tr not in TRANS: ERR.append(f'{w}.transition 只能是 {"、".join(TRANS)}（現在「{tr}」）'); tr = 'bars'
            prev = tr
        S.append({'type': ty, 'tech': TECH[ty], 'no': len(S) + 1, 'beat': t, 'nb': nb, 'from': int(round(t * B)), 'trans': tr, 'anchor': anc, **d})
        for k, v in ev.items(): sfx.setdefault(k, []); sfx[k] += [t + b for b in v]
        stl_b += [t + b for b in st]
        txt += tx
        t += nb
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    for i, s in enumerate(S):
        s['to'] = S[i + 1]['from'] if i + 1 < len(S) else int(round(t * B))
        s['win'] = list(TRANS[s['trans']]) if s['trans'] else [0, 0]
        if s['trans']:
            sfx['whoosh'].append((s['from'] + s['win'][0]) / B)
    frames = int(round(t * B))
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加章，不要編造內容')
    lg = S[-1]
    logoHit = int(round((lg['beat'] + lg['hit']) * B))
    # 收尾螺旋收斂的元素：前面各章的數字與短名稱（最多 5 個）＋幾何形狀
    echo = []
    for e in ctx['echo']:
        if e and e not in echo and em(e) <= 6: echo.append(e)
    echo = echo[:5]
    items = ['c', 's', 'tri'] + [f'#{e}' for e in echo]
    for sh in ['card', 'cube', 'chip', 'plane', 'ring', 'bar']:
        if len(items) >= 12: break
        items.append(sh)
    lg['items'] = items
    lg['card'] = next((s.get('head') for s in S if s['type'] == 'grid' and s.get('head')), '') or (op.get('title') or '')
    hud, hS = fit('hud 左上角固定小字', sb.get('hud') if sb.get('hud') is not None else
                  (f"{op.get('mark') or op.get('title') or ''} — {lab['reel']}" if lab['reel'] else (op.get('mark') or '')), 18, 14, 900,
                  latin=0.62, ls=0.33)
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [round(b * B) for b in stl_b] + [s['from'] + s['win'][0] // 2 for s in S[1:]]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 24: stl.pop(len(stl) // 2)
    o0 = S[0]
    poster = cl(round((o0['nb'] - 1.2) * B))
    mid = S[len(S) // 2]
    ov = [poster, cl(mid['from'] + (mid['to'] - mid['from']) * 0.55), cl(frames - 10)]
    allText = ''.join([txt, hud, lg['card'], *echo, *TECH.values(), *[v for v in lab.values() if v],
                       '0123456789/—●・+%.,:-ABCDEFGHIJKLMNOPQRSTUVWXYZ'])
    return {'template': '廣S', 'name': sb.get('name', '技法巡禮'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beat': B, 'beats': t,
            'chapters': S, 'sections': [s['from'] for s in S] + [logoHit], 'logoHit': logoHit,
            'sfx': {k: sorted(round(b * B) for b in v) for k, v in sfx.items()},
            'd': {'labels': lab, 'hud': hud, 'hudSize': hS},
            'stills': stl, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    except ValueError as e:
        sys.exit(f'✗ storyboard 不符合範本欄位規定：\n{e}')
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', tl['beats'], '拍＝', tl['beats'] // 4, '小節）')
    for i, s in enumerate(tl['chapters']):
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）第 {i + 1} 章 {TYPE_ZH[s["type"]]} {s["tech"]}（{s["nb"]} 拍＝{s["nb"] * B / FPS:.1f} 秒）'
              + (f'　轉場 {s["trans"]}' if s['trans'] else ''))
    print('  字數', len(set(tl['allText'])))
