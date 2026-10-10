"""範本廣H「晶片之旅」時間表：storyboard.json → 時間表（每個事件第幾格、音效時間、畫面上的字、名稱點陣）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（一個不中斷的鏡頭，電子光點帶路，125 BPM）：
  電路板（絲印 board.top／bottom 印出來）→ 推進晶片封裝蓋（雷射刻字 chip.lines）→ 金線 → 彩虹晶粒
  → 降落發光電路城市，光點沿主幹道跑，經過 3～6 座地標逐一點亮（看板字 towers）
  → 衝向邏輯閘、riser → **完全靜音一拍** → drop：神經網路像煙火連鎖點亮（大標 drop）
  → 一路拉遠穿回各層、回到電路板 → 走線把名稱排成方塊點陣（end.name，由這裡用 Pillow 即時產生）→ 標語、網址。
一拍 14.4 格、一小節 57.6 格（原作同值，格數帶小數，配樂用秒）。片長依地標座數、每座字數、名稱字數伸縮。
"""
import glob, math, os

FPS, BPM = 30, 125
B = 60 / BPM * FPS            # 一拍 14.4 格
BAR = 4 * B
ERR = []
GRID = 22                      # 名稱點陣：每個中文字 22×22 格（英數 13 格寬）
HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..', '..'))


