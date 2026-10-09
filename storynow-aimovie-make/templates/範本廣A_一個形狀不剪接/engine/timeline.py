"""範本廣A「一個形狀不剪接」時間表：storyboard.json → 時間表（片長、每個狀態的起訖格、事件格、音效）。
make_ad.py 會呼叫 build(sb)；畫面（remotion/src/Ad.tsx）與配樂（music.py）都只讀這份輸出，聲音和畫面永遠對齊。

節奏：120 BPM、一拍 15 格（30 fps）。每種狀態有「基本動作長度」（照原作 H2 的手調節奏），
再依「畫面上要讀的字數」加停留拍數（每 pace 個字加一拍，預設 4 字／拍＝每秒 8 字）——內容越多片越長。
片尾自動接回第一個狀態（一拍），整支是無縫循環。

欄位規定見範本 README「內容欄位」；不合格時 raise ValueError（make_ad.py 會印出來）。
"""
import math

FPS, BPM, BEAT = 30, 120, 15
REPRISE = 15   # 片尾變回第一個狀態的長度（格）


# ───── 字寬估算（跟 remotion/src/ui.tsx 的 tw() 同一套） ─────
def cw(c):
    o = ord(c)
    if o >= 0x2E80 or c in '…・，。！？「」：；（）': return 1.0
    if c == ' ': return 0.28
    if c in '.,:;/-·\'|': return 0.35
    if c.isupper() or c.isdigit(): return 0.64
    if c.islower(): return 0.55
    return 0.6


def tw(s, size, ls=0):
    return sum(cw(c) for c in str(s)) * size + ls * len(str(s))


def nchars(*ss):
    return sum(1 for s in ss for c in str(s or '') if not c.isspace())


# ───── 每種狀態：欄位檢查、要讀的字、基本長度、事件、停留插在哪 ─────
ERR = []


def need(s, i, key, size, maxw, ls=0, optional=False):
    v = s.get(key)
    if v in (None, ''):
        if not optional: ERR.append(f'第 {i + 1} 個狀態（{s["type"]}）缺欄位 {key}')
        return ''
    w = tw(v, size, ls)
    if w > maxw:
        lim = int(maxw / (size + ls))
        ERR.append(f'第 {i + 1} 個狀態（{s["type"]}）的 {key}「{v}」太長（約 {w:.0f}px＞{maxw}px；中文最多約 {lim} 字）')
    return str(v)


