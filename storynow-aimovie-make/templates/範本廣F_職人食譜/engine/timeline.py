"""範本廣F「職人食譜」時間表：storyboard.json → 時間表（黑板每一行字的位置與書寫格、手的動作、料理檯道具、烤箱、上菜、鏡頭）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定：俯拍料理檯，主廚的手把任何主題寫成一份食譜——
  黑板寫標題／副標／出處 → 板擦擦掉、鏡頭拉開
  → 材料 1～4 項（每寫一項，料理檯上滑進一組道具，手過去剁蔥／敲蛋／倒牛奶拉花／打蛋，回黑板打勾）
  → 步驟 1～4 項（大字＋小字說明；道具滑進來，有的手會撒香料、放莓果，寫完打勾）
  → 道具全部飛進烤盤 → 推進烤箱、轉計時器、滴答倒數 →「叮！」→ 開門端出盤子，醬汁在盤上寫出名稱、撒裝飾
  → 黑板寫「上菜！」與結語，手放上出處小卡（網址或電話）。
材料、步驟兩段可以省略其中一段；項數 1～4，黑板版面依項數置中。100 BPM、一拍 18 格；寫字時間依字數。
"""
import math

FPS, BPM, BEAT, BAR = 30, 100, 18, 72
ERR = []
COUNTER = (880, 1890)          # 料理檯可擺道具的橫向範圍（黑板佔 30～790）
TX, HX = 170, 100              # 黑板：項目文字的左緣、標題的左緣
BL, BR = 70, 750               # 黑板可寫字的左右邊界
TOP, BOT = 186, 972            # 標題縮到頂端後，下面可用的高度
MAT_KINDS = ['chop', 'egg', 'pour', 'whisk']        # 材料第 1～4 項的道具與手的動作
STEP_KINDS = ['tent', 'cloche', 'spice', 'cake']    # 步驟第 1～4 項的道具
HS, MS, SS, NS, AS = 84, 62, 58, 42, 50            # 字級：段落標題、材料項目、步驟項目、步驟小字、上菜頁一句話（原作 58／44／46／38／46，太小太淡）


def cw(c): return 1.0 if ord(c) >= 0x2E80 else (0.3 if c == ' ' else 0.6)
def em(s): return sum(cw(c) for c in str(s))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def qb(f): return int(math.ceil(f / BEAT) * BEAT)
def clamp(v, a, b): return max(a, min(b, v))


