"""範本廣L「新創快剪」時間表：storyboard.json → 時間表（每段第幾格、鏡頭重擊、背景格線滑動、音樂用的事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（把主題包裝成一間新創的產品發表，120 BPM，一拍正好 15 格，事件都落在拍上）：
  輸入框 input（必備）：一句指令一字一字打進輸入框 → 按 Enter，整個輸入框往上甩出
  Hero hero（必備）：一～兩行大字價值主張逐字上推（第二行品牌藍＋圓點）、一行副標
  build-up：DROP 的每一項各一拍硬切（巨大數字或關鍵字＋說明），小鼓越來越密
  鑽進游標點 → DROP drop（必備，1～3 項）：藍底上「a ＋ b ＋ c」一拍砸一個，下方一行總結
  產品線 cards（2～4 張，可省）：卡片軌道一張一張停在游標下
  指標 metrics（2～4 個，可省）：暗場指標牆，數字吃角子老虎滾停，鏡頭往下捲；％ 畫比例圓環、有 from 就「劃掉換數字」
  功能 features（2～4 個，可省）：每個功能一個畫面，鏡頭往左甩
  CTA cta（必備）：名稱逐字上推、標語、按鈕被游標按下（漣漪）、網址
段落省略時片長跟著縮短。
"""
import math

FPS, BPM = 30, 120
BF = 15                    # 一拍 15 格
ERR = []

# 範本自己的介面小標（新創網站的通用英文介面字；storyboard 的 labels 可覆寫）
CHROME = {'input': 'PROMPT', 'hero': 'LAUNCH', 'drop': 'LINEUP', 'cards': 'PRODUCTS', 'metrics': 'METRICS', 'features': 'FEATURES',
          'cta': 'JOIN', 'kicker': 'Announcing', 'enter': 'ENTER', 'feature': 'Feature'}


def cw(c, latin=0.58):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.28
    return latin


def em(s, latin=0.58): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())
def beats(x): return int(math.ceil(x - 1e-6)) * BF          # 拍數（無條件進位）→ 格數


