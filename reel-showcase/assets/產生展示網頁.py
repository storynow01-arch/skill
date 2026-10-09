"""產生展示網站（多頁、四個分區）：
  展示網頁.html                       首頁：四個分區入口＋最新加入
  展示網頁素材/區_<分區>.html          分區頁：縮圖牆（滑過預覽）、篩選、搜尋
  展示網頁素材/片_<版本名>.html        單片頁：大播放器、說明、品檢、附件、上一支／下一支
四個分區：
  待挑選/        新做好、還沒決定的影片。每支按「要／不要」；版本.json 的「分區」寫好它要去哪一區
  無配音_廣告/   純廣告（確定保留）
  有配音/        旁白影片（確定保留）
  收進 skill     不是資料夾：純廣告／旁白影片裡「已收進 skill」（版本.json 有「收進skill」欄位）
                 或「標記要收進 skill」（挑選紀錄.json）的影片
挑選結果存在 挑選紀錄.json（雙擊 啟動展示網頁.bat 打開網頁，按鈕會自動存檔）。
展示網頁素材/ 整個資料夾都是自動產生的（封面、6 秒預覽、頁面），可刪掉重建；
樣式與互動原始檔在 展示網頁樣式/site.css、site.js（改這裡）。
用法：在 04_版本庫/ 執行  PYTHONUTF8=1 py 產生展示網頁.py"""
import json, os, subprocess, html, re, shutil

# ===== 網站設定（換專案時只改這一段；四個分區的說明在下面 SECTIONS） =====
BRAND = 'REEL'                                   # 左上角英文品牌字
SITE = '影片版本庫'                               # 網站中文名（頁籤標題、頂欄、頁尾）
HERO_EN = 'AI VIDEO STUDIO · VERSION LIBRARY'    # 首頁大標上方的英文眉標
HERO_TITLE = '看到好影片，<br>就做一支自己的。'      # 首頁大標（可用 <br> 換行）
HERO_TEXT = '網路上的好影片、好提示詞，在這裡用程式手刻試做；做得好的存成版本，之後直接拿來用。'

# (資料夾/代號, 頁面名稱, 英文眉標, 說明)
SECTIONS = [('待挑選', '待挑選', 'To Review', '新做好、還沒決定的影片。每支按「要」或「不要」，挑完跟 Claude 說「挑完了」：要的自動移到純廣告或旁白影片，不要的移到資源回收筒。'),
            ('無配音_廣告', '純廣告', 'Ads & Reels', '沒有旁白，靠畫面與音樂節奏說話：作品集、廣告短片、社群開場。'),
            ('有配音', '旁白影片', 'Narrated', '有旁白與字幕（Netflix 繁中規範），講解內容：招生介紹、教學、活動說明。'),
            ('收進skill', '收進 skill', 'In the Skill', '收進 GitHub skill 倉庫「影片製作」（storynow-aimovie-make）當範本的影片：已收進的，和你標記要收進、等 Claude 處理的。')]
TITLE = {k: t for k, t, *_ in SECTIONS}
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
A = '展示網頁素材'
os.makedirs(f'{A}/preview', exist_ok=True)
for f in ('site.css', 'site.js'):  # 樣式與互動的原始檔在 展示網頁樣式/，這裡只複製
    shutil.copyfile(f'展示網頁樣式/{f}', f'{A}/{f}')
esc = html.escape
STATE = json.load(open('挑選紀錄.json', encoding='utf-8')) if os.path.exists('挑選紀錄.json') else {}


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height',
                        '-select_streams', 'v:0', '-of', 'json', p], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}')
    f, s = j.get('format', {}), (j.get('streams') or [{}])[0]
    return float(f.get('duration', 0)), int(f.get('size', 0)), s.get('width', 0), s.get('height', 0)


def qa(d):
    md = os.path.join(d, '最終品檢', 'final_qa.md')
    lines = open(md, encoding='utf-8').read().splitlines() if os.path.exists(md) else []
    items = [l[2:].strip() for l in lines if l.startswith('- ✗') or l.startswith('- ✓')]
    return (all(i.startswith('✓') for i in items) if items else None), items


def slug(s):
    return re.sub(r'[\\/:*?"<>|\s]+', '_', s)


def mmss(t):
    return f'{int(t // 60)}:{int(t % 60):02d}'