def fit(where, s, fs, maxw, optional=True):
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    s = str(s)
    w = em(s) * fs
    if w > maxw:
        ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw} 像素；中文最多約 {int(maxw / fs)} 字、英數約 {int(maxw / fs / 0.6)} 個）')
    return s


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))
    hold = lambda *s: max(0, math.ceil(nchars(*s) / pace) - 3) * BEAT // 2

    # ───── 欄位檢查（上限＝黑板、小籤、盤子、小卡的寬度）─────
    title = fit('title 黑板標題', sb.get('title'), 132, 680, False)
    sub = fit('sub 副標', sb.get('sub'), 50, 680)
    frm = fit('from 出處', sb.get('from'), 40, 680)

    def section(key, label, kinds):
        v = sb.get(key)
        if v in (None, '', {}, []): return None
        if isinstance(v, list): v = {'items': v}
        items = v.get('items') or []
        if not 1 <= len(items) <= 4:
            ERR.append(f'{key}.items {label}要 1～4 項（現在 {len(items)} 項；整段不要就把 {key} 拿掉）')
        out = []
        for i, it in enumerate(items[:4]):
            if isinstance(it, str): it = {'text': it}
            if key == 'materials':
                out.append({'text': fit(f'{key}.items[{i}].text {label}', it.get('text'), MS, 590, False),
                            'tag': fit(f'{key}.items[{i}].tag 料理檯小籤', it.get('tag'), 34, 180), 'kind': kinds[i]})
            else:
                out.append({'text': fit(f'{key}.items[{i}].text {label}', it.get('text'), SS, 520, False),
                            'note': fit(f'{key}.items[{i}].note 小字說明', it.get('note'), NS, 590), 'kind': kinds[i]})
        return {'head': fit(f'{key}.head 段落標題', v.get('head', label), HS, 640), 'items': out}

    mats = section('materials', '材料', MAT_KINDS)
    steps = section('steps', '步驟', STEP_KINDS)
    if not mats and not steps: ERR.append('materials（材料）和 steps（步驟）至少要有一段')
    ov = sb.get('oven') or {}
    oven = {'head': fit('oven.head 烤箱頁標題', ov.get('head', '放進烤箱'), 84, 680),
            'note': fit('oven.note 烤箱頁小字', ov.get('note'), 56, 680),
            'ding': fit('oven.ding 叮', ov.get('ding', '叮！'), 180, 680)}
    sv = sb.get('serve') or {}
    big = sv.get('big') or []
    if isinstance(big, str): big = [big]
    if len(big) > 2: ERR.append(f'serve.big 大字最多 2 行（現在 {len(big)} 行）')
    serve = {'head': fit('serve.head 上菜頁標題', sv.get('head', '上菜！'), HS, 680),
             'line': fit('serve.line 上菜頁一句話', sv.get('line'), AS, 680),
             'big': [fit(f'serve.big[{i}] 大字', x, 96, 680) for i, x in enumerate(big[:2])]}
    pl = sb.get('plate') or {}
    pname = fit('plate.name 醬汁寫的名稱', pl.get('name'), 64, 470, False)
    psize = clamp(int(450 / max(1, em(pname))), 64, 100)
    plate = {'name': pname, 'size': psize, 'over': fit('plate.over 名稱上方小字', pl.get('over'), 40, 440)}
    cd = sb.get('card') or {}
    card = {'head': fit('card.head 小卡標題', cd.get('head', '食譜出處' if cd.get('url') else ''), 34, 400),
            'url': fit('card.url 網址或電話', cd.get('url'), 30, 420)}
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───── 黑板版面 ─────
    L, pages, w, tasks, erase = {}, [], {}, [], []

    def line(id, text, x, y, size, color, align='left', bullet=None):
        tw = em(text) * size
        L[id] = {'kind': 'text', 'text': text, 'x': x, 'y': round(y), 'size': size, 'color': color, 'align': align,
                 'bullet': bullet, 'w': round(tw), 'left': round(x - tw / 2 if align == 'center' else x)}

    def tick(id, x, y):
        L[id] = {'kind': 'tick', 'x': round(x), 'y': round(y), 'color': 'pink', 'w': 44, 'left': round(x)}

    def stack(rows, top=TOP, bot=BOT):
        """rows：[(高度, 之後的間距)]，整組在 top～bot 之間垂直置中，回傳每列的 y"""
        hs = sum(h for h, g in rows); gs = sum(g for h, g in rows[:-1])
        z = min(1.0, max(0.3, (bot - top - hs) / gs)) if gs else 1.0      # 太高時先把行距縮小（字級不變）
        H = hs + gs * z
        y = top + max(0, (bot - top - H) / 2)
        ys = []
        for h, g in rows: ys.append(y); y += h + g * z
        return ys

    # 第 0 頁：標題（擦黑板時縮到頂端留著）、副標、出處
    rows = [(132 * 1.35, 30)] + ([(50 * 1.35, 18)] if sub else []) + ([(40 * 1.35, 0)] if frm else [])
    ys = stack(rows, 120, 820)
    line('title', title, 410, ys[0], 132, 'chalk', 'center')
    p0 = ['title']
    if sub: line('sub', sub, 410, ys[1], 50, 'chalk', 'center'); p0.append('sub')
    if frm: line('from', frm, 410, ys[-1], 40, 'blue', 'center'); p0.append('from')
    pages.append(p0)

    if mats:
        n = len(mats['items'])
        rows = [(HS * 1.35, 44)] + [(MS * 1.35, 48)] * n
        ys = stack(rows)
        line('mat', mats['head'], HX, ys[0], HS, 'yellow'); pg = ['mat']
        for i, it in enumerate(mats['items']):
            line(f'm{i}', it['text'], TX, ys[i + 1], MS, 'chalk', bullet='box')
            tick(f'k{i}', TX - 66, ys[i + 1] + MS * 0.22 + 7)
            pg += [f'm{i}', f'k{i}']
        pages.append(pg)
    if steps:
        rows = [(HS * 1.35, 40)]
        for it in steps['items']:
            rows.append((SS * 1.35, 4 if it['note'] else 44))
            if it['note']: rows.append((NS * 1.35, 44))
        ys = stack(rows)
        line('steps', steps['head'], HX, ys[0], HS, 'yellow'); pg = ['steps']; r = 1
        for i, it in enumerate(steps['items']):
            line(f's{i}', it['text'], TX, ys[r], SS, 'chalk', bullet=str(i + 1)); pg.append(f's{i}')
            tick(f'c{i}', TX + em(it['text']) * SS + 18, ys[r] + SS * 0.4); r += 1
            if it['note']: line(f'n{i}', it['note'], TX, ys[r], NS, 'blue'); pg.append(f'n{i}'); r += 1
            pg.append(f'c{i}')
        pages.append(pg)
    rows = [(84 * 1.35, 24)] + ([(56 * 1.35, 60)] if oven['note'] else []) + [(180 * 1.35, 0)]
    ys = stack(rows)
    line('oven', oven['head'], HX, ys[0], 84, 'yellow'); pg = ['oven']
    if oven['note']: line('ovenb', oven['note'], HX, ys[1], 56, 'chalk'); pg.append('ovenb')
    line('ding', oven['ding'], 410, ys[-1], 180, 'pink', 'center'); pg.append('ding')
    pages.append(pg)
    rows = [(HS * 1.35, 30)] + ([(AS * 1.35, 60)] if serve['line'] else []) + [(96 * 1.35, 14)] * len(serve['big'])
    ys = stack(rows)
    line('serve', serve['head'], HX, ys[0], HS, 'yellow'); pg = ['serve']; r = 1
    if serve['line']: line('aes', serve['line'], HX, ys[1], AS, 'chalk'); pg.append('aes'); r = 2
    for i, b in enumerate(serve['big']):
        line(f'y{i}', b, 410, ys[r + i], 96, 'yellow' if i == 0 else 'pink', 'center'); pg.append(f'y{i}')
    pages.append(pg)

    def wdur(id, per, lo, hi):
        return clamp(int(per * nchars(L[id]['text']) + 6), lo, hi)

    def write(id, at, dur=None):
        if dur is None: dur = 8 if L[id]['kind'] == 'tick' else wdur(id, 2.5, 16, 40)
        w[id] = [at, dur]; tasks.append({'type': 'write', 'id': id, 'a': at - 2, 'b': at + dur})
        return at + dur

    def page_text(i): return [L[x]['text'] for x in pages[i] if L[x]['kind'] == 'text']

    # ───── 料理檯道具的欄位 ─────
    props, ev = [], {}

    def cols(n):
        cwid = min(360, (COUNTER[1] - COUNTER[0]) / n)
        mid = (COUNTER[0] + COUNTER[1]) / 2
        return [mid + (i - (n - 1) / 2) * cwid for i in range(n)], min(1.0, cwid / 340)

    def prop(id, kind, at, x, y, s=1.0, rot=0, frm='top', **kw):
        props.append(dict(id=id, kind=kind, at=at, x=round(x), y=round(y), s=round(s, 3), rot=rot, frm=frm, **kw))

    # ───── 排時間 ─────
    t = write('title', 14, wdur('title', 6, 24, 42)) + 6
    if sub: t = write('sub', t, wdur('sub', 2, 14, 32)) + 4
    if frm: t = write('from', t, wdur('from', 1.5, 12, 26))
    t = qb(t + 14 + hold(*page_text(0)) // 2)
    erase.append([t, 24]); E0 = t
    cam = [[0, 1.22, 160, 470], [E0, 1.22, 160, 470], [E0 + 46, 1, 960, 540]]
    kicks = []
    sec = {'intro': 0}
    t = E0 + 26
    sec['groove'] = qb(E0 + 12)

    if mats:
        t = write('mat', t, 14) + 4
        xs, sc = cols(len(mats['items']))
        for i, it in enumerate(mats['items']):
            a = t
            t = write(f'm{i}', a)
            cx, cy, k = xs[i], (300 if steps else 400), it['kind']
            A = t + 12
            if k == 'chop':
                hits = [A + 10 + 8 * j for j in range(4)]
                prop(f'p{i}', 'cut', a + 10, cx, cy, sc, -5, hits=hits)
                tasks.append({'type': 'chop', 'a': A, 'b': hits[-1] + 8, 'x': round(cx + 80 * sc), 'y': round(cy - 86 * sc), 'hits': hits, 'gap': 8, 'sc': sc})
                kicks += [[h, 0.012] for h in hits]
                end = hits[-1] + 8
            elif k == 'egg':
                prop(f'p{i}a', 'flour', a + 6, cx - 70 * sc, cy - 40, sc * 0.8, 6)
                go, crack = A + 6, A + 20
                prop(f'p{i}', 'bowl', a + 14, cx + 62 * sc, cy + 30, sc * 0.9, 0, crack=crack)
                tasks.append({'type': 'egg', 'a': A, 'b': crack + 10, 'x0': round(cx - 40), 'y0': round(cy - 150), 'x1': round(cx + 62 * sc), 'y1': round(cy - 32),
                              'go': go, 'crack': crack})
                kicks.append([crack, 0.012]); end = crack + 10
            elif k == 'pour':
                p0, p1 = A + 6, A + 34
                prop(f'p{i}', 'cup', a + 10, cx, cy, sc, 0, pour=[p0, p1])
                tasks.append({'type': 'pour', 'a': A, 'b': p1 + 4, 'x': round(cx - 110 * sc), 'y': round(cy - 56 * sc), 'p0': p0, 'p1': p1})
                end = p1 + 4
            else:
                w0, w1 = A + 4, A + 30
                prop(f'p{i}', 'whisk', a + 10, cx, cy, sc, 0, mix=[w0, w1])
                tasks.append({'type': 'whisk', 'a': A, 'b': w1 + 4, 'x': round(cx), 'y': round(cy), 'w0': w0, 'w1': w1, 'sc': sc})
                end = w1 + 4
            ev[f'act{i}'] = [A, end]
            if it['tag']: prop(f'g{i}', 'tag', a + 18, cx - 10, cy + 172, min(1.0, sc * 1.05), -3 + 4 * (i % 2), text=it['tag'])
            t = write(f'k{i}', end + 11) + 3
        t = qb(t + 6 + hold(*page_text(1)))

    if steps:
        if mats:
            erase.append([t, 24])
            cam += [[t, 1, 960, 540]]
            t += 26
        S0 = t
        t = write('steps', t, 14) + 4
        xs, sc = cols(len(steps['items']))
        for i, it in enumerate(steps['items']):
            a = t
            t = write(f's{i}', a)
            if it['note']: t = write(f'n{i}', t + 2, wdur(f'n{i}', 1.6, 14, 34))
            cx, cy, k = xs[i], (730 if mats else 560), it['kind']
            A, act = t + 12, False
            if k == 'tent':
                prop(f'q{i}', 'tent', a + 10, cx - 40 * sc, cy - 20, sc, -4, 'right')
                prop(f'q{i}b', 'saucer', a + 24, cx + 100 * sc, cy + 70, sc, 0)
            elif k == 'cloche':
                prop(f'q{i}', 'cloche', a + 10, cx - 30 * sc, cy - 20, sc, 0, 'right')
                prop(f'q{i}b', 'hat', a + 24, cx + 110 * sc, cy + 70, sc * 0.9, 8)
                kicks.append([a + 10, 0.012])
            elif k == 'spice':
                for j, (dx, dy) in enumerate([(-70, -40), (60, -30), (0, 80)]):
                    prop(f'q{i}{j}', 'spice', a + 6 + 6 * j, cx + dx * sc, cy + dy, sc, 0, color=['#C8442E', '#E8B53A', '#7EA34A'][j], seed=j + 1)
                ev['sprinkle'] = [A + 12, round(cx), cy - 60]
                tasks.append({'type': 'sprinkle', 'a': A, 'b': A + 30, 'x': round(cx), 'y': cy - 70}); act = True
            else:
                prop(f'q{i}', 'cake', a + 10, cx, cy + 10, sc, 0, berry=[A + 8, A + 22])
                tasks.append({'type': 'berry', 'a': A, 'b': A + 26, 'x0': round(cx + 90), 'y0': cy - 160, 'x1': round(cx + 8 * sc), 'y1': round(cy - 6), 'p0': A + 8, 'p1': A + 22})
                act = True
            if act: ev[f'sact{i}'] = [A, tasks[-1]['b']]
            t = write(f'c{i}', (tasks[-1]['b'] + 12) if act else t + 2) + 4
        cam += [[S0 + 30, 1, 960, 540], [t, 1.06, 900, 560]]
        t = qb(t + 6 + hold(*page_text(len(pages) - 3)))

    # 烤箱
    O = t
    erase.append([O, 24])
    cam += [[O, 1.06, 900, 560], [O + 20, 1.1, 900, 600], [O + 46, 1, 960, 540]]
    ev['dish_in'] = O + 4; ev['gather'] = O + 14
    write('oven', O + 20, wdur('oven', 3, 14, 30))
    ev['oven_in'] = [O + 18, O + 44]
    push = [O + 48, O + 72]
    ev['push'] = push
    tasks.append({'type': 'push', 'a': push[0] - 6, 'b': push[1] + 4})
    ev['door_close'] = push[1] + 6
    ev['timer_in'] = [push[1] - 4, push[1] + 8]
    twist = [push[1] + 14, push[1] + 24]
    ev['twist'] = twist
    tasks.append({'type': 'twist', 'a': twist[0] - 4, 'b': twist[1] + 4})
    kicks += [[ev['oven_in'][1], 0.02], [ev['door_close'], 0.03]]
    ov0 = qb(twist[1] + 2)
    te = twist[1] + 4
    if oven['note']: te = write('ovenb', twist[1] + 16, wdur('ovenb', 2.5, 16, 34))
    ding = max(ov0 + 3 * BEAT, qb(te + 8))          # 計時器至少滴答 3 拍；小字寫完才叮
    ev['ticks'] = list(range(ov0, ding, BEAT))
    ev['dingf'] = ding
    if ding - 1 - (te + 6) > 20: tasks.append({'type': 'tap', 'a': te + 6, 'b': ding - 1})
    write('ding', ding + 2, 10)
    kicks.append([ding, 0.055])
    cam += [[ov0, 1, 960, 540], [ding - 8, 1.07, 820, 560], [ding + 2, 1.07, 820, 560], [ding + 34, 1, 960, 540]]
    sec['soft'] = O; sec['oven'] = ov0; sec['full'] = ding

    # 上菜
    do = ding + 20
    ev['door_open'] = do
    erase.append([do, 24])
    po = [do + 10, do + 38]; ev['plate_out'] = po
    ev['oven_out'] = [po[1] + 2, po[1] + 32]
    pa = po[1] + 6
    pb = pa + clamp(7 * nchars(pname), 26, 44)
    ev['plating'] = [pa, pb]
    ev['garnish'] = [pb + 2, pb + 28]
    ev['manage'] = [pb + 16, pb + 40]
    kicks.append([po[1], 0.03])
    t = write('serve', do + 18, 16) + 4
    if serve['line']: t = write('aes', t, wdur('aes', 2, 18, 40)) + 6
    for i in range(len(serve['big'])): t = write(f'y{i}', t, wdur(f'y{i}', 3, 16, 32)) + 4
    t = max(t, ev['garnish'][1])
    if card['url'] or card['head']:
        ci = [t + 6, t + 24]; ev['card_in'] = ci
        tasks.append({'type': 'card', 'a': ci[0] - 2, 'b': ci[1] + 16})
        final = ci[1]
    else:
        final = t
    final = qb(final)
    ev['final'] = final
    kicks.append([final, 0.035])
    cam += [[do + 40, 1, 960, 540], [final, 1.04, 960, 470]]
    frames = final + 50 + min(24, hold(pname, plate['over'], card['url'], *serve['big']))
    sec['final'] = final

    tasks.sort(key=lambda x: x['a'])
    erase_ix = {x: i for i, p in enumerate(pages) for x in p}
    texts = [x['text'] for x in L.values() if x['kind'] == 'text'] + [pname, plate['over'], card['head'], card['url']] + \
            [it.get('tag', '') for it in (mats or {'items': []})['items']]

    stills = [w['title'][0] + w['title'][1] + 20, E0 + 30]
    for x in ('act0', 'act1', 'act2', 'act3'):
        if x in ev: stills.append(ev[x][0] + 22)
    for i in range(4):
        if f'c{i}' in w: stills.append(w[f'c{i}'][0] + 6)
    stills += [ev['push'][0] + 10, ev['ticks'][1], ding + 4, ev['plating'][1], ev['garnish'][1] + 10, final + 10, frames - 2]
    stills = sorted(set(min(frames - 1, max(0, s)) for s in stills))
    while len(stills) > 16: stills.pop(len(stills) // 2)
    mids = [s for s in stills if 0.25 * frames < s < 0.6 * frames]
    return {'template': '廣F', 'name': sb.get('name', '職人食譜'), 'fps': FPS, 'bpm': BPM, 'beat': BEAT, 'frames': frames,
            'lines': L, 'pages': pages, 'pageOf': erase_ix, 'w': w, 'erase': erase, 'tasks': tasks, 'props': props, 'ev': ev,
            'cam': cam, 'kicks': kicks, 'sections': sec,
            'd': {'title': title, 'plate': plate, 'card': card, 'nMat': len(mats['items']) if mats else 0, 'nStep': len(steps['items']) if steps else 0},
            'stills': stills, 'poster': ev['garnish'][1] + 20,
            'overview': [stills[2] if len(stills) > 2 else frames // 5, mids[len(mids) // 2] if mids else frames // 2, final + 20],
            'allText': ''.join(texts) + '0123456789'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print('  黑板頁', tl['pages'])
    print('  擦黑板', tl['erase'])
    print('  段落', tl['sections'])
    print('  事件', {k: v for k, v in tl['ev'].items()})
