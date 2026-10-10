"""範本廣N「數位故障」時間表：storyboard.json → 時間表（每一章第幾格開始、章內每個解碼／鎖定事件的拍點、音效事件、畫面上的字與字級）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（訊號被干擾的螢幕：資訊不是「出現」，是「解碼成功」；phonk 110 BPM，一拍 16.36 格，每一章都從拍上開始）：
  chapters 依序列出要用的章（3～7 章；第一章必須是 open、最後一章必須是 logo，中間可任選、順序可換、可省略）：
    open      開場：SIGNAL LOST 錯誤視窗 → 縮寫亂碼解碼（可省）→ 名稱解碼鎖定＋英文一行＋全名一行
    layers    數字組合逐層解碼：1～3 個面板（數字＋單位＋名單），最後合成一行
    channels  頻道切換：2～9 個項目像轉台一樣切過去（CH01…）
    errors    錯誤視窗彈出又修復：1～4 個亮點，左邊修復紀錄一條一條 [OK]
    numbers   數字亂碼滾動鎖定：1～2 個大數字（只用文本的數字），可加 1～2 張小數字卡
    status    系統狀態列：2～6 列「項目／說明／狀態」逐列上線，最後 ALL SYSTEMS ONLINE
    logo      收尾：全畫面故障慢慢收斂成名稱、標語、一行小字、網址
  換章：前 4 格～後 5 格畫面切成 20 條撕裂、新舊兩章切條穿插、RGB 色版爆開再收回（招牌轉場）。
章數與字數決定片長。
"""
import math
import re

FPS, BPM = 30, 110
B = FPS * 60 / BPM          # 一拍 16.3636 格
ERR = []
TYPES = ['open', 'layers', 'channels', 'errors', 'numbers', 'status', 'logo']
MIDDLE = ['layers', 'channels', 'errors', 'numbers', 'status']
TYPE_ZH = {'open': '開場解碼', 'layers': '數字組合', 'channels': '頻道切換', 'errors': '錯誤修復', 'numbers': '數字鎖定',
           'status': '系統狀態', 'logo': '收尾 logo'}
# 上方角標的章名（每一章可用 label 覆寫）
TYPE_LABEL = {'open': 'BOOT', 'layers': 'INDEX', 'channels': 'CHANNEL', 'errors': 'ERROR LOG', 'numbers': 'DATA', 'status': 'SYSTEM',
              'logo': 'END'}
# 範本自己的介面字（訊號、錯誤視窗、狀態列的通用英文介面；storyboard 的 labels 可覆寫）
CHROME = {'lostTitle': '!! SIGNAL LOST · ERR 0x00', 'noSignal': 'NO SIGNAL', 'decoding': 'DECODING', 'lostMsg': '訊號中斷　正在嘗試重新解碼',
          'source': '> DECODING SOURCE //', 'acquired': 'SIGNAL ACQUIRED', 'layer': 'LAYER', 'ok': '[ OK ]', 'tuning': 'TUNING...',
          'play': 'PLAY', 'repairLog': 'REPAIR LOG', 'error': '!! ERROR', 'corrupted': 'DATA CORRUPTED', 'repaired': '[OK] REPAIRED',
          'repairing': 'REPAIRING', 'restoredMsg': 'CHECKSUM MATCH · DATA RESTORED', 'fixing': 'FIXING', 'restored': 'RESTORED',
          'locked': 'LOCKED', 'status': 'SYSTEM STATUS', 'allOk': 'ALL SYSTEMS ONLINE', 'signalRestored': 'SIGNAL RESTORED · 100%',
          'rec': 'REC', 'seq': 'SEQ'}
# 亂碼解碼時中文字鎖定前跳動的字（畫面會出現，要一起載入字型）
CJK_POOL = '訊號解碼錯誤資料損壞系統重啟傳輸頻道載入緩衝封包節點掃描同步'
LAT_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$*?<>/=+'


def cw(c, latin=0.58):
    if ord(c) >= 0x2E80: return 1.0
    if c == ' ': return 0.3
    return latin