def spec(s, i):
    """回傳 (要讀的字數, 免費拍數, 事件 {名稱: 相對格}, 基本長度, 停留插入點, 音效 [(相對格, 種類)])"""
    t = s['type']
    if t == 'button':
        need(s, i, 'label', 46, 520, 3)
        return nchars(s.get('label')), 1, {'hover': 22}, 30, 4, []
    if t == 'loading':
        return 0, 0, {'check': 30}, 45, 99, [(30, 'ding')]
    if t == 'island':
        tag = need(s, i, 'tag', 36, 200, optional=True); txt = need(s, i, 'text', 36, 520 - tw(tag, 36))
        return nchars(tag, txt), 1, {}, 30, 13, []
    if t == 'player':
        need(s, i, 'cover', 92, 220, -2); need(s, i, 'coverSub', 30, 230, optional=True)
        need(s, i, 'title', 56, 470); need(s, i, 'subtitle', 30, 480, optional=True)
        sx = [(f, 'scrub') for f in range(63, 78, 3)]
        return (nchars(s.get('coverSub'), s.get('title'), s.get('subtitle')), 2, {'play': 30, 'scrubDown': 60, 'scrubUp': 78}, 90, 31,
                [(30, 'click'), (60, 'grab')] + sx + [(78, 'release')])
    if t == 'slider':
        need(s, i, 'label', 30, 130)
        sx = [(f, 'scrub') for f in range(18, 35, 3)]
        return nchars(s.get('label')), 1, {'volDown': 15, 'volUp': 35}, 45, 99, [(15, 'grab')] + sx + [(35, 'release')]
    if t == 'toggle':
        need(s, i, 'label', 44, 440)
        return nchars(s.get('label')), 1, {'hover': 18, 'flip': 30}, 45, 31, [(18, 'tick'), (30, 'click')]
    if t == 'tabs':
        tabs = s.get('tabs') or []
        if not 2 <= len(tabs) <= 4: ERR.append(f'第 {i + 1} 個狀態（tabs）要 2～4 個分頁，現在 {len(tabs)} 個')
        for k, tb in enumerate(tabs):
            if tw(tb.get('a', ''), 42) + tw(tb.get('b', ''), 42) + 10 > 240:
                ERR.append(f'第 {i + 1} 個狀態（tabs）第 {k + 1} 個分頁「{tb.get("a", "")} {tb.get("b", "")}」太長（a＋b 中文合計最多約 5 字）')
        return nchars(*[tb.get('a', '') + tb.get('b', '') for tb in tabs]), 0, {}, 15 + 15 * len(tabs), -1, []
    if t == 'chart':
        need(s, i, 'title', 40, 430); need(s, i, 'note', 31, 430, optional=True)
        bars = s.get('bars') or []
        if not 2 <= len(bars) <= 5: ERR.append(f'第 {i + 1} 個狀態（chart）要 2～5 根長條，現在 {len(bars)} 根')
        slot = 940 / max(1, len(bars))
        for k, b in enumerate(bars):
            if not isinstance(b.get('v'), (int, float)) or b['v'] <= 0: ERR.append(f'chart 第 {k + 1} 根長條的 v 要是正數')
            if tw(b.get('l', ''), 34) > slot - 20: ERR.append(f'chart 第 {k + 1} 根長條的標籤「{b.get("l")}」太長（最多約 {int((slot - 20) / 34)} 字）')
            if tw(b.get('show', b.get('v', '')), 44) > slot - 10: ERR.append(f'chart 第 {k + 1} 根長條的數字「{b.get("show")}」太長')
        tip = s.get('tip') or {}
        hl = s.get('highlight', 0)
        if not 0 <= hl < max(1, len(bars)): ERR.append(f'chart 的 highlight 要在 0～{len(bars) - 1}')
        if tip:
            if tw(tip.get('head', ''), 36) > 430: ERR.append(f'chart 提示框 head「{tip.get("head")}」太長（最多約 11 字）')
            ls = tip.get('lines') or []
            if len(ls) > 2: ERR.append('chart 提示框 lines 最多 2 行')
            for ln in ls:
                if tw(ln, 31) > 430: ERR.append(f'chart 提示框「{ln}」太長（一行最多約 13 字）')
        txt = nchars(s.get('title'), s.get('note'), *[b.get('l', '') + str(b.get('show', b.get('v', ''))) for b in bars],
                     tip.get('head', ''), *(tip.get('lines') or []))
        return txt, 1, {'hover': 15}, 30, 16, [(15, 'tick')]
    if t == 'search':
        need(s, i, 'placeholder', 40, 640); q = need(s, i, 'query', 40, 600)
        if not 1 <= len(q) <= 6: ERR.append(f'第 {i + 1} 個狀態（search）的 query 要 1～6 個字')
        if tw(str(s.get('result', '')) + '・' + str(s.get('resultSub', '')), 36) > 700:
            ERR.append(f'第 {i + 1} 個狀態（search）的 result＋resultSub 太長（中文合計最多約 18 字）')
        need(s, i, 'result', 36, 700)
        n = max(1, len(q)); keys = {f'key{k}': 6 * (k + 1) for k in range(n)}
        res = 6 * n + 3
        return (nchars(s.get('placeholder'), q, s.get('result'), s.get('resultSub')), 1, {**keys, 'results': res}, res + 15, res + 1,
                [(v, 'key') for v in keys.values()] + [(res, 'tick')])
    if t == 'toast':
        need(s, i, 'text', 40, 600)
        return nchars(s.get('text')), 0, {}, 15, 8, [(2, 'chime')]
    ERR.append(f'第 {i + 1} 個狀態的 type「{t}」不存在（可用：button loading island player slider toggle tabs chart search toast）')
    return 0, 0, {}, 30, 99, []


