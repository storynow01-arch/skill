"""範本廣D「電視購物台」時間表：storyboard.json → 時間表（每個商品區的起點、區內事件格、主持人動作與對白）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事：彩色測試條 → 轉台進棚、台標砸下飛到左上角 → 主持人跳進來「大家好！」→ 一個橫向連續的攝影棚，鏡頭往右甩過一個個「商品區」：
  price（必備）原價牌滾數字 →「原價！」→ 鼓滾奏 → 紅線劃掉 → 掉下去 →「現在只要 ○」大爆炸＋彩紙 → 大橫幅
  bonus「再加碼！」金卡數字滾動＋收銀機＋錢幣雨｜tags 1～3 張吊牌落下搖晃｜gifts 小鳥銜牌＋兩個禮盒＋「雙重好禮」
  chips 標題＋1～3 個打勾膠囊｜countdown 限時倒數時鐘＋行動呼籲（綜藝效果，只在內容真的有期限時用）
  call（必備）電話響＋「立即撥打！」＋號碼一位一位跳出＋網址 → 收尾大貼圖（標語兩行＋名稱）＋彩帶彩紙。
中間五區都可省略。138.46 BPM、一拍 13 格；停留依字數（pace 字／半拍，預設 6）。
"""
import math

FPS, BF = 30, 13
BPM = FPS * 60 / BF
ERR = []


def cw(c):
    o = ord(c)
    if o >= 0x2E80 or c in '…・，。！？「」：；（）～＋％': return 1.0
    if c == ' ': return 0.3
    if c.isdigit(): return 0.5
    if c in '.:/-': return 0.32
    return 0.6


def em(s): return sum(cw(c) for c in str(s))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())


def fit(where, s, fs, maxw, optional=False):
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return ''
    w = em(s) * fs
    if w > maxw: ERR.append(f'{where}「{s}」太長（約 {w:.0f}＞{maxw}；中文最多約 {int(maxw / fs)} 字）')
    return str(s)


def digits_ok(where, s, n=6):
    s = str(s or '')
    if not s or not any(c.isdigit() for c in s) or len(s) > n:
        ERR.append(f'{where}「{s}」要是含數字、{n} 個字元以內的字串（會吃角子老虎式滾動）')


ZONES = ('price', 'bonus', 'tags', 'gifts', 'chips', 'countdown', 'call')


