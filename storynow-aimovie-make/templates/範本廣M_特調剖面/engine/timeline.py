"""範本廣M「特調剖面」時間表：storyboard.json → 時間表（每一層第幾格倒、標註第幾格出現、鏡頭、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（把任何主題包裝成一杯特調的「食譜說明影片」，90 BPM，一拍 20 格，每一層的開始都落在拍上）：
  開場：空杯落在吧台（殘影＋落地壓扁），左邊標題（小膠囊＋一～兩行杯名＋一行小字）
  每一層 layers（2～7 層，照順序）：左邊大標註「步驟 N＋名稱＋份量（可省）＋一句小字」，細線指向杯中那一層；
      倒完縮成右邊小標籤，用折線釘在那一層。型態：
      liquid 液體（瓶子倒）／soda 氣泡（汽水瓶倒，杯裡冒泡）／float 浮層（倒在湯匙背上，浮在最上面）／
      ice 冰塊（一顆一顆掉進杯裡）／stir 攪拌（長柄匙轉圈，前面幾層的交界變柔）／garnish 裝飾（檸檬片、薄荷葉、吸管，最多 3 行小字；只能放最後）
  顏色反應 react（可省）：指定某一層液體，倒完後交界慢慢變成另一個顏色，標註多一行「說明」
  完成：鏡頭拉遠，整杯變成完整剖面圖（右邊一排小標籤）＋「完成！」＋杯名；蓋章（可省）
  收尾：杯子沿吧台滑到黑板旁，鏡頭往右推到黑板：小膠囊、一行（可加重點字）、名稱大字、標語、網址
層數與字數決定片長。
"""
import math
import re

FPS, BPM = 30, 90
BF = 20                    # 一拍 20 格
BAR = 80
CAP = 300                  # 杯子容量（畫面單位；液面最高到 300）
ERR = []

KINDS = ['liquid', 'soda', 'float', 'ice', 'stir', 'garnish']
POUR = ('liquid', 'soda', 'float')
KIND_ZH = {'liquid': '液體', 'soda': '氣泡', 'float': '浮層', 'ice': '冰塊', 'stir': '攪拌', 'garnish': '裝飾'}
# 液體的預設色盤（依序取；可在 layer.color 指定 #RRGGBB）
PALETTE = ['#E59A2E', '#E0607E', '#E8B21E', '#3550D9', '#2FB3A8', '#7A4FC8', '#FF8A1F']   # 相鄰兩色要分得開
KIND_COLOR = {'ice': '#5AA9D6', 'stir': '#E58A3A', 'garnish': '#3FAE6A'}
REACT_COLOR = '#9B4FD0'
VESSELS = ['bottle', 'carafe', 'pitcher']
# 範本自己的介面字（可用 storyboard 的 labels 覆寫）
CHROME = {'step': '步驟', 'done': '完成！'}


def cw(c, latin=0.58):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.58): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def beats(fr): return int(math.ceil(fr / BF - 1e-6)) * BF        # 格數 → 進位到整拍


