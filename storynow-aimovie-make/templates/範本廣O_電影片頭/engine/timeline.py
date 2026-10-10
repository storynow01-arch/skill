"""範本廣O「電影片頭」時間表：storyboard.json → 時間表（每一章第幾格開始、章內每個登場事件的拍點、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（整支像一部電影的片頭字幕，Saul Bass 剪紙風；搖擺大樂隊 140 BPM，一拍 12.86 格，每一章都從小節頭開始、長度是整小節）：
  chapters 依序列出要用的章（3～8 章；第一章必須是 title、最後一章必須是 end，中間可任選、順序可換、可省略、可重複）：
    title      片名卡：黑條一根根滑入組成構圖、剪紙卡飛上來、片名逐字落位、英文片名、豎排一行
    discs      三片剪紙圓：1～3 個數字（只用文本的數字）各在一片剪紙圓上彈出，下方標籤
    cast       主演名單：2～6 位主演一位一位登場（剪影色塊＋名字＋英文＋角色小字＋重點小框）
    cards      剪紙卡：2～4 張卡片從兩側飛入（剪影＋名字＋說明＋英文），可加中央紅色「特別演出」標
    synopsis   劇情大綱：2～4 個剪影小場景，每場 1～3 行字，下一場從右邊推進來
    boxoffice  票房紀錄：1～2 張電影票（數字吃角子老虎滾動）＋紅色印章
    pan        剪紙全景橫搖：2～4 段場景排成一整條，鏡頭一段一段橫搖過去
    credits    迷魂記螺旋＋工作人員名單：2～10 筆「職稱／名字」兩兩一組在螺旋兩側出現
    end        片尾 logo：四根黑條框住、紅色圓章、標語兩行、THE END（可被紅線劃掉換成一句話）、全名與網址電話
  換章：每個換章點用一種剪紙轉場（斜向黑條掃過、剪刀剪開、光圈收放、百葉黑條、色塊撕開、同心色環、直條落下；進片尾一律光圈）。
章數與字數決定片長。
"""
import math
import re

FPS, BPM = 30, 140
B = FPS * 60 / BPM          # 一拍 12.857 格
BAR = 4 * B                 # 一小節 51.43 格
SW = 0.66                   # 搖擺：反拍落在三連音第三個
ERR = []
TYPES = ['title', 'discs', 'cast', 'cards', 'synopsis', 'boxoffice', 'pan', 'credits', 'end']
TYPE_ZH = {'title': '片名卡', 'discs': '三片剪紙圓', 'cast': '主演名單', 'cards': '剪紙卡', 'synopsis': '劇情大綱', 'boxoffice': '票房紀錄',
           'pan': '剪紙全景橫搖', 'credits': '螺旋＋工作人員名單', 'end': '片尾 logo'}
# 換章轉場：依序輪流（進片尾一律 iris）；每章可用 transition 覆寫。值＝(轉場前幾格, 轉場後幾格)
TRANS = {'sweep': (-9, 9), 'scissors': (-5, 16), 'iris': (-12, 16), 'blinds': (-10, 10), 'tear': (-6, 10), 'rings': (-4, 14), 'bars': (-10, 10)}
TRANS_ORDER = ['sweep', 'scissors', 'iris', 'blinds', 'tear', 'rings', 'bars']
# 範本自己的介面字（電影片頭的通用字樣；storyboard 的 labels 可覆寫，每章也可用 head／headEn 覆寫該章標題）
CHROME = {'starring': '主演', 'starringEn': 'STARRING', 'discsHead': 'THE NUMBERS', 'synopsis': '劇情大綱', 'synopsisEn': 'SYNOPSIS',
          'boxoffice': '票房紀錄', 'boxofficeEn': 'BOX OFFICE', 'admit': 'ADMIT ONE', 'pan': 'ON LOCATION', 'credits': 'PRODUCTION CREDITS',
          'theEnd': 'THE END'}
# 剪影圖庫（remotion/src/icons.tsx；都畫在 200×200 的框內）
ICONS = ['student', 'chef', 'plane', 'camera', 'chip', 'bag', 'family', 'plate', 'filmcam', 'bus', 'lamp',
         'cup', 'book', 'cake', 'laptop', 'clock', 'pin', 'house', 'ticket']
