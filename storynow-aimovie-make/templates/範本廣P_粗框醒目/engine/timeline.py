"""範本廣P「粗框醒目」時間表：storyboard.json → 時間表（每一章第幾格開始、章內每個登場事件的拍點、換章轉場、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（新粗野主義 Neo-Brutalism：行銷網頁介面活過來，粗黑框＋硬陰影的視窗、按鈕、卡片、貼紙；drum & bass 160 BPM，一拍 11.25 格，
每一章都從小節頭開始、長度是整小節；每拍都有東西彈出、被按下、被拖走）：
  chapters 依序列出要用的章（3～8 章；第一章必須是 start、最後一章必須是 end，中間可任選、順序可換、可省略、可重複）：
    start      開始按鈕：游標點下「開始」→ 名稱視窗爆出（彩色小方塊炸開）、一行等寬字、英文小視窗、貼紙、上方跑馬燈膠帶
    buttons    大按鈕：2～3 顆大按鈕（大字＋小單位）從上方掉下來，游標一顆顆按下、下方彈出說明視窗
    board      看板拖曳：2～4 張卡片被游標拖進看板（deck＝從左邊牌堆拖進格子；drop＝從畫面上方拖下來），卡上貼紙一張張貼上
    checklist  勾選清單：2～5 項一列列滑入，游標一項項打勾、底色填滿、完成計數與進度條；可加 1～3 張貼紙
    counter    計數器＋收據：大數字滾動停住（只用文本的數字）、按 PRINT 印出收據（1～3 列項目，可加滾動總數）、印章、1～2 個小數字視窗
    settings   設定面板：2～4 個開關一個個打開，右邊預覽視窗跟著換成圖示＋大字＋說明
    stack      視窗堆疊→一鍵清空：3～9 個視窗一拍一個彈出疊成一大疊，游標按「一鍵清空」，視窗全部甩出畫面、系統訊息彈出
    end        logo 大按鈕：大按鈕砸下（標語）、名稱小視窗、貼紙、游標按下大按鈕、網址列、電話貼紙、跑馬燈膠帶
  換章：每個換章點一種招牌轉場（游標抓住整個畫面拖出去 drag／大色塊視窗蓋過再往上收走 cover／看板橫向捲動 pan／Ctrl+Z 倒帶收走 undo）。
  畫面最下方固定一條靜止的工作列（y ≥ 994）。
章數與字數決定片長。
"""
import math
import re

FPS, BPM = 30, 160
B = FPS * 60 / BPM          # 一拍 11.25 格
BAR = 4 * B                 # 一小節 45 格
ERR = []
TYPES = ['start', 'buttons', 'board', 'checklist', 'counter', 'settings', 'stack', 'end']
TYPE_ZH = {'start': '開始按鈕', 'buttons': '大按鈕', 'board': '看板拖曳', 'checklist': '勾選清單', 'counter': '計數器＋收據',
           'settings': '設定面板開關', 'stack': '視窗堆疊→一鍵清空', 'end': 'logo 大按鈕'}
# 換章轉場：依序輪流（進 end 一律 cover）；每章可用 transition 覆寫。值＝[轉場從換章點前幾格開始, 換章點後幾格結束)
TRANS = {'drag': (-28, 0), 'cover': (-12, 13), 'pan': (-14, 10), 'undo': (-26, 7)}
TRANS_ORDER = ['drag', 'cover', 'pan', 'undo', 'cover', 'drag', 'undo']
COVER_TITLE = ['unzip.exe', 'calc.exe', 'boot.exe']
# 範本自己的介面字（網頁／作業系統介面的通用字樣；storyboard 的 labels 可覆寫）
CHROME = {'start': '開始', 'selected': '已選 ✓', 'selectAll': 'SELECT ALL ✓', 'board': '看板', 'dragHint': '拖曳 → 排好',
          'boardDone': '排好了 ✓', 'notify': '通知.msg', 'dragDone': 'DRAG & DROP ✓', 'todo': '清單', 'done': '完成',
          'counterApp': 'counter.app', 'receipt': 'RECEIPT ── 收據', 'thanks': 'THANK YOU ★', 'print': 'PRINT', 'printer': 'PRINTER.exe',
          'settings': '設定 ▸ ', 'preview': '預覽.png', 'waiting': '等待設定…', 'allOn': '全部開啟 ✓',
          'windows': 'WINDOWS', 'allOpen': '全部打開！', 'clear': '一鍵清空桌面', 'cleared': '桌面已清空 ✓', 'sysmsg': '系統訊息.msg',
          'browser': 'browser', 'undo': '◀◀ 復原 UNDO', 'ctrl': 'Ctrl', 'z': 'Z', 'loading': '載入中…', 'booting': '啟動中…'}
