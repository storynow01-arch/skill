"""範本廣R「駭客終端」時間表：storyboard.json → 時間表（每一章第幾格開始、章內每一行指令與輸出的拍點、換章轉場、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（終端機駭客 Terminal，《駭客軍團》片頭感）：整支是「有人在終端機打指令查詢某個主題」，資訊都以指令輸出出現；
techhouse 126 BPM（一拍 14.29 格），指令在拍點上按 Enter；每一章從小節頭開始、長度是整小節。
  chapters 依序列出要用的章（3～7 章；第一章必須是 boot、最後一章必須是 end，中間可任選、順序可換、可省略）：
    boot     開機自檢：BIOS 自檢快速捲動 → ./主機 --start → 載入進度條 → ASCII 大字名稱掃描出現（中文名用楷體大字）→ 一行副標逐字打出 → 全名滑入
    whoami   ASCII 大字＋資訊：whoami → neofetch（左邊小 ASCII 名稱、右邊 2～6 列「鍵：值」、色塊）→ echo $SLOGAN → 標語大字逐字打出
    ls       清單：ls -l 目錄 → 2～9 列像資料夾一樣一列列滑入（名稱／標籤／# 說明）→ 統計列 → 反白游標往下掃
    tmux     四窗格：畫面被分割線推成 2～4 個窗格（上一章留在左上窗格被推擠），每格同時跑一個指令、輸出幾行；章末最後一格放大成全螢幕
    cat      數字查詢：cat 檔案 → 1～2 個大數字框（吃角子老虎滾動，只用文本的數字）→ 0～3 列小數字或百分比條
    status   systemctl 狀態：systemctl status → 2～6 個服務一個個亮起（● 名稱.service — 說明／狀態／備註）＋右側監控面板與 ping
    end      sudo join → 密碼 ●●●● → 驗證進度條 → ACCESS GRANTED → 終端機縮成一個視窗（logo：ASCII 名稱、標語、副標、$ open 網址）
  換章（招牌轉場）：clear 把畫面逐行往上捲走／視窗最小化縮成一行再展開／進 tmux＝窗格分割（上一章被推擠）／出 tmux＝窗格放大合併；
  最後一章結尾整個終端機縮成一個視窗（logo）。畫面最下方 180 像素是靜止的 tmux 狀態列，只在換章那格改高亮。
章數與字數決定片長。
"""
import math
import re

FPS, BPM = 30, 126
B = FPS * 60 / BPM          # 一拍 14.2857 格
BAR = 4 * B
ERR = []
TYPES = ['boot', 'whoami', 'ls', 'tmux', 'cat', 'status', 'end']
TYPE_ZH = {'boot': '開機自檢', 'whoami': 'ASCII 大字＋資訊', 'ls': 'ls 清單', 'tmux': 'tmux 四窗格', 'cat': '數字查詢',
           'status': 'systemctl 狀態', 'end': 'sudo join → ACCESS GRANTED → logo'}
WIN = {'boot': 'boot', 'whoami': 'whoami', 'ls': 'ls', 'tmux': 'panes', 'cat': 'cat', 'status': 'status', 'end': 'sudo'}
# 範本自己的介面字（終端機與 tmux 的通用字樣；storyboard 的 labels 可覆寫）
CHROME = {'vsplit': '垂直分割', 'hsplit': '水平分割', 'zoom': '放大窗格', 'detach': '離開', 'session': 'session:',
          'loadCore': '載入核心', 'total': 'total', 'dirs': 'directories', 'password': 'PASSWORD', 'pwFor': 'password for',
          'verify': '驗證中', 'check1': '身分驗證', 'check2': '權限確認', 'join': '加入', 'granted': 'ACCESS GRANTED',
          'welcome': '歡迎加入', 'running': 'active (running)', 'success': '✓ BUILD SUCCESS', 'monitor': '[ htop ]', 'ping': '[ ping ]',
          'load': 'load', 'pass': 'PASS', 'ok': 'OK', 'reply': 'reply from', 'login': 'login:', 'bios': 'BIOS', 'post': 'POST', 'open': 'open'}
STYLES = ['list', 'tree', 'log', 'make']
STYLE_CMD = {'list': 'cat {l}.txt', 'tree': 'tree {l}/', 'log': 'tail -f {l}.log', 'make': 'make {l}'}
NUM_RE = r'[0-9][0-9.,:/%]*'
# ASCII 大字可用的字（remotion/src/ui.tsx 的 GLYPH）
ASCII_OK = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -.!+')
TYPE_F = 1.4                # 打字：每個字幾格（長指令最多打 1.5 拍）


def cw(c, latin=0.6):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.6
    return latin


def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss):   # 讀字量：中文 1、英數 0.5
    return sum((1.0 if ord(c) >= 0x2E80 else 0.5) for s in ss for c in str(s or '') if not c.isspace())
def bars(n): return max(4, int(math.ceil(n / 4 - 1e-6)) * 4)
def td(s): return min(1.5, max(0.45, len(str(s)) * TYPE_F / B))       # 打完一行指令要幾拍
def q(x): return round(x * 4) / 4                                      # 對齊到 16 分音符


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6, ls=0.0):
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


