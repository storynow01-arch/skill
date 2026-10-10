"""範本廣J「寵物直播」時間表：storyboard.json → 時間表（每個事件第幾格、鏡頭關鍵格、留言、下單、愛心、音效、畫面上的字）。
make_ad.py 呼叫 build(sb)；畫面（remotion/src）與配樂（music.py）都只讀這份輸出。

故事固定（同一個直播房間連續拍攝，主角是戴耳機的柴犬主播，120 BPM K-pop 舞曲）：
  開播前：手機上倒數 3、2、1（鏡頭從房間全景推進手機）→ LIVE，狗狗從櫃台下彈上來揮手
  帶貨（products 1～3 件）：商品掉到展示台、狗狗用爪子指、商品卡滑進來、按「立即下單」（收銀機鏘）、下單通知（叮咚）、彈幕往上捲、愛心噴
  揭曉（reveal）：有人留言問 → 狗狗指向手機外，鏡頭往右拉出手機，牆上招牌霓虹燈閃兩下亮起名稱，上下兩行字、一顆斜標章砸下來 → 拉回手機
  關鍵字（keywords 2～3 個）：每個關鍵字的小物掉上台、貼紙「跳出手機」飛到畫面四周 → 三樣一起跟拍子跳、× 號旋轉、置頂留言 → 貼紙飛回台上
  展示（shows 0～2 件）：獎盃／獎牌＝禮盒搖兩下打開、鏡頭推進手機、光芒旋轉、右側匾額飛出；證書＝左側卡片甩進來、印章砸下
  高潮：鏡頭拉遠，愛心噴出手機滿屏、留言飛出、觀看人數大計數器衝到爆表
  下播：手機出現「直播已結束」卡片 → 鏡頭往右拉到牆上招牌，霓虹燈亮出名稱、標語、網址 → 卡片翻面變名稱 → 狗狗揮手說掰掰
商品、關鍵字、展示品的數量決定片長；一拍 15 格、一小節 60 格（整數格）。
"""
import math

FPS, BPM = 30, 120
B = 15                     # 一拍 15 格
BAR = 4 * B
ERR = []

# ───────────── 通用小物庫（Items.tsx 畫；商品與關鍵字都從這裡挑）─────────────
ICONS = {'bowl': '碗', 'bone': '骨頭玩具', 'ball': '球', 'cup': '杯子', 'book': '書', 'bag': '袋子', 'gift': '禮盒',
         'cake': '蛋糕', 'chart': '圖表手機', 'megaphone': '大聲公', 'bulb': '燈泡', 'laptop': '筆電', 'calendar': '日曆',
         'heart': '愛心', 'star': '星星'}
SHOWS = {'trophy': '獎盃（禮盒打開＋右側匾額）', 'medal': '獎牌（禮盒打開＋右側匾額）', 'ticket': '優惠券（禮盒打開＋右側匾額）',
         'cert': '證書（左側卡片＋印章）'}
INAMES = '、'.join(f'{k}（{v}）' for k, v in ICONS.items())
SNAMES = '、'.join(f'{k}（{v}）' for k, v in SHOWS.items())

# 直播介面固定用字（不涉內容，storyboard 的 ui 可以改）
UI = {'soon': '直播即將開始', 'buy': '立即下單', 'ordered': '剛剛下單了', 'feature': '主打', 'hot': '熱賣中', 'pinned': '置頂',
      'say': '說點什麼…', 'viewers': '觀看人數', 'boom': '人數爆表！', 'ended': '直播已結束', 'thanks': '感謝收看！', 'bye': '拜拜～下次見！'}
# 觀眾暱稱與通用彈幕（不涉內容；storyboard 沒寫 comments 時只用這些）。原作的「喵喵隊長」「掰掰」改成「咪咪隊長」「拜拜」：喵、掰不在 Zen Maru Gothic 裡
NICKS = ['布丁', '豆花', '小魚乾', '芋圓', '柚子媽', '毛毛蟲', '咪咪隊長', '阿肥的主人', '奶茶', '小湯圓']
POOL = {
    'live': ['來了來了', '狗狗好可愛', '主播好專業', '歪頭殺', '愛心送上', '已加入購物車', '下單了！', '+1', '好想要'],
    'ask': ['這是誰的直播？'],
    'reveal': ['原來是這裡！', '也太強了吧', '真的假的', '愛心送上'],
    'kw': ['好酷', '+1', '我也要', '學到了', '全部都要！', '下單了！'],
    'show': ['還有嗎？', '太猛了', '好厲害', '拍手拍手'],
    'climax': ['人好多！', '愛心滿滿', '狗狗別走', '衝啊', '愛心送上', '好熱鬧', '下單了！'],
    'end': ['下次見～', '拜拜狗狗', '愛心送上'],
}


