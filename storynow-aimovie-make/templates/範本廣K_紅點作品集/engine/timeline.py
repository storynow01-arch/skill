"""範本廣K「紅點作品集」時間表：storyboard.json → 時間表（每段第幾格、鏡頭重擊、甩鏡、音樂用的拍點、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（一顆紅點從頭帶到尾，128 BPM 作品集快剪；一拍 14.0625 格，事件都落在半拍或四分之一拍上）：
  開場 open（必備）：紅點從天落下、壓扁回彈，蓋出縮寫大字（一字一拍半），上一行小字、下一行紅色英文
  數字組合 counts（0～4 組，可省）：連續鏡頭一組一組掃過「數字＋單位」，紅點在後面跳，最後拉遠排成一行、上下跑馬燈
  鑽進紅點 → 紅底：
    劃掉換數字 swap（可省）：前一個值滾出來、被一刀劃掉、碎掉掉下去，後一個值砸上來（只在文本真的有「前→後」兩個值時用）
    省略 swap 時只留一拍紅底轉場
  紅點縮成米白小點 → 圓形炸開 DROP：
  大數字 stats（0～3 個，可省）：第 1 個是星形 DROP 大數字，之後甩鏡換圓環大數字（％ 會畫成比例）
  名稱一刀刀疊上 names（0 或 2～9 個，可省）：膠囊小標＋名稱從右邊一刀刀滑進來往上疊
  全部吸回紅點 → LOGO 重擊（必備）：紅圓裡是縮寫、旁邊名稱、底線、標語兩段、網址
段落省略時片長跟著縮短；內容少時最短約 15 秒。
"""
import math

FPS, BPM = 30, 128
BEAT = 60 / BPM            # 0.46875 秒
BF = BEAT * FPS            # 一拍 14.0625 格
ERR = []


def cw(c, latin=0.55):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.55): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def fr(b): return round(b * BF, 3)
def half(x): return math.ceil(x * 2 - 1e-6) / 2


