"""品檢總表（2026-10-08）：彙整 qa/品檢紀錄/ 裡每一項品檢的結果、例外與耗時，加上製作各步驟的耗時。

    python qa_summary.py [qa/品檢紀錄] [--title 影片名稱]

輸出：<資料夾>/品檢總表.md、品檢總表.html。耗時另讀 _耗時.json（make_video.py 寫的：每一步花幾秒）。
"""
import argparse, html, json, os, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MARK = {'擋': '✗ 擋', '提醒': '⚠ 提醒', '通過': '✓ 通過'}


def load(d):
    recs, steps = [], []
    for f in sorted(os.listdir(d)):
        p = os.path.join(d, f)
        if f == '_耗時.json':
            steps = json.load(open(p, encoding='utf-8'))
        elif f.endswith('.json'):
            recs.append(json.load(open(p, encoding='utf-8')))
    return recs, steps


def build(d, title):
    recs, steps = load(d)
    total_qa = sum(r['seconds'] for r in recs)
    total_all = sum(s['seconds'] for s in steps)
    blocked = [r for r in recs if r['result'] == '擋']
    md = [f'# 品檢總表：{title}', '',
          f'- 結果：**{"未通過（" + str(len(blocked)) + " 項擋下）" if blocked else "通過"}**',
          f'- 品檢合計 {total_qa:.0f} 秒' + (f'；整支製作 {total_all / 60:.1f} 分鐘（品檢佔 {total_qa / total_all:.0%}）' if total_all else ''), '',
          '## 各項品檢', '', '| 品檢 | 結果 | 擋 | 提醒 | 例外 | 耗時 |', '|---|---|--:|--:|--:|--:|']
    md += [f"| {r['name']} | {MARK[r['result']]} | {len(r['block'])} | {len(r['warn'])} | {len(r['exempt'])} | {r['seconds']:.1f}s |" for r in recs]
    for r in recs:
        rows = [('✗', x) for x in r['block']] + [('⚠', x) for x in r['warn']]
        if rows or r['exempt']:
            md += ['', f"### {r['name']}", '']
            md += [f"- {m} [{x['code']}] {x['where']}：{x['msg']}" for m, x in rows]
            md += [f"- ℹ 例外 [{x['code']}] {x['where']}：{x['reason']}" for x in r['exempt']]
    if steps:
        md += ['', '## 製作各步驟耗時', '', '| 步驟 | 耗時 | 佔比 |', '|---|--:|--:|']
        md += [f"| {s['step']} | {s['seconds']:.0f}s | {s['seconds'] / total_all:.0%} |" for s in steps]
    out_md = os.path.join(d, '品檢總表.md')
    open(out_md, 'w', encoding='utf-8').write('\n'.join(md))
    # HTML：同一份內容，表格好讀
    body, in_table = [], False
    for ln in md:
        if ln.startswith('|'):
            cells = [c.strip() for c in ln.strip('|').split('|')]
            if set(''.join(cells)) <= set('-: '):
                continue
            tag = 'th' if not in_table else 'td'
            if not in_table: body.append('<table>'); in_table = True
            body.append('<tr>' + ''.join(f'<{tag}>{html.escape(c).replace("**", "")}</{tag}>' for c in cells) + '</tr>')
            continue
        if in_table: body.append('</table>'); in_table = False
        if ln.startswith('# '): body.append(f'<h1>{html.escape(ln[2:])}</h1>')
        elif ln.startswith('## '): body.append(f'<h2>{html.escape(ln[3:])}</h2>')
        elif ln.startswith('### '): body.append(f'<h3>{html.escape(ln[4:])}</h3>')
        elif ln.startswith('- '): body.append(f'<p>{html.escape(ln[2:]).replace("**", "")}</p>')
    if in_table: body.append('</table>')
    css = ('body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;max-width:960px;margin:24px auto;padding:0 16px;color:#222}'
           'table{border-collapse:collapse;width:100%;margin:8px 0 20px}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}'
           'th{background:#f2f2f2}h2{margin-top:28px}')
    open(os.path.join(d, '品檢總表.html'), 'w', encoding='utf-8').write(
        f'<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>品檢總表</title><style>{css}</style>' + '\n'.join(body))
    print('\n'.join(md[:4]))
    print(f'→ {out_md}')
    return 1 if blocked else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('dir', nargs='?', default='qa/品檢紀錄'); ap.add_argument('--title', default='')
    a = ap.parse_args()
    sys.exit(build(a.dir, a.title))


if __name__ == '__main__':
    main()