def em(s, latin=0.58): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss):   # 讀字量：中文 1、英數 0.5（英數一眼看得比較快）
    return sum((1.0 if ord(c) >= 0x2E80 else 0.5) for s in ss for c in str(s or '') if not c.isspace())
def fb(n): return int(round(n * B))                                  # 拍數 → 格數


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
        ERR.append(f'{where}「{s}」只能用英文字母、數字（故障字型沒有中文）')
    if len(s) > maxn: ERR.append(f'{where}「{s}」太長（最多 {maxn} 個字元）')
    return s


def lst(x):
    if x is None: return []
    if isinstance(x, (str, dict)): return [x]
    return list(x)


# ───────────────────────── 每一種章 ─────────────────────────
def ch_open(c, w, rb):
    abbr = latin_only(f'{w}.abbr 縮寫（亂碼解碼大字）', c.get('abbr'), 6).upper()
    name, nameS = fit(f'{w}.name 名稱大字', c.get('name'), 250, 140, 1700, False, ls=0.07)
    en, enS = fit(f'{w}.en 名稱下方英文一行', c.get('en'), 46, 30, 1700, latin=0.6, ls=0.3)
    full, fullS = fit(f'{w}.full 全名或一句話', c.get('full'), 44, 32, 1350)
    A = 4                                     # SIGNAL LOST 視窗 4 拍（一小節）
    N0 = A + 4 if abbr else A                 # 名稱開始解碼的拍
    n = max(1, len(name))
    zstep = min(0.5, 2.5 / n)
    L = N0 + max(8, math.ceil(rb(name, en, full) * 0.6 + 2))
    locksA = [A + i * min(1.0, 3.0 / max(1, len(abbr) - 1)) for i in range(len(abbr))]
    ev = {'tick': [*locksA, *[N0 + i * zstep for i in range(n)]], 'ok': [N0 + 4] if full or en else [], 'static': [0]}
    d = {'abbr': abbr, 'hex': ''.join(f'{ord(ch):02X}' for ch in abbr), 'name': name, 'nameSize': nameS, 'en': en, 'enSize': enS,
         'full': full, 'fullSize': fullS, 'A': A, 'N0': N0, 'locksA': locksA, 'zstep': zstep}
    return d, L, ev, [N0 + 6, L - 1], name + en + full + abbr


def ch_layers(c, w, rb):
    P = lst(c.get('panels'))
    if not 1 <= len(P) <= 3: ERR.append(f'{w}.panels 要 1～3 個面板（現在 {len(P)} 個）')
    P = P[:3]
    np_ = max(1, len(P))
    pw = {1: 1000, 2: 760, 3: 520}[np_]
    out, txt = [], ''
    starts, t = [], 0
    for j, p in enumerate(P):
        p = p or {}
        num = str(p.get('n') or '').strip()
        unit = str(p.get('unit') or '').strip()
        if not num: ERR.append(f'{w}.panels[{j}].n 數字（必備，只用文本有的數字）')
        if len(unit) > 3: ERR.append(f'{w}.panels[{j}].unit 單位「{unit}」最多 3 字')
        wid = 0.6 * 240 * len(num) + 120 * em(unit) + 16
        sc = min(1.0, (pw - 60) / max(1, wid))
        if sc < 0.45: ERR.append(f'{w}.panels[{j}] 數字＋單位「{num}{unit}」太長（這個面板寬最多約 {int((pw - 60) / (0.45 * 144))} 位數）')
        names = [str(x) for x in lst(p.get('names'))]
        if len(names) > 6: ERR.append(f'{w}.panels[{j}].names 最多 6 行')
        NM = []
        for q, x in enumerate(names[:6]):
            s, sz = fit(f'{w}.panels[{j}].names[{q}] 名單', x, 36, 28, pw - 110)
            NM.append([s, sz])
        nm_sz = min([sz for _, sz in NM] or [36])
        dur = max(3, math.ceil(rb(num, unit, *names) * 0.5 + 1.5))   # 面板解碼後一直留在畫面上，讀的時間可以跨到後面的面板
        starts.append(t); t += dur
        out.append({'n': num, 'unit': unit, 'scale': round(max(0.45, sc), 3), 'names': [s for s, _ in NM], 'namesSize': nm_sz, 'at': starts[-1]})
        txt += num + unit + ''.join(names)
    fin = t
    wid = sum(0.6 * 220 * len(p['n']) + 160 * em(p['unit']) + 26 * 2 + 30 for p in out) or 1
    fsc = min(1.0, 1700 / wid)
    if fsc < 0.5: ERR.append(f'{w}.panels 合成一行太長（數字與單位合計太多字：把單位改短或減少面板）')
    sub, subS = fit(f'{w}.sub 合成後下方一行', c.get('sub'), 40, 28, 1700, latin=0.6, ls=0.12)
    L = fin + max(4, math.ceil(rb(sub) * 0.8 + 2))
    ev = {'ok': [s + 1 for s in starts], 'tick': [s + 0.75 for s in starts], 'hit': [fin], 'static': []}
    d = {'panels': out, 'pw': pw, 'fin': fin, 'finScale': round(max(0.5, fsc), 3), 'sub': sub, 'subSize': subS}
    return d, L, ev, [*(s + 2.5 for s in starts), fin + 2.5], txt + sub


