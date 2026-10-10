"""範本廣I「點線面」時間表：storyboard.json → 時間表（每個事件第幾格、主角路徑、鏡頭、物件幾何、畫面上的字）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（製圖紙上一鏡到底，主角是一個點，120 BPM，每升一維多一種顏色、多一層樂器）：
  0D 點：點彈出、開場字寫出來（head）→ 蓄力 → 點拉出一條地平線
  1D 線（紅）：點當筆尖，一筆一筆勾出物件的線稿（line.object），閃一下、標註字寫出（line.label／note）
  2D 面（藍）：點描出外框 → 色面沿對角線「啪」地鋪滿 → 細節一格格彈出 → 左右生出兩個縮小的分身（plane）
  3D 體（黃）：點畫出立方體展開圖 → 五個面一拍一拍摺起來 → 點變成噴頭，物件在方塊上一層層「印」出來（2.5D 擠出，solid）
  4D 時間：鏡頭拉遠成全景、所有東西跟拍子跳 → 點長成鏡頭，鑽進去看片中片小廣告（film）→ 拉回
  收回：黃→藍→紅→地平線依序縮進那個點 → 名稱寫出來，點落在名稱後當句點 → 副標、標語、網址（end）
1D／2D／3D／4D 四段最多可省略一段（片長跟著變短）。物件從內建圖形庫挑（OBJ），每一維用該維的畫法。
一拍 15 格、一小節 60 格（整數格）。
"""
import math

FPS, BPM = 30, 120
B = 15                     # 一拍 15 格
BAR = 4 * B
ERR = []

# ───────────── 通用圖形庫（局部座標：x 置中、地面 y=0、往上為負；寬 ≤ 620、高 ≤ 660）─────────────
# 每個部件：pts 點列、closed 是否封閉、fill 顏色代號（r 紅、b 藍、y 黃、k 墨、s 白、None 只有線）、
# role：o＝外框（2D 由點描出來）、d＝細節（2D 一格格彈出）；w 線寬。1D 依序把全部部件畫成線稿。


