"""取代範本E 的驗收（2026-10-08）：用範本E qa/selftest.py「同一套做壞方法」，做壞一支系列影片，交給系列品檢實際跑。

    python acceptance_e.py <專案資料夾>      # 專案要有 out/ 的成片、src/data/spec.json、storyboard.json

範本E 的 22 項：影片層 7（黑畫面、中段無聲、響度差 10 dB、凍結 6 秒、單格突跳、字幕閃 1 格、字幕抖動）、
字幕資料層 5（句尾標點、唸法殘留、以「的」開頭、超過 18 字、和稿子不符）、同步層 2（物件沒對旁白、講完又循環）、
版面層 8（超出畫面、標題過長、圖塊重疊、對比不足、版面偏移、間距過小、畫面空白、詞中斷行）——版面層另見 README。
每一項：正常版要「沒事」、做壞版要「被抓到」，兩個都對才算有效。結果寫到 <專案>/qa/驗收_範本E.md。
"""
import copy, glob, json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from pathlib import Path
from final_report import spec_checks

PY = sys.executable
CLIP = 60.0
RESULTS = []


def ff(*args):
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        raise SystemExit(r.stderr[-400:])


def fq(mp4, work):
    out = os.path.join(work, os.path.basename(mp4) + '_品檢')
    subprocess.run([PY, os.path.join(HERE, 'final_qa.py'), mp4, '--lufs', '-14', '--out', out], capture_output=True)
    return json.load(open(os.path.join(out, 'final_qa.json'), encoding='utf-8'))


def record(layer, name, before, after, ok, how):
    RESULTS.append((layer, name, before, after, ok, how))
    print(f'{"✓" if ok else "✗"} [{layer}] {name:<16} 正常版 {before!s:>8}   做壞版 {after!s:>8}   （{how}）', flush=True)


def video_layer(mp4, spec, work):
    base = os.path.join(work, 'base.mp4')
    ff('-i', mp4, '-t', str(CLIP), '-c', 'copy', base)
    fps = spec.get('fps', 30)
    caps = [c for c in spec['captions'] if c['to'] < (CLIP - 1) * fps]
    # 連續兩頁的交界（下一頁正好接著開始）：這一格字幕消失才是「閃一下」，兩頁中間本來就空的不算（同範本E）
    boundary = next(c['to'] for i, c in enumerate(caps[:-1]) if caps[i + 1]['from'] == c['to'] and c['to'] > 300)
    pg = max(caps, key=lambda c: c['to'] - c['from'])
    R0 = fq(base, work)
    cases = [
        ('黑畫面', ['-vf', "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,20,20.6)'", '-c:a', 'copy'],
         lambda R: len(R['F3']), 'final_qa F3'),
        ('中段無聲', ['-af', "volume=0:enable='between(t,25,28)'", '-c:v', 'copy'],
         lambda R: len([x for x in R['F7'] if x not in R.get('F7_designed', [])]), 'final_qa F7'),
        ('響度差 10 dB', ['-af', 'volume=-10dB', '-c:v', 'copy'], lambda R: 0 if R['F6']['ok'] else 1, 'final_qa F6'),
        ('凍結 6 秒', ['-vf', 'loop=loop=180:size=1:start=900,setpts=N/FRAME_RATE/TB,trim=0:60', '-af', 'atrim=0:60'],
         lambda R: R['F4']['max_still'], 'final_qa F4（參考值，範本E 也只列數值）'),
        ('單格突跳', ['-filter_complex', "[0:v]split[m][s];[s]crop=1920:700:0:160[c];[m][c]overlay=x=0:y=200:enable='eq(n,600)'", '-c:a', 'copy'],
         lambda R: R['F11']['count'], 'final_qa F11'),
        # 範本E 用深色底蓋字幕帶；範本D 是淺灰紙面，改用紙色蓋掉一格＝字幕消失一格
        ('字幕閃 1 格', ['-vf', f"drawbox=x=0:y=930:w=iw:h=90:color=0xececee:t=fill:enable='eq(n,{boundary})'", '-c:a', 'copy'],
         lambda R: R['F1']['count'], 'final_qa F1'),
        ('字幕抖動', ['-filter_complex', f"[0:v]split[m][s];[s]crop=1920:90:0:930[band];[m][band]overlay=x=12:y=930:enable='between(n,{pg['from'] + 6},{pg['to'] - 6})*not(mod(n,4))'", '-c:a', 'copy'],
         lambda R: R['F2']['count'], 'final_qa F2'),
    ]
    for name, args, measure, how in cases:
        bad = os.path.join(work, f'bad_{len(RESULTS)}.mp4')
        ff('-i', base, *args, bad)
        b, a = measure(R0), measure(fq(bad, work))
        ok = (a >= 5.5 and a > b) if name == '凍結 6 秒' else (b == 0 and a > 0)
        record('影片', name, b, a, ok, how)