# ---------- 收集（三個實體資料夾） ----------
vers_by = {}
for key, *_ in SECTIONS[:3]:
    vers = []
    if os.path.isdir(key):
        for name in sorted(os.listdir(key)):
            d = os.path.join(key, name)
            meta = os.path.join(d, '版本.json')
            if not os.path.isfile(meta):
                continue
            m = json.load(open(meta, encoding='utf-8'))
            path = os.path.join(d, m['成片']).replace('\\', '/')
            exists = os.path.exists(path)
            dur, size, w, h = probe(path) if exists else (0, 0, 0, 0)
            sid = slug(name)
            poster, prev = f'{sid}.jpg', f'preview/{sid}.mp4'
            if exists and not os.path.exists(f'{A}/{poster}'):
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(dur * m.get('封面位置', 0.3)), '-i', path,
                                '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', f'{A}/{poster}'])
            if exists and not os.path.exists(f'{A}/{prev}'):
                st = max(0.0, min(dur - 6, dur * m.get('封面位置', 0.3) - 1))
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st:.2f}', '-t', '6', '-i', path, '-an',
                                '-vf', 'scale=640:-2,fps=24', '-c:v', 'libx264', '-crf', '30', '-preset', 'veryfast',
                                '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{A}/{prev}'])
            ok, items = qa(d) if exists else (None, [])
            extras = [f for f in sorted(os.listdir(d)) if f != m['成片'] and os.path.isfile(os.path.join(d, f))
                      and f.lower().endswith(('.mp4', '.jpg', '.png', '.webm', '.mov'))]
            dest = m.get('分區', '無配音_廣告') if key == '待挑選' else key
            vers.append(dict(id=sid, name=name, dir=d.replace('\\', '/'), m=m, path=path, exists=exists, dur=dur,
                             size=size, w=w, h=h, poster=poster, prev=prev, ok=ok, items=items, extras=extras,
                             sec=key, dest=dest, inskill=m.get('收進skill', '')))
    vers.sort(key=lambda v: (v['m'].get('日期', ''), v['name']), reverse=True)
    vers_by[key] = vers
marked = set(STATE.get('收進skill', []))
vers_by['收進skill'] = [v for k in ('無配音_廣告', '有配音') for v in vers_by[k] if v['inskill'] or v['id'] in marked]
ALL = [v for k in ('待挑選', '無配音_廣告', '有配音') for v in vers_by[k]]
KEPT = [v for v in ALL if v['sec'] != '待挑選']

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">')
META = {v['id']: {'名稱': v['m']['名稱'], '區': v['sec'], '去向': TITLE[v['dest']], '已收進': v['inskill']} for v in ALL}


def head(t, rel=''):
    return (f'<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(t)}</title>{FONTS}'
            f'<link rel="stylesheet" href="{rel}site.css"></head><body>')


def topbar(rel, cur):
    """rel：從目前頁面到 展示網頁素材/ 的相對路徑（首頁＝'展示網頁素材/'，素材頁＝''）"""
    links = ''.join(f'<a class="{"on" if cur == k else ""} s-{k}" href="{rel}區_{k}.html"><span>{esc(t)}</span><i>{len(vers_by[k])}</i></a>'
                    for k, t, *_ in SECTIONS)
    home = '展示網頁.html' if rel else '../展示網頁.html'
    return (f'<div class="savebar" data-savebar hidden>現在是直接開檔，按鈕不會存到檔案。請雙擊 04_版本庫 裡的「啟動展示網頁.bat」打開。</div>'
            f'<header class="top"><a class="brand" href="{home}"><b>{BRAND}</b><span>{SITE}</span></a>'
            f'<nav>{links}</nav><button class="picks-btn" data-open-picks>挑選進度 <i data-pick-count>0</i></button></header>')


def badge(v):
    if v['ok']:
        return '<span class="qa ok" title="最終品檢全部通過">品檢通過</span>'
    if v['ok'] is False:
        return '<span class="qa warn" title="有說明項，見單片頁">品檢有說明</span>'
    return '<span class="qa na">未品檢</span>'


def actions(v, big=False):
    """待挑選：要／不要；純廣告、旁白影片：收進 skill"""
    c = ' big' if big else ''
    if v['sec'] == '待挑選':
        return f'<div class="decide{c}" data-decide="{v["id"]}"><button data-v="要">要</button><button data-v="不要">不要</button></div>'
    if v['inskill']:
        return f'<span class="skilltag{c}">已收進 skill：{esc(v["inskill"])}</span>'
    return f'<button class="skillbtn{c}" data-skill="{v["id"]}"><span class="off">＋ 收進 skill</span><span class="onn">✓ 等待收進 skill</span></button>'