def fit(where, s, fs, lo, maxw, optional=True, latin=0.55, ls=0.0):
    """字級可在 lo～fs 之間自動縮（ls＝每字字距 px）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    n = len(s)
    size = min(fs, (maxw - ls * n) / max(0.1, em(s, latin)))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / (lo + ls))} 字、英數約 {int(maxw / (lo * latin + ls))} 個）')
        size = lo
    return s, int(size)


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))           # 每秒讀幾個字（快剪：只算主要的字）
    read = lambda *ss: nchars(*ss) / pace / BEAT   # 讀完要幾拍

    # ───────────── 開場：縮寫大字 ─────────────
    op = sb.get('open') or {}
    mark = str(op.get('mark') or '').strip()
    if not 1 <= len(mark) <= 8: ERR.append(f'open.mark 縮寫大字要 1～8 個字（現在「{mark}」{len(mark)} 個；英文縮寫或 2～4 字的名稱）')
    slots = [cw(c, 0.53) for c in mark] or [1]
    markS = min(520, 1600 / sum(slots))
    if markS < 220: ERR.append(f'open.mark 縮寫大字「{mark}」太長（英文最多約 8 個、中文最多約 6 字）')
    markS = int(max(220, markS))
    above, aboveS = fit('open.above 縮寫上方小字', op.get('above'), 56, 40, 1700, ls=6)
    below, belowS = fit('open.below 縮寫下方紅字（英文為主）', op.get('below'), 46, 32, 1700, latin=0.5, ls=14)

    # ───────────── 數字組合 ─────────────
    counts = sb.get('counts') or []
    if len(counts) > 4: ERR.append(f'counts 數字組合最多 4 組（現在 {len(counts)} 組）')
    C = []
    for i, c in enumerate(counts[:4]):
        num = str(c.get('num') or '').strip(); unit = str(c.get('unit') or '').strip()
        if not num: ERR.append(f'缺欄位 counts[{i}].num 數字')
        if len(num) > 5: ERR.append(f'counts[{i}].num「{num}」太長（最多 5 個字元，例 3000、12、1.5）')
        if em(unit) > 4: ERR.append(f'counts[{i}].unit「{unit}」太長（單位最多約 4 字）')
        C.append({'num': num, 'unit': unit})
    ticker = [str(x) for x in (sb.get('ticker') or [])]
    if sum(em(x) for x in ticker) > 60: ERR.append('ticker 跑馬燈合計太長（全部合計最多約 60 字）')

    # ───────────── 劃掉換數字 ─────────────
    sw = sb.get('swap') or None
    SW = None
    if sw:
        lab, labS = fit('swap.label 紅底上方標題', sw.get('label'), 124, 80, 1700, ls=10)
        frm = str(sw.get('from') or ''); fu = str(sw.get('fromUnit') or '')
        to = str(sw.get('to') or ''); tu = str(sw.get('unit') or '')
        if not frm or not to: ERR.append('swap 要有 from（前一個值）與 to（後一個值）兩個欄位；文本沒有前後兩個值就整段省略')
        fromS = min(380, 1500 / max(0.5, em(frm, 0.57) + em(fu) * 0.37))
        if fromS < 200: ERR.append(f'swap.from「{frm}{fu}」太長（數字最多約 6 位、中文最多約 4 字）')
        toS = min(640, 1050 / max(0.5, em(to, 0.5) + em(tu) * 0.32 + 0.05))
        if toS < 300: ERR.append(f'swap.to「{to}{tu}」太長（後一個值最多約 4 個數字＋1～2 字單位）')
        note, noteS = fit('swap.note 紅底下方說明', sw.get('note'), 50, 38, 1700, ls=4)
        SW = {'label': lab, 'labelSize': labS, 'from': frm, 'fromUnit': fu, 'fromSize': int(max(200, fromS)),
              'to': to, 'unit': tu, 'toSize': int(max(300, toS)), 'note': note, 'noteSize': noteS}

    # ───────────── 大數字 ─────────────
    stats = sb.get('stats') or []
    if isinstance(stats, dict): stats = [stats]
    if len(stats) > 3: ERR.append(f'stats 大數字最多 3 個（現在 {len(stats)} 個）')
    ST = []
    for i, s in enumerate(stats[:3]):
        star = i % 2 == 0
        val = str(s.get('value') or ''); unit = str(s.get('unit') or '')
        if not val: ERR.append(f'缺欄位 stats[{i}].value 大數字')
        lab, labS = fit(f'stats[{i}].label 大數字上方標題', s.get('label'), 66, 48, 1700, ls=8)
        note, noteS = fit(f'stats[{i}].note 大數字下方說明', s.get('note'), 50, 38, 1700, ls=4)
        if star:
            vs = min(560, 1150 / max(0.5, em(val, 0.58) + em(unit, 0.5) * 0.46))   # 星形直徑約 960：字可以壓出星形一點，不要大太多
            if vs < 230: ERR.append(f'stats[{i}] 星形大數字「{val}{unit}」太長（最多約 7 個字元＋1～2 字單位）')
        else:
            vs = min(300, 480 / max(0.5, em(val, 0.6) + em(unit, 0.5) * 0.5))   # 圓環內徑約 590，左右留白
            if vs < 140: ERR.append(f'stats[{i}] 圓環大數字「{val}{unit}」太長（最多約 5 個字元，例 80%、12:10）')
        try:
            pct = float(val) / 100 if unit in ('%', '％') and 0 < float(val) <= 100 else 1.0
        except ValueError:
            pct = 1.0
        ST.append({'value': val, 'unit': unit, 'size': int(max(230 if star else 140, vs)), 'label': lab, 'labelSize': labS, 'note': note,
                   'noteSize': noteS, 'shape': 'star' if star else 'ring', 'pct': pct})

    # ───────────── 名稱一刀刀疊上 ─────────────
    names = sb.get('names') or []
    if names and not 2 <= len(names) <= 9: ERR.append(f'names 名稱要 2～9 個（現在 {len(names)} 個；不要這段就整段省略）')
    NM = []
    for i, n in enumerate(names[:9]):
        if isinstance(n, str): n = {'name': n}
        tag, tagS = fit(f'names[{i}].tag 膠囊小標', n.get('tag'), 44, 34, 200)
        pw = int(max(150, em(tag) * tagS + 56)) if tag else 0
        nm, nmS = fit(f'names[{i}].name 名稱', n.get('name'), 128, 84, 1920 - 420 - pw - 36 - 60, False)
        NM.append({'tag': tag, 'tagSize': tagS, 'pillW': pw, 'name': nm, 'size': nmS})

    # ───────────── LOGO ─────────────
    lg = sb.get('logo') or {}
    lmark = str(lg.get('mark') or mark)
    lmarkS = min(130, 320 / max(0.5, em(lmark, 0.5)))
    if lmarkS < 64: ERR.append(f'logo.mark 紅圓裡的縮寫「{lmark}」太長（英文最多約 9 個、中文 4 字；可另寫 logo.mark）')
    lname, lnameS = fit('logo.name 名稱', lg.get('name'), 210, 110, 1060, False, ls=6)
    slog = lg.get('slogan') or []
    if isinstance(slog, str): slog = [slog]
    slog = [str(x) for x in slog[:2]]
    sw_ = sum(em(x) for x in slog) + (1 if len(slog) > 1 else 0)
    slogS = int(min(84, 1060 / max(1, sw_ + 0.05 * nchars(*slog))))
    if slog and slogS < 56: ERR.append(f'logo.slogan 標語「{"　".join(slog)}」太長（兩段合計最多約 17 字）')
    url, urlS = fit('logo.url 網址或電話', lg.get('url'), 48, 32, 1060, latin=0.5, ls=6)

    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))

    # ───────────── 排拍子（單位：拍）─────────────
    scenes = []
    hits = []           # [拍, 強度]
    t = 0.0
    land = 1.0
    letters = [2.0 + 0.5 * i for i in range(len(mark))]
    a_end = max(4.0, half(letters[-1] + 1.0 + max(0, read(above) - 2.5)))
    hits += [[land, 1.0]] + [[b, 0.55] for b in letters]
    A = {'kind': 'open', 'a': 0.0, 'land': land, 'letters': letters, 'above': letters[min(1, len(letters) - 1)],
         'below': letters[min(2, len(letters) - 1)]}
    scenes.append(A)
    t = a_end
    if C:
        h = [t + 2 * i for i in range(len(C))]
        asm = t + 2 * len(C)
        dive = asm + 1.5 if (ticker or len(C) > 1) else asm + 0.5
        red = dive + 1.0
        hits += [[x, 0.8] for x in h] + [[asm, 0.5]]
        scenes.append({'kind': 'counts', 'a': t, 'h': h, 'assemble': asm, 'dive': dive})
        A['out'] = 'whip'
    else:
        dive = t; red = t + 1.0
        A['out'] = 'dive'; A['dive'] = dive
    if SW:
        roll_end = red + 1.25; strike = red + 2.0; drop = red + 2.5; zero = red + 3.0
        gap = zero + half(max(1.0, read(SW['label'], SW['note']) - 3.0))
        hits += [[zero, 1.0]]
        R = {'kind': 'swap', 'a': red, 'rollEnd': roll_end, 'strike': strike, 'drop': drop, 'zero': zero, 'gap': gap}
    else:
        gap = red + 1.0
        R = {'kind': 'bridge', 'a': red, 'gap': gap}
    boom = gap + 0.5
    R['boom'] = boom
    scenes.append(R)
    hits += [[boom, 1.3]]
    t = boom
    for i, s in enumerate(ST):
        dur = max(4.0, half(1.5 + read(s['label'], s['note'])))
        e = {'kind': 'stat', 'i': i, 'a': t, 'in': 'boom' if i == 0 else 'whip', 'outWhip': True}   # 每個大數字都甩鏡離場
        if i: hits += [[t, 0.9]]
        scenes.append(e)
        t += dur
    if NM:
        sp = [0.5] * min(5, len(NM)) + [0.25] * max(0, len(NM) - 5)
        N = [t]
        for x in sp[1:]: N.append(N[-1] + x)
        hold = half(min(4.0, max(1.0, 0.6 * read(*[n['name'] for n in NM]) - (N[-1] - N[0]) - 1.0)))   # 疊上時已經在讀，只補不足的
        collapse = N[-1] + hold + 0.25
        logo = collapse + 0.75
        hits += [[x, 0.3] for x in N]
        scenes.append({'kind': 'names', 'a': t, 'n': N, 'collapse': collapse})
    else:
        logo = t
    # 沒有大數字也沒有名稱：紅點炸開直接是 LOGO
    hits += [[logo, 1.4]]
    slogan_b = logo + 1.5
    tail = half(max(4.0, 1.0 + read(*slog) + 0.5 * read(url)))
    end = slogan_b + tail
    scenes.append({'kind': 'logo', 'a': logo, 'slogan': slogan_b})
    for i in range(len(scenes) - 1): scenes[i]['b'] = scenes[i + 1]['a']
    scenes[-1]['b'] = end
    frames = int(math.ceil(end * BF))
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加段落（counts 數字組合、stats 大數字、names 名稱、swap 前後兩個值），'
                         '或改用一句話就能撐住的範本；不要編造內容')

    # 換段時背景點陣先動（比前景早 10 格）：每個甩鏡進場的段
    slides = [s['a'] for s in scenes if s['kind'] == 'counts' or (s['kind'] == 'stat' and s['in'] == 'whip')
              or (s['kind'] == 'names' and ST)]

    # 換成格數（畫面用）
    def F(x):
        if isinstance(x, list): return [F(y) for y in x]
        if isinstance(x, (int, float)) and not isinstance(x, bool): return fr(x)
        return x
    keep = {'kind', 'i', 'in', 'out', 'outWhip'}
    scF = [{k: (v if k in keep else F(v)) for k, v in s.items()} for s in scenes]

    # 抽格
    fpos = lambda b: int(min(frames - 1, max(0, round(b * BF))))
    st = [fpos(land) + 6, fpos(letters[-1]) + 8]
    poster = None
    for s in scenes:
        k = s['kind']
        if k == 'counts':
            st += [fpos(x) + 10 for x in s['h']] + [fpos(s['assemble']) + 12]
        elif k == 'swap':
            st += [fpos(s['a']) + 14, fpos(s['strike']) + 4, fpos(s['zero']) + 10]
        elif k == 'bridge':
            st += [fpos(s['a']) + 4]
        elif k == 'stat':
            st += [fpos(s['a']) + 24]
            if poster is None: poster = fpos(s['a']) + 24
        elif k == 'names':
            st += [fpos(s['n'][-1]) + 8, fpos(s['collapse']) + 5]
        elif k == 'logo':
            st += [fpos(s['a']) + 8, fpos(s['slogan']) + 20, frames - 6]
    st = sorted(set(st))
    while len(st) > 20: st.pop(len(st) // 2)
    if poster is None: poster = fpos(slogan_b) + 20
    mid = next((fpos(s['assemble']) + 12 for s in scenes if s['kind'] == 'counts'), fpos(letters[-1]) + 8)
    ov = [mid, poster, frames - 10]

    allText = ''.join([mark, above, below, *[c['num'] + c['unit'] for c in C], *ticker,
                       *([SW['label'], SW['from'], SW['fromUnit'], SW['to'], SW['unit'], SW['note']] if SW else []),
                       *[s['value'] + s['unit'] + s['label'] + s['note'] for s in ST],
                       *[n['tag'] + n['name'] for n in NM], lmark, lname, *slog, url])
    return {'template': '廣K', 'name': sb.get('name', '紅點作品集'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beatFrames': BF,
            'scenes': scF, 'beats': scenes, 'hits': [[fr(b), a] for b, a in hits], 'slides': [fr(b) for b in slides],
            'end': end,
            'd': {'mark': mark, 'markSize': markS, 'slots': slots, 'above': above, 'aboveSize': aboveS, 'below': below, 'belowSize': belowS,
                  'counts': C, 'ticker': ticker, 'swap': SW, 'stats': ST, 'names': NM,
                  'logo': {'mark': lmark, 'markSize': int(max(64, lmarkS)), 'name': lname, 'nameSize': lnameS, 'slogan': slog,
                           'sloganSize': slogS, 'url': url, 'urlSize': urlS}},
            'stills': st, 'poster': int(poster), 'overview': ov,
            'allText': allText + '0123456789%●'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', round(tl['end'], 2), '拍）')
    for s in tl['beats']:
        print(f"  {s['kind']:7s} 第 {s['a']:6.2f} 拍（第 {fr(s['a']):7.1f} 格）～ 第 {s['b']:6.2f} 拍")
    print('  字數', len(set(tl['allText'])))