def keys(t0, enter, s):
    """逐字打字的每個字出現在第幾拍（與 ui.tsx 的 typed() 同一個算法：t0→enter-2 格之間打完）"""
    n = len(str(s))
    if n == 0: return []
    f0, f1 = round(t0 * B), round(enter * B) - 2
    return [(f0 + (i + 1) * (f1 - f0) / n) / B for i in range(n)]


def cmd(t0, s, ev, gap=0.2):
    """一行指令：t0 開始打字、打完後 gap 拍按 Enter（Enter 對齊到 16 分音符）；回傳 enter 拍"""
    enter = q(t0 + td(s) + gap)
    if enter <= t0 + td(s): enter += 0.25
    ev.setdefault('key', []).extend(keys(t0, enter, s))
    ev.setdefault('enter', []).append(enter)
    return enter


def ascii_spec(where, s):
    """ASCII 大字：英數（A–Z 0–9 空白 - . ! +）用方塊字；有中文就回傳 None（畫面改用楷體大字）"""
    s = str(s or '').strip()
    if not s: return None
    if any(ord(c) >= 0x2E80 for c in s): return None
    up = s.upper()
    bad = sorted(set(c for c in up if c not in ASCII_OK))
    if bad: ERR.append(f'{where}「{s}」有方塊字沒有的字元 {"".join(bad)}（只能用英文字母、數字、空白、- . ! +）')
    cols = sum(4 if c == ' ' else 8 for c in up) - 2 + 1
    return {'text': up, 'cols': cols}


# ───────────────────────── 每一種章 ─────────────────────────
def ch_boot(c, w, rb, g):
    lab = g['lab']
    title, tS = fit(f'{w}.title 名稱', c.get('title'), 64, 40, 1700, False)
    asc = ascii_spec(f'{w}.ascii ASCII 大字', c.get('ascii'))
    if asc:
        cwid = min(40, 1780 / asc['cols'])
        if cwid < 17: ERR.append(f'{w}.ascii「{c.get("ascii")}」太長（方塊字最多約 12 個字母，空白算半個）')
        asc.update(cw=round(max(17, cwid), 2), ch=round(max(17, cwid) * 1.15, 2))
        bigS = 0
    else:   # 沒有英數名稱：名稱本身用楷體大字（掃描出現）
        _, bigS = fit(f'{w}.title 名稱（當大字）', title, 200, 96, 1700)
    sub, sS = fit(f'{w}.sub 大字下方一行（逐字打出）', c.get('sub'), 40, 28, 1700, ls=0.06)
    cm = str(c.get('cmd') or f'./{g["host"]} --start')
    cm, _ = fit(f'{w}.cmd 開機指令', cm, 32, 32, 1780 - em(g['ps']) * 32)
    BI = []
    for j, x in enumerate(lst(c.get('bios'))[:10]):
        x = {'text': x} if isinstance(x, str) else (x or {})
        tx, _ = fit(f'{w}.bios[{j}] 自檢行', x.get('text'), 30, 30, 1100, False)
        st = str(x.get('status') or lab['pass'])
        BI.append({'text': tx, 'status': st})
    if len(lst(c.get('bios'))) > 10: ERR.append(f'{w}.bios 自檢行最多 10 行（現在 {len(lst(c.get("bios")))} 行）')
    head = f'{g["host"].upper()}-{lab["bios"]}　(C) {title}'
    head, _ = fit(f'{w} BIOS 標題（主機名＋名稱）', head, 30, 30, 1500)
    login = f'{g["host"]} {lab["login"]} {g["user"]}'
    nl = len(BI) + 2
    ev = {'beep': [0.0], 'line': [j * 3.6 / B for j in range(0, nl, 2)]}
    P = q(max(2.0, (nl * 3.6 + 10) / B))                # 自檢捲動幾拍（一行 3.6 格，原作）
    E = cmd(P + 0.3, cm, ev)
    A0 = E + 0.75                                       # 進度條跑完 → 大字開始掃描
    A1 = A0 + 1.25
    S1 = A1 - 0.25 + (max(0.8, min(1.5, td(sub) * 0.6)) if sub else 0.25)
    T1 = S1 if asc else 0                               # 全名滑入（ASCII 版才有；中文大字版名稱就是大字）
    ev['whoosh'] = [A0]
    if asc: ev['pop'] = [T1]
    ev['key'] += keys(A1 - 0.25, S1 + 2 / B, sub) if sub else []
    last = max(T1, S1, A1)
    hold = last + 0.75 + rb(title, sub, c.get('ascii')) * 0.25
    # 版面：大字、副標、全名這一組在 y 140～720 之間置中
    bigH = 8 * asc['ch'] if asc else bigS * 1.25
    gh = bigH + (24 + sS * 1.4 if sub else 0) + (16 + tS * 1.3 if asc else 0)
    y0 = max(150, 140 + (580 - gh) / 2)
    d = {'title': title, 'titleSize': tS, 'ascii': asc, 'bigSize': bigS, 'sub': sub, 'subSize': sS, 'cmd': cm, 'bios': BI, 'head': head,
         'login': login, 'P': P, 'E': E, 'A0': A0, 'A1': A1, 'S1': S1, 'T1': T1, 'y0': round(y0), 'bigH': round(bigH), 'bottom': round(y0 + gh)}
    return d, hold, ev, [P * 0.6, A1 + 0.3, hold], title + sub + cm + head + login + ''.join(x['text'] + x['status'] for x in BI) + lab['loadCore'] + lab['post']