# 設定面板預覽圖示（remotion/src/chB.tsx 的 Icon；都畫在 200×200 的框內）
ICONS = ['bus', 'house', 'book', 'water', 'star', 'cup', 'cake', 'clock', 'pin', 'laptop', 'car', 'gift']
# 視窗堆疊的位置（原作第 8 章的 13 個小視窗，依序取用；最後一個大視窗另放）
STACK_POS = [(120, 80, 640, 300), (1180, 60, 560, 280), (640, 260, 700, 260), (200, 520, 520, 240), (1240, 420, 560, 240),
             (80, 300, 600, 240), (1080, 640, 600, 230), (520, 600, 560, 240), (860, 90, 560, 240), (300, 140, 620, 260),
             (1100, 240, 640, 280), (160, 600, 520, 240), (1240, 580, 520, 260)]
STACK_FILE = ['home.exe', 'info.sys', 'lineup.txt', 'note.app', 'photo.jpg', 'menu.pdf', 'map.png', 'todo.app', 'hello.msg',
              'data.csv', 'about.html', 'promo.gif', 'readme.txt']
NUM_RE = r'[0-9][0-9.,:/%]*'


def cw(c, latin=0.6):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss):   # 讀字量：中文 1、英數 0.5（英數一眼看得比較快）
    return sum((1.0 if ord(c) >= 0x2E80 else 0.5) for s in ss for c in str(s or '') if not c.isspace())
