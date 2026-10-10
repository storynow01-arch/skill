"""範本廣E「一鏡到底」時間表：storyboard.json → 時間表（主角、交通車、鏡頭的每一格位置＋各站事件格＋天色）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定：色鉛筆畫的主角從清晨家門口出發，鏡頭一路往右跟拍、不剪接，依 storyboard 的 stops 經過 0～3 個站點：
  ride      站牌等車 → 交通車開過田野小鎮、慢慢經過大看板 → 下車
  building  招牌入口 → 上課／開店鐘響 → 跑到座位坐下，看黑板上的字
  pool      水池告示牌 → 跳水（殘影）→ 游過去爬上岸
最後一站固定是傍晚的房間（門口小黑板、門牌、冷氣吊牌、書桌便條）→ 自習 → 關燈上床 → 鏡頭推進窗戶，星空浮出名稱、標語、網址。
天色由早到晚跟著時間表走。100 BPM、一拍 18 格；停留依字數（pace 字／半拍，預設 6）。
主角、車、鏡頭都在這裡算成「每一格的數字」，畫面只照表畫，聲音也讀同一份。
"""
import math

FPS, BPM, BEAT, BAR = 30, 100, 18, 72
WALK, RUN = 10.0, 18.0          # 走路／跑步每格幾像素（腳步依走過的距離換姿勢，不會滑步）
GY = 900
ERR = []
POSES = ['stand', 'walk', 'run', 'sit', 'crouch', 'jump', 'reach', 'wave', 'look']
MODES = ['body', 'swim', 'bed', 'none']
# 各站在原作世界座標的原點（畫面程式照原作座標畫，再整組平移到這一站的位置）
ORIG = {'building': 9300, 'pool': 11200, 'room': 13230}
WIDTH = {'building': 1950, 'pool': 2060}


def cw(c): return 1.0 if ord(c) >= 0x2E80 else 0.6
def em(s): return sum(cw(c) for c in str(s))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def ss(p): return 0.0 if p <= 0 else 1.0 if p >= 1 else 0.5 - 0.5 * math.cos(math.pi * p)
def eo(p): p = min(1.0, max(0.0, p)); return 1 - (1 - p) ** 3
def qb(f): return int(math.ceil(f / BEAT) * BEAT)


def fit(where, s, fs, maxw, optional=True):
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    w = em(s) * fs
    if w > maxw:
        ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw} 像素；中文最多約 {int(maxw / fs)} 字、英數約 {int(maxw / fs / 0.6)} 個）')
    return str(s)


def lines(where, v, n, specs):
    """v：字串或字串陣列（最多 n 行）；specs：每行 (字級, 寬)"""
    if v in (None, '', []): return []
    if isinstance(v, str): v = [v]
    if len(v) > n: ERR.append(f'{where} 最多 {n} 行（現在 {len(v)} 行）')
    return [fit(f'{where}[{i}]', x, *specs[min(i, len(specs) - 1)]) for i, x in enumerate(v[:n])]