def ch_whoami(c, w, rb, g):
    lab = g['lab']
    asc = ascii_spec(f'{w}.ascii ASCII 名稱', c.get('ascii') or g['ascii'])
    nm = g['title']
    if asc:
        cwid = min(28, 840 / asc['cols'])
        asc.update(cw=round(cwid, 2), ch=round(cwid * 1.3, 2))
        nS = 0
    else:
        _, nS = fit(f'{w} 左邊名稱大字（boot 的 title）', nm, 120, 56, 820)
    IT = need(f'{w}.info', lst(c.get('info')), 2, 6, '資訊列')
    rows, t, txt = [], 0, ''
    kw = max([em((x or {}).get('key')) for x in IT] + [1])
    if kw > 5: ERR.append(f'{w}.info 的 key 最多約 5 字')
    for j, x in enumerate(IT):
        x = x or {}
        k_, _ = fit(f'{w}.info[{j}].key', x.get('key'), 30, 30, 160, False)
        v, vS = fit(f'{w}.info[{j}].value', x.get('value'), 30, 28, 840 - (kw + 1) * 30, False)
        rows.append({'key': k_, 'value': v, 'size': vS})
        txt += k_ + v
    slogan, slS = fit(f'{w}.slogan 標語大字', c.get('slogan'), 116, 64, 1720)
    ev = {}
    E1 = cmd(0.1, 'whoami', ev, 0.15)
    E2 = cmd(E1 + 0.25, 'neofetch', ev, 0.15)
    t = E2 + 0.5
    for o in rows:
        o['at'] = t
        t += max(0.5, min(1.0, rb(o['key'], o['value']) * 0.35))
    ev['line'] = [E1] + [o['at'] for o in rows]
    ev['whoosh'] = [E2]
    colAt = t
    last = colAt
    if slogan:
        E3 = cmd(colAt + 0.5, 'echo $SLOGAN', ev, 0.15)
        S1 = E3 + max(1.2, min(3.0, len(slogan) * 0.17))
        ev['key'] += keys(E3, S1 + 2 / B, slogan)
        last = S1
    else:
        E3 = S1 = 0
    hold = last + 1.5 + rb(slogan, *[r['key'] + r['value'] for r in rows]) * 0.35
    d = {'ascii': asc, 'name': nm if not asc else '', 'nameSize': nS, 'info': rows, 'slogan': slogan, 'sloganSize': slS,
         'E1': E1, 'E2': E2, 'colAt': colAt, 'E3': E3, 'S1': S1, 'bottom': 652 + 140 if slogan else 180 + (len(rows) + 3) * 44}
    return d, hold, ev, [colAt, hold], txt + slogan + 'whoami neofetch echo $SLOGAN' + g['user'] + g['host']


def ch_ls(c, w, rb, g):
    lab = g['lab']
    IT = need(f'{w}.items', lst(c.get('items')), 2, 9, '清單項目')
    n = len(IT)
    dr = str(c.get('dir') or f'./{g["host"]}/')
    cm, _ = fit(f'{w}.dir 目錄', f'ls -l {dr}', 32, 32, 1780 - em(g['ps']) * 32)
    RH = 58 if n <= 7 else 54
    names = [str((x or {}).get('name') or '') for x in IT]
    tags = [str((x or {}).get('tag') or '') for x in IT]
    nameW = min(560, max(em(s) * 34 for s in names) + 34)
    tagW = max([em(f'[{s}]') * 32 for s in tags if s] + [0])
    nameX = round(16 + 192 + 30 + len(g['user']) * 19.2 + 30 + 4 * 19.2 + 40)      # 權限、使用者、4096 之後
    tagX = nameX + nameW + 30
    noteX = tagX + (tagW + 40 if tagW else 0)
    out, txt = [], ''
    ev = {}
    E = cmd(0.2, cm, ev)
    t = E + 0.75
    for j, x in enumerate(IT):
        x = x or {}
        nm, nS = fit(f'{w}.items[{j}].name 名稱', x.get('name'), 34, 28, 560, False)
        tg, _ = fit(f'{w}.items[{j}].tag 標籤', f'[{x["tag"]}]' if x.get('tag') else '', 32, 32, 300)
        nt, ntS = fit(f'{w}.items[{j}].note # 說明', x.get('note'), 32, 26, 1816 - noteX - 70)
        out.append({'name': nm, 'nameSize': nS, 'tag': tg, 'note': nt, 'noteSize': ntS, 'at': t})
        t += max(0.75, min(1.25, rb(nm, tg, nt) * 0.35))
        txt += nm + tg + nt
    sm = f'✓ {n} {lab["dirs"]}'
    extra, exS = fit(f'{w}.summary 統計列', c.get('summary'), 32, 28, 1700 - em(sm) * 32)
    sumAt = t + 0.25
    selAt = sumAt + 0.5
    ev['line'] = [E] + [o['at'] for o in out] + [sumAt]
    last = selAt + n * 3 / B
    hold = last + 0.75 + rb(*[o['name'] + o['note'] for o in out]) * 0.2
    top0 = 24 + 50 * 2
    d = {'cmd': cm, 'items': out, 'RH': RH, 'nameX': nameX, 'nameW': round(nameW), 'tagX': round(tagX), 'noteX': round(noteX), 'E': E,
         'total': f'{lab["total"]} {n}', 'sum': sm, 'extra': extra, 'extraSize': exS, 'sumAt': sumAt, 'selAt': selAt,
         'bottom': top0 + n * RH + 18 + 50}
    return d, hold, ev, [out[min(2, n - 1)]['at'] + 0.5 if out else 2, hold], txt + cm + sm + extra + d['total'] + 'drwxr-xr-x4096' + g['host']


