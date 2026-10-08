"""修改紀錄：保留 AI 初稿與每次修改後的 storyboard，產出「AI 初稿 ↔ 最新版」對照（系列教學影片 乙2／乙4／乙13）。

YouTube 營利審核若判定「大量產製、低原創」，修改紀錄是申訴證據：證明內容經過教師依專業修改。

    python revision.py save storyboard.json --label AI初稿        # 乙2 寫完稿就存
    python revision.py save storyboard.json --label 審稿後          # 乙4 套用修改前後各存一次
    python revision.py report storyboard.json                      # 乙13 產出 修改紀錄/修改對照.md

存在 storyboard 同一層的 修改紀錄/，檔名 <序號>_<標籤>_<時間>.json。
"""
import argparse, datetime, difflib, glob, json, os, re, shutil, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def _dir(sb_path):
    return os.path.join(os.path.dirname(os.path.abspath(sb_path)), '修改紀錄')


def _snapshots(sb_path):
    return sorted(glob.glob(os.path.join(_dir(sb_path), '[0-9][0-9]_*.json')))


def save(sb_path, label):
    json.load(open(sb_path, encoding='utf-8'))          # 壞掉的 JSON 不存
    d = _dir(sb_path)
    os.makedirs(d, exist_ok=True)
    n = len(_snapshots(sb_path)) + 1
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    label = re.sub(r'[\\/:*?"<>|\s]+', '_', label)
    dst = os.path.join(d, f'{n:02d}_{label}_{stamp}.json')
    shutil.copy2(sb_path, dst)
    print(f'已存：{dst}')
    return dst


def _line_text(line):
    return line['text'] if isinstance(line, dict) else line


def _scenes(sb):
    return {s.get('id', f'#{i}'): s for i, s in enumerate(sb.get('scenes', []))}


def compare(old, new):
    """回傳 (逐場差異列表, 統計)。差異只看旁白文字與畫面 props，不看時間參數以外的格式。"""
    so, sn = _scenes(old), _scenes(new)
    rows, total, changed = [], 0, 0
    for sid in list(dict.fromkeys(list(so) + list(sn))):
        a, b = so.get(sid), sn.get(sid)
        la = [_line_text(x) for x in (a or {}).get('lines', [])]
        lb = [_line_text(x) for x in (b or {}).get('lines', [])]
        total += max(len(la), len(lb))
        ops = []
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=la, b=lb).get_opcodes():
            if tag == 'equal':
                continue
            changed += max(i2 - i1, j2 - j1)
            ops.append((tag, la[i1:i2], lb[j1:j2]))
        props_changed = a is not None and b is not None and a.get('props') != b.get('props')
        if a is None or b is None or ops or props_changed:
            rows.append({'id': sid, 'added': a is None, 'removed': b is None, 'ops': ops, 'props': props_changed})
    teacher = [s.get('id') for s in new.get('scenes', []) if s.get('teacher')]
    return rows, {'total': total, 'changed': changed, 'teacher': teacher}


def report(sb_path):
    snaps = _snapshots(sb_path)
    if not snaps:
        sys.exit('沒有修改紀錄：先跑 revision.py save storyboard.json --label AI初稿')
    first = json.load(open(snaps[0], encoding='utf-8'))
    latest = json.load(open(sb_path, encoding='utf-8'))
    rows, st = compare(first, latest)
    ratio = st['changed'] / st['total'] if st['total'] else 0
    teacher = '、'.join(st['teacher']) if st['teacher'] else '⚠ 沒有（場景加 "teacher": true 標記）'
    out = [f'# 修改對照：{latest.get("title", "")}', '',
           f'- AI 初稿：`{os.path.basename(snaps[0])}`',
           f'- 最新版：`{os.path.basename(sb_path)}`（共 {len(snaps)} 份紀錄）',
           f'- 旁白修改：{st["changed"]} / {st["total"]} 句（{ratio:.0%}）',
           f'- 老師提醒場景：{teacher}', '']
    if not rows:
        out.append('與 AI 初稿相同，沒有修改。')
    for r in rows:
        head = f'## {r["id"]}'
        if r['added']: head += '（新增場景）'
        if r['removed']: head += '（刪除場景）'
        if r['props']: head += '（畫面有改）'
        out.append(head)
        for tag, la, lb in r['ops']:
            for x in la: out.append(f'- ~~{x}~~')
            for x in lb: out.append(f'- **{x}**')
        out.append('')
    dst = os.path.join(_dir(sb_path), '修改對照.md')
    open(dst, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'旁白修改 {st["changed"]}/{st["total"]} 句（{ratio:.0%}）；老師提醒場景 {len(st["teacher"])} 個')
    print(f'報告：{dst}')
    return st


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('save'); s.add_argument('storyboard'); s.add_argument('--label', required=True)
    r = sub.add_parser('report'); r.add_argument('storyboard')
    a = ap.parse_args()
    save(a.storyboard, a.label) if a.cmd == 'save' else report(a.storyboard)


if __name__ == '__main__':
    main()
