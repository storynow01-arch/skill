"""頻道總覽：頻道資料夾（例 02_YT頻道影片/）最上層的 展示網頁.html，列出每一科（有 系列設定.md 的資料夾）的進度，
點進去就是那一科的展示網頁。同時重建每一科的展示網頁。
程式放在 <頻道資料夾>/_展示網頁/（建立系列展示網頁.py 會複製過去）。
用法：python 產生頻道總覽.py            （每節出片後 make_video 會自動跑）"""
import html, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from 產生系列展示網頁 import FONTS, VER, build, site_conf  # noqa: E402

esc = html.escape


def main():
    subs, idle = [], []
    for name in sorted(os.listdir(ROOT)):
        d = os.path.join(ROOT, name)
        if not os.path.isdir(d) or name.startswith(('_', '.')):
            continue
        if os.path.isfile(os.path.join(d, '系列設定.md')):
            info = build(d)
            st = os.path.join(d, '展示紀錄.json')
            s = json.load(open(st, encoding='utf-8')) if os.path.exists(st) else {}
            vals = list((s.get('狀態') or {}).values())
            info.update(up=vals.count('已上架'), ok=vals.count('確定使用'), fix=vals.count('要修改'))
            info['wait'] = info['videos'] - info['up'] - info['ok'] - info['fix']
            subs.append(info)
        else:
            idle.append(name)
    cards = ''
    for s in subs:
        cov = ''.join(f'<img src="{esc(p)}" alt="">' for p in s['posters'][:3]) or '<div class="none">還沒有成片</div>'
        cards += f'''<a class="subj-card" href="{esc(s['subject'])}/展示網頁.html"><div class="cov">{cov}</div><div class="sb">
  <div class="en">{esc(s['subject'])}</div><h3>{esc(s['title'].split('｜')[-1])}</h3>
  <div class="nums"><span><b>{s['videos']}</b>/ {s['total']} 節已成片</span><span><b>{s['wait']}</b>待確認</span><span><b>{s['fix']}</b>要修改</span><span><b>{s['up']}</b>已上架</span></div>
  <div class="progress"><i style="width:{s['videos'] / max(1, s['total']) * 100:.1f}%"></i><em style="width:{s['up'] / max(1, s['total']) * 100:.1f}%"></em></div></div></a>'''
    idle_html = ''.join(f'<span class="stcell no">{esc(n)}</span> ' for n in idle)
    tot_v, tot_up = sum(s['videos'] for s in subs), sum(s['up'] for s in subs)
    BRAND, SITE = site_conf()
    page = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(SITE)}｜頻道總覽</title>{FONTS}<link rel="stylesheet" href="_展示網頁/site.css?v={VER}"><link rel="stylesheet" href="_展示網頁/series.css?v={VER}"></head><body class="series">
<header class="top"><a class="brand" href="展示網頁.html"><b>{esc(BRAND)}</b><span>{esc(SITE)}</span></a><nav></nav></header>
<main class="wrap"><section class="phead"><div class="en">Channel Overview</div><h1>頻道總覽<small>{len(subs)} 科</small></h1>
<p>每一科的教學影片進度。點進去看那一科的成片、確認、上架狀態。已成片 {tot_v} 節、已上架 {tot_up} 節。</p></section>
<div class="subjects">{cards or '<p class="empty">還沒有科目（科目資料夾裡要有 系列設定.md）</p>'}</div>
{f'<div class="shead"><h2>還沒開始系列的資料夾</h2></div><p>{idle_html}</p>' if idle else ''}</main>
<footer class="foot"><span>頻道總覽</span><span>用「啟動展示網頁.bat」打開；每一節出片後會自動重建。</span></footer></body></html>'''
    open(os.path.join(ROOT, '展示網頁.html'), 'w', encoding='utf-8').write(page)
    print(f'→ 頻道總覽：{len(subs)} 科、已成片 {tot_v} 節、已上架 {tot_up} 節')


if __name__ == '__main__':
    main()