def ch_tmux(c, w, rb, g):
    lab = g['lab']
    PN = need(f'{w}.panes', lst(c.get('panes')), 2, 4, '窗格')
    n = len(PN)
    PW = 934
    PH = 406 if n >= 3 else 816
    rowsMax = int((PH - 44) // 46)
    out, txt = [], ''
    ev = {'whoosh': [0.0] + ([1.0] if n >= 3 else [])}
    T0 = [2.0, 0.4, 1.6, 1.8]                          # 各窗格開始打指令（原作）；第一格要等上一章被推走
    for j, x in enumerate(PN):
        x = x or {}
        st = str(x.get('style') or STYLES[j % 4])
        if st not in STYLES: ERR.append(f'{w}.panes[{j}].style 只能是 {"、".join(STYLES)}（現在「{st}」）'); st = 'list'
        label, _ = fit(f'{w}.panes[{j}].label 窗格標籤', x.get('label'), 28, 28, 300, False)
        pw = 1868 if (n == 3 and j == 2) else PW
        cm = str(x.get('cmd') or STYLE_CMD[st].format(l=label))
        cm, _ = fit(f'{w}.panes[{j}].cmd 指令', cm, 30, 28, pw - 100)
        LN = [str(s) for s in lst(x.get('lines'))]
        if not 1 <= len(LN) <= 5: ERR.append(f'{w}.panes[{j}].lines 輸出要 1～5 行（現在 {len(LN)} 行）')
        LN = LN[:5]
        pre = {'list': 2, 'tree': 4, 'log': 7, 'make': 3}[st]          # ▸ ／├── ／[ OK ] ／CC
        right = 3 if st == 'make' else 0
        lines = [fit(f'{w}.panes[{j}].lines[{i}]', s, 30, 28, pw - 60 - (pre + right) * 18, False) for i, s in enumerate(LN)]
        star, starS = fit(f'{w}.panes[{j}].star 最後一行（★）', x.get('star'), 30, 28, pw - 90 - (em(lab['success']) * 30 + 30 if st == 'make' else 0))
        rows = 1 + len(lines) + (1 if star or st == 'make' else 0) + (1 if st == 'make' else 0) + (1 if st == 'tree' else 0)
        if rows > rowsMax: ERR.append(f'{w}.panes[{j}] 這一格放不下（指令＋輸出＋★ 共 {rows} 行，{n} 格時每格最多 {rowsMax} 行）')
        t0 = T0[j]
        E = cmd(t0, cm, ev, 0.15)
        t = E + 1.0
        L = []
        for (s, z) in lines:
            L.append({'text': s, 'size': z, 'at': t})
            t += max(0.6, min(1.0, rb(s) * 0.5))
        barAt = t if st == 'make' else 0
        if st == 'make': t += 2.0
        stAt = t + 0.25 if (star or st == 'make') else 0
        out.append({'label': f'{j}:{label}', 'cmd': cm, 'style': st, 't0': t0, 'E': E, 'lines': L, 'barAt': barAt, 'star': star,
                    'starSize': starS, 'starAt': stAt, 'end': max(stAt, t)})
        ev.setdefault('line', []).extend([o['at'] for o in L] + ([stAt] if stAt else []))
        txt += label + cm + ''.join(s for s, _ in lines) + star
    last = max(o['end'] for o in out)
    hold = max(last + 1.0, 3 + rb(*[o['text'] for p in out for o in p['lines']], *[p['star'] for p in out]) * 0.35)
    d = {'panes': out, 'n': n, 'PW': PW, 'PH': PH, 'actFrom': 3.0}
    return d, hold, ev, [last * 0.6, last + 0.5, hold], txt + lab['success'] + lab['pass'] + '├──└──▸★✓$ '


def ch_cat(c, w, rb, g):
    lab = g['lab']
    fl = str(c.get('file') or f'{g["host"]}.txt')
    cm, _ = fit(f'{w}.file 檔名', f'cat {fl}', 32, 32, 1780 - em(g['ps']) * 32)
    BX = need(f'{w}.boxes', lst(c.get('boxes')), 1, 2, '大數字框')
    nb_ = len(BX)
    W = [880, 872] if nb_ == 2 else [1784]
    out, txt = [], ''
    ev = {}
    E = cmd(0.05, cm, ev)
    t = E + 0.5
    for j, x in enumerate(BX):
        x = x or {}
        val = number(f'{w}.boxes[{j}].n 大數字', x.get('n'), 7)
        unit = str(x.get('unit') or '')
        if em(unit) > 2: ERR.append(f'{w}.boxes[{j}].unit 單位「{unit}」最多 2 字')
        S = min(230, (W[j] - 110) / max(0.6, 0.6 * len(val) + 0.5 * em(unit)))
        if S < 110: ERR.append(f'{w}.boxes[{j}] 大數字＋單位「{val}{unit}」太長（約 5 位數＋1 字單位）')
        label, _ = fit(f'{w}.boxes[{j}].label 框上的標籤', f'[ {x["label"]} ]' if x.get('label') else '', 28, 28, W[j] - 80)
        pre, pS = fit(f'{w}.boxes[{j}].pre 數字上方小字', x.get('pre'), 36, 28, W[j] - 80)
        note, noS = fit(f'{w}.boxes[{j}].note 框底小字', x.get('note'), 28, 26, W[j] - 80)
        nd = max(1, sum(ch.isdigit() for ch in val))
        lock = [t + 1.0 + i * min(0.4, 1.2 / max(1, nd - 1)) for i in range(nd)]
        out.append({'n': val, 'unit': unit, 'size': int(max(110, S)), 'label': label, 'pre': pre, 'preSize': pS, 'note': note,
                    'noteSize': noS, 'at': t, 'lock': lock, 'laps': 2 if nd <= 2 else 1, 'w': W[j], 'x': 44 if j == 0 else 956})
        ev.setdefault('pop', []).append(t)
        ev.setdefault('tick', []).extend(lock)
        t = t + 1.25
        txt += val + unit + label + pre + note
    RW = []
    if len(lst(c.get('rows'))) > 3: ERR.append(f'{w}.rows 最多 3 列（現在 {len(lst(c.get("rows")))} 列）')
    t = max(o['lock'][-1] for o in out) + 0.25
    for j, x in enumerate(lst(c.get('rows'))[:3]):
        x = x or {}
        lb, lS = fit(f'{w}.rows[{j}].label 左邊說明', x.get('label'), 32, 28, 620, False)
        val = number(f'{w}.rows[{j}].n 數字', x.get('n'), 7) if x.get('n') not in (None, '') else ''
        unit = str(x.get('unit') or '')
        pct = unit == '%' and bool(val)
        if pct:
            try: pv = float(val.replace(',', ''))
            except ValueError: pv = 0
            if not 0 <= pv <= 100: ERR.append(f'{w}.rows[{j}] 百分比「{val}」要在 0～100')
        else:
            pv = 0
        nW = (0.6 * len(val) * 40 + em(unit) * 40 + 20) if val else 0
        note, nS = fit(f'{w}.rows[{j}].note 右邊小字', x.get('note'), 30, 26, 1780 - 660 - (660 + 120 if pct else nW) - 30)
        nd = max(1, sum(ch.isdigit() for ch in val))
        lock = [t + 0.75 + i * 0.25 for i in range(nd)] if val else []
        RW.append({'label': lb, 'labelSize': lS, 'n': val, 'unit': unit, 'pct': pv / 100 if pct else -1, 'note': note, 'noteSize': nS,
                   'at': t, 'lock': lock})
        ev.setdefault('line', []).append(t)
        ev.setdefault('tick', []).extend(lock)
        t += max(0.75, min(1.25, rb(lb, val, unit, note) * 0.4))
        txt += lb + val + unit + note
    last = max([t - 0.5] + [o['lock'][-1] for o in out])
    hold = last + 0.75 + rb(*[o['pre'] + o['label'] + o['n'] + o['unit'] for o in out]) * 0.25
    d = {'cmd': cm, 'boxes': out, 'rows': RW, 'E': E, 'bottom': 530 + len(RW) * 64 if RW else 500}
    return d, hold, ev, [out[0]['lock'][-1] + 0.3, hold], txt + cm + '[]'


def ch_status(c, w, rb, g):
    lab = g['lab']
    un = str(c.get('unit') or g['host'])
    cm, _ = fit(f'{w}.unit 查詢對象', f'systemctl status {un}', 32, 32, 1100 - em(g['ps']) * 32)
    IT = need(f'{w}.items', lst(c.get('items')), 2, 6, '服務')
    MON = [str(s) for s in lst(c.get('monitor'))] if c.get('monitor') is not None else \
        [str((x or {}).get('name') or '')[:4] for x in IT[:4]]
    if len(MON) > 4: ERR.append(f'{w}.monitor 監控面板最多 4 條（現在 {len(MON)} 條）')
    MON = [fit(f'{w}.monitor[{j}] 監控標籤', s, 28, 28, 140)[0] for j, s in enumerate(MON[:4])]
    colW = 1110
    out, txt, t = [], '', 0
    ev = {}
    E = cmd(0.1, cm, ev)
    ping = c.get('ping', True) is not False
    pingTo = str(g['url'] or g['host'])
    pingCmd, _ = fit(f'{w} ping 網址（storyboard 的 url）', f'ping {pingTo}', 28, 26, 590)
    PE = cmd(E + 0.5, pingCmd, ev, 0.15) if ping else 0
    t = E + 1.0
    H = 0
    for j, x in enumerate(IT):
        x = x or {}
        nm = str(x.get('name') or '')
        if not nm: ERR.append(f'缺欄位 {w}.items[{j}].name 服務名稱')
        desc = str(x.get('desc') or '')
        head = em(nm + '.service') * 36 + (em(' — ' + desc) * 32 if desc else 0) + 50
        hs = min(1.0, (colW - 10) / head)
        if hs < 0.8: ERR.append(f'{w}.items[{j}]「{nm}.service — {desc}」太長（名稱＋說明合計中文約 {int((colW - 60) / 34)} 字）')
        state, sS = fit(f'{w}.items[{j}].state 狀態', x.get('state') or lab['running'], 30, 26, colW - 120)
        note, nS = fit(f'{w}.items[{j}].note 備註', x.get('note'), 28, 26, colW - 120)
        h = 46 * (3 if note else 2) + 18
        out.append({'name': nm + '.service', 'desc': desc, 'hs': round(max(0.8, hs), 3), 'state': state, 'stateSize': sS, 'note': note,
                    'noteSize': nS, 'at': t, 'h': h})
        H += h
        t += max(1.0, min(1.75, rb(nm, desc, note) * 0.4))
        txt += nm + '.service' + desc + state + note
    if H > 700: ERR.append(f'{w}.items 太多（{len(IT)} 項共 {H} px，畫面只有 700 px：有 note 的服務最多約 4 項、沒有 note 最多 6 項）')
    ev['line'] = [o['at'] for o in out]
    nping = 6
    pings = [PE + 0.75 + i * 1.0 for i in range(nping)] if ping else []
    ev['tick'] = [p for p in pings]
    last = out[-1]['at'] if out else 2
    hold = last + 1.25 + rb(*[o['name'] + o['desc'] + o['note'] for o in out]) * 0.2
    d = {'cmd': cm, 'items': out, 'monitor': MON, 'E': E, 'ping': ping, 'pingCmd': pingCmd, 'PE': PE, 'pings': pings,
         'replyTo': g['host'], 'bottom': 100 + H}
    return d, hold, ev, [out[min(1, len(out) - 1)]['at'] + 0.6, hold], txt + cm + pingCmd + ''.join(MON) + lab['reply'] + g['host'] + 'seq=0123456789 ok●—'


def ch_end(c, w, rb, g):
    lab = g['lab']
    join = str(c.get('join') or g['title'])
    cm, _ = fit(f'{w}.join sudo join 的對象', f'sudo join {join}', 32, 32, 1780 - em(g['ps']) * 32)
    checks = [str(s) for s in lst(c.get('checks'))] or [lab['check1'], lab['check2'], f'{lab["join"]} {join}']
    if len(checks) > 3: ERR.append(f'{w}.checks 驗證項目最多 3 項（現在 {len(checks)} 項）')
    checks = [fit(f'{w}.checks[{j}] 驗證項目', s, 32, 28, 1100)[0] for j, s in enumerate(checks[:3])]
    welcome, wS = fit(f'{w}.welcome ACCESS GRANTED 下方大字', c.get('welcome') or f'{lab["welcome"]} {join}', 68, 44, 1220)
    sub, sbS = fit(f'{w}.sub 下方琥珀色一行', c.get('sub'), 36, 28, 1220)
    root = f'root@{g["host"]}:~# '
    rootTail, rtS = fit(f'{w} uid 行（使用者＋join）', f'uid=0({g["user"]}) groups={join}', 32, 28, 1780 - em(root) * 32)
    asc = ascii_spec(f'{w}.ascii logo 的 ASCII 名稱', c.get('ascii') or g['ascii'])
    if asc:
        cwid = min(30, 1180 / asc['cols'])
        asc.update(cw=round(cwid, 2), ch=round(cwid * 1.2, 2))
        nS = 0
    else:
        _, nS = fit(f'{w} logo 名稱大字（boot 的 title）', g['title'], 110, 60, 1160)
    slogan, slS = fit(f'{w}.slogan 標語（logo 視窗）', c.get('slogan'), 100, 56, 1180, False)
    full, fS = fit(f'{w}.full 標語下方一行', c.get('full'), 40, 28, 1160)
    url = str(c.get('url') or '')
    url, uS = fit(f'{w}.url $ open 網址', url, 36, 28, 1160 - em(f'$ {lab["open"]} ') * 36)
    ev = {}
    E = cmd(0.1, cm, ev)
    box = E + 0.5
    dots = [box + 0.25 + i * 0.25 for i in range(6)]
    V0 = dots[-1] + 0.5
    V1 = V0 + 1.25
    ck = [V0 + 0.25 + i * 0.4 for i in range(len(checks))]
    G = math.ceil(V1 + 0.25)                            # ACCESS GRANTED 落在拍點上
    rootAt = G + 0.5
    subAt = G + 1.0
    S = 2 * math.ceil((G + 1.75 + rb(welcome, sub) * 0.3) / 2)   # 縮成 logo 視窗（落在小節頭或小節中間的強拍）
    lg = {'scan1': 1.5, 'sl': 1.5, 'full': 2.25, 'open': 3.0}
    u1 = 3.3 + max(1.0, min(2.2, len(url) * 0.08)) if url else 3.0
    ev['tick'] = dots
    ev['line'] = [E] + ck + [rootAt]
    ev['granted'] = [G]
    ev['whoosh'] = [V0, S]
    ev['pop'] = [S + lg['sl']] + ([S + lg['full']] if full else [])
    if url:
        ev['key'] += keys(S + 3.3, S + u1 + 2 / B, url)
        ev['enter'].append(S + u1 + 0.25)
    tail = max(u1, 4.5) + 1.0 + rb(slogan, full, url) * 0.3 + 2.0    # 最後 1.4 秒配樂淡出（字還在畫面上）
    L = S + math.ceil(tail)
    d = {'cmd': cm, 'join': join, 'checks': checks, 'welcome': welcome, 'welcomeSize': wS, 'sub': sub, 'subSize': sbS, 'root': root,
         'rootTail': rootTail, 'rootSize': rtS, 'E': E, 'box': box, 'dots': dots, 'V0': V0, 'V1': V1, 'ck': ck, 'G': G, 'rootAt': rootAt,
         'subAt': subAt, 'S': S, 'ascii': asc, 'name': '' if asc else g['title'], 'nameSize': nS, 'slogan': slogan, 'sloganSize': slS,
         'full': full, 'fullSize': fS, 'url': url, 'urlSize': uS, 'u1': u1, 'lg': lg}
    return d, L, ev, [box + 1.5, V1, G + 1.5, S + 1.5, L - 0.5], \
        cm + ''.join(checks) + welcome + sub + root + rootTail + slogan + full + url + lab['password'] + lab['pwFor'] + lab['verify'] + lab['granted'] + lab['open'] + '●✓[sudo]$'


BUILDERS = {'boot': ch_boot, 'whoami': ch_whoami, 'ls': ch_ls, 'tmux': ch_tmux, 'cat': ch_cat, 'status': ch_status, 'end': ch_end}
OUT_NEED = {'clear': 1.2, 'minimize': 0.85, 'split': 0.0, 'zoom': 0.8, '': 0.0}   # clear 指令在章尾 2.2 拍前開始打，和停留時間重疊


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rb = lambda *ss: nchars(*ss) / pace * FPS / B
    lab = {**CHROME, **(sb.get('labels') or {})}
    CHS = lst(sb.get('chapters'))
    types = [str((x or {}).get('type') or '') for x in CHS]
    if not 3 <= len(CHS) <= 7: ERR.append(f'chapters 要 3～7 章（現在 {len(CHS)} 章；示範 25～35 秒約 5 章）')
    if not types or types[0] != 'boot': ERR.append('chapters 第一章必須是 boot（開機自檢）')
    if not types or types[-1] != 'end': ERR.append('chapters 最後一章必須是 end（sudo join → ACCESS GRANTED → logo）')
    for i, ty in enumerate(types):
        if ty not in TYPES: ERR.append(f'chapters[{i}].type 只能是 {"、".join(TYPES)}（現在「{ty}」）')
        elif ty in ('boot', 'end') and 0 < i < len(types) - 1: ERR.append(f'chapters[{i}] {ty} 只能放在第一章／最後一章')
        if ty == 'tmux' and i > 0 and types[i - 1] == 'tmux': ERR.append(f'chapters[{i}] 不能連續兩章 tmux')
    boot = next((x for x, ty in zip(CHS, types) if ty == 'boot'), {}) or {}
    end = next((x for x, ty in zip(CHS, types) if ty == 'end'), {}) or {}
    # 主機名（提示字元、標題列、狀態列用）：storyboard 的 host，沒寫就用 boot 的 ascii 轉小寫
    host = str(sb.get('host') or re.sub(r'[^a-z0-9]+', '', str(boot.get('ascii') or '').lower()))
    if not host: ERR.append('host 主機名（英數，例 sunnywindow）沒寫，boot 也沒有英數 ascii 可以轉：請在 storyboard 最外層寫 host')
    elif not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,17}', host): ERR.append(f'host「{host}」只能用小寫英數與 -，最多 18 個字元')
    user = str(sb.get('user') or 'guest')
    if not re.fullmatch(r'[a-z_][a-z0-9_-]{0,15}', user): ERR.append(f'user「{user}」只能用小寫英數與 _ -，最多 16 個字元')
    title = str(boot.get('title') or '')
    url = str(sb.get('url') if sb.get('url') is not None else end.get('url') or '')
    ps = f'{user}@{host}:~$ '
    g = {'lab': lab, 'host': host, 'user': user, 'title': title, 'ascii': boot.get('ascii') or '', 'url': url, 'ps': ps}

    # 轉場：進 tmux＝split、出 tmux＝zoom；其他換章點 clear／minimize 輪流（每章可用 transition 指定）
    trans = ['']
    alt = 0
    for i in range(1, len(CHS)):
        if types[i] == 'tmux': tr = 'split'
        elif types[i - 1] == 'tmux': tr = 'zoom'
        else:
            tr = str((CHS[i] or {}).get('transition') or ('clear', 'minimize')[alt % 2])
            if tr not in ('clear', 'minimize'): ERR.append(f'chapters[{i}].transition 只能是 clear 或 minimize（tmux 前後固定是窗格分割與放大）'); tr = 'clear'
            alt += 1
        trans.append(tr)

    S, txt, stl_b, t = [], '', [], 0
    sfx = {k: [] for k in ('key', 'enter', 'line', 'tick', 'pop', 'whoosh', 'beep', 'granted')}
    secs = []
    for i, x in enumerate(CHS[:7]):
        x = x or {}
        ty = types[i]
        if ty not in BUILDERS: continue
        w = f'chapters[{i}]（{ty}）'
        d, need_b, ev, st, tx = BUILDERS[ty](x, w, rb, g)
        out = trans[i + 1] if i + 1 < len(trans) else ''
        evmax = max([b for v in ev.values() for b in v] or [0])
        nb = need_b if ty == 'end' else bars(max(need_b + OUT_NEED.get(out, 0), evmax + (2.6 if out == 'clear' else 1.0)))
        ttl = {'boot': 'boot', 'whoami': 'whoami', 'ls': d.get('cmd', 'ls'), 'tmux': f'tmux · {d.get("n", 0)} panes', 'cat': d.get('cmd', 'cat'),
               'status': 'systemctl status', 'end': 'sudo'}[ty]
        wt, _ = fit(f'{w} 標題列（使用者＠主機＋指令）', f'{user}@{host}: ~ — {ttl}', 28, 28, 1180)
        S.append({'type': ty, 'beat': t, 'nb': nb, 'from': int(round(t * B)), 'trans': trans[i], 'out': out, 'title': wt, **d})
        if out == 'clear':      # 章尾的 clear 指令（在 Ad.tsx 統一畫）：倒數 2.2 拍開始打字、倒數 1 拍按 Enter，然後整個畫面逐行往上捲走
            ev.setdefault('key', []).extend(keys(nb - 2.2, nb - 1.0, 'clear'))
            ev.setdefault('enter', []).append(nb - 1.0)
            ev.setdefault('whoosh', []).append(nb - 0.9)
        elif out == 'minimize':
            ev.setdefault('whoosh', []).append(nb - 12 / B)
        elif out == 'zoom':
            ev.setdefault('whoosh', []).append(nb - 11 / B)
        for k_, v in ev.items(): sfx.setdefault(k_, []).extend(t + b for b in v)
        stl_b += [t + b for b in st]
        txt += tx + wt
        secs.append(t)
        if ty == 'end': secs.append(t + d['S'])
        t += nb
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    frames = int(round(t * B))
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加章，不要編造內容')
    for i, s in enumerate(S):
        s['to'] = S[i + 1]['from'] if i + 1 < len(S) else frames
    # 狀態列：每章一個視窗名，最後一章再多一個 open（縮成 logo 視窗那一刻高亮）
    wins = [WIN[s['type']] for s in S] + ['open']
    session = str(sb.get('session') or title)
    hints = [('^B %', lab['vsplit']), ('^B "', lab['hsplit']), ('^B z', lab['zoom']), ('^B d', lab['detach'])]
    hw = sum(em(a) + 0.6 + em(b) + 2 for a, b in hints) * 28 + 48
    sw = (em(lab['session']) + 0.6 + em(session)) * 28 + 48
    if hw + sw + 40 > 1920: ERR.append(f'session 狀態列右邊的名稱「{session}」太長（中文約 {int((1920 - hw - 40) / 28 - em(lab["session"]) - 1)} 字）：storyboard 最外層 session 可改短')
    hb = em(f'[{host}]') * 28 + 44
    ww = sum((em(f'{j}:{n}*') + 0.6) * 28 + 26 for j, n in enumerate(wins))
    uw = em(url) * 28 + 52
    if hb + 20 + ww + uw + 30 > 1920: ERR.append(f'狀態列太長（{int(hb + ww + uw)} px）：url「{url}」改短（storyboard 最外層 url），或少一章')
    # 桌面圖示（logo 視窗縮小後才看得到）：取自章的目錄、檔名、服務
    icl = []
    for s in S:
        if s['type'] == 'ls': icl.append((s['cmd'].split(' ')[-1].strip('./').split('/')[-1] or host) + '/')
        elif s['type'] == 'cat': icl.append(s['cmd'][4:])
        elif s['type'] == 'status': icl.append(s['cmd'].split(' ')[-1] + '.log')
    icr = [f'{host}.sh', 'README', 'join.key']
    icl = [x for x in icl if em(x) * 28 <= 210][:3]
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))

    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [round(b * B) for b in stl_b]
    for s in S[1:]:
        stl += [s['from'] - 6, s['from'] + 6]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 24: stl.pop(len(stl) // 2)
    e = S[-1]
    poster = cl(e['from'] + round((e['G'] + 1.5) * B))
    mid = S[len(S) // 2]
    b0 = S[0]
    ov = [cl(b0['from'] + round((b0['A1'] + 0.5) * B)), cl(mid['from'] + (mid['to'] - mid['from']) * 0.6), cl(frames - 30)]
    allText = ''.join([txt, *lab.values(), ps, session, url, host, user, *wins, *icl, *icr, *[a + b for a, b in hints],
                       '0123456789ABCDEF ,.:%/+-_>[]()=@~$#&*!?·●✓★▸─├└│…'])
    return {'template': '廣R', 'name': sb.get('name', '駭客終端'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beat': B, 'beats': t,
            'chapters': S, 'sections': [round(x * B) for x in secs],
            'sfx': {k: sorted(round(b * B) for b in v) for k, v in sfx.items()},
            'd': {'labels': lab, 'host': host, 'user': user, 'session': session, 'url': url, 'wins': wins, 'iconsL': icl, 'iconsR': icr},
            'stills': stl, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    except ValueError as e:
        sys.exit(f'✗ storyboard 不符合範本欄位規定：\n{e}')
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', tl['beats'], '拍＝', tl['beats'] / 4, '小節）')
    for i, s in enumerate(tl['chapters']):
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）第 {i + 1} 章 {TYPE_ZH[s["type"]]}（{s["nb"]} 拍＝{s["nb"] * B / FPS:.1f} 秒）'
              + (f'　進場 {s["trans"]}' if s['trans'] else '') + (f'　縮成 logo 在第 {s["S"]} 拍' if s['type'] == 'end' else ''))
    print('  字數', len(set(tl['allText'])))
