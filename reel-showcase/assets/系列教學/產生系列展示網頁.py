"""系列教學模式：一個科目（有 系列設定.md 的資料夾）的展示網站。不搬檔案——直接讀每一節資料夾裡的成片。
  <科目>/展示網頁.html                    首頁：五個分區入口＋最新成片＋全科進度
  <科目>/展示網頁素材/區_<分區>.html       分區頁：縮圖牆（滑過預覽）、搜尋
  <科目>/展示網頁素材/片_<節次>.html       單支頁：大播放器、狀態按鈕、YouTube 網址、上架清單、品檢、檔案
五個分區（狀態存在 <科目>/展示紀錄.json，網頁按鈕自動存；伺服器＝頻道資料夾的 _展示網頁/啟動展示網頁.py）：
  待確認   最終品檢通過、還沒看過的成片（沒有狀態就是待確認）
  要修改   看過、要改的（附修改備註，Claude 讀了去改，改好重出會回到待確認）
  確定使用 看過、確定要上的
  已上架   已上傳 YouTube（附網址）
  全部節次 大綱每一節的進度總表（未做／製作中／待確認……）
用法：python 產生系列展示網頁.py <科目資料夾>      （每節出片後 make_video 會自動跑）"""
import html, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SECTIONS = [('待確認', 'To Review', '最終品檢通過、你還沒看過的成片。看完按「確定使用」或「要修改」（要修改請寫下哪裡要改）。'),
            ('要修改', 'Needs Fix', '看過、要改的。Claude 讀修改備註去改，改好重新出片後會回到「待確認」。'),
            ('確定使用', 'Approved', '確定要上 YouTube 的。上傳時照單支頁的「上架清單」一項一項勾，上傳後貼上 YouTube 網址。'),
            ('已上架', 'On YouTube', '已經上傳 YouTube 的。點封面右上角的 ▶ YouTube 直接開影片。'),
            ('全部節次', 'All Lessons', '大綱每一節的進度：未做、製作中、待確認、要修改、確定使用、已上架。')]
DEFAULT_CHECK = ['說明欄照模板寫（開頭兩行、章節時間軸、出處、AI 揭露、#標籤）', '上傳 SRT 字幕檔', '「變造或合成內容」勾「是」',
                 '加入播放清單、設定排程時間', '上線後檢查：#標籤、章節、轉錄稿']
esc = html.escape
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">')


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height',
                        '-select_streams', 'v:0', '-of', 'json', p], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}')
    f, s = j.get('format', {}), (j.get('streams') or [{}])[0]
    return float(f.get('duration', 0)), int(f.get('size', 0)), s.get('width', 0), s.get('height', 0)


def mmss(t):
    return f'{int(t // 60)}:{int(t % 60):02d}'


def outline(md):
    """系列設定.md 的大綱表：第一欄是節次（0-0、1-1、4-統…）的列"""
    rows = []
    for ln in md.splitlines():
        c = [x.strip() for x in ln.strip().strip('|').split('|')] if ln.startswith('|') else []
        if len(c) >= 2 and re.fullmatch(r'\d+-[0-9A-Za-z統]+|\d+', c[0]) and not set(c[1]) <= set('-: '):
            rows.append({'id': c[0], '主題': re.sub(r'\*\*', '', c[1]), '類型': c[2] if len(c) > 2 else '', '官方': c[3] if len(c) > 3 else ''})
    return rows


def checklist(md):
    i = md.find('上架前的提醒清單')
    if i < 0:
        return DEFAULT_CHECK
    items = []
    for ln in md[i:].splitlines()[1:]:
        m = re.match(r'\s*\d+\.\s+(.*)', ln)
        if m:
            items.append(re.sub(r'`', '', m.group(1)).strip())
        elif items and not ln.strip():
            break
    return items or DEFAULT_CHECK