def cw(c, latin=0.6): return 1.0 if ord(c) >= 0x2E80 else (0.3 if c == ' ' else latin)
def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def r2(x): return round(x, 2)


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6):
    """字級可在 lo～fs 之間自動縮的欄位：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    size = min(fs, maxw / max(0.1, em(s, latin)))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / lo)} 字、英數約 {int(maxw / lo / latin)} 個）')
        size = lo
    return s, int(size)


def lines(v):
    if v in (None, ''): return []
    return [str(x) for x in v] if isinstance(v, list) else [str(v)]


# ───────────── 名稱點陣（Pillow＋Noto Sans TC；取代原作寫死的 glyphs.json） ─────────────
def find_cjk_font():
    """找一個有繁體中文的字型檔：環境變數 → skill 內 → node_modules → 系統字型"""
    tried = []
    env = os.environ.get('AD_CJK_FONT')
    if env:
        if os.path.exists(env): return env
        tried.append(f'環境變數 AD_CJK_FONT={env}（檔案不存在）')
    pats = ['*NotoSansTC*.[ot]tf', '*NotoSansCJK*.tt[cf]', '*NotoSansCJK*.otf', '*SourceHanSans*.[ot]t[cf]']
    roots = [os.path.join(HERE, 'fonts'), os.path.join(SKILL, 'engine', 'ad', 'fonts'), os.path.join(SKILL, 'fonts')]
    tried.append('skill 內：' + '、'.join(roots))
    nms, seen = [], set()
    for start in (os.getcwd(), HERE):
        p = os.path.abspath(start)
        for _ in range(8):
            for nm in (os.path.join(p, 'node_modules'), os.path.join(p, '_共用', 'node_modules')):
                if os.path.isdir(nm) and nm not in seen: seen.add(nm); nms.append(nm)
            p = os.path.dirname(p)
    tried.append('node_modules：' + ('、'.join(nms) or '（沒找到）'))
    for r in roots:
        for pat in pats:
            hit = sorted(glob.glob(os.path.join(r, '**', pat), recursive=True))
            if hit: return hit[0]
    for nm in nms:
        for depth in ('*', os.path.join('*', '*'), os.path.join('*', '*', '*'), os.path.join('*', '*', '*', '*')):
            for pat in pats:
                hit = sorted(glob.glob(os.path.join(nm, depth, pat)))
                if hit: return hit[0]
    windir = os.environ.get('WINDIR', r'C:\Windows')
    home = os.path.expanduser('~')
    sysf = [os.path.join(windir, 'Fonts', n) for n in ('NotoSansTC-VF.ttf', 'NotoSansTC-Bold.ttf', 'NotoSansTC-Medium.ttf', 'NotoSansTC-Regular.ttf',
                                                        'NotoSansTC-Bold.otf', 'msjhbd.ttc', 'msjh.ttc')]
    sysf += glob.glob(os.path.join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts', '*NotoSansTC*'))
    sysf += ['/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/STHeiti Medium.ttc', '/Library/Fonts/Arial Unicode.ttf']
    sysf += glob.glob(os.path.join(home, 'Library', 'Fonts', '*NotoSansTC*'))
    for pat in ('/usr/share/fonts/**/NotoSansCJK*-Bold.tt[cf]', '/usr/share/fonts/**/NotoSansCJK*.tt[cf]', '/usr/share/fonts/**/NotoSansTC*',
                '/usr/share/fonts/**/wqy-microhei.ttc', os.path.join(home, '.fonts', '**', '*NotoSans*CJK*'), os.path.join(home, '.local', 'share', 'fonts', '**', '*NotoSansTC*')):
        sysf += sorted(glob.glob(pat, recursive=True))
    tried.append('系統字型：Windows Fonts（NotoSansTC、微軟正黑體）、macOS PingFang、Linux /usr/share/fonts（Noto Sans CJK）')
    for p in sysf:
        if os.path.exists(p): return p
    raise ValueError('end.name 名稱點陣要用中文字型，但這台電腦找不到：\n    ' + '\n    '.join(tried) +
                     '\n    解法：把 NotoSansTC（.ttf/.otf）放到 ' + os.path.join(HERE, 'fonts') + '，或設環境變數 AD_CJK_FONT=<字型檔路徑>')


def glyphs(chars):
    """每個字 → 22 列 0/1 字串（中文 22 欄、英數 13 欄）"""
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
    path = find_cjk_font()
    S = 360
    font = ImageFont.truetype(path, int(S * 0.9))
    try: font.set_variation_by_axes([600])
    except Exception: pass
    ref = font.getbbox('國')
    out = []
    for ch in chars:
        wide = ord(ch) >= 0x2E80
        cols = GRID if wide else 13
        Wd = int(S * cols / GRID)
        im = Image.new('L', (Wd, S), 0); d = ImageDraw.Draw(im)
        bb = d.textbbox((0, 0), ch, font=font)
        y0 = (S - (bb[3] - bb[1])) / 2 - bb[1] if wide else (S - (ref[3] - ref[1])) / 2 - ref[1]
        d.text(((Wd - (bb[2] - bb[0])) / 2 - bb[0], y0), ch, 255, font=font)
        a = np.asarray(im.resize((cols, GRID), Image.BOX)) / 255
        rows = [''.join('1' if v > 0.42 else '0' for v in row) for row in a]
        if not any('1' in r for r in rows): ERR.append(f'end.name 的「{ch}」字型 {os.path.basename(path)} 畫不出來')
        out.append({'ch': ch, 'cols': cols, 'rows': rows})
    return out, os.path.basename(path)


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))

    # ───────────── 欄位檢查（上限＝各層畫面上的寬度）─────────────
    bd = sb.get('board') or {}
    btop, btopS = fit('board.top 電路板上方絲印', bd.get('top'), 60, 46, 820)
    bbot, bbotS = fit('board.bottom 電路板下方絲印', bd.get('bottom'), 46, 36, 820)
    ch = sb.get('chip') or {}
    chipL = lines(ch.get('lines'))
    if len(chipL) > 2: ERR.append(f'chip.lines 封裝蓋刻字最多 2 行（現在 {len(chipL)} 行）')
    chip = [fit(f'chip.lines[{i}] 封裝蓋第 {i + 1} 行刻字', x, 86, 58, 1640) for i, x in enumerate(chipL[:2])]
    code, codeS = fit('chip.code 封裝蓋右下小字', ch.get('code'), 40, 30, 820, latin=0.9)

    towers_in = sb.get('towers') or []
    if not 3 <= len(towers_in) <= 6:
        ERR.append(f'towers 城市地標要 3～6 座（現在 {len(towers_in)} 座）')
    towers = [fit(f'towers[{i}] 第 {i + 1} 座地標的看板字', x, 84, 60, 740, False) for i, x in enumerate(towers_in[:6])]

    dropL = lines(sb.get('drop'))
    if len(dropL) > 2: ERR.append(f'drop 大標最多 2 段（現在 {len(dropL)} 段）')
    dropL = dropL[:2]
    dsize = 120
    if dropL:
        tot = sum(em(x) for x in dropL)
        dsize = int(min(120, (1780 - 36 * (len(dropL) - 1)) / max(0.1, tot)))
        if dsize < 76:
            ERR.append(f'drop 大標「{"／".join(dropL)}」太長（兩段合計中文最多約 {int((1780 - 36) / 76)} 字）')
            dsize = 76

    ed = sb.get('end') or {}
    name = str(ed.get('name') or '')
    nchars_ = [c for c in name if not c.isspace()]
    if not name: ERR.append('缺欄位 end.name 最後走線排出的名稱（2～8 字）')
    elif not 2 <= len(nchars_) <= 8: ERR.append(f'end.name 名稱「{name}」要 2～8 個字（現在 {len(nchars_)} 字；太長請用簡稱，全名放 slogan）')
    sl = lines(ed.get('slogan'))
    if len(sl) > 2: ERR.append(f'end.slogan 標語最多 2 段（現在 {len(sl)} 段）')
    sl = sl[:2]
    if len(sl) == 2:
        slogan = [fit(f'end.slogan[{i}] 標語第 {i + 1} 段（左右各半）', x, 80, 56, 880) for i, x in enumerate(sl)]
    else:
        slogan = [fit('end.slogan 標語', x, 80, 56, 1740) for x in sl]
    url, urlS = fit('end.url 網址或電話', ed.get('url'), 44, 32, 1640, latin=0.9)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───────────── 名稱點陣排版（畫面座標）─────────────
    gl, fontfile = glyphs(nchars_)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))
    GAP = 4
    tot = sum(g['cols'] for g in gl) + GAP * (len(gl) - 1)
    cell = round(min(15, 1480 / tot), 2)
    x = 960 - tot * cell / 2
    for g in gl:
        g['x'] = round(x + g['cols'] * cell / 2, 1)
        x += (g['cols'] + GAP) * cell
    nameTop = round(335 - GRID * cell / 2, 1)

    # ───────────── 排時間（以拍為單位）─────────────
    bt = lambda b: r2(b * B)
    pkg = 6                                   # 電路板 1.5 小節（絲印印出、光點沿走線跑進晶片）
    die, wafer, city = pkg + 4, pkg + 8, pkg + 12   # 每一層 1 小節
    land = []
    t = city + 4
    for i, tw in enumerate(towers):
        land.append(t)
        t += 4 if nchars(tw[0]) <= pace else 6        # 字多的看板多停半小節
    drop = land[-1] + 8                       # 最後一座地標後 2 小節：衝向邏輯閘
    gateRun = land[-1] + 2
    silence = drop - 1                        # 完全靜音一拍
    pull = drop + 8                           # drop 2 小節
    PS, board2 = pull + 2, pull + 7           # 拉遠穿回各層 → 回到電路板
    step = 1 if len(gl) <= 4 else 0.5         # 名稱每個字亮起的間隔（拍）
    nameAt = board2 + 2
    nameCh = [nameAt + i * step for i in range(len(gl))]
    slAt = math.ceil(nameCh[-1] + 1.5)
    if not slogan: slAt = nameCh[-1] + 1
    webAt = slAt + (3 if slogan else 1)
    hold = max(0, math.ceil(nchars(*[s for s, _ in slogan], url) / pace) - 4) * 0.5
    endB = (webAt if url else slAt) + 4.5 + hold
    frames = int(math.ceil(endB * B))

    cityBeeps = []
    for lf in land: cityBeeps += [lf - 3, lf - 1.5]
    cityBeeps = [b for b in cityBeeps if b > city + 0.6]
    boardBeeps = [pkg * j / 6 for j in (1, 2, 3, 4, 5)]
    chipBeeps = [a + (z - a) * j / 4 for a, z in ((pkg, die), (die, wafer), (wafer, city)) for j in (1, 2, 3)]
    nnFire = [drop + k * 0.5 for k in range(6)]
    PSf, PEf = PS * B, board2 * B
    pullPass = [PSf] + [PSf + (PEf - PSf) * math.acos(1 - 2 * (4 - z) / 4.1) / math.pi for z in (3, 2, 1)]

    marks = {'board': 0, 'pkg': bt(pkg), 'die': bt(die), 'wafer': bt(wafer), 'city': bt(city), 'gateRun': bt(gateRun),
             'silence': bt(silence), 'drop': bt(drop), 'pull': bt(pull), 'board2': bt(board2), 'name': bt(nameAt),
             'slogan': bt(slAt), 'web': bt(webAt)}
    M = marks
    stills = [12, M['pkg'] - 12, M['pkg'] + 14, M['die'] + 10, M['wafer'] + 14, M['city'] + 30]
    stills += [bt(l) + 22 for l in land]
    stills += [M['gateRun'] + 24, M['silence'] + 6, M['drop'] + 14, M['drop'] + BAR + 26, M['pull'] + 20, pullPass[2],
               M['board2'] + 6, bt(nameCh[-1]) + 14, M['web'] + 16, frames - 3]
    stills = sorted(set(int(min(frames - 1, max(0, s))) for s in stills))
    while len(stills) > 20: stills.pop(len(stills) // 2)

    texts = [btop, bbot, *[c for c, _ in chip], code, *[w for w, _ in towers], *dropL, name, *[s for s, _ in slogan], url]
    return {'template': '廣H', 'name': sb.get('name', '晶片之旅'), 'fps': FPS, 'frames': frames, 'bpm': BPM,
            'beatFrames': r2(B), 'barFrames': r2(BAR), 'marks': marks, 'pitchFrames': r2(1.5 * BAR),
            'pushPass': [M['pkg'], M['die'], M['wafer'], M['city']], 'pullPass': [r2(x) for x in pullPass],
            'land': [bt(l) for l in land], 'boardBeeps': [bt(x) for x in boardBeeps], 'cityBeeps': [bt(x) for x in cityBeeps],
            'chipBeeps': [bt(x) for x in chipBeeps], 'nnFire': [bt(x) for x in nnFire], 'nameCh': [bt(x) for x in nameCh],
            'd': {'board': {'top': btop, 'topSize': btopS, 'bottom': bbot, 'bottomSize': bbotS},
                  'chip': {'lines': [c for c, _ in chip], 'size': min([s for _, s in chip] or [86]), 'code': code, 'codeSize': codeS},
                  'towers': [w for w, _ in towers], 'towerSize': min(s for _, s in towers),
                  'drop': dropL, 'dropSize': dsize,
                  'name': {'text': name, 'glyphs': gl, 'grid': GRID, 'cell': cell, 'top': nameTop, 'font': fontfile},
                  'slogan': [s for s, _ in slogan], 'sloganSize': min([s for _, s in slogan] or [80]), 'url': url, 'urlSize': urlS},
            'stills': stills, 'poster': int(M['drop'] + BAR + 22),
            'overview': [int(bt(land[1]) + 20), int(M['drop'] + BAR + 22), int(frames - 6)],
            'allText': ''.join(texts) + '0123456789/ U'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    m = tl['marks']
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print('  封裝／晶粒／晶圓／城市', m['pkg'], m['die'], m['wafer'], m['city'])
    print('  地標點亮', tl['land'], tl['d']['towers'])
    print('  衝向邏輯閘', m['gateRun'], '靜音', m['silence'], 'drop', m['drop'], '拉遠', m['pull'], '回電路板', m['board2'])
    print('  名稱', tl['d']['name']['text'], '每格', tl['d']['name']['cell'], 'px，字型', tl['d']['name']['font'], '亮起', tl['nameCh'])
    print('  標語', m['slogan'], '網址', m['web'])
    for g in tl['d']['name']['glyphs'][:2]:
        print('\n'.join(r.replace('0', '.').replace('1', '#') for r in g['rows']))