def bars(n): return max(4, int(math.ceil(n / 4 - 1e-6)) * 4)           # 拍數 → 進位到整小節（拍）


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6, ls=0.0, lines=1):
    """字級可在 lo～fs 之間自動縮（ls＝字距，單位 em；lines＝可以折成幾行）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    w = em(s, latin) + ls * len(s)
    cap = maxw * (lines if lines == 1 else lines * 0.88)        # 折行時每行不會剛好排滿，留一點餘裕
    size = min(fs, cap / max(0.1, w))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(cap / (lo * (1 + ls)))} 字、英數約 {int(cap / (lo * (latin + ls)))} 個）')
        size = lo
    return s, int(size)


def stk(where, s, fs, lo, maxw, latin=0.6):
    """貼紙：框＋內距共 54 px"""
    return fit(where, s, fs, lo, maxw - 54, latin=latin)


def number(where, s, maxn):
    s = str(s or '').strip()
    if not re.fullmatch(NUM_RE, s): ERR.append(f'{where}「{s}」要是數字（可含 . , : / %；只用文本有的數字）')
    if len(s) > maxn: ERR.append(f'{where}「{s}」最多 {maxn} 個字元')
    return s


def lst(x):
    if x is None: return []
    if isinstance(x, (str, dict)): return [x]
    return list(x)


def need(where, items, lo, hi, what):
    if not lo <= len(items) <= hi: ERR.append(f'{where} {what}要 {lo}～{hi} 個（現在 {len(items)} 個）')
    return items[:hi]


def step(rb, *ss, base=2, cap=4, k=0.6):
    """每一項停幾拍：至少 base 拍（原作），字多就依讀字量加長，最多 cap 拍"""
    return max(base, min(cap, math.ceil(rb(*ss) * k)))


# ───────────────────────── 每一種章 ─────────────────────────
def ch_start(c, w, rb, lab):
    title, tS = fit(f'{w}.title 名稱大字', c.get('title'), 250, 120, 1000, False, ls=0.04)
    app, aS = fit(f'{w}.app 視窗標題', c.get('app') or (f'{title}.exe' if title else ''), 28, 22, 1150)
    sub, sS = fit(f'{w}.sub 名稱下方一行（等寬字）', c.get('sub'), 40, 30, 1300 - 2.4 * 40)
    btn, bS = fit('labels.start 開始按鈕', lab['start'], 96, 56, 270)
    badge = str(c.get('badge') or '')
    bdLines, bdS = [], 140
    if badge:
        if em(badge, 0.62) * 140 <= 440 or ' ' not in badge.strip():
            bdLines = [badge]
            bdS = min(140, 440 / em(badge, 0.62))
        else:   # 折成兩行（在最接近中間的空格折）
            sp_ = [i for i, ch in enumerate(badge) if ch == ' ']
            cut = min(sp_, key=lambda i: abs(i - len(badge) / 2))
            bdLines = [badge[:cut].strip(), badge[cut + 1:].strip()]
            bdS = min(150 / 2 / 1.0, 440 / max(em(x, 0.62) for x in bdLines))
        if bdS < 48: ERR.append(f'{w}.badge 右上小視窗「{badge}」太長（英數約 14 個、中文約 8 字）')
    en, eS = stk(f'{w}.en 等寬字貼紙', c.get('en'), 36, 26, 1100)
    ST = [str(x) for x in lst(c.get('stickers'))]
    if len(ST) > 2: ERR.append(f'{w}.stickers 貼紙最多 2 張（現在 {len(ST)} 張）')
    STk = [stk(f'{w}.stickers[{j}] 貼紙', s, 64, 40, 440) for j, s in enumerate(ST[:2])]
    tape, tpS = fit(f'{w}.tape 上方跑馬燈', c.get('tape'), 34, 34, 2000)
    seq = 7.0
    enAt = seq if en else 0
    seq += 1 if en else 0
    stAt = []
    for _ in STk:
        stAt.append(seq); seq += 1
    tapeAt = seq if tape else 0
    last = max([6.0, enAt, *stAt, tapeAt])
    L = bars(max(12, last + 2, 5 + rb(title, sub, badge, en, *ST) * 0.65))
    ev = {'pop': [0, 4] + ([6] if badge else []), 'press': [3], 'burst': [4], 'slap': [x for x in [enAt, *stAt] if x],
          'whoosh': [tapeAt] if tape else []}
    d = {'title': title, 'titleSize': tS, 'app': app, 'appSize': aS, 'sub': sub, 'subSize': sS, 'btn': btn, 'btnSize': bS,
         'badge': bdLines, 'badgeSize': int(bdS), 'badgeTitle': (re.sub(r'[^A-Za-z0-9]+', '', badge).lower()[:14] or 'app') + '.sys',
         'en': en, 'enSize': eS, 'enAt': enAt, 'stickers': [{'text': s, 'size': z, 'at': a} for (s, z), a in zip(STk, stAt)],
         'tape': tape, 'tapeAt': tapeAt}
    return d, L, ev, [4.6, 6.5, L - 0.5], title + app + sub + btn + badge + en + ''.join(ST) + tape


def ch_buttons(c, w, rb, lab):
    IT = need(f'{w}.items', lst(c.get('items')), 2, 3, '大按鈕')
    head, hS = fit(f'{w}.head 上方標題框', c.get('head'), 96, 56, 1000)
    out, txt = [], ''
    n = len(IT)
    T0 = n + 2.0
    t = T0
    for j, x in enumerate(IT):
        x = x or {}
        big = str(x.get('n') or '')
        if not big: ERR.append(f'缺欄位 {w}.items[{j}].n 按鈕大字')
        unit = str(x.get('unit') or '')
        wid = em(big, 0.62) + (0.5 * em(unit) + 0.06 if unit else 0)
        S = min(240, 460 / max(0.5, wid))
        if S < 110: ERR.append(f'{w}.items[{j}] 按鈕大字＋單位「{big}{unit}」太長（約 4 位數＋2 字單位，或中文 3 字）')
        en, eS = fit(f'{w}.items[{j}].en 按鈕英文小框', x.get('en'), 32, 22, 430)
        tip = str(x.get('tip') or '')
        tpS = 56
        if tip:
            one = 476 / em(tip)
            tpS = min(56, one) if one >= 34 else min(40, 2 * 476 * 0.86 / em(tip))
            if tpS < 26: ERR.append(f'{w}.items[{j}].tip 說明視窗「{tip}」太長（兩行共約 30 字）')
        stp = step(rb, big, unit, tip, k=0.7)
        out.append({'n': big, 'size': int(max(110, S)), 'unit': unit, 'en': en, 'enSize': eS, 'tip': tip, 'tipSize': int(max(26, tpS)), 'tap': t})
        t += stp
        txt += big + unit + en + tip
    lastTap = out[-1]['tap'] if out else T0
    allAt = lastTap + 2
    L = bars(max(allAt + 2.5, lastTap + 1 + rb(head) * 0.4))
    ev = {'thump': [1 + j for j in range(n)], 'press': [o['tap'] for o in out], 'pop': [o['tap'] + 3 / B for o in out],
          'slap': [allAt]}
    d = {'items': out, 'head': head, 'headSize': hS, 'allAt': allAt}
    return d, L, ev, [n + 1, *[o['tap'] + 1.2 for o in out], L - 0.5], txt + head


def ch_board(c, w, rb, lab):
    IT = need(f'{w}.items', lst(c.get('items')), 2, 4, '卡片')
    n = len(IT)
    mode = str(c.get('mode') or 'deck')
    if mode not in ('deck', 'drop'): ERR.append(f'{w}.mode 只能是 deck（從牌堆拖進格子）或 drop（從上方拖下來）（現在「{mode}」）'); mode = 'deck'
    if mode == 'deck':
        W, H = 480, 300
        sz = dict(name=(50, 36), tag=(28, 22, 2), en=(26, 20), hook=(28, 22))
    else:
        W, H = (500 if n <= 3 else 400), 430
        sz = dict(name=(60, 40), tag=(32, 24, 3), en=(28, 22), hook=(32, 24))
    out, txt = [], ''
    for j, x in enumerate(IT):
        x = x or {}
        name, nS = fit(f'{w}.items[{j}].name 卡片名稱', x.get('name'), sz['name'][0], sz['name'][1], W - 44, False)
        tag, tS = fit(f'{w}.items[{j}].tag 卡片說明', x.get('tag'), sz['tag'][0], sz['tag'][1], W - 44, lines=sz['tag'][2])
        en, eS = fit(f'{w}.items[{j}].en 卡片上方英文條', x.get('en'), sz['en'][0], sz['en'][1], W - 40)
        hook, kS = stk(f'{w}.items[{j}].hook 卡上貼紙', x.get('hook'), sz['hook'][0], sz['hook'][1], W - 40)
        out.append({'name': name, 'nameSize': nS, 'tag': tag, 'tagSize': tS, 'en': en, 'enSize': eS, 'hook': hook, 'hookSize': kS})
        txt += name + tag + en + hook
    head = str(c.get('head') or '')
    title, tiS = fit(f'{w}.head 看板標題', f'{head or lab["board"]}.board', 28, 22, 1500)
    note, noS = stk(f'{w}.note 左上貼紙', c.get('note') or (lab['dragHint'] if mode == 'deck' else ''), 36, 28, 460)
    done, dS = fit(f'{w}.done 通知視窗', c.get('done') or lab['boardDone'], 44, 32, 460)
    if mode == 'deck':
        gap = 2.0
        for j, o in enumerate(out):
            o['st'] = 6 / B + j * gap
            o['grab'] = o['st'] + 6 / B
            o['drop'] = o['st'] + 18 / B
        last = out[-1]['drop'] if out else 2
        for j, o in enumerate(out): o['hookAt'] = last + 1 + j * 0.32
        notifyAt = 0
        endEv = (out[-1]['hookAt'] if out else last) + 0.5
    else:
        gap = 3.0 if n <= 3 else 2.5
        for j, o in enumerate(out):
            o['st'] = 4 / B + j * gap
            o['grab'] = o['st']
            o['drop'] = o['st'] + 16 / B
        last = out[-1]['drop'] if out else 2
        for j, o in enumerate(out): o['hookAt'] = last + 0.6 + j * 0.75
        notifyAt = (out[-1]['hookAt'] if out else last) + 1
        endEv = notifyAt + 0.5
    ddAt = endEv + 0.5
    L = bars(max(ddAt + 2.5, 2 + rb(*[o['name'] + o['tag'] + o['hook'] for o in out]) * 0.6))
    ev = {'press': [o['grab'] for o in out], 'drag': [o['grab'] + 1 / B for o in out], 'thump': [o['drop'] for o in out],
          'slap': [o['hookAt'] for o in out if o['hook']] + [ddAt], 'pop': [notifyAt] if notifyAt else []}
    d = {'mode': mode, 'W': W, 'H': H, 'items': out, 'title': title, 'titleSize': tiS, 'note': note, 'noteSize': noS,
         'done': done, 'doneSize': dS, 'notifyAt': notifyAt, 'ddAt': ddAt}
    return d, L, ev, [o['drop'] + 0.6 for o in out] + [L - 0.5], txt + title + note + done + lab['dragDone']


def ch_checklist(c, w, rb, lab):
    IT = [str(x) for x in need(f'{w}.items', lst(c.get('items')), 2, 5, '勾選項目')]
    ST = [str(x) for x in lst(c.get('stickers'))]
    if len(ST) > 3: ERR.append(f'{w}.stickers 貼紙最多 3 張（現在 {len(ST)} 張）')
    ST = ST[:3]
    maxw = 700 if ST else 1180
    out, t = [], 2.0
    for j, s in enumerate(IT):
        s, z = fit(f'{w}.items[{j}] 勾選項目' + ('（有貼紙時右邊留給貼紙）' if ST else ''), s, 44, 34, maxw, False)
        out.append({'text': s, 'size': z, 'ck': t})
        t += step(rb, s, k=0.55)
    head = str(c.get('head') or '')
    title, tiS = fit(f'{w}.head 清單標題', f'{head or lab["todo"]}.todo', 28, 22, 1300)
    stS = [stk(f'{w}.stickers[{j}] 貼紙', s, 40, 30, 560) for j, s in enumerate(ST)]
    lastCk = out[-1]['ck'] if out else 2
    stAt = [lastCk + 2 + j * 0.5 for j in range(len(stS))]
    L = bars(max(lastCk + 2.5 + (len(stS) * 0.5 + 1 if stS else 0), 2 + rb(*IT, *ST) * 0.7))
    ev = {'pop': [0], 'press': [o['ck'] for o in out], 'tick': [o['ck'] + 1 / B for o in out], 'slap': stAt}
    d = {'items': out, 'title': title, 'titleSize': tiS, 'sp': 130 if len(out) <= 4 else 110,
         'stickers': [{'text': s, 'size': z, 'at': a} for (s, z), a in zip(stS, stAt)]}
    return d, L, ev, [o['ck'] + 0.8 for o in out] + [L - 0.4], ''.join(IT) + ''.join(ST) + title + lab['done']


def ch_counter(c, w, rb, lab):
    head, hS = fit(f'{w}.head 數字上方標籤', c.get('head'), 48, 34, 760)
    val = number(f'{w}.n 大數字', c.get('n'), 6)
    unit = str(c.get('unit') or '')
    if len(unit) > 2: ERR.append(f'{w}.unit 單位「{unit}」最多 2 字')
    S = min(300, 780 / max(0.6, 0.62 * len(val) + (0.55 * em(unit) + 0.04 if unit else 0)))
    if S < 140: ERR.append(f'{w} 大數字＋單位「{val}{unit}」太長（約 4 位數＋1 字單位）')
    app, aS = fit(f'{w}.app 計數器視窗標題', c.get('app') or lab['counterApp'], 28, 22, 700)
    R = c.get('receipt') or {}
    rows = lst(R.get('rows'))
    tot = R.get('total') or None
    if len(rows) > (2 if tot else 3) or not (rows or tot):
        ERR.append(f'{w}.receipt 收據要 1～3 列 rows（有 total 時最多 2 列）（現在 {len(rows)} 列{"＋total" if tot else ""}）')
    RW = []
    for j, x in enumerate(rows[:3]):
        x = x or {}
        lb, lS = fit(f'{w}.receipt.rows[{j}].label 收據左邊小字', x.get('label'), 32, 26, 260)
        vl, vS = fit(f'{w}.receipt.rows[{j}].value 收據右邊大字', x.get('value'), 48, 30, 572 - em(lb) * lS - 24, False)
        RW.append({'label': lb, 'labelSize': lS, 'value': vl, 'valueSize': vS})
    TT = None
    if tot:
        tl_, tlS = fit(f'{w}.receipt.total.label 總數上方小字', tot.get('label'), 32, 26, 572)
        tn = number(f'{w}.receipt.total.n 總數', tot.get('n'), 7)
        pre, tu = str(tot.get('pre') or ''), str(tot.get('unit') or '')
        ts = min(130, 572 / max(0.6, 0.62 * len(tn) + (0.43 * em(pre) + 0.1 if pre else 0) + (0.45 * em(tu) + 0.08 if tu else 0)))
        if ts < 70: ERR.append(f'{w}.receipt.total「{pre}{tn}{tu}」太長')
        TT = {'label': tl_, 'labelSize': tlS, 'n': tn, 'pre': pre, 'unit': tu, 'size': int(max(70, ts))}
    rtitle, rtS = fit('labels.receipt 收據標題', lab['receipt'], 34, 26, 572)
    thanks, thS = fit(f'{w}.receipt.footer 收據最下面一行', R.get('footer') or lab['thanks'], 30, 24, 572)
    RH = 52 + 44 + 32 + len(RW) * 74 + ((TT['labelSize'] * 1.3 + TT['size'] * 1.05 + 14) if TT else 0) + 36 + 40
    stamp, stS = fit(f'{w}.stamp 印章', c.get('stamp'), 72, 48, 400)
    SS = lst(c.get('stats'))
    if len(SS) > 2: ERR.append(f'{w}.stats 小數字視窗最多 2 個（現在 {len(SS)} 個）')
    stats = []
    for j, x in enumerate(SS[:2]):
        x = x or {}
        sn = number(f'{w}.stats[{j}].n 小數字', x.get('n'), 6)
        su = str(x.get('unit') or '')
        if len(su) > 2: ERR.append(f'{w}.stats[{j}].unit 單位「{su}」最多 2 字')
        z = min(92, 360 / max(0.6, 0.62 * len(sn) + (0.6 * em(su) if su else 0)))
        if z < 56: ERR.append(f'{w}.stats[{j}]「{sn}{su}」太長')
        lb, lS = fit(f'{w}.stats[{j}].label 小數字說明', x.get('label'), 28, 22, 370)
        ttl, _ = fit(f'{w}.stats[{j}].title 視窗標題', x.get('title') or f'data{j + 1}.stat', 28, 22, 300)
        stats.append({'n': sn, 'unit': su, 'size': int(max(56, z)), 'label': lb, 'labelSize': lS, 'title': ttl})
    nd = max(1, sum(ch.isdigit() for ch in val))
    locks = [3 + i * min(1.0, 1.5 / max(1, nd - 1)) for i in range(nd)]
    printEnd = 2 + 8 * 5.6 / B
    totLocks = []
    if TT:
        td = max(1, sum(ch.isdigit() for ch in TT['n']))
        totLocks = [5 + i * 3 / B for i in range(td)]
    stampAt = max(7.0, printEnd + 1) if stamp else 0
    s0 = (stampAt + 1.5) if stamp else max(7.0, printEnd + 1)
    statAt = [s0 + j for j in range(len(stats))]
    last = max([locks[-1], printEnd, *(totLocks or [0]), stampAt, *(statAt or [0])])
    L = bars(max(last + 3.5, 2 + rb(head, val, unit, *[r['label'] + r['value'] for r in RW], TT['label'] if TT else '', stamp,
                                  *[s['label'] for s in stats]) * 0.6))
    ev = {'pop': [0] + statAt, 'press': [1], 'tick': locks + totLocks + [2 + s * 5.6 / B for s in range(8)], 'stamp': [stampAt] if stamp else []}
    d = {'head': head, 'headSize': hS, 'n': val, 'unit': unit, 'size': int(max(140, S)), 'app': app, 'appSize': aS, 'locks': locks,
         'laps': 2 if nd <= 2 else 1, 'rows': RW, 'total': TT, 'totLocks': totLocks, 'rtitle': rtitle, 'rtitleSize': rtS,
         'thanks': thanks, 'thanksSize': thS, 'RH': int(RH), 'stamp': stamp, 'stampSize': stS, 'stampAt': stampAt, 'stats': stats, 'statAt': statAt}
    return d, L, ev, [locks[-1] + 0.5, printEnd + 0.3, last + 0.8, L - 0.4], \
        head + val + unit + app + ''.join(r['label'] + r['value'] for r in RW) + (TT['label'] + TT['pre'] + TT['n'] + TT['unit'] if TT else '') \
        + rtitle + thanks + stamp + ''.join(s['n'] + s['unit'] + s['label'] + s['title'] for s in stats)


def ch_settings(c, w, rb, lab):
    IT = need(f'{w}.items', lst(c.get('items')), 2, 4, '開關')
    head = str(c.get('head') or '')
    title, tiS = fit(f'{w}.head 設定面板標題', lab['settings'] + head if head else lab['settings'].strip(' ▸'), 28, 22, 780)
    out, t, txt = [], 2.0, ''
    for j, x in enumerate(IT):
        x = x or {}
        label, lS = fit(f'{w}.items[{j}].label 開關左邊的字', x.get('label'), 40, 30, 600, False)
        word, wS = fit(f'{w}.items[{j}].word 預覽大字', x.get('word'), 140, 76, 680, False)
        sub, sS = fit(f'{w}.items[{j}].sub 預覽說明', x.get('sub'), 38, 28, 640)
        ic = str(x.get('icon') or ICONS[j % len(ICONS)]).lower()
        if ic not in ICONS: ERR.append(f'{w}.items[{j}].icon「{ic}」只能是 {"、".join(ICONS)}')
        num = None
        if x.get('n'):
            nn = number(f'{w}.items[{j}].n 預覽小數字', x.get('n'), 6)
            pre, un = str(x.get('pre') or ''), str(x.get('unit') or '')
            if em(pre) * 34 + 0.62 * len(nn) * 64 + em(un) * 34 + 30 > 660: ERR.append(f'{w}.items[{j}] 預覽小數字「{pre}{nn}{un}」太長')
            nd = max(1, sum(ch.isdigit() for ch in nn))
            num = {'pre': pre, 'n': nn, 'unit': un, 'locks': [t + 10 / B + i * 3 / B for i in range(nd)], 'start': t + 2 / B}
        out.append({'label': label, 'labelSize': lS, 'word': word, 'wordSize': wS, 'sub': sub, 'subSize': sS, 'icon': ic, 'on': t, 'num': num})
        t += step(rb, word, sub, k=0.6)
        txt += label + word + sub + (num['pre'] + num['n'] + num['unit'] if num else '')
    lastOn = out[-1]['on'] if out else 2
    allAt = lastOn + 2
    L = bars(max(allAt + 2.5, 2 + rb(*[o['label'] + o['word'] + o['sub'] for o in out]) * 0.55))
    ev = {'pop': [0, 1] + [o['on'] + 1 / B for o in out], 'press': [o['on'] for o in out], 'slap': [allAt],
          'tick': [z for o in out if o['num'] for z in o['num']['locks']]}
    d = {'items': out, 'title': title, 'titleSize': tiS, 'allAt': allAt}
    return d, L, ev, [o['on'] + 1.2 for o in out] + [L - 0.4], txt + title + lab['preview'] + lab['waiting'] + lab['allOn']


def ch_stack(c, w, rb, lab):
    WS = need(f'{w}.windows', lst(c.get('windows')), 3, 9, '小視窗')
    wins, txt = [], ''
    for j, x in enumerate(WS):
        x = {'text': x} if isinstance(x, str) else (x or {})
        X, Y, Wd, Hd = STACK_POS[j]
        s, z = fit(f'{w}.windows[{j}] 視窗大字', x.get('text'), 120 if Hd >= 280 else 100, 48, Wd - 50, False)
        ttl, _ = fit(f'{w}.windows[{j}].title 視窗標題', x.get('title') or STACK_FILE[j], 28, 22, Wd - 200)
        wins.append({'x': X, 'y': Y, 'w': Wd, 'h': Hd, 'text': s, 'size': z, 'title': ttl})
        txt += s + ttl
    bg = c.get('big')
    if bg:
        bg = {'text': bg} if isinstance(bg, str) else bg
        s, z = fit(f'{w}.big 最後的大視窗', bg.get('text'), 96, 56, 920, False)
        ttl, _ = fit(f'{w}.big.title 大視窗標題', bg.get('title') or 'ALL.exe', 28, 22, 700)
        wins.append({'x': 460, 'y': 250, 'w': 1000, 'h': 460, 'text': s, 'size': z, 'title': ttl})
        txt += s + ttl
    m = len(wins)
    for j, o in enumerate(wins): o['at'] = float(j)
    cnt, cS = stk(f'{w} 視窗數貼紙', f'{lab["windows"]} ×{m}', 40, 30, 480)
    shout, shS = stk(f'{w}.shout 貼紙', c.get('shout') or lab['allOpen'], 44, 32, 600)
    btn, bS = fit(f'{w}.button 清空按鈕', c.get('button') or lab['clear'], 72, 48, 640)
    msg, mS = fit(f'{w}.msg 清空後的系統訊息', c.get('msg') or lab['cleared'], 76, 48, 740)
    after, afS = stk(f'{w}.after 最後的貼紙', c.get('after'), 56, 36, 620)
    cntAt, shAt = m, m + 0.5
    btnAt, press = m + 1.5, m + 3
    outAt, msgAt = m + 6, m + 6.5
    afAt = m + 7.5 if after else 0
    L = bars(max((afAt or msgAt) + 2.5, 2 + rb(*[o['text'] for o in wins]) * 0.5 + 8))
    ev = {'pop': [o['at'] for o in wins] + [btnAt, msgAt], 'slap': [cntAt, shAt] + ([afAt] if after else []), 'press': [press],
          'drag': [press + 5 / B], 'burst': [press]}
    d = {'wins': wins, 'count': cnt, 'countSize': cS, 'shout': shout, 'shoutSize': shS, 'btn': btn, 'btnSize': bS, 'msg': msg, 'msgSize': mS,
         'after': after, 'afterSize': afS, 'cntAt': cntAt, 'shAt': shAt, 'btnAt': btnAt, 'press': press, 'outAt': outAt, 'msgAt': msgAt, 'afAt': afAt}
    return d, L, ev, [m - 0.2, shAt + 1, press + 0.8, msgAt + 0.8, L - 0.4], txt + cnt + shout + btn + msg + after + lab['sysmsg']


def ch_end(c, w, rb, lab):
    slogan, slS = fit(f'{w}.slogan 大按鈕標語', c.get('slogan'), 124, 76, 1300, False)
    name, nS = fit(f'{w}.name 名稱小視窗', c.get('name'), 90, 52, 560)
    ntitle, _ = fit(f'{w}.title 名稱小視窗標題', c.get('title') or 'HOME', 28, 22, 420)
    en, eS = stk(f'{w}.en 等寬字貼紙', c.get('en'), 34, 26, 880)
    full, fS = stk(f'{w}.full 全名貼紙', c.get('full'), 40, 28, 830)
    url, uS = fit(f'{w}.url 網址列', c.get('url'), 46, 30, 840)
    tel, tS = stk(f'{w}.tel 右下貼紙（電話）', c.get('tel'), 32, 24, 430)
    tape, _ = fit(f'{w}.tape 上方跑馬燈', c.get('tape'), 34, 34, 2000)
    browser, _ = fit('labels.browser', lab['browser'], 28, 22, 900)
    L = bars(max(14, 11.5, 3 + rb(slogan, name, en, full, url, tel) * 0.6))
    ev = {'pop': [x for x, ok in ((1, name), (7, url)) if ok], 'slap': [x for x, ok in ((2, en), (2.5, full), (8, tel)) if ok],
          'press': [6], 'burst': [6 + 10 / B], 'whoosh': [9] if tape else []}
    d = {'slogan': slogan, 'sloganSize': slS, 'name': name, 'nameSize': nS, 'ntitle': ntitle, 'en': en, 'enSize': eS, 'full': full, 'fullSize': fS,
         'url': url, 'urlSize': uS, 'tel': tel, 'telSize': tS, 'tape': tape, 'browser': browser}
    return d, L, ev, [3.2, 7.6, L - 0.3], slogan + name + ntitle + en + full + url + tel + tape + browser


BUILDERS = {'start': ch_start, 'buttons': ch_buttons, 'board': ch_board, 'checklist': ch_checklist, 'counter': ch_counter,
            'settings': ch_settings, 'stack': ch_stack, 'end': ch_end}


def taskbar(sb, S):
    """最下方固定的工作列：預設＝開場的英文小視窗、名稱視窗標題、片尾網址；storyboard 的 taskbar 可覆寫或設成空字串拿掉"""
    tb = sb.get('taskbar') or {}
    st = next((s for s in S if s['type'] == 'start'), {})
    en = next((s for s in S if s['type'] == 'end'), {})
    dflt = {'badge': ' '.join(st.get('badge') or []), 'app': st.get('app', ''), 'note': '', 'url': en.get('url', '')}
    items = []
    for key, font, col in (('badge', 'sg', 'y'), ('app', 'tc', 'p'), ('note', 'tc', 'w'), ('url', 'mono', 'm')):
        v = tb.get(key, dflt[key])
        v = str(v or '')
        if key == 'badge' and v: v = '■ ' + v
        if v: items.append({'key': key, 'text': v, 'font': font, 'col': col})
    wsum = sum(em(i['text']) * 31 + 54 for i in items) + 18 * (len(items) - 1) + 44 + 60
    if wsum > 1920:
        ERR.append(f'taskbar 工作列太長（{int(wsum)} px > 1920）：用 storyboard 的 taskbar 把 badge／app／note／url 改短，或設成 "" 拿掉')
    return items


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rb = lambda *ss: nchars(*ss) / pace * FPS / B                  # 讀完要幾拍
    lab = {**CHROME, **(sb.get('labels') or {})}

    CHS = lst(sb.get('chapters'))
    types = [str((x or {}).get('type') or '') for x in CHS]
    if not 3 <= len(CHS) <= 8: ERR.append(f'chapters 要 3～8 章（現在 {len(CHS)} 章；建議 4～6 章）')
    if not types or types[0] != 'start': ERR.append('chapters 第一章必須是 start（開始按鈕）')
    if not types or types[-1] != 'end': ERR.append('chapters 最後一章必須是 end（logo 大按鈕）')
    for i, ty in enumerate(types):
        if ty not in TYPES: ERR.append(f'chapters[{i}].type 只能是 {"、".join(TYPES)}（現在「{ty}」）')
        elif ty in ('start', 'end') and 0 < i < len(types) - 1: ERR.append(f'chapters[{i}] {ty} 只能放在第一章／最後一章')
    S, txt, stl_b = [], '', []
    sfx = {k: [] for k in ('pop', 'press', 'slap', 'thump', 'tick', 'drag', 'whoosh', 'stamp', 'burst', 'rewind')}
    t, nCover = 0, 0
    for i, x in enumerate(CHS[:8]):
        x = x or {}
        ty = types[i]
        if ty not in BUILDERS: continue
        w = f'chapters[{i}]（{ty}）'
        d, nb, ev, st, tx = BUILDERS[ty](x, w, rb, lab)
        if i + 1 < len(CHS) and types[i + 1] in BUILDERS:     # 下一章的轉場會提早吃掉這一章的結尾：最後一個事件之後至少留 3 拍
            nx = CHS[i + 1] or {}
            ntr = str(nx.get('transition') or ('cover' if types[i + 1] == 'end' else TRANS_ORDER[i % len(TRANS_ORDER)]))
            evmax = max([b for v in ev.values() for b in v] or [0])
            if evmax + 3 - TRANS.get(ntr, (0, 0))[0] / B > nb: nb += 4
        tr, trd = '', {}
        if i > 0:
            tr = str(x.get('transition') or ('cover' if ty == 'end' else TRANS_ORDER[(i - 1) % len(TRANS_ORDER)]))
            if tr not in TRANS: ERR.append(f'{w}.transition 只能是 {"、".join(TRANS)}（現在「{tr}」）'); tr = 'drag'
            if tr == 'cover':
                if ty == 'end':
                    app = next((s.get('app') for s in S if s['type'] == 'start'), '') or 'app.exe'
                    lb = x.get('loading') or f'{app} {lab["booting"]}'
                    ct = 'boot.exe'
                else:
                    hd = x.get('head') if isinstance(x.get('head'), str) else ''
                    lb = x.get('loading') or (f'{hd} {lab["loading"]}' if hd else lab['loading'])
                    ct = COVER_TITLE[nCover % 2]
                lb, lbS = fit(f'{w}.loading 蓋過畫面的大視窗字', lb, 110, 60, 1700)
                trd = {'label': lb, 'labelSize': lbS, 'title': ct, 'col': nCover % 3}
                nCover += 1
                tx += lb + ct
            elif tr == 'drag':
                nd = sum(1 for s in S if s.get('trans') == 'drag')
                trd = {'grab': [900, 198] if nd % 2 == 0 else [520, 98], 'to': [2300, -160] if nd % 2 == 0 else [-2300, 260]}
        S.append({'type': ty, 'beat': t, 'nb': nb, 'from': int(round(t * B)), 'trans': tr, 'tr': trd, **d})
        for k, v in ev.items(): sfx[k] += [t + b for b in v]
        stl_b += [t + b for b in st]
        txt += tx
        t += nb
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    for i, s in enumerate(S):
        s['to'] = S[i + 1]['from'] if i + 1 < len(S) else int(round(t * B))
        s['win'] = list(TRANS[s['trans']]) if s['trans'] else [0, 0]
        if s['trans']:   # 轉場音效（格數直接寫進 sfx）
            f0 = s['from']
            if s['trans'] == 'drag':
                sfx['press'].append((f0 - 18) / B); sfx['drag'].append((f0 - 15) / B)
            elif s['trans'] == 'cover':
                sfx['whoosh'].append((f0 - 12) / B); sfx['pop'].append((f0 + 1) / B)
            elif s['trans'] == 'pan':
                sfx['whoosh'].append((f0 - 14) / B)
            else:
                sfx['press'].append((f0 - 23) / B); sfx['rewind'].append((f0 - 26) / B)
    frames = int(round(t * B))
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加章，不要編造內容')
    tb = taskbar(sb, S)
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))

    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [round(b * B) for b in stl_b] + [s['from'] + max(2, s['win'][1] + 2) for s in S[1:]] + [s['from'] + s['win'][0] // 2 for s in S[1:]]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 24: stl.pop(len(stl) // 2)
    poster = cl(round(6.8 * B))
    mid = S[len(S) // 2]
    ov = [poster, cl(mid['from'] + (mid['to'] - mid['from']) * 0.6), cl(frames - 12)]

    allText = ''.join([txt, *lab.values(), *[i['text'] for i in tb], *COVER_TITLE, 'SELECT ALL✓×/0123456789,.:%+-_>▸◀■★─'])
    return {'template': '廣P', 'name': sb.get('name', '粗框醒目'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beat': B, 'beats': t,
            'chapters': S, 'sfx': {k: sorted(round(b * B) for b in v) for k, v in sfx.items()},
            'd': {'labels': lab, 'taskbar': tb},
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
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）第 {i + 1} 章 {TYPE_ZH[s["type"]]}（{s["nb"]} 拍＝{s["nb"] * B / FPS:.1f} 秒）'
              + (f'　轉場 {s["trans"]}' if s['trans'] else ''))
    print('  字數', len(set(tl['allText'])))