def card(v, rel):
    m = v['m']
    kick = m.get('系列') or m.get('做法', '')
    dest = f'<span class="dest">選「要」→ 放到{TITLE[v["dest"]]}</span>' if v['sec'] == '待挑選' else ''
    return f'''<article class="card" data-id="{v['id']}" data-tags="{esc(m.get('做法', ''))} {esc(m.get('系列', ''))}">
  <a class="thumb" href="{rel}片_{v['id']}.html">
    <img loading="lazy" src="{rel}{v['poster']}" alt="">
    <video muted loop playsinline preload="none" data-src="{rel}{v['prev']}"></video>
    <span class="dur">{mmss(v['dur'])}</span><span class="verdict"></span>
  </a>
  <div class="cbody">
    <div class="kicker">{esc(kick)}</div>
    <h3><a href="{rel}片_{v['id']}.html">{esc(m['名稱'])}</a></h3>
    <p>{esc(m.get('說明', ''))}</p>
    <div class="cfoot">{badge(v)}<span>{esc(m.get('日期', ''))}</span></div>
    <div class="cact">{actions(v)}{dest}</div>
  </div>
</article>'''


def footer():
    return (f'<footer class="foot"><span>{BRAND} · {SITE}</span><span>用「啟動展示網頁.bat」打開，按鈕會自動存到 挑選紀錄.json。'
            '新增版本後執行 產生展示網頁.py 重建。</span></footer>'
            '<aside class="drawer" data-drawer><div class="dhead"><b>挑選進度</b><button data-close-picks>關閉</button></div>'
            '<div class="dlist" data-pick-list></div><p class="hint" data-save-hint></p></aside>'
            f'<script>window.REEL={json.dumps(META, ensure_ascii=False)};</script>')


# ---------- 首頁 ----------
latest = sorted(ALL, key=lambda v: v['m'].get('日期', ''), reverse=True)[:6]
mosaic = ''.join(f'<img src="{A}/{v["poster"]}" alt="">' for v in (ALL * 3)[:18])
tiles = ''
for i, (k, t, en, it) in enumerate(SECTIONS):
    vs = vers_by[k]
    stack = ''.join(f'<img style="--i:{j}" src="{A}/{v["poster"]}" alt="">' for j, v in enumerate(vs[:3])) or '<div class="emptystack">目前沒有影片</div>'
    tiles += f'''<a class="tile s-{k}" href="{A}/區_{k}.html">
  <div class="tnum">0{i + 1}</div>
  <div class="ttext"><div class="en">{en}</div><h2>{esc(t)}</h2><p>{esc(it)}</p>
    <div class="tstat"><b>{len(vs)}</b> 支<span>·</span><b>{sum(v["dur"] for v in vs) / 60:.0f}</b> 分鐘</div><span class="go">進入 →</span></div>
  <div class="stack">{stack}</div></a>'''
home = head(SITE, A + '/') + topbar(A + '/', '') + f'''
<section class="hero"><div class="mosaic">{mosaic}</div><div class="veil"></div>
  <div class="htext"><div class="en">{HERO_EN}</div>
  <h1>{HERO_TITLE}</h1>
  <p>{HERO_TEXT}</p>
  <div class="hstat"><div><b>{len(vers_by["待挑選"])}</b><span>支待挑選</span></div><div><b>{len(KEPT)}</b><span>支已保留</span></div>
  <div><b>{len(vers_by["收進skill"])}</b><span>支收進 skill</span></div></div></div></section>
<main class="wrap"><div class="tiles">{tiles}</div>
<div class="shead"><h2>最新加入</h2><span class="en">LATEST</span></div>
<div class="grid">{''.join(card(v, A + '/') for v in latest)}</div></main>
{footer()}<script src="{A}/site.js"></script></body></html>'''
open('展示網頁.html', 'w', encoding='utf-8').write(home)

# ---------- 分區頁 ----------
for k, t, en, it in SECTIONS:
    vs = vers_by[k]
    tags = sorted({v['m'].get('系列') or v['m'].get('做法', '').split('（')[0].strip() for v in vs} - {''})
    chips = '<button class="chip on" data-filter="">全部</button>' + ''.join(
        f'<button class="chip" data-filter="{esc(x)}">{esc(x)}</button>' for x in tags)
    if k == '待挑選':
        chips += '<span class="sep"></span>' + ''.join(f'<button class="chip" data-verdict="{x}">{x}</button>' for x in ('未決定', '要', '不要'))
    page = head(f'{t}｜{SITE}') + topbar('', k) + f'''
<section class="phead wrap"><div class="en">{en}</div><h1>{esc(t)}<small>{len(vs)} 支</small></h1><p>{esc(it)}</p>
  <div class="tools"><div class="chips">{chips}</div><input type="search" placeholder="搜尋名稱、說明…" data-search></div></section>
<main class="wrap"><div class="grid" data-grid>{''.join(card(v, '') for v in vs) or '<p class="empty">目前沒有影片</p>'}</div>
<p class="empty" data-empty hidden>沒有符合的影片</p></main>
{footer()}<script src="site.js"></script></body></html>'''
    open(f'{A}/區_{k}.html', 'w', encoding='utf-8').write(page)