def build(sb):
    ERR.clear()
    ch, bar, say = sb.get('channel') or {}, sb.get('bar') or {}, sb.get('say') or {}
    fit('channel.name 台標', ch.get('name'), 150, 1100)
    fit('channel.standby 測試條字', ch.get('standby'), 64, 1500)
    fit('channel.tickerLabel 跑馬燈左標', ch.get('tickerLabel', '最新優惠'), 42, 230)
    fit('bar.label 底部左框', bar.get('label', '訂購專線'), 40, 190); fit('bar.sub', bar.get('sub'), 28, 190, True)
    fit('bar.tel 底部大號碼', bar.get('tel'), 104, 820)
    fit('bar.web', bar.get('web'), 52, 620, True); fit('bar.full', bar.get('full'), 36, 620, True)
    for k in ('hello', 'shock', 'hurry', 'call'): fit(f'say.{k} 主持人對白', say.get(k), 54, 420, True)
    p = sb.get('price') or {}
    if not p: ERR.append('price（原價→新價格那一區）是必備的')
    fit('price.label 價格牌標籤', p.get('label'), 52, 760); digits_ok('price.orig 原價', p.get('orig'))
    fit('price.unit', p.get('unit', '元'), 130, 260)
    fit('price.now 新價格', p.get('now'), 330, 760); fit('price.nowUnit', p.get('nowUnit', '元！'), 150, 420)
    fit('price.nowLabel', p.get('nowLabel', '現在只要'), 74, 700); fit('price.banner 大橫幅', p.get('banner'), 104, 1050)
    fit('price.tag 右上小膠囊', p.get('tag'), 40, 520, True)
    if sb.get('bonus'):
        b = sb['bonus']
        fit('bonus.plus', b.get('plus', '再加碼！'), 110, 600); fit('bonus.title 金卡標題', b.get('title'), 56, 560)
        fit('bonus.pill', b.get('pill'), 50, 380, True); digits_ok('bonus.number', b.get('number'), 4)
        fit('bonus.unit', b.get('unit'), 180, 380); fit('bonus.clang', b.get('clang', '鏘！'), 70, 220)
    tags = sb.get('tags') or []
    if len(tags) > 3: ERR.append('tags 最多 3 張吊牌')
    for i, t in enumerate(tags):
        fit(f'tags[{i}].title', t.get('title'), 50, 330); fit(f'tags[{i}].sub', t.get('sub'), 38, 330, True)
        digits_ok(f'tags[{i}].amount', t.get('amount'), 6); fit(f'tags[{i}].unit', t.get('unit'), 60, 300)
    if sb.get('gifts'):
        g = sb['gifts']
        fit('gifts.sign 小鳥招牌', g.get('sign'), 110, 680)
        for k in ('a', 'b'):
            ls = g.get(k) or []
            if not 1 <= len(ls) <= 2: ERR.append(f'gifts.{k} 禮盒上的字要 1～2 行')
            for j, l in enumerate(ls): fit(f'gifts.{k}[{j}]', l, 52, 300)
        fit('gifts.aBadge', g.get('aBadge'), 36, 320, True); fit('gifts.aNote', g.get('aNote'), 30, 600, True)
        fit('gifts.both', g.get('both', '可同時申請'), 44, 420)
        for j, l in enumerate((g.get('double') or ['雙重', '優惠！'])[:2]): fit(f'gifts.double[{j}]', l, 100, 420)
    if sb.get('chips'):
        c = sb['chips']
        fit('chips.title', c.get('title'), 112, 560); fit('chips.burst', c.get('burst'), 100, 420)
        its = c.get('items') or []
        if not 1 <= len(its) <= 3: ERR.append('chips.items 要 1～3 個')
        for j, it in enumerate(its): fit(f'chips.items[{j}]', it, 64, 1000)
    if sb.get('countdown'):
        c = sb['countdown']
        fit('countdown.title', c.get('title', '限時倒數'), 118, 640); fit('countdown.action', c.get('action'), 92, 1000)
        fr_ = str(c.get('from', '10:00'))
        if not (len(fr_) == 5 and fr_[2] == ':' and fr_.replace(':', '').isdigit()): ERR.append('countdown.from 要是 mm:ss（例 10:00）')
    cl = sb.get('call') or {}
    if not cl: ERR.append('call（撥打專線那一區）是必備的')
    fit('call.call', cl.get('call', '立即撥打！'), 130, 820); fit('call.pill', cl.get('pill'), 46, 520, True)
    fit('call.number 大號碼', cl.get('number'), 168, 1060); fit('call.web', cl.get('web'), 76, 1000, True)
    en = sb.get('end') or {}
    ls = en.get('lines') or []
    if not 1 <= len(ls) <= 2: ERR.append('end.lines 收尾大貼圖要 1～2 行')
    for j, l in enumerate(ls): fit(f'end.lines[{j}]', l, 150, 1300)
    fit('end.name 收尾名稱橫幅', en.get('name'), 78, 1100)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    pace = float(sb.get('pace', 6))
    hold = lambda *ss: max(0, math.ceil(nchars(*ss) / pace) - 3) * BF // 2
    present = [z for z in ZONES if sb.get(z)]
    m, zones = {'bars': 0, 'on': 10, 'logoFly': 36, 'hostIn': 40, 'hello': 48}, []
    t = 0
    for zi, z in enumerate(present):
        e = {'start': t}
        nxt = present[zi + 1] if zi + 1 < len(present) else None
        if z == 'price':
            e['board'] = 66; e['orig'] = 78
            nd = sum(1 for c in str(p['orig']) if c.isdigit())
            e['lock'] = [e['orig'] + 2 + 4 * i for i in range(nd)]
            e['shock'] = e['lock'][-1] + 8; e['roll'] = e['shock'] + 13; e['wave'] = e['roll'] + 18; e['slash'] = e['roll'] + 26
            e['drop'] = e['slash'] + 13; e['zero'] = e['drop'] + 13; e['free'] = e['zero'] + 26
            t = e['free'] + 26 + hold(p.get('banner'), p.get('now'), p.get('label'))
            if nxt and nxt != 'call': e['more'] = t; t += 13
        elif z == 'bonus':
            b = sb['bonus']; e['plus'] = t + 26; e['card'] = t + 45; e['card24'] = e['card'] + 39
            t = e['card24'] + 39 + hold(b.get('title'), b.get('pill'), b.get('number'), b.get('unit'))
        elif z == 'tags':
            e['tags'] = [t + 20 + 33 * i for i in range(len(tags))]
            t = e['tags'][-1] + 39 + hold(*[x.get('title', '') + str(x.get('sub', '')) + str(x.get('amount', '')) + x.get('unit', '') for x in tags])
        elif z == 'gifts':
            g = sb['gifts']; e['bird'] = t + 8; e['early'] = t + 22; e['box1'] = t + 45; e['box2'] = e['box1'] + 26
            e['both'] = e['box2'] + 13; e['double'] = e['both'] + 13
            t = e['double'] + 39 + hold(g.get('sign'), *(g.get('a') or []), *(g.get('b') or []))
        elif z == 'chips':
            c = sb['chips']; e['spTitle'] = t + 12; e['chips'] = [t + 33 + 13 * i for i in range(len(c['items']))]
            t = e['chips'][-1] + 39 + hold(c.get('title'), c.get('burst'), *c['items'])
        elif z == 'countdown':
            e['ticks'] = [t + BF * i for i in range(8)]; e['act'] = t + 52
            t = t + 104 + hold(sb['countdown'].get('action'))
        else:
            e['call'] = t + 13; e['num'] = t + 33
            e['web'] = e['num'] + 2 * len(str(cl['number'])) + 20
            m['end'] = e['web'] + 33 + hold(cl.get('call'), cl.get('number'))
            t = m['end'] + 66 + hold(*ls, en.get('name'))
        zones.append({'type': z, 'i': zi, 'ev': e, 'd': sb[z]})
        if nxt: zones[-1]['ev']['out'] = t
    frames = t
    pans = [zz['ev']['start'] for zz in zones[1:]]

    def walk(v, out):
        if isinstance(v, str): out.append(v)
        elif isinstance(v, dict): [walk(x, out) for x in v.values()]
        elif isinstance(v, list): [walk(x, out) for x in v]
        elif isinstance(v, (int, float)): out.append(str(v))
        return out
    texts = walk({k: v for k, v in sb.items() if k not in ('name', '_source')}, [])
    # 跑馬燈：沒寫就從各區內容自動組
    tick = ch.get('ticker') or '　★　'.join(filter(None, [p.get('banner'), (sb.get('bonus') or {}).get('title', '') + ' ' + str((sb.get('bonus') or {}).get('number', '')) + (sb.get('bonus') or {}).get('unit', '') if sb.get('bonus') else '',
                                                        *[f"{x.get('title', '')} {x.get('amount', '')}{x.get('unit', '')}" for x in tags], *((sb.get('chips') or {}).get('items') or [])])) + '　★　'
    stills = [6, 30, zones[0]['ev']['orig'] + 20, zones[0]['ev']['slash'] + 8, zones[0]['ev']['zero'] + 30]
    for zz in zones[1:-1]: stills.append(zz['ev']['out'] - 8)
    stills += [m['end'] - 8, frames - 10]
    return {'template': '廣D', 'name': sb.get('name', '電視購物台'), 'fps': FPS, 'bpm': round(BPM, 2), 'beatFrames': BF, 'frames': frames,
            'm': m, 'zones': zones, 'pans': pans, 'd': sb, 'ticker': tick,
            'stills': stills, 'poster': zones[0]['ev']['zero'] + 30,
            'overview': [zones[0]['ev']['zero'] + 30, zones[len(zones) // 2]['ev']['out'] - 10, m['end'] + 30],
            'allText': ''.join(texts) + tick + '0123456789：:,.！？＋×～$LIVE現場直播原價還沒完大家好'}


if __name__ == '__main__':
    import json, sys
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    for z in tl['zones']: print(' ', z['type'], z['ev'])