def build(subject_dir):
    S = os.path.abspath(subject_dir)
    subject = os.path.basename(S)
    title = subject.replace('_', '｜', 1)
    md = open(os.path.join(S, '系列設定.md'), encoding='utf-8').read()
    m = re.search(r'播放清單[^：:]*[：:]\s*([^\n（(]+)', md)
    playlist = m.group(1).strip().strip('「」') if m else ''
    plan, checks = outline(md), checklist(md)
    A = os.path.join(S, '展示網頁素材')
    os.makedirs(os.path.join(A, 'preview'), exist_ok=True)
    for f in ('site.css', 'series.css', 'series.js'):
        shutil.copyfile(os.path.join(HERE, f), os.path.join(A, f))

    # ---------- 收集每一節的成片（資料夾名 NN_<節次>_<主題>，成片在 out/，不搬檔案） ----------
    vids = {}
    for name in sorted(os.listdir(S)):
        d = os.path.join(S, name)
        mm = re.match(r'\d+_(\d+-[0-9A-Za-z統]+)_(.+)', name)
        if not (mm and os.path.isdir(d)):
            continue
        lid = mm.group(1)
        out = os.path.join(d, 'out')
        mp4s = [f for f in os.listdir(out) if f.endswith('.mp4') and not f.startswith('_')] if os.path.isdir(out) else []
        if not mp4s:
            vids.setdefault(lid, {'id': lid, 'dir': name, 'video': None})
            continue
        f = max(mp4s, key=lambda x: os.path.getmtime(os.path.join(out, x)))
        p = os.path.join(out, f)
        dur, size, w, h = probe(p)
        stem = f[:-4]
        qmd = os.path.join(out, stem + '_品檢', 'final_qa.md')
        qa_lines = open(qmd, encoding='utf-8').read().splitlines() if os.path.exists(qmd) else []
        items = [l[2:].strip() for l in qa_lines if l.startswith('- ✓') or l.startswith('- ✗')]
        ok = (not any(i.startswith('✗') for i in items)) if items else None
        sb = os.path.join(d, 'storyboard.json')
        sbj = json.load(open(sb, encoding='utf-8')) if os.path.exists(sb) else {}
        mtime = os.path.getmtime(p)
        sid = re.sub(r'[^0-9A-Za-z統-]', '_', lid)
        poster, prev = f'{sid}.jpg', f'preview/{sid}.mp4'
        stamp = os.path.join(A, f'{sid}.stamp')
        fresh = os.path.exists(stamp) and open(stamp).read() == str(mtime)
        if not fresh or not os.path.exists(os.path.join(A, poster)):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{dur * 0.18:.2f}', '-i', p, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', os.path.join(A, poster)])
            st = max(0.0, dur * 0.18 - 1)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{st:.2f}', '-t', '6', '-i', p, '-an', '-vf', 'scale=640:-2,fps=24', '-c:v', 'libx264',
                            '-crf', '30', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(A, prev)])
            open(stamp, 'w').write(str(mtime))
        rel = lambda x: f'../{name}/{x}'.replace('\\', '/')
        files = [('下載成片', rel(f'out/{f}'))]
        if os.path.exists(os.path.join(out, stem + '.srt')):
            files.append(('SRT 字幕檔', rel(f'out/{stem}.srt')))
        if os.path.exists(os.path.join(out, stem + '_品檢', 'final_qa.html')):
            files.append(('最終品檢報告', rel(f'out/{stem}_品檢/final_qa.html')))
        for label, x in (('修改對照', '修改紀錄/修改對照.md'), ('內容分析', '01_內容分析.md'), ('進度紀錄', '進度.md')):
            if os.path.exists(os.path.join(d, x)):
                files.append((label, rel(x)))
        vids[lid] = dict(id=lid, sid=sid, dir=name, video=rel(f'out/{f}'), dur=dur, size=size, w=w, h=h, poster=poster, prev=prev,
                         ok=ok, items=items, title=mm.group(2).replace('_', ' '), sbtitle=sbj.get('title', ''), files=files,
                         date=__import__('datetime').datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M'), mtime=mtime)
    plan_ids = [r['id'] for r in plan]
    for lid in vids:                                  # 資料夾有、大綱沒有的節次也列出來
        if lid not in plan_ids:
            plan.append({'id': lid, '主題': vids[lid].get('title', ''), '類型': '', '官方': ''})
    topic = {r['id']: r['主題'] for r in plan}
    V = [v for v in vids.values() if v.get('video')]
    order = {r['id']: i for i, r in enumerate(plan)}
    V.sort(key=lambda v: order.get(v['id'], 999))
    for v in V:
        v['topic'] = topic.get(v['id']) or v['title']

    meta = {v['sid']: {'節次': v['id'], '主題': v['topic'], 'ok': v['ok']} for v in V}
    boot = (f'<script>window.SERIES={json.dumps({"subject": subject, "items": meta, "checks": checks, "total": len(plan)}, ensure_ascii=False)};</script>')

    def head(t, rel=''):
        return (f'<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<title>{esc(t)}</title>{FONTS}<link rel="stylesheet" href="{rel}site.css"><link rel="stylesheet" href="{rel}series.css"></head><body class="series">')

    def topbar(rel, cur):
        links = ''.join(f'<a class="{"on" if cur == k else ""}" href="{rel}區_{k}.html"><span>{k}</span><i data-count="{k}">0</i></a>' for k, *_ in SECTIONS)
        home, chan = ('展示網頁.html', '../展示網頁.html') if rel else ('../展示網頁.html', '../../展示網頁.html')
        return (f'<div class="savebar" data-savebar hidden>現在是直接開檔，按鈕不會存到檔案。請雙擊這個資料夾裡的「啟動展示網頁.bat」打開。</div>'
                f'<header class="top"><a class="brand" href="{chan}" title="回頻道總覽"><b>CH</b><span>頻道總覽</span></a>'
                f'<a class="brand subj" href="{home}"><span>{esc(title)}</span></a><nav>{links}</nav></header>')

    def badge(v):
        if v['ok']:
            return '<span class="qa ok">品檢通過</span>'
        return '<span class="qa warn">品檢有項目</span>' if v['ok'] is False else '<span class="qa na">未品檢</span>'

    def card(v, rel):
        return f'''<article class="card" data-id="{v['sid']}">
  <a class="thumb" href="{rel}片_{v['sid']}.html"><img loading="lazy" src="{rel}{v['poster']}" alt="">
    <video muted loop playsinline preload="none" data-src="{rel}{v['prev']}"></video>
    <span class="dur">{mmss(v['dur'])}</span><span class="stbadge" data-st-badge></span><span class="ytlink" data-yt hidden>▶ YouTube</span></a>
  <div class="cbody"><div class="kicker">{esc(v['id'])}</div>
    <h3><a href="{rel}片_{v['sid']}.html">{esc(v['topic'])}</a></h3>
    <div class="cfoot">{badge(v)}<span>{v['date']}</span></div>
    <div class="cact"><div class="decide st" data-status="{v['sid']}">{''.join(f'<button data-v="{s}">{s}</button>' for s in ('確定使用', '要修改', '已上架'))}</div></div>
  </div></article>'''

    def footer():
        return (f'<footer class="foot"><span>{esc(title)} · 系列教學展示網頁</span><span>用「啟動展示網頁.bat」打開，按鈕自動存到 展示紀錄.json；'
                '每一節出片後會自動重建。</span></footer>')

    # ---------- 首頁 ----------
    mosaic = ''.join(f'<img src="展示網頁素材/{v["poster"]}" alt="">' for v in (V * 6)[:18]) if V else ''
    tiles = ''
    for i, (k, en, it) in enumerate(SECTIONS):
        stack = ''.join(f'<img style="--i:{j}" src="展示網頁素材/{v["poster"]}" alt="">' for j, v in enumerate(V[:3])) if k == '全部節次' else ''
        tiles += f'''<a class="tile" href="展示網頁素材/區_{k}.html" data-tile="{k}"><div class="tnum">0{i + 1}</div>
  <div class="ttext"><div class="en">{en}</div><h2>{k}</h2><p>{esc(it)}</p>
  <div class="tstat"><b data-count="{k}">0</b> {"節" if k == "全部節次" else "支"}</div><span class="go">進入 →</span></div><div class="stack" data-stack="{k}">{stack}</div></a>'''
    latest = sorted(V, key=lambda v: v['mtime'], reverse=True)[:6]
    home = head(title, '展示網頁素材/') + topbar('展示網頁素材/', '') + f'''
<section class="hero"><div class="mosaic">{mosaic}</div><div class="veil"></div><div class="htext"><div class="en">SERIES · {esc(subject)}</div>
  <h1>{esc(title.split('｜')[-1])}</h1><p>{esc(playlist and f'播放清單「{playlist}」。') }每一節出片後自動出現在「待確認」；看完按按鈕，狀態自動存檔。</p>
  <div class="hstat"><div><b>{len(V)}</b><span>節已成片</span></div><div><b data-count="已上架">0</b><span>節已上架</span></div><div><b>{len(plan)}</b><span>節全部</span></div></div>
  <div class="progress"><i style="width:{len(V) / max(1, len(plan)) * 100:.1f}%"></i><em data-progress-yt></em></div></div></section>
<main class="wrap"><div class="tiles five">{tiles}</div>
<div class="shead"><h2>最新成片</h2><span class="en">LATEST</span></div><div class="grid">{''.join(card(v, '展示網頁素材/') for v in latest) or '<p class="empty">還沒有成片</p>'}</div></main>
{footer()}{boot}<script src="展示網頁素材/series.js"></script></body></html>'''
    open(os.path.join(S, '展示網頁.html'), 'w', encoding='utf-8').write(home)

    # ---------- 分區頁（四個狀態分區放全部影片，由 series.js 依狀態篩） ----------
    for k, en, it in SECTIONS[:4]:
        page = head(f'{k}｜{title}') + topbar('', k) + f'''
<section class="phead wrap"><div class="en">{en}</div><h1>{k}<small data-count="{k}">0</small></h1><p>{esc(it)}</p>
  <div class="tools"><div class="chips"></div><input type="search" placeholder="搜尋節次、主題…" data-search></div></section>
<main class="wrap"><div class="grid" data-grid data-section="{k}">{''.join(card(v, '') for v in V)}</div>
<p class="empty" data-empty hidden>這一區目前沒有影片</p></main>{footer()}{boot}<script src="series.js"></script></body></html>'''
        open(os.path.join(A, f'區_{k}.html'), 'w', encoding='utf-8').write(page)

    # 全部節次：進度表
    rows = ''
    for r in plan:
        v = vids.get(r['id'])
        if v and v.get('video'):
            st, link = f'<span class="stcell" data-stcell="{v["sid"]}">待確認</span>', f'<a href="片_{v["sid"]}.html">看影片 →</a>'
        elif v:
            st, link = '<span class="stcell mk">製作中</span>', ''
        else:
            st, link = '<span class="stcell no">未做</span>', ''
        rows += f'<tr><td class="lid">{esc(r["id"])}</td><td>{esc(r["主題"])}</td><td class="ty">{esc(r["類型"])}</td><td>{st}</td><td>{link}</td></tr>'
    page = head(f'全部節次｜{title}') + topbar('', '全部節次') + f'''
<section class="phead wrap"><div class="en">All Lessons</div><h1>全部節次<small>{len(plan)}</small></h1><p>{esc(SECTIONS[4][2])}</p></section>
<main class="wrap"><table class="plan"><thead><tr><th>節次</th><th>主題</th><th>類型</th><th>進度</th><th></th></tr></thead><tbody>{rows}</tbody></table></main>
{footer()}{boot}<script src="series.js"></script></body></html>'''
    open(os.path.join(A, '區_全部節次.html'), 'w', encoding='utf-8').write(page)

    # ---------- 單支頁 ----------
    for i, v in enumerate(V):
        prv, nxt = (V[i - 1] if i > 0 else None), (V[i + 1] if i + 1 < len(V) else None)
        bad = [x for x in v['items'] if x.startswith('✗')]
        qa_html = (f'<details class="qabox" {"open" if bad else ""}><summary>{badge(v)}<span>最終品檢</span></summary>'
                   + ''.join(f'<div class="qi {"bad" if x.startswith("✗") else ""}">{esc(x[1:].strip())}</div>' for x in v['items']) + '</details>') if v['items'] else ''
        files = ''.join(f'<a href="{esc(u)}" target="_blank" {"download" if lab == "下載成片" else ""}>{esc(lab)}</a>' for lab, u in v['files'])
        chk = ''.join(f'<label><input type="checkbox" data-check="{v["sid"]}" data-i="{j}"><span>{esc(c)}</span></label>' for j, c in enumerate(checks))
        rowsd = [('節次', v['id']), ('主題', v['topic']), ('資料夾', v['dir']), ('出片時間', v['date']),
                 ('規格', f'{v["w"]}×{v["h"]} · {mmss(v["dur"])} · {v["size"] / 1e6:.0f} MB'), ('播放清單', playlist)]
        dl = ''.join(f'<dt>{a}</dt><dd>{esc(b)}</dd>' for a, b in rowsd if b)
        nav_ = (f'<a class="pn" data-key="prev" href="片_{prv["sid"]}.html"><span>← 上一節</span><b>{esc(prv["id"])} {esc(prv["topic"])}</b></a>' if prv else '<span></span>') + \
               (f'<a class="pn r" data-key="next" href="片_{nxt["sid"]}.html"><span>下一節 →</span><b>{esc(nxt["id"])} {esc(nxt["topic"])}</b></a>' if nxt else '<span></span>')
        page = head(f'{v["id"]} {v["topic"]}｜{title}') + topbar('', '') + f'''
<main class="wrap detail" data-detail="{v['sid']}">
  <div class="crumb"><a href="區_全部節次.html">← 全部節次</a><span>{i + 1} / {len(V)}</span></div>
  <div class="theater"><video controls preload="metadata" poster="{v['poster']}" src="{esc(v["video"])}"></video></div>
  <div class="dgrid"><div class="dmain"><div class="kicker">{esc(v['id'])}</div><h1>{esc(v['topic'])}</h1>
    <div class="acts"><div class="decide big st" data-status="{v['sid']}">{''.join(f'<button data-v="{s}">{s}</button>' for s in ('確定使用', '要修改', '已上架'))}</div>
      <span class="stnow">目前：<b data-st-text="{v['sid']}">待確認</b></span></div>
    <div class="fixbox" data-fixbox="{v['sid']}" hidden><b>哪裡要改？</b><textarea data-note="{v['sid']}" placeholder="例：2:15 的圖示不對；口訣要改成……（Claude 會讀這裡去改）"></textarea></div>
    <div class="ytbox" data-ytbox="{v['sid']}"><b>YouTube 網址</b><input type="url" data-ytin="{v['sid']}" placeholder="上傳後貼上 https://youtu.be/…"><a data-yt target="_blank" hidden>▶ 開啟</a></div>
    <div class="checkbox"><b>上架清單</b>{chk}</div>{qa_html}</div>
  <aside class="dside"><dl>{dl}</dl><div class="extras"><b>檔案</b>{files}</div></aside></div>
  <nav class="pnav">{nav_}</nav></main>{footer()}{boot}<script src="series.js"></script></body></html>'''
        open(os.path.join(A, f'片_{v["sid"]}.html'), 'w', encoding='utf-8').write(page)

    alive = {f'片_{v["sid"]}.html' for v in V} | {f'區_{k}.html' for k, *_ in SECTIONS}
    for f in os.listdir(A):
        if f.endswith('.html') and f not in alive:
            os.remove(os.path.join(A, f))
    print(f'→ {subject}/展示網頁.html：成片 {len(V)} 支／大綱 {len(plan)} 節')
    return {'subject': subject, 'title': title, 'videos': len(V), 'total': len(plan), 'posters': [f'{subject}/展示網頁素材/{v["poster"]}' for v in V]}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('用法：python 產生系列展示網頁.py <科目資料夾>')
    build(sys.argv[1])