def fit(where, s, fs, lo, maxw, optional=True, latin=0.58, ls=0.0):
    """字級可在 lo～fs 之間自動縮（ls＝字距，單位 em）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    n = len(s)
    w = em(s, latin) + ls * n
    size = min(fs, maxw / max(0.1, w))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / (lo * (1 + ls)))} 字、英數約 {int(maxw / (lo * (latin + ls)))} 個）')
        size = lo
    return s, int(size)


def items_of(x, key='items'):
    if x is None: return [], {}
    if isinstance(x, list): return x, {}
    return list(x.get(key) or []), x


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    read = lambda *ss: nchars(*ss) / pace          # 讀完要幾秒
    lab = {**CHROME, **(sb.get('labels') or {})}

    # ───────────── 品牌 ─────────────
    br = sb.get('brand') or {}
    bmark, _ = fit('brand.mark 左上品牌字（英文名或縮寫為佳）', br.get('mark'), 30, 30, 520, False, latin=0.6)
    bname, _ = fit('brand.name 品牌全名（小標）', br.get('name'), 28, 28, 900)

    # ───────────── 輸入框 ─────────────
    ip = sb.get('input') or {}
    prompt, promptS = fit('input.prompt 輸入框指令', ip.get('prompt'), 56, 42, 1040, False, ls=0.02)
    if len(prompt) > 26: ERR.append(f'input.prompt 輸入框指令「{prompt}」太長（最多 26 個字元，打字太久）')
    ph, _ = fit('input.placeholder 輸入框提示字', ip.get('placeholder'), 56, 56, 1040, ls=0.02)
    hint, _ = fit('input.hint 輸入框左下小標', ip.get('hint'), 28, 28, 760, latin=0.72, ls=0.14)

    # ───────────── Hero ─────────────
    he = sb.get('hero') or {}
    lines = he.get('lines') or []
    if isinstance(lines, str): lines = [lines]
    lines = [str(x) for x in lines]
    if not 1 <= len(lines) <= 2: ERR.append(f'hero.lines Hero 大字要 1～2 行（現在 {len(lines)} 行）')
    lines = lines[:2]
    heroS = int(min(236, 1380 / max(0.5, max([em(lines[0]) if lines else 1] + [em(x) + 0.3 for x in lines[1:]]))))
    if heroS < 120: ERR.append(f'hero.lines Hero 大字「{"／".join(lines)}」太長（每行中文最多約 11 字、英數約 19 個）')
    heroS = max(120, heroS)
    sub, subS = fit('hero.sub Hero 副標', (he.get('sub') or '') + (he.get('subEm') or ''), 44, 34, 1480)
    kicker = str(he.get('kicker') or lab['kicker'])

    # ───────────── DROP ─────────────
    dl, dr = items_of(sb.get('drop'))
    if not 1 <= len(dl) <= 3: ERR.append(f'drop.items DROP 要 1～3 項（現在 {len(dl)} 項；文本沒有數字就用 1～4 字的關鍵字）')
    D = []
    for i, it in enumerate(dl[:3]):
        if isinstance(it, str): it = {'n': it}
        n = str(it.get('n') or '').strip()
        if not n: ERR.append(f'缺欄位 drop.items[{i}].n 數字或關鍵字')
        if em(n, 0.6) > 4.2: ERR.append(f'drop.items[{i}].n「{n}」太長（數字最多約 6 位、關鍵字最多 4 字）')
        unit, unitS = fit(f'drop.items[{i}].unit 緊貼數字的單位', it.get('unit'), 120, 72, 440)
        label, labelS = fit(f'drop.items[{i}].label 單位下方的標籤', it.get('label'), 56, 40, 640)
        # build-up 版面：巨大 n ＋ 右邊一欄（單位大字＋藍點，下一行淡色標籤）；寬度 1500 內
        lw = max(em(unit) * unitS + 50, em(label) * labelS)
        bs = min(820, (1500 - lw - 40) / max(0.5, em(n, 0.6)))
        if bs < 260: ERR.append(f'drop.items[{i}]「{n}{unit}／{label}」太長（數字約 4 位、單位約 3 字、標籤約 10 字）')
        en, _ = fit(f'drop.items[{i}].en 小標', it.get('en'), 28, 28, 560, latin=0.72, ls=0.14)
        D.append({'n': n, 'unit': unit, 'unitSize': unitS, 'label': label, 'labelSize': labelS, 'bigSize': int(max(260, bs)), 'en': en})
    # DROP 那一排：每項＝「數字＋小一號單位」，下一行淡色標籤；寬＝max(數字列寬, 標籤寬)，中間「＋」
    if D:
        nem = [max(em(d['n'], 0.6) + (em(d['unit']) * 0.3 + 0.04 if d['unit'] else 0), 0.6) for d in D]
        sub_w = [em(d['label']) * 44 for d in D]
        dropS = min(340, (1600 - 140 * (len(D) - 1) - 30 * 2 * (len(D) - 1)) / sum(nem))
        for _ in range(3):   # 說明比數字寬時，扣掉多出來的寬度再算一次
            extra = sum(max(0, sw - ne * dropS) for sw, ne in zip(sub_w, nem))
            dropS = min(340, (1600 - 140 * (len(D) - 1) - 60 * (len(D) - 1) - extra) / sum(nem))
        if dropS < 150: ERR.append('drop.items DROP 一排放不下（數字或說明太長：三項時每項數字約 3 位、說明約 6 字）')
        dropS = int(max(150, dropS))
        for d, ne, sw in zip(D, nem, sub_w): d['w'] = int(max(ne * dropS, sw) + 20)
    else:
        dropS = 340
    dline, dlineS = fit('drop.line DROP 下方總結一行', dr.get('line'), 88, 56, 1500)
    dtag = str(dr.get('tag') or lab['drop'])

    # ───────────── 產品線卡片 ─────────────
    cl, cr = items_of(sb.get('cards'))
    if cl and not 2 <= len(cl) <= 4: ERR.append(f'cards.items 卡片要 2～4 張（現在 {len(cl)} 張；不要這段就整段省略）')
    CA = []
    for i, c in enumerate(cl[:4]):
        if isinstance(c, str): c = {'name': c}
        tag, _ = fit(f'cards.items[{i}].tag 卡片右上小標', c.get('tag'), 28, 28, 230)
        nm, nmS = fit(f'cards.items[{i}].name 卡片名稱', c.get('name'), 54, 40, 398, False)
        en, _ = fit(f'cards.items[{i}].en 卡片英文小字', c.get('en'), 28, 28, 398, latin=0.6, ls=0.06)
        desc = str(c.get('desc') or '')
        dls = desc.replace('　', '\n').split('\n')
        if len(dls) > 2 or any(em(x) * 34 > 398 for x in dls):
            ERR.append(f'cards.items[{i}].desc 卡片說明「{desc}」太長（最多 2 行，每行約 11 字；用全形空白或換行分行）')
        hook, _ = fit(f'cards.items[{i}].hook 卡片底部重點', c.get('hook'), 32, 32, 398)
        CA.append({'tag': tag, 'name': nm, 'size': nmS, 'en': en, 'desc': '\n'.join(dls) if desc else '', 'hook': hook})
    ctitle, ctitleS = fit('cards.title 卡片段標題', (cr.get('title') or '') + (cr.get('titleEm') or ''), 72, 56, 1500)
    ctag = str(cr.get('tag') or lab['cards'])

    # ───────────── 指標牆 ─────────────
    ml, mr = items_of(sb.get('metrics'))
    if ml and not 2 <= len(ml) <= 4: ERR.append(f'metrics.items 指標要 2～4 個（現在 {len(ml)} 個；不要這段就整段省略）')
    ME = []
    for i, m in enumerate(ml[:4]):
        val = str(m.get('value') or '').strip(); unit = str(m.get('unit') or ''); pre = str(m.get('prefix') or '')
        frm = str(m.get('from') or '')
        if not val: ERR.append(f'缺欄位 metrics.items[{i}].value 指標數字')
        tag, _ = fit(f'metrics.items[{i}].tag 指標小標', m.get('tag'), 28, 28, 900, latin=0.72, ls=0.14)
        label, labelS = fit(f'metrics.items[{i}].label 指標說明', m.get('label'), 56, 44, 940)
        note, noteS = fit(f'metrics.items[{i}].note 指標補充', m.get('note'), 34, 28, 940)
        if frm:
            fs = min(280, 900 / max(0.5, em(frm, 0.6)))
            if fs < 150: ERR.append(f'metrics.items[{i}].from 劃掉的前一個值「{frm}」太長（最多約 8 個數字或 5 字）')
            vs = min(560, 560 / max(0.5, em(val, 0.6) + em(unit) * 0.2))
            if vs < 220: ERR.append(f'metrics.items[{i}] 後一個值「{val}{unit}」太長（最多約 4 個數字＋1～2 字單位）')
            ME.append({'kind': 'swap', 'tag': tag, 'from': frm, 'fromSize': int(max(150, fs)), 'value': val, 'unit': unit,
                       'size': int(max(220, vs)), 'label': label, 'labelSize': labelS, 'note': note, 'noteSize': noteS, 'prefix': '', 'pct': 1.0})
            continue
        pw = em(pre) * 64 + 20 if pre else 0
        vs = min(380, (960 - pw) / max(0.5, em(val, 0.6) + em(unit, 0.6) * 0.4 + 0.05))
        if vs < 200: ERR.append(f'metrics.items[{i}]「{pre}{val}{unit}」太長（數字最多約 6 個字元＋1～2 字單位）')
        try:
            pct = float(val) / 100 if unit in ('%', '％') and 0 < float(val) <= 100 else 1.0
        except ValueError:
            pct = 1.0
        ME.append({'kind': 'ring', 'tag': tag, 'prefix': pre, 'value': val, 'unit': unit, 'size': int(max(200, vs)), 'pct': pct, 'from': '', 'fromSize': 0,
                   'label': label, 'labelSize': labelS, 'note': note, 'noteSize': noteS})
    mtag = str(mr.get('tag') or lab['metrics'])

    # ───────────── 功能 ─────────────
    fl, fr_ = items_of(sb.get('features'))
    if fl and not 2 <= len(fl) <= 4: ERR.append(f'features.items 功能要 2～4 個（現在 {len(fl)} 個；不要這段就整段省略）')
    FE = []
    VIS = ['chip', 'route', 'cube', 'check']
    for i, ft in enumerate(fl[:4]):
        tag, _ = fit(f'features.items[{i}].tag 功能小標', ft.get('tag'), 28, 28, 640, latin=0.72, ls=0.14)
        title, titleS = fit(f'features.items[{i}].title 功能標題', ft.get('title'), 88, 60, 900, False)
        sub_, subS_ = fit(f'features.items[{i}].sub 功能說明', ft.get('sub'), 40, 32, 900)
        vis = ft.get('vis') or VIS[i % 4]
        if vis not in VIS: ERR.append(f'features.items[{i}].vis 只能是 {"、".join(VIS)}')
        icon, _ = fit(f'features.items[{i}].icon 晶片上的字', ft.get('icon') or f'{i + 1:02d}', 34, 22, 90, latin=0.6)
        route = [str(x) for x in (ft.get('route') or [])][:2]
        for x in route:
            if em(x) > 6: ERR.append(f'features.items[{i}].route 路線兩端「{x}」太長（每端約 6 字）')
        checks = [str(x) for x in (ft.get('checks') or [])][:3]
        for x in checks:
            if em(x) * 40 > 380: ERR.append(f'features.items[{i}].checks 打勾項目「{x}」太長（每項約 9 字）')
        FE.append({'tag': tag, 'title': title, 'titleSize': titleS, 'sub': sub_, 'subSize': subS_, 'vis': vis, 'icon': icon,
                   'route': route, 'checks': checks})

    # ───────────── CTA ─────────────
    ct = sb.get('cta') or {}
    cname, cnameS = fit('cta.name 收尾名稱', ct.get('name'), 190, 110, 1700, False, ls=0.02)
    slog, slogS = fit('cta.slogan 收尾標語', ct.get('slogan'), 60, 42, 1600, ls=0.08)
    btn, btnS = fit('cta.button 按鈕字', ct.get('button'), 48, 40, 560, False, ls=0.06)
    url, urlS = fit('cta.url 網址或電話', ct.get('url'), 40, 30, 1500, latin=0.58, ls=0.04)

    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))

    # ───────────── 排時間（單位：格；全部落在拍上）─────────────
    n = len(prompt)
    step = 5 if n <= 14 else max(3, 70 // n)
    typeAt = [12 + i * step for i in range(n)]
    enter = max(90, int(math.ceil((typeAt[-1] + 18) / BF)) * BF)
    hero1 = enter + 15
    hero2 = enter + 45 if len(lines) > 1 else hero1
    heroSub = hero2 + 15
    b1 = enter + 90 + beats(max(0, read(*lines, sub) * 0.6 - 2.0) * 2)
    bs_ = [b1 + BF * i for i in range(len(D))]
    dive = bs_[-1] + BF
    drop = dive + BF
    ns = [drop + BF * i for i in range(len(D))]
    after = ns[-1] + 30 + beats(max(0, read(dline) - 2.5) * 2)
    marks = {'enter': enter, 'hero1': hero1, 'hero2': hero2, 'heroSub': heroSub, 'b': bs_, 'dive': dive, 'drop': drop, 'n': ns}
    t = after
    slides, vslides, hits = [enter, b1] + bs_[1:] + [dive], [enter], []
    hits += [[b, 0.08] for b in bs_] + [[x, 0.06] for x in ns]
    if CA:
        rail = t
        focus = []
        f = rail + BF
        for c in CA:
            focus.append(f)
            f += beats(max(2, read(c['name'], c['hook']) * 1.3))   # 卡片停在游標下時已在讀，快剪：名稱＋重點
        f += beats(max(0, read(ctitle) - 1.0) * 2) if len(CA) else 0
        marks.update({'rail': rail, 'focus': focus})
        slides += [rail - 15, rail] + focus[1:]
        t = f
    if ME:
        ms, zeros, locks = [], [], []
        for m in ME:
            ms.append(t)
            dur = beats(max(4, read(m['label'], m['note']) * 2 + 1))
            if m['kind'] == 'swap':
                zeros.append(t + 30)
                dur = 30 + beats(max(2, read(m['label'], m['note']) * 2))
            else:
                zeros.append(None)
            src = m['from'] if m['kind'] == 'swap' else m['value']
            nd = sum(ch.isdigit() for ch in src)
            st = min(6, 18 / max(1, nd - 1))
            locks.append([round(t + 12 + st * j) if m['kind'] == 'swap' else round(t + 20 + st * j) for j in range(max(1, nd))])
            t += dur
        marks.update({'m': ms, 'zero': zeros, 'locks': locks})
        slides += [ms[0]]
        vslides += ms[1:]
        hits += [[ms[0], 0.05]] + [[z, 0.05] for z in zeros if z]
    if FE:
        fs_ = []
        for ft in FE:
            fs_.append(t)
            t += beats(max(2, read(ft['title'], ft['sub']) * 0.6 * 2))
        marks['f'] = fs_
        slides += fs_
    cta = t
    click = cta + 45
    urlAt = click + 15
    end = max(cta + 90, urlAt + beats(max(0, read(cname, slog) - 1.0) * 2) + 15)
    marks.update({'cta': cta, 'click': click, 'url': urlAt, 'end': end})
    slides += [cta]
    hits += [[cta, 0.04], [click, 0.04]]
    frames = end
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加段落（cards、metrics、features），不要編造內容')

    # HUD 段落小標（有的段才編號）
    secs = [('input', 0), ('hero', enter + 10), ('drop', b1)]
    if CA: secs.append(('cards', marks['rail']))
    if ME: secs.append(('metrics', marks['m'][0]))
    if FE: secs.append(('features', marks['f'][0]))
    secs.append(('cta', cta))
    sections = [[f, f'{i + 1:02d} / {lab[k]}'] for i, (k, f) in enumerate(secs)]

    # 抽格
    clampf = lambda x: int(min(frames - 1, max(0, x)))
    st = [typeAt[n // 2] + 2, enter - 4, heroSub + 20, b1 + 8, dive + 6, ns[-1] + 14]
    if CA: st += [x + 10 for x in marks['focus']]
    if ME:
        for i, m in enumerate(marks['m']):
            st += [m + 32] if not marks['zero'][i] else [marks['zero'][i] - 4, marks['zero'][i] + 14]
    if FE: st += [x + 14 for x in marks['f']]
    st += [click - 6, frames - 4]
    st = sorted(set(clampf(x) for x in st))
    while len(st) > 20: st.pop(len(st) // 2)
    poster = clampf(ns[-1] + 14)
    ov = [clampf(heroSub + 20), poster, clampf(frames - 6)]

    allText = ''.join([bmark, bname, prompt, ph, hint, *lines, sub, kicker, dtag, dline, *[d['n'] + d['unit'] + d['label'] + d['en'] for d in D],
                       ctag, ctitle, *[c['tag'] + c['name'] + c['en'] + c['desc'] + c['hook'] for c in CA],
                       mtag, *[m['tag'] + m['prefix'] + m['value'] + m['unit'] + m['label'] + m['note'] + m.get('from', '') for m in ME],
                       *[f['tag'] + f['title'] + f['sub'] + f['icon'] + ''.join(f['route']) + ''.join(f['checks']) for f in FE],
                       cname, slog, btn, url, *[s for _, s in sections], lab['enter'], lab['feature'], '●+／/·0123456789%'])
    return {'template': '廣L', 'name': sb.get('name', '新創快剪'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beatFrames': BF,
            'marks': marks, 'typeAt': typeAt, 'slides': sorted(set(slides)), 'vslides': vslides, 'hits': hits, 'sections': sections,
            'd': {'brand': {'mark': bmark, 'name': bname},
                  'input': {'prompt': prompt, 'size': promptS, 'placeholder': ph, 'hint': hint, 'enter': lab['enter']},
                  'hero': {'lines': lines, 'size': heroS, 'sub': he.get('sub') or '', 'subEm': he.get('subEm') or '', 'subSize': subS, 'kicker': kicker},
                  'drop': {'tag': dtag, 'items': D, 'size': dropS, 'line': dline, 'lineSize': dlineS},
                  'cards': {'tag': ctag, 'title': cr.get('title') or '', 'titleEm': cr.get('titleEm') or '', 'titleSize': ctitleS, 'items': CA},
                  'metrics': {'tag': mtag, 'items': ME},
                  'features': {'label': lab['feature'], 'items': FE},
                  'cta': {'name': cname, 'nameSize': cnameS, 'slogan': slog, 'sloganSize': slogS, 'button': btn, 'buttonSize': btnS,
                          'url': url, 'urlSize': urlS}},
            'stills': st, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', tl['frames'] / BF, '拍）')
    for f, s in tl['sections']:
        print(f'  第 {f:4d} 格（{f / FPS:5.1f} 秒，第 {f / BF:5.1f} 拍）{s}')
    print('  字數', len(set(tl['allText'])))