def cw(c, latin=0.6): return 1.0 if ord(c) >= 0x2E80 else (0.3 if c == ' ' else latin)
def em(s, latin=0.6): return sum(cw(c, latin) for c in str(s or ''))
def nchars(*ss): return sum(1 for s in ss for c in str(s or '') if not c.isspace())


def fit(where, s, fs, lo, maxw, optional=True, latin=0.6, lsr=0.0):
    """字級可在 lo～fs 之間自動縮的欄位（lsr＝字距占字級的比例，算在寬度裡）：縮到 lo 還放不下才記錯誤；回傳 (字, 字級)"""
    if s in (None, ''):
        if not optional: ERR.append(f'缺欄位 {where}')
        return '', fs
    s = str(s)
    w1 = em(s, latin) + lsr * len(s)
    size = min(fs, maxw / max(0.1, w1))
    if size < lo:
        ERR.append(f'{where}「{s}」太長（中文最多約 {int(maxw / (lo * (1 + lsr)))} 字、英數約 {int(maxw / (lo * (latin + lsr)))} 個）')
        size = lo
    return s, int(size)


def build(sb):
    ERR.clear()
    pace = float(sb.get('pace', 6))
    ui = {**UI, **{k: str(v) for k, v in (sb.get('ui') or {}).items() if k in UI and v}}
    peak = int(sb.get('peak') or (sb.get('ui') or {}).get('peak') or 100000)

    # ───────────── 欄位檢查（手機裡的字是手機座標＝鏡頭 1 倍時的畫面 px；招牌字是世界座標，鏡頭 0.62 倍）─────────────
    title, titleS = fit('title 直播間名稱（左上角頻道列）', sb.get('title'), 28, 24, 350, False)
    _, introS = fit('title 直播間名稱（開播前畫面）', sb.get('title'), 52, 36, 480, False)
    for key, w, fs in (('soon', 480, 40), ('buy', 200, 28), ('ordered', 300, 28), ('hot', 290, 28), ('pinned', 90, 28), ('say', 250, 28),
                       ('viewers', 560, 52), ('boom', 640, 84), ('ended', 440, 60), ('thanks', 440, 46), ('bye', 370, 46)):
        fit(f'ui.{key} 直播介面用字', ui[key], fs, fs * 0.75, w)

    prods = sb.get('products') or []
    if isinstance(prods, dict): prods = [prods]
    if not 1 <= len(prods) <= 3: ERR.append(f'products 商品要 1～3 件（現在 {len(prods)} 件）')
    P = []
    for i, p in enumerate(prods[:3]):
        icon = p.get('icon')
        if icon not in ICONS: ERR.append(f'products[{i}].icon「{icon}」不在小物庫：可用 {INAMES}')
        n, nS = fit(f'products[{i}].name 商品名稱（商品卡）', p.get('name'), 28, 24, 296, False)
        pr, prS = fit(f'products[{i}].price 商品卡第二行（價格或特色）', p.get('price'), 28, 24, 296)
        P.append({'icon': icon, 'name': n, 'nameSize': nS, 'price': pr, 'priceSize': prS})

    rv = sb.get('reveal') or {}
    rpre, rpreS = fit('reveal.pre 揭曉前一行（招牌上）', rv.get('pre'), 84, 64, 1120)
    rname, rnameS = fit('reveal.name 揭曉的名稱（招牌霓虹字）', rv.get('name'), 210, 110, 1100, False, lsr=0.04)
    rpost, rpostS = fit('reveal.post 揭曉後一行（招牌上）', rv.get('post'), 84, 64, 1120)
    rtag, rtagS = fit('reveal.tag 斜標章', rv.get('tag'), 120, 76, 1240)
    badge = rname if rname and em(rname) * 28 + 24 <= 180 else ''

    kws = sb.get('keywords') or []
    if not 2 <= len(kws) <= 3: ERR.append(f'keywords 關鍵字要 2～3 個（現在 {len(kws)} 個）')
    K = []
    for i, kw in enumerate(kws[:3]):
        if isinstance(kw, str): kw = {'word': kw}
        icon = kw.get('icon')
        if icon not in ICONS: ERR.append(f'keywords[{i}].icon「{icon}」不在小物庫：可用 {INAMES}')
        word = str(kw.get('word') or '')
        if not word: ERR.append(f'缺欄位 keywords[{i}].word 關鍵字')
        size = int(min(130, 500 / (1.05 + max(0.5, em(word)))))
        if size < 64: ERR.append(f'keywords[{i}].word 關鍵字「{word}」太長（貼紙上最多約 6 字）')
        card, cardS = fit(f'keywords[{i}].word（商品卡「{ui["feature"]}：…」）', f'{ui["feature"]}：{word}', 28, 24, 296)
        K.append({'icon': icon, 'word': word, 'size': max(64, size), 'card': card, 'cardSize': cardS})
    pinned = ' × '.join(k['word'] for k in K)
    pinLabelW = em(ui['pinned']) * 28 + 20
    pinnedS = int(min(30, (508 - 36 - 10 - pinLabelW) / max(1, em(pinned))))
    if K and pinnedS < 24:
        ERR.append(f'keywords 關鍵字合起來太長（置頂留言「{ui["pinned"]} {pinned}」一行放不下：全部關鍵字合計最多約 {int((508 - 46 - pinLabelW) / 24 - 1.6 * (len(K) - 1))} 字）')
        pinnedS = 24

    shows = sb.get('shows') or []
    if isinstance(shows, dict): shows = [shows]
    if len(shows) > 2: ERR.append(f'shows 展示品最多 2 件（現在 {len(shows)} 件）')
    S = []
    for i, s in enumerate(shows[:2]):
        kind = s.get('kind')
        if kind not in SHOWS: ERR.append(f'shows[{i}].kind「{kind}」不在展示品種類：可用 {SNAMES}'); continue
        if kind == 'cert':
            top, topS = fit(f'shows[{i}].top 證書抬頭', s.get('top'), 52, 40, 500, lsr=0.1)
            main, mainS = fit(f'shows[{i}].main 證書主文', s.get('main'), 74, 48, 500, False)
            stamp, stampS = fit(f'shows[{i}].stamp 印章字（圓章裡）', s.get('stamp'), 92, 50, 160)
            S.append({'kind': kind, 'top': top, 'topSize': topS, 'main': main, 'mainSize': mainS, 'stamp': stamp, 'stampSize': stampS})
        else:
            top, topS = fit(f'shows[{i}].top 匾額上方色帶', s.get('top'), 58, 44, 620)
            main, mainS = fit(f'shows[{i}].main 匾額中間一行', s.get('main'), 72, 52, 680)
            big, bigS = fit(f'shows[{i}].big 匾額金色大字', s.get('big'), 170, 96, 660, False)
            S.append({'kind': kind, 'top': top, 'topSize': topS, 'main': main, 'mainSize': mainS, 'big': big, 'bigSize': bigS})

    user = [str(c) for c in (sb.get('comments') or []) if str(c).strip()]
    for i, c in enumerate(user):
        if em(c) > 11.5: ERR.append(f'comments[{i}] 留言「{c}」太長（彈幕一行最多約 11 字）')

    ed = sb.get('end') or {}
    name, nameS = fit('end.name 名稱（招牌霓虹字）', ed.get('name'), 250, 110, 1100, False, lsr=0.04)
    _, cardNameS = fit('end.name 名稱（手機卡片翻面）', ed.get('name'), 92, 52, 440, False, lsr=0.04)
    esub, esubS = fit('end.sub 名稱下的副標（手機卡片）', ed.get('sub'), 50, 34, 390)
    slogan, sloganS = fit('end.slogan 標語（招牌上）', ed.get('slogan'), 104, 72, 1160)
    url, urlS = fit('end.url 網址或電話（招牌上）', ed.get('url'), 76, 52, 1100, latin=0.58)
    if ERR: raise ValueError('\n'.join('  ✗ ' + e for e in ERR))

    # ───────────── 排時間（以拍為單位；最後換成格）─────────────
    F = lambda b: int(round(b * B))
    cam = [[0, 960, 600, 0.5], [F(1.5), 960, 592, 0.54]]
    punch = []                                   # [格, 推進量, 震動像素]
    stand = []                                   # 展示台上的小物 [進場格, 離場格, icon]
    cards = []                                   # 商品卡
    orders = []                                  # [按下單格, 暱稱, 通知結束格]
    hearts = []                                  # 愛心噴發格
    points = []                                  # 狗狗指東西 [開始, 結束, 角度]
    tilt, bark, whoosh = [], [], []
    secs = []                                    # 配樂段落 [名稱, 開始格]

    live = F(4)
    countdown = [F(1), F(2), F(3)]
    cam.append([live - 4, 960, 540, 1])
    punch.append([live, 0.05, 10])
    bark.append(live + 6)
    secs += [['intro', 0], ['verse', live]]

    # 帶貨：每件 4 拍
    t = live + F(2)
    prod_t = []
    for i, p in enumerate(P):
        prod_t.append(t)
        order = t + 36
        cards.append({'a': t + 8, 'b': t + 58, 'icon': p['icon'], 'name': p['name'], 'nameSize': p['nameSize'],
                      'price': p['price'], 'priceSize': p['priceSize'], 'order': order})
        orders.append(order)
        points.append([t - 4, t + 48, -104])
        punch.append([t, 0.035, 8])
        hearts.append(t + 44)
        t += F(4)
    for i, pt in enumerate(prod_t):
        stand.append([pt, prod_t[i + 1] if i + 1 < len(prod_t) else None, P[i]['icon']])

    # 揭曉：鏡頭往右拉出手機到牆上招牌
    R0 = t
    rextra = 2 if nchars(rpre, rname, rpost, rtag) > 4 * pace else 0      # 招牌上的字多：多停 2 拍
    tilt.append(R0 - 16)
    bark.append(R0 + 12)
    points.append([R0 + 10, R0 + 58, -82])
    whoosh.append(R0)
    rev = {'start': R0, 'pre': R0 + 42, 'sign': R0 + 50, 'post': R0 + 62, 'slam': R0 + 80,
           'back': R0 + F(8 + rextra) - 2, 'end': R0 + F(10 + rextra)}
    cam += [[R0, 960, 540, 1], [R0 + 45, 1480, 540, 0.62], [rev['back'], 1505, 540, 0.62], [rev['end'], 960, 540, 1]]
    whoosh.append(rev['back'])
    if rtag: punch.append([rev['slam'], 0.06, 14])
    hearts += [rev['slam'] + 20, rev['slam'] + 45]
    stand[-1][1] = rev['end']                     # 最後一件商品留在台上到拉回
    secs.append(['pre', R0])

    # 關鍵字：每個 4 拍，貼紙跳出手機
    K0 = rev['end']
    secs.append(['chorus', K0])
    kw_t = []
    t = K0
    for i, kw in enumerate(K):
        kw_t.append(t)
        order = t + 36
        cards.append({'a': t + 8, 'b': t + 58, 'icon': kw['icon'], 'name': kw['card'], 'nameSize': kw['cardSize'],
                      'price': ui['hot'], 'priceSize': 28, 'order': order})
        orders.append(order)
        points.append([t - 4, t + 48, -104])
        punch.append([t, 0.035, 8])
        hearts.append(t + 44)
        t += F(4)
    combo = t
    for i, kt in enumerate(kw_t):
        stand.append([kt, kw_t[i + 1] if i + 1 < len(kw_t) else combo, K[i]['icon']])
    pos = [[360, 260, -6], [1560, 330, 5], [380, 640, 4]] if len(K) == 3 else [[360, 300, -6], [1560, 420, 5]]
    stickers = [{'a': kw_t[i] + 4, 'icon': K[i]['icon'], 'word': K[i]['word'], 'size': K[i]['size'], 'to': pos[i][:2], 'rot': pos[i][2]}
                for i in range(len(K))]
    xs = [[380, 450], [1560, 560]] if len(K) == 3 else [[360, 500], [1560, 620]]     # × 號位置
    comboD = {'at': combo, 'back': combo + 44, 'out': combo + 56, 'brk': combo + 30}
    punch.append([combo, 0.04, 8])
    tilt.append(combo + 32)
    bark.append(combo + 30)
    hearts.append(combo + 10)

    # 展示：獎盃／獎牌 8 拍、證書 7 拍
    t = combo + F(4)
    S0 = t
    showsT = []
    for i, s in enumerate(S):
        if s['kind'] == 'cert':
            e = {**s, 'start': t, 'in': t + 8, 'stampAt': t + 38, 'end': t + F(7)}
            stand.append([t, e['end'], 'cert'])
            whoosh.append(t + 4)
            punch.append([e['stampAt'], 0.06, 16])
            points.append([e['stampAt'] - 4, e['stampAt'] + 30, -150])
            orders.append(e['stampAt'] + 30)
            hearts.append(e['stampAt'] + 24)
            secs.append(['cert', t])
            t = e['end']
        else:
            hit = t + F(2)
            e = {**s, 'start': t, 'shake': [t + 10, t + 22], 'hit': hit, 'exit': t + F(6.5), 'end': t + F(8)}
            stand.append([t, hit + 12, 'gift'])
            stand.append([hit, e['end'], s['kind']])
            cam += [[hit - 14, 960, 540, 1], [hit + 14, 1080, 470, 1.45], [e['exit'], 1090, 468, 1.47], [e['end'], 960, 540, 1]]
            punch.append([hit, 0.07, 16])
            points.append([hit - 2, hit + 70, -104])
            orders.append(hit + 45)
            hearts += [hit + 30, hit + 80]
            secs += [['brk', t], ['trophy', hit]]
            t = e['end']
        showsT.append(e)
    for i, e in enumerate(showsT):                # 證書卡片在下一段開始時甩出畫面
        e['out'] = showsT[i + 1]['start'] if i + 1 < len(showsT) else t
    pinnedEnd = (showsT[0].get('hit', showsT[0]['start'] + 20) if showsT else t)

    # 高潮：鏡頭拉遠、愛心滿屏、人數爆表
    C = t
    boom = C + F(4)
    E = C + F(8)
    cam += [[C + 4, 960, 540, 1], [C + 40, 960, 520, 0.7], [E - 4, 960, 520, 0.72]]
    punch += [[C, 0.06, 14], [boom, 0.05, 12]]
    orders += [C + 36, C + 75, C + 96]
    hearts += list(range(C, E - 20, 15))
    secs.append(['climax', C])

    # 下播：鏡頭往右拉到招牌 → 名稱、標語、網址 → 卡片翻面 → 掰掰
    eextra = 2 if nchars(esub, slogan) + nchars(url) / 2 > 4 * pace else 0   # 副標＋標語（網址算半）字多：多停 2 拍
    frames = E + F(9 + eextra)
    cam += [[E + 46, 1480, 540, 0.62], [frames, 1500, 540, 0.64]]
    whoosh.append(E)
    end = {'at': E, 'sign': E + 40, 'logo': E + 60, 'slogan': E + 70, 'url': E + 90, 'bye': E + 90, 'wave': E + 30}
    bark.append(end['bye'])
    secs.append(['outro', E])
    stand[-1][1] = stand[-1][1] if stand[-1][1] else frames
    for s_ in stand:
        if s_[1] is None or s_[1] > frames: s_[1] = frames
    # 最後一件展示品留在台上到最後（原作證照留到片尾）
    if showsT: stand[-1][1] = frames

    # 拍點輕推：副歌與高潮段每小節第一拍
    for b in range(0, frames, BAR):
        if K0 <= b < combo + F(4) or C <= b < E: punch.append([b, 0.022, 0])

    # 下單通知：顯示到下一筆通知或置頂留言出現為止
    orders.sort()
    O = []
    for i, o in enumerate(orders):
        a = o + 12
        b = min(a + 58, orders[i + 1] + 12 if i + 1 < len(orders) else 10 ** 6)
        if a < combo <= b + 10: b = combo - 10
        if a < pinnedEnd and o >= combo: a, b = pinnedEnd + 4, max(pinnedEnd + 50, b)
        O.append([o, NICKS[(i * 3 + 1) % len(NICKS)], a, b])

    # 觀看人數曲線（直播介面的動態數字，不是文本數據）：照原作的成長曲線，依段落長短伸縮
    base = [(120, 1), (150, 23), (210, 168), (300, 486), (400, 1286), (480, 2051), (600, 3612), (750, 5208), (870, 7344),
            (990, 9126), (1080, 12560), (1200, 18832), (1300, 26316), (1380, 38420)]
    va = [[int(live + (f0 - 120) / (1380 - 120) * (C - live)), max(1, round(v * peak / 100000))] for f0, v in base]
    va += [[C + 15, round(52800 * peak / 100000)], [C + 30, round(71900 * peak / 100000)], [C + 45, round(88600 * peak / 100000)], [boom, peak]]

    # 彈幕：每 28 格一則（高潮 18 格），依段落從通用池挑；使用者寫的 comments 穿插在揭曉之後
    phases = [('live', live + 12), ('ask', R0 - 20), ('reveal', R0 + 10), ('kw', K0), ('show', S0), ('climax', C), ('end', E + 10)]
    cms = []
    ui_i = 0
    used = {k: 0 for k in POOL}
    for pi, (ph, a) in enumerate(phases):
        b = phases[pi + 1][1] if pi + 1 < len(phases) else E + 70
        if ph == 'show' and not showsT: continue
        step = 18 if ph == 'climax' else 28
        if ph == 'ask':
            cms.append([a, POOL['ask'][0], True]); continue
        f = a
        j = 0
        while f < b - 6:
            if user and ph in ('reveal', 'kw', 'show', 'climax') and j % 2 == 1:
                cms.append([f, user[ui_i % len(user)], True]); ui_i += 1
            else:
                pool = POOL[ph]
                cms.append([f, pool[used[ph] % len(pool)], False]); used[ph] += 1
            f += step; j += 1
    cms = [[f, NICKS[(i * 7 + 3) % len(NICKS)], txt, hi] for i, (f, txt, hi) in enumerate(cms) if f < frames - 30]
    gen = POOL['climax']
    flying = []
    for i in range(9):
        if user and i % 2 == 0: flying.append(user[(i // 2) % len(user)])
        else: flying.append(gen[i % len(gen)])

    # 抽格
    stills = [12, countdown[2] + 6]
    stills += [c['a'] + 24 for c in cards[:len(P)]]
    stills += [R0 + 70, rev['slam'] + 24]
    stills += [kt + 30 for kt in kw_t] + [combo + 24]
    for e in showsT: stills.append((e['hit'] + 40) if 'hit' in e else (e['stampAt'] + 20))
    stills += [C + 50, boom + 20, E + 30, end['logo'] + 40, frames - 8]
    stills = sorted(set(int(min(frames - 1, max(0, s))) for s in stills))
    while len(stills) > 20: stills.pop(len(stills) // 2)
    poster = boom + 14
    ov = [combo + 24, boom + 14, frames - 20]

    allText = ''.join([title, *ui.values(), *[p['name'] + p['price'] for p in P], rpre, rname, rpost, rtag,
                       *[k['word'] + k['card'] for k in K], pinned,
                       *[(s.get('top', '') + s.get('main', '') + s.get('big', '') + s.get('stamp', '')) for s in S],
                       *[c[2] for c in cms], *flying, *NICKS, name, esub, slogan, url])
    return {'template': '廣J', 'name': sb.get('name', '寵物直播'), 'fps': FPS, 'frames': frames, 'bpm': BPM, 'beatFrames': B, 'barFrames': BAR,
            'live': live, 'countdown': countdown, 'reveal': rev, 'combo': comboD, 'climax': C, 'boom': boom, 'end': end,
            'cam': cam, 'punch': punch, 'stand': stand, 'cards': cards, 'orders': O, 'hearts': sorted(hearts), 'points': points,
            'tilt': tilt, 'bark': bark, 'whoosh': whoosh, 'secs': secs, 'va': va, 'peak': peak, 'comments': cms, 'flying': flying,
            'stickers': stickers, 'xs': xs, 'shows': showsT, 'pinnedEnd': pinnedEnd, 'kwStart': K0,
            'd': {'title': title, 'titleSize': titleS, 'introSize': introS, 'ui': ui, 'badge': badge,
                  'reveal': {'pre': rpre, 'preSize': rpreS, 'name': rname, 'nameSize': rnameS, 'post': rpost, 'postSize': rpostS,
                             'tag': rtag, 'tagSize': rtagS},
                  'pinned': pinned, 'pinnedSize': pinnedS,
                  'end': {'name': name, 'nameSize': nameS, 'cardNameSize': cardNameS, 'sub': esub, 'subSize': esubS,
                          'slogan': slogan, 'sloganSize': sloganS, 'url': url, 'urlSize': urlS}},
            'stills': stills, 'poster': int(poster), 'overview': ov,
            'allText': allText + '0123456789,+LIVE×：'}


if __name__ == '__main__':
    import json, sys
    sys.stdout.reconfigure(encoding='utf-8')
    tl = build(json.load(open(sys.argv[1], encoding='utf-8')))
    print(tl['frames'], '格＝', round(tl['frames'] / FPS, 1), '秒')
    print('  開播', tl['live'], '商品卡', [c['a'] for c in tl['cards'][:len(tl['cards']) - len(tl['stickers'])]])
    print('  揭曉', tl['reveal'])
    print('  關鍵字', [s['a'] for s in tl['stickers']], '合體', tl['combo'])
    print('  展示', [(e['kind'], e['start'], e['end']) for e in tl['shows']])
    print('  高潮', tl['climax'], '爆表', tl['boom'], '下播', tl['end'])
    print('  配樂段落', tl['secs'])
    print('  彈幕', len(tl['comments']), '則；字數', len(set(tl['allText'])))