def _arc(cx, cy, r, a0, a1, n=None, ry=None):
    ry = ry if ry is not None else r
    n = n or max(6, int(abs(a1 - a0) / 9))
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def _circ(cx, cy, r, n=40): return _arc(cx, cy, r, -90, 270, n)[:-1]
def _rect(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def _rrect(x0, y0, x1, y1, r):
    return (_arc(x1 - r, y0 + r, r, -90, 0, 4) + _arc(x1 - r, y1 - r, r, 0, 90, 4) +
            _arc(x0 + r, y1 - r, r, 90, 180, 4) + _arc(x0 + r, y0 + r, r, 180, 270, 4))


def _wave(x, y0, y1, amp=18, n=16): return [(x + amp * math.sin(i / n * math.pi * 2), y0 + (y1 - y0) * i / n) for i in range(n + 1)]


def _star(cx, cy, r, n=5):
    return [(cx + (r if i % 2 == 0 else r * 0.45) * math.cos(-math.pi / 2 + i * math.pi / n),
             cy + (r if i % 2 == 0 else r * 0.45) * math.sin(-math.pi / 2 + i * math.pi / n)) for i in range(2 * n)]


def P(pts, fill=None, closed=True, role='o', w=5):
    return {'pts': [(round(x, 1), round(y, 1)) for x, y in pts], 'fill': fill, 'closed': closed, 'role': role, 'w': w}


# 店面雨棚的波浪邊：上緣直線＋六個往下的半圓
_AWN = [(-290, -400), (290, -400)] + [q for i in range(5, -1, -1) for q in _arc(-290 + 48.33 * (2 * i + 1), -400, 48.33, 0, 180, 8, 26)]

OBJ = {
    'camera': {'zh': '相機', 'accent': (-175, -512), 'parts': [
        P(_rrect(-240, -560, 240, -260, 24), 'b'),
        P([(-140, -560), (-115, -615), (-5, -615), (20, -560)], 'r'),
        P(_circ(0, -410, 110), 's', role='d'),
        P(_circ(0, -410, 70), 'y', role='d'),
        P(_rect(150, -585, 210, -560), 'r', role='d'),
        P(_rect(-210, -530, -140, -495), 'y', role='d'),
        P([(-130, 0), (0, -260), (130, 0)], None, False, w=4)]},
    'tablet': {'zh': '平板', 'accent': (-285, -380), 'parts': [
        P(_rrect(-310, -590, 310, -170, 10), 'b'),
        P([(-100, -170), (-170, 0)], None, False, w=4),
        P([(100, -170), (170, 0)], None, False, w=4),
        P(_rect(-260, -560, 260, -200), 's', role='d'),
        P(_circ(-140, -430, 70), 'r', role='d'),
        P(_rect(-35, -520, 95, -390), 'b', role='d'),
        P(_arc(190, -430, 60, 180, 360), 'r', role='d'),
        P(_rect(-210, -300, 40, -285), 'k', role='d', w=3),
        P(_rect(-210, -262, -10, -247), 'k', role='d', w=3)]},
    'cup': {'zh': '咖啡杯', 'accent': (0, -470), 'parts': [
        P(_rrect(-250, -40, 250, 0, 18), 'y'),
        P([(-170, -340), (170, -340), (130, -60), (-130, -60)], 'b'),
        P(_arc(156, -240, 72, -90, 90), None, False, w=10),
        P(_rect(-80, -60, 80, -40), 'k', role='d'),
        P(_circ(0, -200, 58), 's', role='d'),
        P(_circ(0, -200, 26), 'r', role='d'),
        P(_wave(-60, -380, -560), None, False, role='d', w=4),
        P(_wave(40, -390, -610), None, False, role='d', w=4)]},
    'book': {'zh': '書本', 'accent': (222, -560), 'parts': [
        P([(-300, -130), (0, -90), (300, -130), (300, -100), (0, -55), (-300, -100)], 'b'),
        P([(-290, -130), (-10, -95), (-10, -470), (-290, -500)], 's'),
        P([(10, -95), (290, -130), (290, -500), (10, -470)], 's'),
        P([(-150, -75), (-210, 0)], None, False, w=4),
        P([(150, -75), (210, 0)], None, False, w=4),
        P([(-250, -440), (-50, -415)], None, False, role='d', w=4),
        P([(-250, -380), (-50, -355)], None, False, role='d', w=4),
        P([(-250, -320), (-110, -302)], None, False, role='d', w=4),
        P([(50, -420), (250, -445), (250, -330), (50, -305)], 'r', role='d'),
        P([(200, -490), (200, -575), (222, -555), (244, -575), (244, -485)], 'y', role='d')]},
    'shop': {'zh': '店面', 'accent': (0, -560), 'parts': [
        P(_rect(-250, -400, 250, 0), 's'),
        P([(-290, -400), (290, -400), (240, -500), (-240, -500)], 'r'),
        P(_rect(-160, -610, 160, -520), 'b'),
        P(_rect(-60, -240, 60, 0), 'b', role='d'),
        P(_rect(-210, -310, -100, -170), 'y', role='d'),
        P(_rect(100, -310, 210, -170), 'y', role='d'),
        P(_AWN, 'r', role='d'),
        P(_circ(35, -120, 9, 16), 'k', role='d')]},
    'computer': {'zh': '電腦', 'accent': (160, -330), 'parts': [
        P(_rrect(-290, -580, 290, -200, 14), 'b'),
        P([(-40, -200), (-60, -70), (60, -70), (40, -200)], 'k'),
        P(_rrect(-280, -45, 280, 0, 8), 'y'),
        P(_rect(-250, -550, 250, -230), 's', role='d'),
        P(_rect(-220, -520, 220, -490), 'r', role='d'),
        P(_rect(-200, -450, 60, -435), 'k', role='d', w=3),
        P(_rect(-200, -405, 120, -390), 'k', role='d', w=3),
        P(_rect(-160, -360, 20, -345), 'k', role='d', w=3),
        P(_circ(160, -330, 45), 'y', role='d')]},
    'trophy': {'zh': '獎盃', 'accent': (0, -500), 'parts': [
        P(_arc(0, -580, 170, 0, 180), 'y'),
        P(_arc(-170, -520, 60, 270, 90), None, False, w=9),
        P(_arc(170, -520, 60, -90, 90), None, False, w=9),
        P(_rect(-25, -410, 25, -200), 'y'),
        P(_rect(-120, -200, 120, -110), 'b'),
        P(_rect(-170, -110, 170, 0), 'k'),
        P(_star(0, -500, 52), 'r', role='d'),
        P([(-215, -660), (-215, -610), (-215, -635), (-240, -635), (-190, -635)], None, False, role='d', w=4),
        P([(215, -640), (215, -600), (215, -620), (195, -620), (235, -620)], None, False, role='d', w=4)]},
    'calendar': {'zh': '日曆', 'accent': (62, -285), 'parts': [
        P(_rrect(-250, -520, 250, -90, 10), 's'),
        P(_rect(-250, -520, 250, -420), 'r'),
        P([(-100, -90), (-160, 0)], None, False, w=4),
        P([(100, -90), (160, 0)], None, False, w=4),
        P(_rrect(-140, -560, -110, -490, 8), 'k', role='d'),
        P(_rrect(110, -560, 140, -490, 8), 'k', role='d'),
        P([(-250, -330), (250, -330), (250, -240), (-250, -240), (-250, -150), (250, -150)], None, False, role='d', w=3),
        P([(-125, -420), (-125, -90), (0, -90), (0, -420), (125, -420), (125, -90)], None, False, role='d', w=3),
        P(_circ(62, -285, 34), 'b', role='d')]},
}
NAMES = '、'.join(f'{k}（{v["zh"]}）' for k, v in OBJ.items())


def cw(c, latin=0.6): return 1.0 if ord(c) >= 0x2E80 else (0.3 if c == ' ' else latin)
def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def r1(x): return round(x, 1)


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6, ls=0.0):
    """字級可在 lo～fs 之間自動縮的欄位（ls＝字距，算在寬度裡）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    n = len(s)
    size = min(fs, (maxw - ls * n) / max(0.1, em(s, latin)))
    if size < lo:
        per = lo + ls
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / per)} 字、英數約 {int(maxw / (lo * latin + ls))} 個）')
        size = lo
    return s, int(size)


def plen(pts, closed):
    q = list(pts) + ([pts[0]] if closed else [])
    return sum(math.hypot(q[i + 1][0] - q[i][0], q[i + 1][1] - q[i][1]) for i in range(len(q) - 1))


def place(obj, X, sc, Y=0.0):
    """局部座標 → 世界座標（x 置中於 X、地面在 Y）"""
    parts = []
    for p in OBJ[obj]['parts']:
        pts = [(r1(X + x * sc), r1(Y + y * sc)) for x, y in p['pts']]
        parts.append({**p, 'pts': pts, 'len': r1(plen(pts, p['closed']))})
    xs = [x for p in parts for x, _ in p['pts']]; ys = [y for p in parts for _, y in p['pts']]
    ax, ay = OBJ[obj]['accent']
    return parts, [min(xs), min(ys), max(xs), max(ys)], (r1(X + ax * sc), r1(Y + ay * sc))


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))

    # ───────────── 欄位檢查（字級＝世界座標；0D 鏡頭放大 1.35 倍、2D 拉遠到 0.82、3D 0.9，換算成畫面都 ≥ 34px，主要字 ≥ 44px）─────────────
    title, titleS = fit('title 左上角圖紙標題', sb.get('title'), 34, 34, 820)
    hd = sb.get('head') or {}
    kicker, kickerS = fit('head.kicker 開場小字', hd.get('kicker'), 34, 28, 1250)
    hline, hlineS = fit('head.line 開場句', hd.get('line'), 84, 48, 1250, optional=False)
    ask, askS = fit('head.ask 開場問句', hd.get('ask'), 40, 30, 1250)

    dims = []
    for key, n, zh in (('line', 1, '1D 線'), ('plane', 2, '2D 面'), ('solid', 3, '3D 體')):
        v = sb.get(key)
        if not v: continue
        obj = v.get('object')
        if obj not in OBJ:
            ERR.append(f'{key}.object（{zh}要畫的物件）「{obj}」不在圖形庫：可用 {NAMES}')
            continue
        lab = fit(f'{key}.label {zh}的主標註', v.get('label'), 88, 56, 1400, False, ls=8)
        note = fit(f'{key}.note {zh}的小標註', v.get('note'), 46, 42, 1000)
        dims.append({'key': key, 'n': n, 'object': obj, 'label': lab[0], 'labelSize': lab[1], 'note': note[0], 'noteSize': note[1]})
    fm = sb.get('film') or None
    present = len(dims) + (1 if fm else 0)
    if present < 3:
        ERR.append(f'line／plane／solid／film 四段最多只能省略一段（現在只有 {present} 段）')

    # 全景（4D）縮放：所有物件都要入鏡
    xs = [1900 + 1750 * i for i in range(max(1, len(dims)))]
    TX = (xs[0] + xs[-1]) / 2
    span = xs[-1] - xs[0] + 1500
    sW = round(min(0.6, 1780 / span), 4)

    film = None
    if fm:
        wide = fit('film.wide 全景大字（畫面 px）', fm.get('wide'), 74, 48, 1700, ls=6)
        ftitle = fit('film.title 片中片標題', fm.get('title'), 112, 72, 1600, False, ls=12)
        fsub = fit('film.sub 片中片副標', fm.get('sub'), 40, 34, 1500, ls=4)
        wl = fm.get('words') or []
        if isinstance(wl, str): wl = [wl]
        if len(wl) > 2: ERR.append(f'film.words 片中片兩句口號最多 2 句（現在 {len(wl)} 句）')
        words = [fit(f'film.words[{i}] 片中片第 {i + 1} 句口號', w, 150, 96, 740) for i, w in enumerate(wl[:2])]
        slate = fit('film.title（場記板上）', fm.get('title'), 70, 40, 740)
        film = {'wide': wide[0], 'wideSize': wide[1], 'title': ftitle[0], 'titleSize': ftitle[1], 'sub': fsub[0], 'subSize': fsub[1],
                'words': [w for w, _ in words], 'wordSizes': [s for _, s in words], 'slateSize': slate[1]}

    ed = sb.get('end') or {}
    name, nameS = fit('end.name 名稱（點落在它後面當句點）', ed.get('name'), 210, 120, 1480, False, ls=20)
    esub, esubS = fit('end.sub 名稱下的副標', ed.get('sub'), 48, 44, 1700, ls=4)
    slogan, sloganS = fit('end.slogan 標語', ed.get('slogan'), 68, 48, 1700, ls=12)
    url, urlS = fit('end.url 網址或電話', ed.get('url'), 40, 34, 1600, ls=3)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───────────── 排時間（以拍為單位；最後換成格）─────────────
    F = lambda b: int(round(b * B))
    segs = []                                  # 主角路徑（連續的段）
    lands = []                                 # 落地壓扁的格
    cam = [[0, 0, -80, 1.35]]                  # 鏡頭關鍵格 [格, x, y, 縮放]
    sfx = {'sweep': [], 'flap': [], 'click': [], 'blip': [], 'whoosh': []}
    cur = {'t': 0, 'p': [0, 0]}

    def go(kind, t1, **kw):
        """主角路徑接一段（t1 單位：拍）；arc 的起點＝上一段的終點（噴頭之後由畫面程式即時算）"""
        if kind == 'arc': kw['a'] = cur['p']
        segs.append({'k': kind, 't0': cur['t'], 't1': F(t1), **kw})
        cur['t'] = segs[-1]['t1']
        if kind in ('arc', 'drag'): cur['p'] = kw.get('b')
        elif kind == 'path': cur['p'] = kw['pts'][-1]
        elif kind in ('hold', 'bounce', 'charge'): cur['p'] = kw['p']
        elif kind == 'nozzle': cur['p'] = None

    def camk(b, x, y, s): cam.append([F(b), r1(x), r1(y), s])

    headExtra = 2 if nchars(hline, ask) > 3.5 * pace else 0      # 開場句＋問句字多：多停 2 拍
    pop = 1
    S = 8 + headExtra                          # 第一維開始（拉線）
    go('hold', pop, p=[0, 0])
    go('bounce', S - 1.6, p=[0, 0])
    go('charge', S, p=[0, 0])
    head = {'pop': F(pop), 'kicker': F(1.5), 'line': F(2.5), 'lineDur': F(min(3.5, max(1.5, 0.22 * nchars(hline)))),
            'tag': F(4.5), 'ask': F(5 + headExtra * 0.5), 'charge': F(S - 1.6), 'drag': F(S)}

    out = []
    prevAcc = None
    for i, dm in enumerate(dims):
        X = xs[i]
        first = i == 0
        extra = 2 if nchars(dm['label'], dm['note']) > 2.5 * pace else 0   # 標註字多：多停 2 拍
        if first:
            go('drag', S + 1.5, a=[0, 0], b=[X - 500, 0])
            camk(S - 0.5, 0, -80, 1.35); camk(S + 1.2, X - 650, -220, 1.05)
            R = S + 2
        else:
            camk(S - 0.3, *cam[-1][1:])
            R = S + 1
        n = dm['n']
        e = {'n': n, 'key': dm['key'], 'object': dm['object'], 'X': X, 'start': F(S), 'label': dm['label'], 'labelSize': dm['labelSize'],
             'note': dm['note'], 'noteSize': dm['noteSize']}
        if n == 1:                             # 1D：全部部件畫成線稿
            parts, bb, acc = place(dm['object'], X, 0.85)
            camk(R, X, -330, 1)
            slot = 5 / len(parts)
            t = R
            for j, p in enumerate(parts):
                pts = p['pts'] + ([p['pts'][0]] if p['closed'] else [])
                go('arc', t, b=list(pts[0]), h=50 if j else 160)
                p['t0'] = F(t); p['dur'] = max(4, F(t + slot * 0.78) - F(t))
                go('path', t + slot * 0.78, pts=[list(q) for q in pts])
                sfx['sweep'].append(F(t))
                t += slot
            go('arc', R + 5.5, b=list(acc), h=140)
            lands.append(F(R + 5.5))
            e.update(parts=parts, bb=bb, acc=acc, flash=F(R + 5.5), labelAt=F(R + 5.5), noteAt=F(R + 6.25), dimAt=F(R + 4.6))
            end = R + 8.5 + extra
            go('hold', math.ceil(end), p=list(acc))
        elif n == 2:                           # 2D：描外框 → 色面鋪滿 → 細節彈出 → 分身
            parts, bb, acc = place(dm['object'], X, 0.8)
            camk(R, X, -330, 1)
            ol = [p for p in parts if p['role'] == 'o']
            dt = [p for p in parts if p['role'] == 'd']
            slot = 2.5 / max(1, len(ol))
            t = R
            for j, p in enumerate(ol):
                pts = p['pts'] + ([p['pts'][0]] if p['closed'] else [])
                go('arc', t, b=list(pts[0]), h=320 if j == 0 else 60)
                p['t0'] = F(t); p['dur'] = max(4, F(t + slot * 0.8) - F(t))
                go('path', t + slot * 0.8, pts=[list(q) for q in pts])
                sfx['sweep'].append(F(t))
                t += slot
            go('arc', R + 3, b=list(acc), h=90)
            lands.append(F(R + 3))
            step = 1.5 / max(1, len(dt))
            step = 0.5 if step >= 0.5 else 0.25
            for j, p in enumerate(dt):
                p['t0'] = F(R + 3.5 + j * step)
                sfx['blip'].append(F(R + 3.5 + j * step))
            last = R + 3.5 + (len(dt) - 1) * step
            cp = max(R + 5.5, last + 1)
            camk(cp - 0.3, X, -330, 1); camk(cp + 0.7, X, -330, 0.82)
            sfx['whoosh'].append(F(cp) - 3)
            e.update(parts=parts, bb=bb, acc=acc, fill=F(R + 3), copies=F(cp), labelAt=F(R + 3.25), noteAt=F(R + 4), dimAt=F(R + 3.5))
            end = cp + 2 + extra
            go('hold', math.ceil(end), p=list(acc))
        else:                                  # 3D：展開圖 → 摺成方塊 → 物件在方塊上一層層印出來
            A = 200
            PO = [X, -A]
            parts, bb, acc = place(dm['object'], X, 0.5, Y=-A * 1.5)
            camk(R, X, -350, 0.9)
            net = [[x * A, y * A] for x, y in [[0, -2], [1, -2], [1, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2], [0, 1], [-1, 1], [-1, 0], [0, 0], [0, -2]]]
            netw = [[r1(PO[0] + (x - y) * 0.866), r1(PO[1] + (x + y) * 0.5)] for x, y in net]
            go('arc', R, b=netw[0], h=360)
            go('path', R + 1.5, pts=netw)
            sfx['sweep'].append(F(R))
            side = [X - 560, -14]
            go('arc', R + 2, b=side, h=200)
            folds = [F(R + 2.5 + 0.5 * j) for j in range(5)]
            sfx['flap'] += folds
            go('bounce', R + 5, p=side)
            rail, plate, p0 = F(R + 5), F(R + 5.5), R + 5.5
            sfx['click'] += [rail, plate]
            go('arc', p0, b=None, h=260)          # 終點＝噴頭起點（畫面程式算）
            e.update(parts=parts, bb=bb, acc=acc, A=A, PO=PO, net=netw, netLen=r1(plen(netw, False)), netAt=F(R), netDur=F(1.5),
                     folds=folds, rail=rail, plate=plate, print0=F(p0), print1=F(p0 + 3.5), labelAt=F(R + 4.25), noteAt=F(R + 5), dimAt=F(p0 + 0.5))
            end = p0 + 4 + extra
            go('nozzle', math.ceil(end))
        end = math.ceil(end)                   # 每段結束對齊整拍
        e['end'] = F(end)
        out.append(e)
        S = end

    # ───────────── 4D：全景 → 點長成鏡頭鑽進片中片 → 拉回 ─────────────
    H = S
    LY = r1(-330 + (360 - 540) / sW)
    lensR = r1(110 / sW)
    sDive = round(1250 / lensR, 3)
    camk(H - 2, *cam[-1][1:]); camk(H, TX, -330, sW)
    m = {'hit': F(H), 'labelsOff': F(H - 1.6), 'wide': F(H + 0.3)}
    if film:
        Fm = H + 4.5
        go('arc', H + 1.5, b=[TX, LY], h=300)
        lands.append(F(H + 1.5))
        camk(H + 3, TX, -330, sW); camk(H + 4.5, TX, LY, sDive)
        camk(Fm + 7, TX, LY, sDive); camk(Fm + 9.5, TX, -330, sW)
        C = Fm + 9.5
        m.update(lens0=F(H + 1.5), lens1=F(H + 3), dive=F(H + 3), film=F(Fm), out=F(Fm + 7), lensBack=F(Fm + 9.5))
        film.update(slate=F(Fm), titleAt=F(Fm + 0.3), subAt=F(Fm + 1.1), actors=[F(Fm + 0.5 + 0.5 * j) for j in range(4)],
                    stack=[F(Fm + 2.5 + 0.5 * j) for j in range(3)], bulb=F(Fm + 4.5), spin=F(Fm + 5.5),
                    word1=F(Fm + 2.5), word2=F(Fm + 4.5))
    else:
        go('arc', H + 1.5, b=[TX, LY], h=300)
        lands.append(F(H + 1.5))
        C = H + 4
        m.update(lens0=0, lens1=0, dive=0, film=0, out=0, lensBack=0)
    go('hold', C + 2, p=[TX, LY])
    camk(C, TX, -330, sW); camk(C + 1.5, TX, LY, sW)
    m.update(collapse=F(C), suck=F(C), wideOut=F(C - 0.5))

    # ───────────── 收尾：名稱寫出 → 點落成句點 → 副標、標語、網址 ─────────────
    G = C + 2
    nameDur = min(3, max(1.5, 0.35 * nchars(name)))
    land = G + 4
    t = land + 1
    texts = []
    for s_ in (esub, slogan, url):
        if s_:
            texts.append(F(t)); t += 1.25
        else:
            texts.append(None)
    hold = max(0, math.ceil(nchars(esub, slogan, url) / pace) - 7) * 0.5
    last = t + 1.25 + hold
    frames = F(last + 1.5)
    m.update(logo=F(G), land=F(land), last=F(last), nameAt=F(G + 0.5), nameDur=F(nameDur), plabel=F(land + 0.3), dimLine=F(land + 0.8))

    # 每維開始時刻（HUD 指示器、配樂分層）：沒畫的維度沿用下一段的開始
    st = {e['n']: e['start'] for e in out}
    st[4] = m['hit']
    for n in (3, 2, 1):
        if n not in st: st[n] = st[n + 1]
    secs = {'point': 0, 'line': st[1], 'plane': st[2], 'solid': st[3], 'motion': st[4], 'collapse': m['collapse'], 'logo': m['logo'], 'end': m['last']}

    punch = [[F(pop), 0.05], [head['drag'], 0.06], [m['hit'], 0.12], [m['logo'], 0.08], [m['land'], 0.03]]
    for e in out:
        if e['n'] == 1: punch.append([e['flash'], 0.06])
        if e['n'] == 2: punch.append([e['fill'], 0.07])
        if e['n'] == 3: punch += [[x, 0.035] for x in e['folds']] + [[e['rail'], 0.025], [e['plate'], 0.025]]
    if film: punch += [[x, 0.035] for x in film['actors']] + [[x, 0.03] for x in film['stack']] + [[film['bulb'], 0.05]]

    # 抽格
    stills = [12, head['line'] + 30, head['charge'] + 10, head['drag'] + 16]
    for e in out:
        if e['n'] == 1: stills += [e['parts'][len(e['parts']) // 2]['t0'] + 4, e['noteAt'] + 30]
        if e['n'] == 2: stills += [e['fill'] + 6, e['copies'] + 24]
        if e['n'] == 3: stills += [e['folds'][2] + 4, e['print1'] - 4]
    stills += [m['hit'] + 14, m['hit'] + 34]
    if film: stills += [m['dive'] + 10, film['actors'][3] + 8, film['bulb'] + 12, m['out'] + 30]
    stills += [m['collapse'] + 14, m['logo'] + 24, m['land'] + 6, frames - 3]
    stills = sorted(set(int(min(frames - 1, max(0, s))) for s in stills))
    while len(stills) > 20: stills.pop(len(stills) // 2)

    poster = (film['spin'] + 22) if film else (m['hit'] + 30)
    mid = next((e for e in out if e['n'] == 2), out[len(out) // 2])
    ov = [int((mid['copies'] + 30) if mid['n'] == 2 else (mid.get('flash', mid.get('print1', 0)) + 20)), int(poster), int(frames - 6)]

    allText = ''.join([title, kicker, hline, ask, *[e['label'] + e['note'] for e in out],
                       *([film['wide'], film['title'], film['sub'], *film['words']] if film else []), name, esub, slogan, url])
    return {'template': '廣I', 'name': sb.get('name', '點線面'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beatFrames': B, 'barFrames': BAR,
            'secs': secs, 'marks': m, 'head': head, 'segs': segs, 'lands': lands, 'cam': cam, 'punch': punch, 'sfx': sfx,
            'TX': r1(TX), 'LY': LY, 'lensR': lensR, 'sWide': sW, 'sDive': sDive, 'xs': xs,
            'd': {'title': title, 'kicker': kicker, 'kickerSize': kickerS, 'line': hline, 'lineSize': hlineS, 'ask': ask, 'askSize': askS,
                  'dims': out, 'film': film,
                  'end': {'name': name, 'nameSize': nameS, 'sub': esub, 'subSize': esubS, 'slogan': slogan, 'sloganSize': sloganS,
                          'url': url, 'urlSize': urlS, 'texts': texts}},
            'stills': stills, 'poster': int(poster), 'overview': ov,
            'allText': allText + '0123456789DPRECSNTAKO (,) :1'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    m = tl['marks']
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print('  各維開始', tl['secs'])
    for e in tl['d']['dims']:
        print(f"  {e['n']}D {e['object']}（{OBJ[e['object']]['zh']}）開始 {e['start']}、結束 {e['end']}：{e['label']}／{e['note']}")
    print('  4D 全景', m['hit'], '鏡頭', m['lens0'], '鑽入', m['dive'], '片中片', m['film'], '拉回', m['out'], '收回', m['collapse'])
    print('  名稱', m['logo'], '句點落下', m['land'], '副標／標語／網址', tl['d']['end']['texts'], '最後', m['last'])
    print('  全景縮放', tl['sWide'], '鑽入縮放', tl['sDive'])