def fit(where, s, fs, lo, maxw, optional=True, latin=0.58, ls=0.0):
    """字級可在 lo～fs 之間自動縮：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    w = em(s, latin) + ls * len(s)
    size = min(fs, maxw / max(0.1, w))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / (lo * (1 + ls)))} 字、英數約 {int(maxw / (lo * (latin + ls)))} 個）')
        size = lo
    return s, int(size)


def wrap_fit(where, s, fs, lo, maxw, lines=2):
    """可換行的小字：字級 lo～fs，最多 lines 行（可用 \\n 指定換行）"""
    if not s: return '', fs
    s = str(s)
    parts = s.split('\n')
    if len(parts) > lines:
        ERR.append(f'{where}「{s}」最多 {lines} 行'); return s, lo
    for size in range(fs, lo - 1, -1):
        n = sum(max(1, math.ceil(em(p) * size / maxw - 1e-6)) for p in parts)
        if n <= lines: return s, size
    ERR.append(f'{where}「{s}」太長（{lines} 行內中文最多約 {int(maxw / lo) * lines} 字）')
    return s, lo


def color_ok(where, c):
    if c and not re.fullmatch(r'#[0-9A-Fa-f]{6}', str(c)):
        ERR.append(f'{where} 顏色「{c}」要寫成 #RRGGBB'); return False
    return bool(c)


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rf = lambda *ss: nchars(*ss) / pace * FPS                      # 讀完要幾格
    lab = {**CHROME, **(sb.get('labels') or {})}

    # ───────────── 開場標題、頁首 ─────────────
    header, headerS = fit('header 左上頁首', sb.get('header'), 36, 28, 1300)
    ti = sb.get('title') or {}
    ttag, ttagS = fit('title.tag 標題上方小膠囊', ti.get('tag'), 38, 30, 500)
    tl_ = ti.get('lines') or []
    if isinstance(tl_, str): tl_ = [tl_]
    if not 1 <= len(tl_) <= 2: ERR.append(f'title.lines 杯名大字要 1～2 行（現在 {len(tl_)} 行）')
    tlines = []
    for i, x in enumerate(tl_[:2]):
        s, sz = fit(f'title.lines[{i}] 杯名大字', x, 112, 72, 580, False)
        tlines.append([s, sz])
    tsize = min([sz for _, sz in tlines] or [112])
    tsub, tsubS = fit('title.sub 標題下方一行小字', ti.get('sub'), 42, 32, 580)

    # ───────────── 每一層 ─────────────
    LY = sb.get('layers') or []
    if not 2 <= len(LY) <= 7: ERR.append(f'layers 要 2～7 層（現在 {len(LY)} 層）')
    LY = LY[:7]
    kinds = [str((x or {}).get('kind') or 'liquid') for x in LY]
    for i, kd in enumerate(kinds):
        if kd not in KINDS: ERR.append(f'layers[{i}].kind 只能是 {"、".join(KINDS)}（現在「{kd}」）')
    if not any(k in POUR for k in kinds): ERR.append('layers 至少要有一層 liquid、soda 或 float（杯子才會有顏色）')
    if kinds.count('ice') > 1: ERR.append('layers 的 ice 冰塊最多 1 層')
    if kinds.count('garnish') > 1: ERR.append('layers 的 garnish 裝飾最多 1 層')
    if 'garnish' in kinds and kinds.index('garnish') != len(kinds) - 1: ERR.append('layers 的 garnish 裝飾只能放最後一層')
    for i, kd in enumerate(kinds):
        if kd == 'stir' and not any(k in POUR for k in kinds[:i]): ERR.append(f'layers[{i}] stir 攪拌前面要先有液體層')

    rc = sb.get('react') or None
    react_i = None
    if rc:
        ri = rc.get('layer')
        if not isinstance(ri, int) or not 1 <= ri <= len(LY) or kinds[ri - 1] not in POUR:
            ERR.append(f'react.layer 要寫第幾層（1～{len(LY)}），而且那一層要是 liquid、soda 或 float')
        else:
            react_i = ri - 1
        color_ok('react.color', rc.get('color'))
    rtext, rtextS = fit('react.text 顏色反應說明', (rc or {}).get('text'), 44, 34, 560, react_i is None)

    S = []
    pi = 0
    for i, x in enumerate(LY):
        x = x or {}
        kd = kinds[i]
        name, nameS = fit(f'layers[{i}].name 名稱', x.get('name'), 92, 60, 560, False)
        amt = str(x.get('amount') or '').strip()
        unit = str(x.get('unit') or '').strip()
        amtS = 104
        if amt:
            w = em(amt, 0.62) + (em(unit) * 0.54 + 0.14 if unit else 0)
            amtS = int(min(104, 560 / max(0.5, w)))
            if amtS < 64: ERR.append(f'layers[{i}].amount＋unit「{amt}{unit}」太長（數字最多約 7 位＋1～2 字單位）')
            amtS = max(64, amtS)
        elif unit:
            ERR.append(f'layers[{i}].unit 有單位卻沒有 amount 數字（沒有數字就兩個都省略）')
        note, noteS = wrap_fit(f'layers[{i}].note 小字', x.get('note'), 38, 30, 560, 2)
        items = [str(t) for t in (x.get('items') or [])]
        if items and kd != 'garnish': ERR.append(f'layers[{i}].items 只有 garnish 裝飾層可以用')
        if len(items) > 3: ERR.append(f'layers[{i}].items 最多 3 行（檸檬片、薄荷葉、吸管各一行）')
        IT = []
        for j, t in enumerate(items[:3]):
            s, sz = fit(f'layers[{i}].items[{j}] 裝飾小字', t, 54, 38, 500)
            IT.append([s, sz])
        if kd in POUR:
            col = x.get('color') if color_ok(f'layers[{i}].color', x.get('color')) else PALETTE[pi % len(PALETTE)]
        else:
            col = x.get('color') if color_ok(f'layers[{i}].color', x.get('color')) else KIND_COLOR[kd]
        short = x.get('short') or (f'{name} {amt}{unit}'.strip() if kd != 'stir' else '')
        short, shortS = fit(f'layers[{i}].short 右邊小標籤', short, 36, 26, 380)
        count = 6
        if kd == 'ice':
            count = int(x.get('count') or 6)
            if not 3 <= count <= 6: ERR.append(f'layers[{i}].count 冰塊顆數要 3～6'); count = max(3, min(6, count))
        S.append({'kind': kd, 'name': name, 'nameSize': nameS, 'amount': amt, 'unit': unit, 'amountSize': amtS,
                  'note': note, 'noteSize': noteS, 'items': IT, 'color': col, 'short': short, 'shortSize': shortS,
                  'count': count, 'vessel': ('soda' if kd == 'soda' else 'pitcher' if kd == 'float' else VESSELS[pi % 3]) if kd in POUR else '',
                  'react': i == react_i})
        if kd in POUR: pi += 1

    dn = sb.get('done') or {}
    dlabel, dlabelS = fit('labels.done 完成大字', lab['done'], 128, 90, 600)
    dname, dnameS = fit('done.name 完成後的杯名', dn.get('name') or ''.join(s for s, _ in tlines), 58, 40, 620)
    dpill, dpillS = fit('done.pill 杯名下方小膠囊', dn.get('pill'), 34, 28, 560)
    st = sb.get('stamp') or {}
    has_stamp = bool(st.get('main'))
    s_top, s_topS = fit('stamp.top 章上方小字', st.get('top'), 30, 22, 186)
    s_main, s_mainS = fit('stamp.main 章中間大字', st.get('main'), 52, 34, 200)
    s_bot, s_botS = fit('stamp.bottom 章下方小字', st.get('bottom'), 30, 22, 186)
    bd = sb.get('board') or {}
    btag, btagS = fit('board.tag 黑板小膠囊', bd.get('tag'), 40, 30, 740)
    bline, blineS = fit('board.line＋board.em 黑板一行', (bd.get('line') or '') + (bd.get('em') or ''), 42, 30, 800)
    bname, bnameS = fit('board.name 黑板名稱大字', bd.get('name'), 156, 96, 800, False)
    bslog, bslogS = fit('board.slogan 黑板標語', bd.get('slogan'), 64, 44, 800)
    burl, burlS = fit('board.url 網址或電話', bd.get('url'), 42, 30, 800, latin=0.56)
    step_label, _ = fit('labels.step 步驟膠囊', lab['step'], 34, 34, 300)

    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))

    # ───────────── 排時間（格）─────────────
    glassLand = 16
    first = max(80, beats(rf(ttag, *[s for s, _ in tlines], tsub) * 0.7 + 24))
    t = first
    disp_on = False
    for i, s in enumerate(S):
        kd = s['kind']
        read = rf(s['name'], s['amount'], s['unit'], s['note'], *[x for x, _ in s['items']]) * 0.9 + 30
        base = {'liquid': 100, 'soda': 100, 'float': 100, 'ice': 8 + 10 * (s['count'] - 1) + 40, 'stir': 60, 'garnish': 80}[kd]
        dur = beats(max(base, read))
        s['from'] = t
        if kd in POUR:
            s['pour'] = [t + 12, t + dur - 24]
            s['tagAt'] = s['pour'][1] + 6
            if s['react']:
                s['reactAt'] = s['pour'][1] - 8
                dur = max(dur, beats(s['reactAt'] - t + rf(rtext) + 40))
            disp_on = True
        elif kd == 'ice':
            s['ice'] = [t + 8 + 10 * j for j in range(s['count'])]
            s['tagAt'] = s['ice'][-1] + 10
            s['disp'] = 7.5 if disp_on else 0.0
        elif kd == 'stir':
            s['stir'] = [t + 10, t + dur - 14]
        elif kd == 'garnish':
            s['lemon'] = t + 12
            s['mint'] = [t + 32, t + 44]
            s['straw'] = t + 60
            s['tagAt'] = s['straw'] + 6
        s['to'] = t + dur
        t += dur
    reveal = t
    stamp = reveal + 44 if has_stamp else None
    truck = reveal + (76 if has_stamp else 60)
    logo = truck + 26
    end = logo + beats(min(140, max(74, rf(btag, bline, bname, bslog) * 0.6 + rf(burl) * 0.2 + 20)))

    # 每層液體的份量（畫面單位）：杯子裝到 CAP，扣掉冰塊排開的體積，液體層平分
    ice_vol = sum(s['count'] * s['disp'] for s in S if s['kind'] == 'ice')
    npour = sum(1 for s in S if s['kind'] in POUR)
    for s in S:
        s['vol'] = round((CAP - ice_vol) / npour, 2) if s['kind'] in POUR else 0

    # 高潮（全樂團進來）：顏色反應那一層；沒有就最後一層液體；液柱落到液面的那一格
    climax = next((s for s in S if s['react']), None) or [s for s in S if s['kind'] in POUR][-1]
    drop = climax['pour'][0] + 8
    react_at = climax.get('reactAt')
    marks = {'glassLand': glassLand, 'first': first, 'drop': drop, 'riser': [max(first, drop - 80), drop], 'react': react_at,
             'reveal': reveal, 'stamp': stamp, 'truck': truck, 'logo': logo, 'end': end}
    frames = end
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加層，不要編造內容')

    # 抽格
    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [10, first - 16]
    for s in S:
        if s['kind'] in POUR:
            stl += [(s['pour'][0] + s['pour'][1]) // 2]
            if s.get('reactAt'): stl += [s['reactAt'] + 40]
        elif s['kind'] == 'ice': stl += [s['ice'][-1] + 4]
        elif s['kind'] == 'stir': stl += [(s['stir'][0] + s['stir'][1]) // 2]
        else: stl += [s['straw'] + 4]
        stl += [s['to'] - 4]
    stl += [reveal + 36] + ([stamp + 10] if stamp else []) + [truck + 30, logo + 40, frames - 4]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 20: stl.pop(len(stl) // 2)
    poster = cl((stamp + 14) if stamp else reveal + 40)
    ov = [cl(S[0]['to'] - 6), cl(next((s['reactAt'] + 40 for s in S if s.get('reactAt')), S[len(S) // 2]['to'] - 6)), poster]

    allText = ''.join([header, ttag, *[x for x, _ in tlines], tsub, step_label, rtext, dlabel, dname, dpill, s_top, s_main, s_bot,
                       btag, bline, bname, bslog, burl, '0123456789',
                       *[s['name'] + s['amount'] + s['unit'] + s['note'] + s['short'] + ''.join(x for x, _ in s['items']) for s in S]])
    return {'template': '廣M', 'name': sb.get('name', '特調剖面'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beatFrames': BF,
            'marks': marks, 'steps': S,
            'd': {'header': header, 'headerSize': headerS,
                  'title': {'tag': ttag, 'tagSize': ttagS, 'lines': [x for x, _ in tlines], 'size': tsize, 'sub': tsub, 'subSize': tsubS},
                  'stepLabel': step_label,
                  'react': {'text': rtext, 'size': rtextS, 'color': (rc or {}).get('color') or REACT_COLOR},
                  'done': {'label': dlabel, 'labelSize': dlabelS, 'name': dname, 'nameSize': dnameS, 'pill': dpill, 'pillSize': dpillS},
                  'stamp': {'on': has_stamp, 'top': s_top, 'topSize': s_topS, 'main': s_main, 'mainSize': s_mainS, 'bottom': s_bot, 'bottomSize': s_botS},
                  'board': {'tag': btag, 'tagSize': btagS, 'line': bd.get('line') or '', 'em': bd.get('em') or '', 'lineSize': blineS,
                            'name': bname, 'nameSize': bnameS, 'slogan': bslog, 'sloganSize': bslogS, 'url': burl, 'urlSize': burlS}},
            'stills': stl, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    for i, s in enumerate(tl['steps']):
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）步驟 {i + 1} {KIND_ZH[s["kind"]]}：{s["name"]} {s["amount"]}{s["unit"]}')
    m = tl['marks']
    for k in ('drop', 'react', 'reveal', 'stamp', 'truck', 'logo'):
        if m.get(k) is not None: print(f'  第 {m[k]:4d} 格（{m[k] / FPS:5.1f} 秒）{k}')
    print('  字數', len(set(tl['allText'])))