PAN_ART = ['bus', 'building', 'water', 'night']        # 全景專用的大場景；也可以填任何剪影名（畫成大圓上的剪影）
NUM_RE = r'[0-9][0-9.,:/%]*'


def cw(c, latin=0.58):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.58): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss):   # 讀字量：中文 1、英數 0.5（英數一眼看得比較快）
    return sum((1.0 if ord(c) >= 0x2E80 else 0.5) for s in ss for c in str(s or '') if not c.isspace())
def fb(n): return int(round(n * B))                                  # 拍數 → 格數
def bars(n): return max(4, int(math.ceil(n / 4 - 1e-6)) * 4)           # 拍數 → 進位到整小節（拍）


def fit(where, s, fs, lo, maxw, optional=True, latin=0.58, ls=0.0):
    """字級可在 lo～fs 之間自動縮（ls＝字距，單位 em）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
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


def latin_only(where, s, maxn):
    s = str(s or '')
    if s and not re.fullmatch(r'[A-Za-z0-9 .&\-_/+]+', s):
        ERR.append(f'{where}「{s}」只能用英文字母、數字')
    if len(s) > maxn: ERR.append(f'{where}「{s}」太長（最多 {maxn} 個字元）')
    return s


def number(where, s, maxn):
    s = str(s or '').strip()
    if not re.fullmatch(NUM_RE, s): ERR.append(f'{where}「{s}」要是數字（可含 . , : / %；只用文本有的數字）')
    if len(s) > maxn: ERR.append(f'{where}「{s}」最多 {maxn} 個字元')
    return s


def icon(where, s, j):
    s = str(s or ICONS[j % len(ICONS)]).lower()
    if s not in ICONS: ERR.append(f'{where}「{s}」剪影只能是 {"、".join(ICONS)}')
    return s


def lst(x):
    if x is None: return []
    if isinstance(x, (str, dict)): return [x]
    return list(x)


def head(c, lab, key, keyEn=None):
    h = str(c.get('head') or lab[key])
    he = str(c.get('headEn') or lab[keyEn]) if keyEn else ''
    return h, he


# ───────────────────────── 每一種章 ─────────────────────────
def ch_title(c, w, rb, lab):
    title, tS = fit(f'{w}.title 片名大字', c.get('title'), 300, 150, 1040, False, ls=0.1)
    tw = em(title) * tS * 1.1
    cardW = int(min(1220, max(880, tw + 180)))
    presents, pS = fit(f'{w}.presents 左上出品字', c.get('presents'), 44, 32, 620)
    presentsEn, peS = fit(f'{w}.presentsEn 右上英文', c.get('presentsEn'), 40, 30, 540, latin=0.45)
    en, enS = fit(f'{w}.en 片名下方英文', c.get('en'), 64, 40, 1300, latin=0.42, ls=0.31)
    vert, vS = fit(f'{w}.vertical 左側豎排一行', c.get('vertical'), 44, 34, 540 / 1.05)
    n = max(1, len(title))
    st = min(1.0, 3.0 / n)                 # 片名每個字隔幾拍落下
    T0 = 4.5                               # 片名開始落的拍
    tEnd = T0 + n * st
    ev = {'whoosh': [2 / B + i * 0.75 for i in range(6)], 'thump': [3.6 + 0.4], 'tick': [T0 + i * st for i in range(n)],
          'pop': [tEnd + 0.5]}
    L = bars(max(10, tEnd + 2 + rb(en, vert) * 0.6))
    d = {'title': title, 'titleSize': tS, 'cardW': cardW, 'presents': presents, 'presentsSize': pS, 'presentsEn': presentsEn,
         'presentsEnSize': peS, 'en': en, 'enSize': enS, 'vertical': vert, 'verticalSize': vS, 'T0': T0, 'st': st, 'tEnd': tEnd}
    return d, L, ev, [tEnd + 0.8, L - 0.5], title + presents + presentsEn + en + vert


def ch_discs(c, w, rb, lab):
    IT = lst(c.get('items'))
    if not 1 <= len(IT) <= 3: ERR.append(f'{w}.items 剪紙圓要 1～3 個（現在 {len(IT)} 個）')
    IT = IT[:3]
    out, txt = [], ''
    for j, x in enumerate(IT):
        x = x or {}
        n = number(f'{w}.items[{j}].n 數字', x.get('n'), 5)
        unit = str(x.get('unit') or '')
        if len(unit) > 2: ERR.append(f'{w}.items[{j}].unit 單位「{unit}」最多 2 字')
        wid = 0.6 * len(n) + 0.4 * em(unit)
        size = min(330, 340 / max(0.6, wid))
        if size < 120: ERR.append(f'{w}.items[{j}] 數字＋單位「{n}{unit}」太長（圓裡最多約 4 位數＋1 字單位）')
        lb, lbS = fit(f'{w}.items[{j}].label 圓下方標籤', x.get('label'), 120, 64, 500 if len(IT) == 3 else 640)
        out.append({'n': n, 'unit': unit, 'size': int(max(120, size)), 'label': lb, 'labelSize': lbS})
        txt += n + unit + lb
    h, _ = head(c, lab, 'discsHead')
    h, hS = fit(f'{w}.head 左上英文標題', h, 56, 40, 700, latin=0.42, ls=0.29)
    note, nS = fit(f'{w}.note 右上一句', c.get('note'), 54, 36, 1000)
    k = len(out)
    L = bars(max(8, k + 2.5 + rb(note, *[o['label'] for o in out]) * 0.4))
    ev = {'pop': [1 + j for j in range(k)], 'whoosh': [4, 5] if L >= 8 else [], 'tick': [k + 1.5] if note else []}
    return {'items': out, 'head': h, 'headSize': hS, 'note': note, 'noteSize': nS}, L, ev, [k + 2, L - 0.5], txt + h + note


def ch_cast(c, w, rb, lab):
    IT = lst(c.get('items'))
    if not 2 <= len(IT) <= 6: ERR.append(f'{w}.items 主演要 2～6 位（現在 {len(IT)} 位）')
    IT = IT[:6]
    out, txt, t = [], '', 0
    for j, x in enumerate(IT):
        x = x or {}
        name, nS = fit(f'{w}.items[{j}].name 名字', x.get('name'), 130, 84, 830, False)
        en, eS = fit(f'{w}.items[{j}].en 英文一行', x.get('en'), 56, 38, 830, latin=0.42, ls=0.21)
        role, rS = fit(f'{w}.items[{j}].role 角色小字', x.get('role'), 46, 34, 830)
        hook, hS = fit(f'{w}.items[{j}].hook 重點小框', x.get('hook'), 42, 32, 760)
        ic = icon(f'{w}.items[{j}].icon', x.get('icon'), j)
        slot = max(3, math.ceil(rb(name, en, role, hook) * 0.6 + 0.5))
        out.append({'name': name, 'nameSize': nS, 'en': en, 'enSize': eS, 'role': role, 'roleSize': rS, 'hook': hook, 'hookSize': hS,
                    'icon': ic, 'at': t, 'slot': slot})
        t += slot
        txt += name + en + role + hook
    hz, he = head(c, lab, 'starring', 'starringEn')
    hz, hzS = fit(f'{w}.head 左側豎排標題', hz, 150, 90, 340)
    he, heS = fit(f'{w}.headEn 左側英文', he, 52, 36, 300, latin=0.42, ls=0.12)
    L = bars(t)
    if out: out[-1]['slot'] += L - t
    ev = {'whoosh': [x['at'] for x in out], 'pop': [x['at'] + 1 for x in out if x['hook']]}
    return {'items': out, 'head': hz, 'headSize': hzS, 'headEn': he, 'headEnSize': heS}, L, ev, \
        [x['at'] + min(x['slot'] - 0.6, 2.2) for x in out], txt + hz + he


def ch_cards(c, w, rb, lab):
    IT = lst(c.get('items'))
    if not 2 <= len(IT) <= 4: ERR.append(f'{w}.items 剪紙卡要 2～4 張（現在 {len(IT)} 張）')
    IT = IT[:4]
    out, txt = [], ''
    for j, x in enumerate(IT):
        x = x or {}
        name, nS = fit(f'{w}.items[{j}].name 名字', x.get('name'), 72, 52, 500, False)
        sub, sS = fit(f'{w}.items[{j}].sub 說明', x.get('sub'), 38, 30, 500)
        en, eS = fit(f'{w}.items[{j}].en 英文', x.get('en'), 36, 28, 500, latin=0.42, ls=0.22)
        out.append({'name': name, 'nameSize': nS, 'sub': sub, 'subSize': sS, 'en': en, 'enSize': eS,
                    'icon': icon(f'{w}.items[{j}].icon', x.get('icon'), j + 3), 'at': 1 + j})
        txt += name + sub + en
    tag, tS = fit(f'{w}.tag 中央紅色標（中文）', c.get('tag'), 52, 38, 760)
    tagEn, teS = fit(f'{w}.tagEn 中央紅色標（英文）', c.get('tagEn'), 40, 30, 640, latin=0.42, ls=0.2)
    n = len(out)
    tagAt = n + 1 + SW if (tag or tagEn) else 0
    L = bars(max(8, n + 2.5 + rb(*[o['name'] + o['sub'] for o in out]) * 0.55, tagAt + 2.5 if tagAt else 0))
    ev = {'whoosh': [o['at'] for o in out], 'thump': [o['at'] + 0.6 for o in out], 'pop': [tagAt] if tagAt else []}
    d = {'items': out, 'tag': tag, 'tagSize': tS, 'tagEn': tagEn, 'tagEnSize': teS, 'tagAt': tagAt}
    return d, L, ev, [n + 1.5, L - 0.5], txt + tag + tagEn


def ch_synopsis(c, w, rb, lab):
    IT = lst(c.get('items'))
    if not 2 <= len(IT) <= 4: ERR.append(f'{w}.items 小場景要 2～4 個（現在 {len(IT)} 個）')
    IT = IT[:4]
    out, txt, t = [], '', 0
    SZ = [(110, 76), (70, 50), (56, 40)]
    for j, x in enumerate(IT):
        x = x or {}
        lines = [str(s) for s in lst(x.get('lines'))]
        if not 1 <= len(lines) <= 3: ERR.append(f'{w}.items[{j}].lines 字要 1～3 行（現在 {len(lines)} 行）')
        LN = [fit(f'{w}.items[{j}].lines[{q}] 第 {q + 1} 行', s, SZ[q][0], SZ[q][1], 900, q > 0 or False) for q, s in enumerate(lines[:3])]
        stamp = str(x.get('stamp') or '')
        if len(stamp) > 3: ERR.append(f'{w}.items[{j}].stamp 圓章「{stamp}」最多 3 字')
        slot = max(4, math.ceil(rb(*lines, stamp) * 0.85 + 0.5))
        out.append({'lines': [s for s, _ in LN], 'sizes': [z for _, z in LN], 'stamp': stamp,
                    'icon': icon(f'{w}.items[{j}].icon', x.get('icon'), j + 6), 'at': t, 'slot': slot})
        t += slot
        txt += ''.join(lines) + stamp
    h, he = head(c, lab, 'synopsis', 'synopsisEn')
    h, hS = fit(f'{w}.head 左上標題', h, 40, 30, 300)
    he, heS = fit(f'{w}.headEn 左上英文', he, 36, 28, 360, latin=0.42, ls=0.22)
    L = bars(t)
    if out: out[-1]['slot'] += L - t
    ev = {'whoosh': [x['at'] for x in out[1:]], 'tick': [x['at'] + 0.2 for x in out], 'thump': [x['at'] + 3 for x in out if x['stamp']]}
    return {'items': out, 'head': h, 'headSize': hS, 'headEn': he, 'headEnSize': heS}, L, ev, \
        [x['at'] + min(x['slot'] - 0.8, 2.6) for x in out], txt + h + he


def ch_boxoffice(c, w, rb, lab):
    TK = lst(c.get('tickets'))
    if not 1 <= len(TK) <= 2: ERR.append(f'{w}.tickets 電影票要 1～2 張（現在 {len(TK)} 張）')
    TK = TK[:2]
    out, txt, ev_tick = [], '', []
    for j, x in enumerate(TK):
        x = x or {}
        label, lS = fit(f'{w}.tickets[{j}].label 票上方一行', x.get('label'), 46, 32, 600)
        val = number(f'{w}.tickets[{j}].value 數字', x.get('value'), 6)
        unit = str(x.get('unit') or '')
        if len(unit) > 3: ERR.append(f'{w}.tickets[{j}].unit 單位「{unit}」最多 3 字')
        size = min(300, 560 / max(0.6, 0.6 * len(val) + 0.47 * em(unit)))
        if size < 120: ERR.append(f'{w}.tickets[{j}] 數字＋單位「{val}{unit}」太長')
        foot, fS = fit(f'{w}.tickets[{j}].foot 票下方小字', x.get('foot') or lab['admit'], 44, 30, 560, latin=0.42, ls=0.22)
        at = 4 / B if j == 0 else 4                        # 第一張開場就飛入，第二張在第 2 小節（拍 4）
        start = at + 10 / B
        nd = max(1, sum(ch.isdigit() for ch in val))
        locks = [start + 1.5 + i * min(0.8, 2.4 / max(1, nd - 1)) for i in range(nd)]
        out.append({'label': label, 'labelSize': lS, 'value': val, 'unit': unit, 'size': int(max(120, size)), 'foot': foot, 'footSize': fS,
                    'at': at, 'start': start, 'locks': locks})
        ev_tick += locks
        txt += label + val + unit + foot
    S = c.get('stamp') or {}
    if isinstance(S, str): S = {'big': S}
    stTop, stTS = fit(f'{w}.stamp.top 印章上排', S.get('top'), 36, 26, 170)
    stBig, stBS = fit(f'{w}.stamp.big 印章大字', S.get('big'), 84, 44, 180, latin=0.55)
    last = max([o['locks'][-1] for o in out] or [2])
    stampAt = max(8.0, last + 0.75) if (stTop or stBig) else 0      # 印章落在第 3 小節頭（銅管重音）或最後一位停住之後
    h, he = head(c, lab, 'boxoffice', 'boxofficeEn')
    h, hS = fit(f'{w}.head 上方標題', h, 90, 60, 1400, ls=0.11)
    he, heS = fit(f'{w}.headEn 上方英文', he, 48, 32, 1500, latin=0.42, ls=0.54)
    L = bars(max(stampAt + 2.5, last + 2.5, rb(*[o['label'] + o['foot'] for o in out], stTop, stBig) * 0.6))
    ev = {'whoosh': [o['at'] for o in out], 'tick': ev_tick, 'stamp': [stampAt] if stampAt else []}
    d = {'tickets': out, 'stampTop': stTop, 'stampTopSize': stTS, 'stampBig': stBig, 'stampBigSize': stBS, 'stampAt': stampAt,
         'head': h, 'headSize': hS, 'headEn': he, 'headEnSize': heS}
    return d, L, ev, [last + 0.6, L - 0.4], txt + stTop + stBig + h + he


def ch_pan(c, w, rb, lab):
    IT = lst(c.get('items'))
    if not 2 <= len(IT) <= 4: ERR.append(f'{w}.items 全景要 2～4 段（現在 {len(IT)} 段）')
    IT = IT[:4]
    out, txt, t = [], '', 0
    for j, x in enumerate(IT):
        x = x or {}
        title, tS = fit(f'{w}.items[{j}].title 大字', x.get('title'), 140, 90, 860, False)
        sub, sS = fit(f'{w}.items[{j}].sub 第二行', x.get('sub'), 70, 48, 860)
        note, nS = fit(f'{w}.items[{j}].note 第三行', x.get('note'), 52, 38, 860)
        art = str(x.get('art') or PAN_ART[j % 4]).lower()
        if art not in PAN_ART and art not in ICONS: ERR.append(f'{w}.items[{j}].art「{art}」只能是 {"、".join(PAN_ART)} 或剪影名')
        slot = max(4, math.ceil(rb(title, sub, note) * 0.85 + 1))
        out.append({'title': title, 'titleSize': tS, 'sub': sub, 'subSize': sS, 'note': note, 'noteSize': nS, 'art': art, 'at': t, 'slot': slot})
        t += slot
        txt += title + sub + note
    h, _ = head(c, lab, 'pan')
    h, hS = fit(f'{w}.head 右上英文', h, 44, 32, 700, latin=0.42, ls=0.27)
    L = bars(t)
    if out: out[-1]['slot'] += L - t
    ev = {'whoosh': [x['at'] for x in out[1:]], 'tick': [x['at'] + 0.6 for x in out]}
    return {'items': out, 'head': h, 'headSize': hS}, L, ev, [x['at'] + min(x['slot'] - 1.2, 2.6) for x in out], txt + h


def ch_credits(c, w, rb, lab):
    CR = lst(c.get('credits'))
    if not 2 <= len(CR) <= 10: ERR.append(f'{w}.credits 名單要 2～10 筆（現在 {len(CR)} 筆）')
    CR = CR[:10]
    flat = []
    for j, x in enumerate(CR):
        x = x or {}
        r, rS = fit(f'{w}.credits[{j}].role 職稱', x.get('role'), 44, 32, 420)
        nm, nS = fit(f'{w}.credits[{j}].name 名字', x.get('name'), 58, 40, 420, False)
        flat.append({'role': r, 'roleSize': rS, 'name': nm, 'nameSize': nS})
    groups, t, txt = [], 3 / B, ''
    for g in range(0, len(flat), 2):
        pair = flat[g:g + 2]
        slot = max(3, math.ceil(rb(*[p['role'] + p['name'] for p in pair]) * 0.8 + 0.5))
        groups.append({'pair': pair, 'at': t, 'slot': slot})
        t += slot
        txt += ''.join(p['role'] + p['name'] for p in pair)
    h, _ = head(c, lab, 'credits')
    h, hS = fit(f'{w}.head 上方英文', h, 48, 34, 1500, latin=0.42, ls=0.5)
    L = bars(t + 1)
    ev = {'tick': [g['at'] for g in groups], 'whoosh': [L - 2]}
    return {'groups': groups, 'head': h, 'headSize': hS}, L, ev, [g['at'] + min(g['slot'] - 0.5, 2) for g in groups], txt + h


def ch_end(c, w, rb, lab):
    badge = latin_only(f'{w}.badge 紅色圓章（英數）', c.get('badge'), 5).upper()
    sl = [str(x) for x in lst(c.get('slogan'))]
    if not 1 <= len(sl) <= 2: ERR.append(f'{w}.slogan 標語要 1～2 行')
    SL = [fit(f'{w}.slogan[{q}] 標語第 {q + 1} 行', s, 170, 110, 1240, False) for q, s in enumerate(sl[:2])]
    full, fS = fit(f'{w}.full 全名或一行字', c.get('full'), 44, 32, 1500)
    url, uS = fit(f'{w}.url 網址或電話', c.get('url'), 54, 36, 1500, latin=0.55)
    after, aS = fit(f'{w}.after THE END 劃掉後換上的一句', c.get('after'), 100, 70, 1200)
    te, teS = fit('labels.theEnd', lab['theEnd'], 120, 80, 1200, latin=0.42, ls=0.25)
    afterEnd = 7 + (10 + 3 * len(after)) / B if after else 6
    L = bars(max(12, afterEnd + 2.5, 3.5 + rb(full, url) * 0.8))
    ev = {'whoosh': [2 / B + i * 0.5 for i in range(4)] + ([7] if after else []), 'stamp': [2] if badge else [], 'tick': [4]}
    d = {'badge': badge, 'slogan': [s for s, _ in SL], 'sloganSizes': [z for _, z in SL], 'full': full, 'fullSize': fS, 'url': url, 'urlSize': uS,
         'after': after, 'afterSize': aS, 'theEnd': te, 'theEndSize': teS}
    return d, L, ev, [4.6, L - 0.3], badge + ''.join(sl) + full + url + after + te


BUILDERS = {'title': ch_title, 'discs': ch_discs, 'cast': ch_cast, 'cards': ch_cards, 'synopsis': ch_synopsis, 'boxoffice': ch_boxoffice,
            'pan': ch_pan, 'credits': ch_credits, 'end': ch_end}


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rb = lambda *ss: nchars(*ss) / pace * FPS / B                  # 讀完要幾拍
    lab = {**CHROME, **(sb.get('labels') or {})}

    CHS = lst(sb.get('chapters'))
    types = [str((x or {}).get('type') or '') for x in CHS]
    if not 3 <= len(CHS) <= 8: ERR.append(f'chapters 要 3～8 章（現在 {len(CHS)} 章；建議 4～6 章）')
    if not types or types[0] != 'title': ERR.append('chapters 第一章必須是 title（片名卡）')
    if not types or types[-1] != 'end': ERR.append('chapters 最後一章必須是 end（片尾 logo）')
    for i, ty in enumerate(types):
        if ty not in TYPES: ERR.append(f'chapters[{i}].type 只能是 {"、".join(TYPES)}（現在「{ty}」）')
        elif ty in ('title', 'end') and 0 < i < len(types) - 1: ERR.append(f'chapters[{i}] {ty} 只能放在第一章／最後一章')
    S, txt, sfx, stl_b = [], '', {k: [] for k in ('whoosh', 'thump', 'pop', 'tick', 'stamp')}, []
    t = 0
    for i, x in enumerate(CHS[:8]):
        x = x or {}
        ty = types[i]
        if ty not in BUILDERS: continue
        w = f'chapters[{i}]（{ty}）'
        d, nb, ev, st, tx = BUILDERS[ty](x, w, rb, lab)
        tr = ''
        if i > 0:
            tr = str(x.get('transition') or ('iris' if ty == 'end' else TRANS_ORDER[(i - 1) % len(TRANS_ORDER)]))
            if tr not in TRANS: ERR.append(f'{w}.transition 只能是 {"、".join(TRANS)}（現在「{tr}」）'); tr = 'sweep'
        S.append({'type': ty, 'beat': t, 'nb': nb, 'from': fb(t), 'trans': tr, **d})
        for k, v in ev.items(): sfx[k] += [t + b for b in v]
        stl_b += [t + b for b in st]
        txt += tx
        t += nb
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    for i, s in enumerate(S):
        s['to'] = S[i + 1]['from'] if i + 1 < len(S) else fb(t)
        if s['trans']:
            a, b = TRANS[s['trans']]
            s['win'] = [a + (-2 if s['type'] == 'end' and s['trans'] == 'iris' else 0), b + (2 if s['type'] == 'end' and s['trans'] == 'iris' else 0)]
        else:
            s['win'] = [0, 0]
    frames = fb(t)
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加章，不要編造內容')

    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [fb(b) for b in stl_b] + [s['from'] + s['win'][1] + 2 for s in S[1:]] + [s['from'] - 3 for s in S[1:]]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 20: stl.pop(len(stl) // 2)
    op = S[0]
    poster = cl(fb(op['tEnd'] + 1.6))
    mid = S[len(S) // 2]
    ov = [poster, cl(mid['from'] + (mid['to'] - mid['from']) * 0.6), cl(frames - 12)]

    allText = ''.join([txt, *lab.values(), '0123456789,.:/%'])
    return {'template': '廣O', 'name': sb.get('name', '電影片頭'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beat': B, 'sw': SW, 'beats': t,
            'chapters': S, 'sfx': {k: sorted(fb(b) for b in v) for k, v in sfx.items()},
            'd': {'labels': lab},
            'stills': stl, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', tl['beats'], '拍＝', tl['beats'] // 4, '小節）')
    for i, s in enumerate(tl['chapters']):
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）第 {i + 1} 章 {TYPE_ZH[s["type"]]}（{s["nb"]} 拍＝{s["nb"] * B / FPS:.1f} 秒）'
              + (f'　轉場 {s["trans"]}' if s['trans'] else ''))
    print('  字數', len(set(tl['allText'])))