class Track:
    """主角的動作段落：每段 [a, b) 格、x 從 x0 到 x1、姿勢、模式、可選的 y／旋轉函式"""
    def __init__(self, x):
        self.segs, self.t, self.x, self.bag = [], 0, float(x), True

    def add(self, n, x1=None, pose='stand', ease='l', mode='body', y=None, rot=None, flip=False):
        n = max(1, int(round(n)))
        x1 = self.x if x1 is None else float(x1)
        self.segs.append(dict(a=self.t, b=self.t + n, x0=self.x, x1=x1, pose=pose, ease=ease, mode=mode, y=y, rot=rot,
                              flip=flip, bag=self.bag))
        self.t += n; self.x = x1
        return self.t

    def walk(self, x1, v=WALK, pose='walk', **kw):
        return self.add(math.ceil(abs(x1 - self.x) / v), x1, pose, **kw)

    def until(self, f, **kw):
        if f > self.t: self.add(f - self.t, **kw)
        return self.t

    def sample(self, f):
        s = next((g for g in self.segs if g['a'] <= f < g['b']), self.segs[-1])
        p = min(1.0, max(0.0, (f - s['a']) / max(1, s['b'] - s['a'])))
        e = {'l': p, 's': ss(p), 'o': eo(p)}[s['ease']]
        x = s['x0'] + (s['x1'] - s['x0']) * e
        y = s['y'](p) if s['y'] else 0.0
        rot = s['rot'](p) if s['rot'] else 0.0
        if s['pose'] == 'walk': ph = int(x // 21)
        elif s['pose'] == 'run': ph = int(x // 34)
        else: ph = f // 3
        return x, y, s['pose'], ph, s['flip'], s['bag'], rot, s['mode']


def drive_profile(dip):
    """交通車速度曲線（每格的相對速度）：加速 → 巡航 → 減速慢慢經過看板 → 再加速 → 減速進站"""
    v = [ss((i + 1) / 24) for i in range(24)] + [1.0] * 24
    v += [1 - 0.62 * ss((i + 1) / 14) for i in range(14)]
    mid = len(v) + dip // 2
    v += [0.38] * dip
    v += [0.38 + 0.62 * ss((i + 1) / 14) for i in range(14)] + [1.0] * 20
    v += [1 - ss((i + 1) / 30) for i in range(30)]
    return v, mid


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))
    hold = lambda *s: max(0, math.ceil(nchars(*s) / pace) - 2) * BEAT // 2
    stops = sb.get('stops') or []
    if not isinstance(stops, list): ERR.append('stops 要是陣列（0～3 個站點）'); stops = []
    if len(stops) > 3: ERR.append(f'stops 最多 3 個站點（現在 {len(stops)} 個）')
    room, end = sb.get('room') or {}, sb.get('end') or {}

    # ───── 欄位檢查（上限＝畫面上那塊牌子的寬度）─────
    D = {'stops': [], 'room': {}, 'end': {}}
    for i, s in enumerate(stops[:3]):
        ty = s.get('type'); w = f'stops[{i}]'
        if ty == 'ride':
            D['stops'].append({'type': ty, 'stop': fit(f'{w}.stop 站牌圓牌', s.get('stop'), 50, 150),
                               'board': fit(f'{w}.board 站牌下方板子', s.get('board'), 38, 260),
                               'note': fit(f'{w}.note 站牌便利貼', s.get('note'), 36, 280),
                               'bus': fit(f'{w}.bus 車身字', s.get('bus'), 52, 500),
                               'big': fit(f'{w}.billboard.big 看板大字', (s.get('billboard') or {}).get('big'), 132, 640, False),
                               'small': fit(f'{w}.billboard.small 看板小字', (s.get('billboard') or {}).get('small'), 48, 640)})
        elif ty == 'building':
            D['stops'].append({'type': ty, 'sign': fit(f'{w}.sign 入口招牌', s.get('sign'), 64, 440, False),
                               'board': lines(f'{w}.board 黑板', s.get('board'), 2, [(48, 500)])})
        elif ty == 'pool':
            D['stops'].append({'type': ty, 'sign': fit(f'{w}.sign 水池告示牌', s.get('sign'), 80, 330, False)})
        else:
            ERR.append(f'{w}.type 只能是 ride／building／pool（現在是「{ty}」）')
    D['room'] = {'easel': lines('room.easel 門口小黑板', room.get('easel'), 3, [(44, 290), (36, 290), (66, 290)]),
                 'plate': lines('room.plate 門牌', room.get('plate'), 2, [(40, 240), (52, 240)]),
                 'tag': fit('room.tag 冷氣吊牌', room.get('tag'), 38, 180),
                 'note': fit('room.note 書桌便條', room.get('note'), 38, 280)}
    D['end'] = {'name': fit('end.name 名稱', end.get('name'), 150, 1000, False),
                'slogan': fit('end.slogan 標語', end.get('slogan'), 74, 1000),
                'url': fit('end.url 網址或電話', end.get('url'), 46, 1000)}
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───── 排時間 ─────
    T = Track(640)
    M = {'doorOpen': 8}
    T.add(14, mode='none')                         # 門還沒開
    T.add(6)                                       # 站在門口
    M['walkStart'] = T.t
    sections = [(0, 'morning')]
    ground = [[-600, 1300, 'road']]
    st, hits, prev_end, prev = [], [], 1300, 'home'

    for i, s in enumerate(D['stops']):
        ty = s['type']; e = {'i': i, 'type': ty, 'd': s}
        if ty == 'ride':
            O = prev_end - 300 if prev == 'home' else prev_end + 100
            KS, BS = O + 380, O - 220
            e.update(O=O, pole=O + 580)
            atStop = T.walk(KS)
            busStop = atStop + 14; busEnter = busStop - 70
            busDoor, board = busStop + 6, busStop + 14
            T.until(busStop + 4, flip=True)          # 回頭看車來了
            T.until(busDoor, flip=False)
            T.until(board, pose='wave')
            doorClose = board + 20
            T.add(doorClose - board, BS + 672, 'walk', y=lambda p: -26 * ss(p * 20 / 8))
            T.add(8, BS + 690, 'walk', y=lambda p: -26)
            go = qb(doorClose + 10)
            dip = 34 + hold(s['big'], s['small'])
            v, mid = drive_profile(dip)
            dist = 3600 + 40 * max(0, dip - 34)
            cum, acc = [], 0.0
            for x in v: acc += x; cum.append(acc)
            cum = [c / acc * dist for c in cum]
            arrive = go + len(v); alight = arrive + 12
            T.until(alight, mode='none')
            AX = BS + dist + 600
            T.x = AX
            T.add(8, AX + 6, 'walk', y=lambda p: -26 * (1 - ss(p)))
            e.update(KS=KS, BS=BS, dist=dist, busEnter=busEnter, busStop=busStop, busDoor=busDoor, board=board,
                     doorClose=doorClose, go=go, arrive=arrive, alight=alight, cum=cum,
                     country=[O + 800, BS + dist - 80], billboard=round(BS + cum[mid] + 760))
            sections.append((go, 'ride')); hits.append((go, 0.015, 7, 0))
            ground.append([O, AX + 120, 'road'])
            prev_end = AX
        elif ty == 'building':
            O = prev_end if prev == 'ride' else (1350 if prev == 'home' else prev_end + 100)
            dx = O - ORIG[ty]; e.update(O=O, dx=dx)
            if T.x < O: T.walk(O)
            bell = T.walk(O + 440)
            sit = T.add(36, O + 1080, 'run')
            stand = T.add(40 + hold(s['sign'], *s['board']), pose='sit')
            T.walk(O + WIDTH[ty])
            e.update(bell=bell, sit=sit, stand=stand, desk=O + 1080)
            sections.append((qb(bell - 12), 'school')); hits.append((bell, 0.02, 6, 0))
            ground += [[O, O + 450, 'road'], [O + 450, O + WIDTH[ty], 'yard']]
            prev_end = O + WIDTH[ty]
        elif ty == 'pool':
            O = prev_end if prev in ('ride', 'building') else (1350 if prev == 'home' else prev_end + 100)
            dx = O - ORIG[ty]; e.update(O=O, dx=dx)
            if T.x < O + 150: T.walk(O + 150)
            secStart = qb(T.t)
            arr = T.walk(O + 540)
            T.bag = True
            jump = arr + 12
            while (jump + 24 - secStart) % BEAT: jump += 1   # 落水在拍點上
            T.add(jump - arr, pose='crouch', y=lambda p: -40)
            T.bag = False
            sx = O + 860
            splash = T.add(24, sx, 'jump', y=lambda p: -40 + 120 * p - 800 * p * (1 - p), rot=lambda p: 115 * ss(p))
            surface = T.add(22, mode='none')
            T.x = sx + 20
            climb = T.add(64, O + 1840, mode='swim')
            T.x = O + 1860
            T.add(18, O + 1950, 'walk', y=lambda p: 30 - 60 * ss(p / 0.44) if p < 0.44 else -30 + 30 * ss((p - 0.44) / 0.56))
            T.walk(O + WIDTH[ty])
            e.update(crouch=arr, jump=jump, splash=splash, surface=surface, climb=climb, entry=sx)
            sections.append((secStart, 'pool'))
            hits += [(secStart, 0.015, 0, 0), (splash, 0.06, 4, 14), (climb, 0.015, 0, 0)]
            ground += [[O, O + 400, 'yard'], [O + 400, O + WIDTH[ty], 'deck']]
            prev_end = O + WIDTH[ty]
        st.append(e); prev = ty

    # 最後一站：傍晚的房間 → 自習 → 關燈 → 推進窗戶
    O = {'home': 1350, 'ride': prev_end + 150, 'building': prev_end - 80}.get(prev, prev_end - 30)
    dx = O - ORIG['room']
    r = D['room']
    if T.x < O: T.walk(O)
    roomStart = T.t
    dormDoor = T.walk(O + 450)
    T.add(12 + hold(*r['easel'], *r['plate']))
    T.walk(O + 846)
    acOn = T.t + 4
    if r['tag']: T.add(14 + hold(r['tag']), pose='look')
    T.bag = False
    T.walk(O + 1290)
    sitDesk = T.t + 4
    lampOff = T.add(40 + hold(r['note']), pose='sit') + 8
    T.add(12, pose='reach')
    inBed = T.walk(O + 1870, 12.6, 'run')
    T.add(400, mode='bed')
    zoom = inBed + 8
    text = zoom + 54
    ed = D['end']
    frames = text + 112 + hold(ed['name'], ed['slogan'], ed['url'])
    R = {'type': 'room', 'O': O, 'dx': dx, 'd': r, 'start': roomStart, 'dormDoor': dormDoor, 'acOn': acOn, 'sitDesk': sitDesk,
         'lampOff': lampOff, 'inBed': inBed, 'zoom': zoom, 'text': text, 'chord': text + 6, 'bed': O + 1870, 'desk': O + 1290}
    sections += [(qb(roomStart), 'dusk'), (qb(sitDesk), 'night')]
    hits += [(lampOff, 0.03, 0, 0)]
    ground += [[O, O + 570, 'path'], [O + 570, O + 3700, 'wood']]

    gr, last = [], -1e9                           # 地面不重疊：後一段從前一段結尾接上
    for a, b, t in sorted(ground, key=lambda g: g[0]):
        a = max(a, last)
        if b > a: gr.append([a, b, t]); last = b
    ground = gr

    # ───── 每一格：主角、車 ─────
    K = [T.sample(f) for f in range(frames)]
    kid = {'x': [round(k[0], 1) for k in K], 'y': [round(k[1], 1) for k in K], 'pose': [POSES.index(k[2]) for k in K],
           'ph': [k[3] for k in K], 'flip': [int(k[4]) for k in K], 'bag': [int(k[5]) for k in K],
           'rot': [round(k[6], 1) for k in K], 'mode': [MODES.index(k[7]) for k in K]}
    for e in st:
        if e['type'] != 'ride': continue
        BS, cum = e['BS'], e['cum']

        def bx(f, e=e, BS=BS, cum=cum):
            if f < e['busEnter']: return None
            if f < e['busStop']: return BS - 1540 + 1540 * eo((f - e['busEnter']) / (e['busStop'] - e['busEnter']))
            if f < e['go']: return BS
            if f < e['arrive']: return BS + cum[f - e['go']]
            return BS + e['dist']

        def door(f, e=e):
            a = ss((f - e['busDoor']) / 8) * (1 - ss((f - e['doorClose']) / 8)) if f < e['doorClose'] + 8 else 0
            return max(a, ss((f - e['arrive'] - 4) / 6) if f >= e['arrive'] else 0)
        xs = [bx(f) for f in range(frames)]
        e['bus'] = {'x': [None if x is None else round(x, 1) for x in xs], 'door': [round(door(f), 3) for f in range(frames)]}
        e['bus']['v'] = [0 if (xs[f] is None or f == 0 or xs[f - 1] is None) else round(xs[f] - xs[f - 1], 2) for f in range(frames)]
        del e['cum']

    # ───── 鏡頭：跟拍、只往右、比主角早一點先動 ─────
    def focus(f):
        if f < M['walkStart']: return 640 + f * 1.5
        for e in st:
            if e['type'] == 'ride' and e['go'] - 6 <= f < e['alight']: return e['bus']['x'][f] + 620
            if e['type'] == 'building' and e['sit'] <= f < e['stand']: return e['desk'] + 160
            if e['type'] == 'pool' and e['jump'] < f < e['surface']: return e['entry'] + 60
        if R['sitDesk'] <= f < R['lampOff']: return R['desk'] + 220
        return kid['x'][f]
    cam, c1, c2, pv = [], 0.0, 0.0, 0.0
    for f in range(frames):
        tgt = max(0.0, focus(min(frames - 1, f + 10)) - 820)
        if f == 0: c1 = c2 = tgt
        c1 += (tgt - c1) * 0.085; c2 += (c1 - c2) * 0.085
        pv = max(pv, c2); cam.append(round(pv, 1))

    # ───── 天色：原作 60 秒的色票，依這支的事件位置對齊 ─────
    anchors = [(0, 0), (360, min(360, int(roomStart * 0.4))), (1060, roomStart - 30), (1306, sitDesk), (1530, lampOff), (1800, frames)]

    def remap(of):
        for (a0, b0), (a1, b1) in zip(anchors, anchors[1:]):
            if of <= a1: return round(b0 + (b1 - b0) * (of - a0) / (a1 - a0))
        return frames
    TINT = [(0, '#dde6fa'), (180, '#eef1f6'), (360, '#fffaf0'), (900, '#fff6e2'), (1060, '#ffe4cc'), (1150, '#ffcdb6'), (1250, '#dcbcd0'), (1340, '#a2a8d8')]
    SKY_T = [(0, '#9fc0ea'), (300, '#94ccef'), (700, '#8cc8ee'), (1000, '#9ac6e8'), (1130, '#e48da6'), (1250, '#6a5fa3'), (1360, '#2f3c7c')]
    SKY_B = [(0, '#fbe0d2'), (300, '#fdf2d6'), (700, '#fff3d8'), (1000, '#ffe4c4'), (1130, '#ffbb78'), (1250, '#e19a9a'), (1360, '#56609e')]

    def keys(lst, tail):
        out, last = [], -1
        for of, c in lst:
            f = max(last + 1, remap(of)); out.append([f, c]); last = f
        for f, c in tail:
            f = max(last + 1, f); out.append([f, c]); last = f
        return out
    sky = {'tint': keys(TINT, [(lampOff, '#959fd6'), (lampOff + 6, '#6573b8'), (frames + 10, '#6573b8')]),
           'top': keys(SKY_T, [(frames + 10, '#2b3878')]), 'bot': keys(SKY_B, [(frames + 10, '#4d5a9a')]),
           'night': [remap(1250), remap(1370)], 'sunEnd': remap(1300), 'sunHide': remap(1320), 'streetLamp': remap(1120)}

    # ───── 給畫面與配樂 ─────
    secs = []
    for f, name in sorted(sections):
        if secs and secs[-1][0] >= f: secs[-1] = [f, name]
        else: secs.append([f, name])
    texts = []

    def walk_(v):
        if isinstance(v, str): texts.append(v)
        elif isinstance(v, dict): [walk_(x) for x in v.values()]
        elif isinstance(v, list): [walk_(x) for x in v]
    walk_(D)
    stills = [M['doorOpen'] + 10, M['walkStart'] + 40]
    for e in st:
        if e['type'] == 'ride': stills += [e['board'], e['go'] + 30 + (e['arrive'] - e['go']) // 2 - 50, e['alight'] + 4]
        if e['type'] == 'building': stills += [e['bell'] + 8, e['sit'] + 20]
        if e['type'] == 'pool': stills += [e['jump'] + 12, e['splash'] + 6, e['climb'] - 20]
    stills += [R['dormDoor'] + 6, R['acOn'] + 6, R['sitDesk'] + 20, R['lampOff'] + 10, R['zoom'] + 40, R['text'] + 70, frames - 3]
    stills = sorted(set(min(frames - 1, max(0, s)) for s in stills))
    while len(stills) > 16: stills.pop(len(stills) // 2)
    mids = [s for s in stills if 0.25 * frames < s < 0.7 * frames]
    return {'template': '廣E', 'name': sb.get('name', '一鏡到底'), 'fps': FPS, 'bpm': BPM, 'beat': BEAT, 'frames': frames,
            'marks': M, 'st': st, 'room': R, 'kid': kid, 'cam': cam, 'ground': ground, 'sky': sky, 'hits': hits,
            'sections': secs, 'd': D, 'poses': POSES, 'modes': MODES, 'stills': stills,
            'poster': R['text'] + 80, 'overview': [stills[2], mids[len(mids) // 2] if mids else frames // 2, R['text'] + 80],
            'allText': ''.join(texts) + '0123456789'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    for e in tl['st']:
        print(' ', e['type'], {k: v for k, v in e.items() if isinstance(v, int) and k not in ('i',)})
    print('  room', {k: v for k, v in tl['room'].items() if isinstance(v, int)})
    print('  段落', tl['sections'])