def data_layer(spec_path, work):
    spec = json.load(open(spec_path, encoding='utf-8'))
    p0 = os.path.join(work, 'spec_base.json'); json.dump(spec, open(p0, 'w', encoding='utf-8'), ensure_ascii=False)
    G0 = spec_checks(Path(p0))

    def case(name, mutate, pick, how):
        s2 = copy.deepcopy(spec); mutate(s2)
        p = os.path.join(work, f'spec_{len(RESULTS)}.json'); json.dump(s2, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        b, a = pick(G0), pick(spec_checks(Path(p)))
        ok = (b is True and a is False) if isinstance(b, bool) else (b == 0 and a > 0)
        record('字幕', name, b, a, ok, how)
    c = spec['captions']
    case('句尾標點', lambda d: [x.update(text=x['text'] + '。') for x in d['captions'][:5]], lambda G: G['G1']['end'], 'G1')
    case('唸法殘留', lambda d: d['captions'][3].update(text='D N S 查不到'), lambda G: G['G5']['count'], 'G5')
    case('以「的」開頭', lambda d: d['captions'][6].update(text='的' + d['captions'][6]['text']), lambda G: G['G6']['count'], 'G6')
    case('超過 18 字', lambda d: d['captions'][4].update(text='這一頁字幕故意寫得非常非常長超過了規範的十八個字上限'), lambda G: G['G2']['over18'], 'G2')
    case('和稿子不符', lambda d: d['captions'][7].update(text='這一句被改掉了'), lambda G: G['G3']['match'], 'G3')


def sync_layer(proj, work):
    """物件沒對旁白 → build.py 的文不對題關卡（不配音建置，看 qa/text_check.json）"""
    cp = os.path.join(work, 'proj'); os.makedirs(cp)
    for f in ('storyboard.json', 'package.json', 'tsconfig.json'):
        if os.path.exists(os.path.join(proj, f)): shutil.copy(os.path.join(proj, f), cp)
    shutil.copytree(os.path.join(proj, 'src'), os.path.join(cp, 'src'))
    os.makedirs(os.path.join(cp, 'public'), exist_ok=True)
    sb = json.load(open(os.path.join(cp, 'storyboard.json'), encoding='utf-8'))

    def issues(story):
        json.dump(story, open(os.path.join(cp, 'storyboard.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        subprocess.run([PY, os.path.join(HERE, '..', 'engine', 'scripts', 'build.py'), 'storyboard.json', '--no-tts', '--no-music'],
                       cwd=cp, capture_output=True)
        return len(json.load(open(os.path.join(cp, 'qa', 'text_check.json'), encoding='utf-8')).get('文不對題', []))
    base = copy.deepcopy(sb)
    first = json.load(open(os.path.join(cp, 'qa', 'text_check.json'), encoding='utf-8')) if issues(base) else {}
    for s in base['scenes']:                       # 正常版本身就有的文不對題先標成刻意（只驗「新弄壞的」有沒有被抓到）
        if any(t.startswith(s['id'] + '：') for t in first.get('文不對題', [])):
            s['allowStatic'] = True
    b = issues(base)
    bad = copy.deepcopy(base)
    tgt = next(s for s in bad['scenes'] if s['type'] in ('cards', 'quiz', 'recap') and not s.get('allowStatic'))
    walk = [tgt['props']]
    while walk:                                     # 把那一場第一個畫面文字換成旁白沒講的話
        o = walk.pop()
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, str) and k in ('title', 'text', 'label', 'question') and len(v) > 1:
                    o[k] = '旁白完全沒提到的一句話'; walk = []; break
                walk.append(v)
        elif isinstance(o, list):
            walk += o
    a = issues(bad)
    record('同步', '物件沒對旁白', b, a, b == 0 and a > 0, f'build.py 文不對題（{tgt["id"]}）')
    RESULTS.append(('同步', '講完又循環', '—', '—', None, '不適用：範本E 的焦點輪播動畫 2026-10-03 已移除，範本 A～H 沒有循環動畫'))
    print('— [同步] 講完又循環  不適用（範本E 自己的焦點輪播；範本 A～H 沒有）')


def main():
    proj = os.path.abspath(sys.argv[1])
    mp4 = max(glob.glob(os.path.join(proj, 'out', '*.mp4')), key=os.path.getmtime)
    spec_path = os.path.join(proj, 'src', 'data', 'spec.json')
    spec = json.load(open(spec_path, encoding='utf-8'))
    work = tempfile.mkdtemp(prefix='accept_e_')
    try:
        video_layer(mp4, spec, work)
        data_layer(spec_path, work)
        sync_layer(proj, work)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    valid = [r for r in RESULTS if r[4] is not None]
    n = sum(1 for r in valid if r[4])
    md = ['# 取代範本E 的驗收（影片層、字幕層、同步層）', '', f'影片：{os.path.basename(mp4)}', '',
          f'**{n}/{len(valid)} 項有效**（另 {len(RESULTS) - len(valid)} 項不適用）', '',
          '| 層 | 範本E 的項目 | 正常版 | 做壞版 | 有效 | 系列品檢由誰抓 |', '|---|---|--:|--:|:-:|---|']
    md += [f'| {l} | {nm} | {b} | {a} | {"✓" if ok else ("—" if ok is None else "✗")} | {how} |' for l, nm, b, a, ok, how in RESULTS]
    os.makedirs(os.path.join(proj, 'qa'), exist_ok=True)
    open(os.path.join(proj, 'qa', '驗收_範本E.md'), 'w', encoding='utf-8').write('\n'.join(md))
    print(f'\n驗收：{n}/{len(valid)} 項有效 → {os.path.join(proj, "qa", "驗收_範本E.md")}')
    sys.exit(0 if n == len(valid) else 1)


if __name__ == '__main__':
    main()