# ---------- 單片頁 ----------
for k, t, *_ in SECTIONS[:3]:
    vs = vers_by[k]
    for i, v in enumerate(vs):
        m = v['m']
        prv, nxt = vs[i - 1] if i > 0 else None, vs[i + 1] if i + 1 < len(vs) else None
        bad = [x for x in v['items'] if x.startswith('✗')]
        good = [x for x in v['items'] if x.startswith('✓')]
        qa_html = ''
        if v['items']:
            qa_html = (f'<details class="qabox" {"open" if bad else ""}><summary>{badge(v)}<span>最終品檢 {len(good)}/{len(v["items"])} 項通過</span></summary>'
                       + ''.join(f'<div class="qi bad">{esc(x[1:].strip())}</div>' for x in bad)
                       + (f'<div class="qnote"><b>說明</b>{esc(m["品檢說明"])}</div>' if bad and m.get('品檢說明') else '')
                       + ''.join(f'<div class="qi">{esc(x[1:].strip())}</div>' for x in good) + '</details>')
        ex = ''.join(f'<a href="../{esc(v["dir"])}/{esc(f)}" target="_blank">{esc(f)}</a>' for f in v['extras'])
        rows = [('所在分區', t), ('選「要」後', TITLE[v['dest']] if k == '待挑選' else ''), ('收進 skill', v['inskill']),
                ('做法', m.get('做法', '')), ('系列', m.get('系列', '')), ('素材', m.get('素材', '')),
                ('試做專案', m.get('試做專案', '')), ('日期', m.get('日期', '')),
                ('規格', f'{v["w"]}×{v["h"]} · {mmss(v["dur"])} · {v["size"] / 1e6:.0f} MB' if v['exists'] else '影片不見了')]
        dl = ''.join(f'<dt>{a}</dt><dd>{esc(b)}</dd>' for a, b in rows if b)
        nav_ = (f'<a class="pn" data-key="prev" href="片_{prv["id"]}.html"><span>← 上一支</span><b>{esc(prv["m"]["名稱"])}</b></a>' if prv else '<span></span>') + \
               (f'<a class="pn r" data-key="next" href="片_{nxt["id"]}.html"><span>下一支 →</span><b>{esc(nxt["m"]["名稱"])}</b></a>' if nxt else '<span></span>')
        player = (f'<video controls preload="metadata" poster="{v["poster"]}" src="../{esc(v["path"])}"></video>'
                  if v['exists'] else '<div class="missing">影片不見了</div>')
        page = head(f'{m["名稱"]}｜{SITE}') + topbar('', k) + f'''
<main class="wrap detail">
  <div class="crumb"><a href="區_{k}.html">← {esc(t)}</a><span>{i + 1} / {len(vs)}</span></div>
  <div class="theater">{player}</div>
  <div class="dgrid">
    <div class="dmain"><div class="kicker">{esc(m.get('系列') or m.get('做法', ''))}</div>
      <h1>{esc(m['名稱'])}</h1><p class="lead">{esc(m.get('說明', ''))}</p>
      <div class="acts">{actions(v, True)}<a class="ghost" href="../{esc(v['path'])}" download>下載成片</a></div>{qa_html}</div>
    <aside class="dside"><dl>{dl}</dl>{f'<div class="extras"><b>附件</b>{ex}</div>' if ex else ''}</aside>
  </div>
  <nav class="pnav">{nav_}</nav>
</main>{footer()}<script src="site.js"></script></body></html>'''
        open(f'{A}/片_{v["id"]}.html', 'w', encoding='utf-8').write(page)

alive = {f'片_{v["id"]}.html' for v in ALL} | {f'區_{k}.html' for k, *_ in SECTIONS}
for f in os.listdir(A):
    if f.endswith('.html') and f not in alive:
        os.remove(os.path.join(A, f))
print('→ 展示網頁.html ＋', len(alive), '頁｜', '、'.join(f'{t} {len(vers_by[k])}' for k, t, *_ in SECTIONS))