CLICK_END = {'button', 'island', 'search'}   # 這些狀態是「被點一下」才變成下一個


def build(sb):
    ERR.clear()
    st = sb.get('states') or []
    if not 3 <= len(st) <= 16: raise ValueError(f'states 要 3～16 個（現在 {len(st)} 個）')
    pace = float(sb.get('pace', 4))
    out, sfx, t = [], [], 0
    for i, s in enumerate(st):
        s = dict(s); s.setdefault('type', '?')
        chars, free, ev, base, hold_at, fx = spec(s, i)
        hold = max(0, math.ceil(chars / pace) - free) * BEAT
        if s['type'] == 'tabs':
            # 分頁：停留平均分給每一頁（點下一頁之前）
            n = len(s.get('tabs') or [1]); per = math.ceil(hold / n / BEAT) * BEAT if n else 0
            ev = {}; x = 15
            for k in range(1, n):
                x += 15 + per; ev[f'tab{k}'] = x; fx.append((x, 'click'))
            dur = x + 15 + per
        elif s['type'] == 'chart':
            # 長條圖字最多：停留拆兩半——長條長完先停（看數字），提示框出來再停，避免一段畫面靜止太久
            pre = (hold // 2 // BEAT) * BEAT
            ev = {'hover': 15 + pre}; fx = [(15 + pre, 'tick')]
            dur = base + hold
        else:
            sh = lambda v: v + hold if v > hold_at else v
            ev = {k: sh(v) for k, v in ev.items()}; fx = [(sh(f), k) for f, k in fx]
            dur = base + hold
        ab = {k: t + v for k, v in ev.items()}
        out.append({'type': s['type'], 'i': i, 't0': t, 't1': t + dur, 'ev': ab, 'd': s})
        sfx += [(t + f, k) for f, k in fx]
        t += dur
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))
    P = t + REPRISE
    # 狀態交界的音效：被點的（按鈕／動態島）＝click、搜尋＝enter＋chime；其他＝swoosh
    bounds = [s['t1'] for s in out]          # 最後一個＝變回第一個狀態
    for k, b in enumerate(bounds):
        prev = out[k]['type']
        if prev == 'search': sfx += [(b, 'enter')]
        elif prev in CLICK_END: sfx += [(b, 'click')]
        else: sfx += [(b, 'swoosh')]
    for s in out:                             # 被點的狀態在交界那一格按下
        if s['type'] in CLICK_END: s['ev']['click'] = s['t1']
    sfx = sorted((int(f) % P, k) for f, k in sfx)

    texts = []
    def walk(v):
        if isinstance(v, str): texts.append(v)
        elif isinstance(v, dict): [walk(x) for x in v.values()]
        elif isinstance(v, list): [walk(x) for x in v]
        elif isinstance(v, (int, float)): texts.append(str(v))
    walk(st)
    mid = lambda s: int(s['t0'] + 0.78 * (s['t1'] - s['t0']))
    pick = lambda ts: next((s for s in out if s['type'] in ts), out[len(out) // 2])
    return {'template': '廣A', 'name': sb.get('name', '一個形狀不剪接'), 'fps': FPS, 'bpm': BPM, 'beat': BEAT, 'frames': P, 'reprise': t,
            'states': out, 'sfx': [[f, k] for f, k in sfx],
            'stills': [mid(s) for s in out] + [P - 3],
            'poster': mid(pick(('chart', 'player'))),
            'overview': [mid(pick(('player',))), mid(pick(('tabs', 'toggle'))), mid(pick(('chart', 'search')))],
            'allText': ''.join(texts) + '0123456789⌘K…・·'}


if __name__ == '__main__':
    import json, sys
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', tl['frames'] / FPS, '秒')
    for s in tl['states']: print(f"  {s['type']:8} {s['t0']:4}–{s['t1']:4}  {s['ev']}")