def ch_channels(c, w, rb):
    IT = lst(c.get('items'))
    if not 2 <= len(IT) <= 9: ERR.append(f'{w}.items 頻道要 2～9 個（現在 {len(IT)} 個）')
    IT = IT[:9]
    out, txt, t = [], '', 0.0
    for j, x in enumerate(IT):
        x = x or {}
        tag, tagS = fit(f'{w}.items[{j}].tag 小標籤', x.get('tag'), 44, 32, 900)
        name, nameS = fit(f'{w}.items[{j}].name 名稱大字', x.get('name'), 200, 110, 1300, False)
        en, enS = fit(f'{w}.items[{j}].en 英文一行', x.get('en'), 44, 30, 1300, latin=0.6, ls=0.2)
        line, lineS = fit(f'{w}.items[{j}].line 一句話', x.get('line'), 50, 36, 1300)
        hook, hookS = fit(f'{w}.items[{j}].hook 框線重點', x.get('hook'), 40, 30, 1200)
        slot = max(1.75, math.ceil((rb(name, line, hook) * 0.55) * 4) / 4)
        out.append({'tag': tag, 'tagSize': tagS, 'name': name, 'nameSize': nameS, 'en': en, 'enSize': enS, 'line': line, 'lineSize': lineS,
                    'hook': hook, 'hookSize': hookS, 'at': t, 'slot': slot})
        t += slot
        txt += tag + name + en + line + hook
    L = math.ceil(t - 1e-6)
    if out: out[-1]['slot'] += L - t
    ev = {'static': [x['at'] for x in out], 'tick': [x['at'] + 0.3 for x in out]}
    return {'items': out, 'n': len(out)}, L, ev, [x['at'] + min(x['slot'] - 0.3, 1.6) for x in out], txt


def ch_errors(c, w, rb):
    IT = lst(c.get('items'))
    if not 1 <= len(IT) <= 4: ERR.append(f'{w}.items 亮點要 1～4 個（現在 {len(IT)} 個）')
    IT = IT[:4]
    out, txt, t = [], '', 0
    for j, x in enumerate(IT):
        x = x or {}
        lines = [str(s) for s in lst(x.get('lines'))]
        if not 1 <= len(lines) <= 2: ERR.append(f'{w}.items[{j}].lines 大字要 1～2 行（現在 {len(lines)} 行）')
        LN = [fit(f'{w}.items[{j}].lines[{q}] 大字', s, 104, 70, 1100, False) for q, s in enumerate(lines[:2])]
        size = min([sz for _, sz in LN] or [104])
        short, shortS = fit(f'{w}.items[{j}].short 左邊修復紀錄', x.get('short') or (lines[0] if lines else ''), 34, 26, 380)
        file = latin_only(f'{w}.items[{j}].file 檔名', x.get('file') or f'item_0{j + 1}', 24)
        dur = max(3, math.ceil(rb(*lines) * 0.75 + 1.2))
        out.append({'lines': [s for s, _ in LN], 'size': size, 'short': short, 'shortSize': shortS, 'file': file, 'at': t, 'dur': dur})
        t += dur
        txt += ''.join(lines) + short + file
    ev = {'static': [x['at'] for x in out], 'ok': [x['at'] + 1 for x in out]}
    return {'items': out}, t, ev, [x['at'] + min(x['dur'] - 0.4, 2.2) for x in out], txt


def ch_numbers(c, w, rb):
    IT = lst(c.get('items'))
    if not 1 <= len(IT) <= 2: ERR.append(f'{w}.items 大數字要 1～2 個（現在 {len(IT)} 個）')
    IT = IT[:2]
    CA = lst(c.get('cards'))
    if len(CA) > 2: ERR.append(f'{w}.cards 小數字卡最多 2 張')
    CA = CA[:2]
    out, txt, t = [], '', 0
    for j, x in enumerate(IT):
        x = x or {}
        val = str(x.get('value') or '').strip()
        if not re.fullmatch(r'[0-9][0-9.,:/]*', val): ERR.append(f'{w}.items[{j}].value「{val}」要是數字（可含 . , : /；只用文本有的數字）')
        if len(val) > 7: ERR.append(f'{w}.items[{j}].value「{val}」最多 7 個字元')
        unit, _ = fit(f'{w}.items[{j}].unit 單位', x.get('unit'), 150, 150, 450)
        size = min(300, 1600 / max(0.6, 0.6 * len(val) + 0.5 * em(unit)))
        if size < 160: ERR.append(f'{w}.items[{j}] 數字＋單位「{val}{unit}」太長')
        head, headS = fit(f'{w}.items[{j}].head 數字上方一行', x.get('head'), 96, 60, 1250 if x.get('badge') else 1650)
        badge = latin_only(f'{w}.items[{j}].badge 英文小標', x.get('badge'), 22)
        note, noteS = fit(f'{w}.items[{j}].note 數字下方一句', x.get('note'), 48, 34, 1000)
        nd = sum(ch.isdigit() for ch in val)
        locks = [1 + i * min(1.0, 4.0 / max(1, nd - 1)) for i in range(max(1, nd))]
        dur = max(math.ceil(locks[-1] + 3), math.ceil(rb(head, val, unit, note) * 0.8 + 1))
        out.append({'value': val, 'unit': unit, 'size': int(min(300, max(160, size))), 'head': head, 'headSize': headS, 'badge': badge,
                    'note': note, 'noteSize': noteS, 'addr': re.sub(r'[^0-9]', '', val)[:8] or '0', 'locks': locks, 'at': t, 'dur': dur})
        t += dur
        txt += val + unit + head + badge + note
    cards = []
    if out:
        last = out[-1]
        ca0 = last['locks'][-1] + 1
        for q, x in enumerate(CA):
            x = x or {}
            v = str(x.get('value') or '').strip()
            if not re.fullmatch(r'[0-9][0-9.,:/]*', v) or len(v) > 6: ERR.append(f'{w}.cards[{q}].value「{v}」要是數字（最多 6 個字元）')
            u, _ = fit(f'{w}.cards[{q}].unit 單位', x.get('unit'), 52, 52, 200)
            lab, labS = fit(f'{w}.cards[{q}].label 說明', x.get('label'), 34, 26, 520)
            at = ca0 + q * 0.4
            cards.append({'value': v, 'unit': u, 'label': lab, 'labelSize': labS, 'at': at, 'lock': [at + 1 + i * 0.4 for i in range(max(1, len(v)))]})
            txt += v + u + lab
        if cards:
            need = math.ceil(cards[-1]['lock'][-1] - last['at'] + max(2.5, rb(*[x['label'] for x in cards]) * 0.6))
            if need > last['dur']:
                t += need - last['dur']; last['dur'] = need
    ev = {'tick': [x['at'] + L for x in out for L in x['locks']] + [L for x in cards for L in x['lock']], 'hit': [x['at'] for x in out[1:]]}
    return {'items': out, 'cards': cards}, t, ev, [x['at'] + x['locks'][-1] + 1 for x in out] + ([cards[-1]['lock'][-1] + 1] if cards else []), \
        txt + LOCK_TXT


LOCK_TXT = 'ADDR 0x // '


def ch_status(c, w, rb):
    R = lst(c.get('rows'))
    if not 2 <= len(R) <= 6: ERR.append(f'{w}.rows 狀態列要 2～6 列（現在 {len(R)} 列）')
    R = R[:6]
    title, titleS = fit(f'{w}.title 視窗右上標題', c.get('title'), 36, 28, 700)
    step = 2 if len(R) <= 4 else 1.5
    out, txt = [], ''
    for q, x in enumerate(R):
        x = x or {}
        lab, labS = fit(f'{w}.rows[{q}].label 項目', x.get('label'), 54, 40, 210, False)
        desc, descS = fit(f'{w}.rows[{q}].desc 說明', x.get('desc'), 38, 28, 760)
        st, stS = fit(f'{w}.rows[{q}].state 狀態（亮起的小框）', x.get('state') or 'ONLINE', 38, 28, 330, latin=0.6)
        out.append({'label': lab, 'labelSize': labS, 'desc': desc, 'descSize': descS, 'state': st, 'stateSize': stS, 'at': 1 + q * step})
        txt += lab + desc + st
    welcome, welS = fit(f'{w}.welcome 最後一行', c.get('welcome'), 40, 30, 900)
    allok = 1 + len(out) * step + (1 if step == 2 else 1.5)
    L = math.ceil(allok + max(3, rb(welcome) * 0.8 + 1.5) + max(0, rb(*[r['desc'] for r in out]) * 0.25 - 4))
    ev = {'ok': [r['at'] + 1 for r in out] + [allok], 'tick': [r['at'] for r in out]}
    d = {'title': title, 'titleSize': titleS, 'rows': out, 'allOk': allok, 'welcome': welcome, 'welcomeSize': welS}
    return d, L, ev, [out[len(out) // 2]['at'] + 1.2 if out else 2, allok + 2], txt + title + welcome


def ch_logo(c, w, rb):
    badge = latin_only(f'{w}.badge 名稱左邊的英文小框', c.get('badge'), 10).upper()
    name, nameS = fit(f'{w}.name 名稱', c.get('name'), 60, 40, 1200 if badge else 1600, False, ls=0.17)
    sl = [str(x) for x in lst(c.get('slogan'))]
    if not 1 <= len(sl) <= 2: ERR.append(f'{w}.slogan 標語要 1～2 段（第二段綠色）')
    sl = sl[:2]
    tot = sum(em(x) for x in sl) + (1 if len(sl) == 2 else 0)
    slS = int(min(150, 1700 / max(0.5, tot)))
    if sl and slS < 90: ERR.append(f'{w}.slogan 標語「{"　".join(sl)}」太長（合計中文最多約 18 字）')
    line, lineS = fit(f'{w}.line 標語下方一行', c.get('line'), 44, 32, 1700)
    url, urlS = fit(f'{w}.url 網址或電話', c.get('url'), 52, 34, 1700, latin=0.6, ls=0.04)
    L = max(10, math.ceil(5 + rb(line, url) * 0.5 + rb(*sl) * 0.3))
    n = sum(len(x) for x in sl)
    ev = {'tick': [1 + i * 0.45 for i in range(n)], 'hit': [L - 4]}
    d = {'badge': badge, 'name': name, 'nameSize': nameS, 'slogan': sl, 'sloganSize': max(90, slS), 'line': line, 'lineSize': lineS,
         'url': url, 'urlSize': urlS}
    return d, L, ev, [5.5, L - 0.3], badge + name + ''.join(sl) + line + url


BUILDERS = {'open': ch_open, 'layers': ch_layers, 'channels': ch_channels, 'errors': ch_errors, 'numbers': ch_numbers,
            'status': ch_status, 'logo': ch_logo}


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 7))
    rb = lambda *ss: nchars(*ss) / pace * FPS / B                  # 讀完要幾拍
    lab = {**CHROME, **(sb.get('labels') or {})}
    hud = sb.get('hud') or {}
    hl, hlS = fit('hud.left 左下 REC 後面的字', hud.get('left'), 28, 28, 600, latin=0.6)
    hr, hrS = fit('hud.right 右下角標', hud.get('right'), 28, 24, 700)

    CHS = lst(sb.get('chapters'))
    types = [str((x or {}).get('type') or '') for x in CHS]
    if not 3 <= len(CHS) <= 7: ERR.append(f'chapters 要 3～7 章（現在 {len(CHS)} 章；建議 4～6 章）')
    if not types or types[0] != 'open': ERR.append('chapters 第一章必須是 open（開場解碼）')
    if not types or types[-1] != 'logo': ERR.append('chapters 最後一章必須是 logo（收尾）')
    for i, ty in enumerate(types):
        if ty not in TYPES: ERR.append(f'chapters[{i}].type 只能是 {"、".join(TYPES)}（現在「{ty}」）')
        elif ty in ('open', 'logo') and 0 < i < len(types) - 1: ERR.append(f'chapters[{i}] {ty} 只能放在第一章／最後一章')
    S, txt, sfx, stl_b = [], '', {'tick': [], 'ok': [], 'static': [], 'hit': []}, []
    t = 0
    for i, x in enumerate(CHS[:7]):
        x = x or {}
        ty = types[i]
        if ty not in BUILDERS: continue
        w = f'chapters[{i}]（{ty}）'
        d, nb, ev, st, tx = BUILDERS[ty](x, w, rb)
        label = latin_only(f'{w}.label 上方角標章名', x.get('label') or TYPE_LABEL[ty], 16).upper()
        S.append({'type': ty, 'label': label, 'beat': t, 'nb': nb, 'from': fb(t), **d})
        for k, v in ev.items(): sfx[k] += [t + b for b in v]
        stl_b += [t + b for b in st]
        txt += tx + label
        t += nb
    if ERR:
        raise ValueError('\n'.join('・' + e for e in ERR))
    for i, s in enumerate(S):
        s['to'] = S[i + 1]['from'] if i + 1 < len(S) else fb(t)
    frames = fb(t)
    if frames < 15 * FPS:
        raise ValueError(f'・內容太少：只排得出 {frames / FPS:.1f} 秒（本範本最短約 15 秒）。請加章，不要編造內容')

    cl = lambda x: int(min(frames - 1, max(0, x)))
    stl = [6] + [fb(b) for b in stl_b] + [s['from'] + 3 for s in S[1:]]
    stl = sorted(set(cl(x) for x in stl))
    while len(stl) > 20: stl.pop(len(stl) // 2)
    op = S[0]
    poster = cl(fb(op['N0'] + 5.5))
    mid = S[len(S) // 2]
    ov = [poster, cl(mid['from'] + (mid['to'] - mid['from']) * 0.6), cl(frames - 10)]

    allText = ''.join([txt, hl, hr, *lab.values(), CJK_POOL, LAT_POOL, '0123456789', '[]>·|/-\\_x!.%:'])
    return {'template': '廣N', 'name': sb.get('name', '數位故障'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beat': B, 'beats': t,
            'chapters': S, 'sfx': {k: sorted(fb(b) for b in v) for k, v in sfx.items()},
            'd': {'hud': {'left': hl, 'right': hr, 'rightSize': hrS}, 'labels': lab},
            'stills': stl, 'poster': poster, 'overview': ov, 'allText': allText}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒（', tl['beats'], '拍）')
    for i, s in enumerate(tl['chapters']):
        print(f'  第 {s["from"]:4d} 格（{s["from"] / FPS:5.1f} 秒）第 {i + 1} 章 {TYPE_ZH[s["type"]]}（{s["nb"]} 拍＝{s["nb"] * B / FPS:.1f} 秒）')
    print('  字數', len(set(tl['allText'])))
