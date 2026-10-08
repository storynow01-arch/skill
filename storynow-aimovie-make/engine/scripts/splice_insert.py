"""多範本結合（2026-10-08，從卡諾圖 2 的 splice.py 通用化）：把別的範本做的片段，插進主影片某個場景的開頭。

    python splice_insert.py <主專案> <主影片>.mp4 --insert S11=<片段>.mp4 [--insert S5=<另一段>.mp4 …] --out <成片>.mp4
                            [--fade 0.5] [--trim 0.45] [--force]

例：範本D 講觀念，在 S11 小測驗前插一段範本H「用電腦驗算」。
〔合併前品檢〕主影片和每個片段旁邊都要有「通過」的 <檔名>_品檢/final_qa.json（M.合併前品檢，擋）。
接法：場景交界切開，接點前後 --fade 秒交叉淡化（硬切會被最終品檢判「畫面突跳」）；片段頭尾 --trim 秒的淡入淡出黑場先剪掉
（範本片頭片尾的設計，插在中間會閃黑）；聲音最後過限幅器。
輸出：<成片>.mp4、<成片>.srt（主影片與片段的字幕依新時間軸重排）、<成片>_合併紀錄.json（給 final_qa/seam_check.py 查接點）。
下一步：python final_qa/seam_check.py <成片>.mp4 --no-chapters；python final_qa/final_qa.py <成片>.mp4 --lufs -14
"""
import argparse, json, os, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'final_qa'))
from qa_record import Recorder
from srt_tool import ts, caption_text


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True).stdout or 0)


def qa_ok(mp4):
    f = os.path.join(os.path.splitext(mp4)[0] + '_品檢', 'final_qa.json')
    if not os.path.exists(f):
        return f'找不到最終品檢紀錄 {f}'
    r = json.load(open(f, encoding='utf-8')).get('result')
    return None if r == '通過' else f'最終品檢沒過：{str(r)[:100]}'


def spec_near(mp4):
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(mp4))), 'src', 'data', 'spec.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def caps(spec, t0=0.0, t1=1e9, shift=0.0):
    if not spec:
        return []
    fps = spec.get('fps', 30)
    out = []
    for c in spec.get('captions', []):
        a, b = c['from'] / fps, c['to'] / fps
        if a >= t0 - 1e-6 and a < t1 and c.get('text', '').strip():
            out.append((a + shift, min(b, t1) + shift, caption_text(c['text'])))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project'); ap.add_argument('main'); ap.add_argument('--insert', action='append', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--fade', type=float, default=0.5)
    ap.add_argument('--trim', type=float, default=0.45); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    spec = json.load(open(os.path.join(a.project, 'src', 'data', 'spec.json'), encoding='utf-8'))
    fps, X, E = spec.get('fps', 30), a.fade, a.trim
    ins = []
    for x in a.insert:
        sid, path = x.split('=', 1)
        sc = next((s for s in spec['scenes'] if s['id'] == sid), None)
        if not sc:
            raise SystemExit(f'主影片沒有場景 {sid}（有：{"、".join(s["id"] for s in spec["scenes"])}）')
        ins.append((sc['from'] / fps, sid, path))
    ins.sort()
    rec = Recorder('M0 合併前品檢', os.path.join(os.path.dirname(os.path.abspath(a.out)) or '.', 'qa', '品檢紀錄'))
    for p in [a.main] + [p for _, _, p in ins]:
        why = qa_ok(p) if os.path.exists(p) else '找不到檔案'
        if why:
            rec.problem('M.合併前品檢', os.path.basename(p), why)
    if rec.finish() and not a.force:
        raise SystemExit('有影片沒過最終品檢，不接（先修好；真的要接加 --force）')
    # 主影片切成 段0｜片段1｜段1｜片段2｜…，相鄰兩段在接點交叉淡化 X 秒
    cuts = [c for c, _, _ in ins]
    pieces, inputs = [], ['-i', a.main]
    bounds = [0.0] + cuts + [dur(a.main)]
    for k in range(len(bounds) - 1):
        lo = bounds[k] - (X if k else 0)                     # 後面幾段多留 X 秒給交叉淡化
        pieces.append(('main', 0, lo, bounds[k + 1], None))
        if k < len(ins):
            inputs += ['-i', ins[k][2]]
            hd = dur(ins[k][2]) - 2 * E
            pieces.append(('insert', k + 1, E, E + hd, ins[k]))
    fc, labels = [], []
    for i, (kind, src, t0, t1, _) in enumerate(pieces):
        fc.append(f'[{src}:v]trim={t0:.3f}:{t1:.3f},setpts=PTS-STARTPTS,fps={fps},format=yuv420p,setsar=1[v{i}];'
                  f'[{src}:a]atrim={t0:.3f}:{t1:.3f},asetpts=PTS-STARTPTS,aresample=48000[a{i}]')
    vlab, alab, length, log, srt = 'v0', 'a0', pieces[0][3] - pieces[0][2], [], []
    log.append({'title': '主影片', 'start': 0.0, 'dur': round(length, 3), 'brand': False})
    srt += caps(spec, 0, pieces[0][3])
    for i in range(1, len(pieces)):
        kind, src, t0, t1, info = pieces[i]
        off = length - X
        fc.append(f'[{vlab}][v{i}]xfade=transition=fade:duration={X}:offset={off:.3f}[vx{i}];[{alab}][a{i}]acrossfade=d={X}[ax{i}]')
        vlab, alab = f'vx{i}', f'ax{i}'
        log.append({'title': f'插入 {info[1]}：{os.path.basename(info[2])}' if kind == 'insert' else '主影片（續）',
                    'start': round(off, 3), 'dur': round(t1 - t0, 3), 'brand': False})
        srt += caps(spec_near(info[2]), t0, t1, off - t0) if kind == 'insert' else caps(spec, t0 + X, t1, off - t0)
        length = off + (t1 - t0)
    fc.append(f'[{alab}]alimiter=limit=0.84:level=false[aout]')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(fc), '-map', f'[{vlab}]', '-map', '[aout]',
                    '-c:v', 'libx264', '-crf', '18', '-preset', 'ultrafast' if os.environ.get('QA_SELFTEST') else 'medium',
                    '-pix_fmt', 'yuv420p', '-r', str(fps), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', a.out], check=True)
    # AAC 編碼後真峰值會浮上來（2026-10-08 實測限幅 −1.5 dB 變 −0.8 dBTP）：量一次，超過 −1 就照 make_video 的做法重轉聲音
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', a.out, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    import re as _re
    pk = _re.findall(r'Peak:\s*(-?[\d.]+) dBFS', r)
    if pk and float(pk[-1]) > -1.0:
        tmp = a.out + '.tmp.mp4'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', a.out, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-2.5:LRA=11',
                        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], check=True)
        os.replace(tmp, a.out)
        print(f'  峰值 {pk[-1]} dBTP 超過 −1，聲音已用 TP −2.5 重轉')
    base = os.path.splitext(a.out)[0]
    total = dur(a.out)
    json.dump({'out': os.path.abspath(a.out), 'total': round(total, 3), 'lufs': -14.0, 'parts': log,
               'sources': [os.path.abspath(a.main)] + [os.path.abspath(p) for _, _, p in ins], 'forced': bool(rec.items)},
              open(base + '_合併紀錄.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    srt = sorted(x for x in srt if x[0] < total)
    with open(base + '.srt', 'w', encoding='utf-8-sig', newline='\r\n') as f:
        for i, (s0, s1, t) in enumerate(srt, 1):
            f.write(f'{i}\n{ts(s0)} --> {ts(min(s1, total))}\n{t}\n\n')
    for x in log:
        print(f'   {x["start"]:8.2f}s  +{x["dur"]:7.2f}s  {x["title"]}')
    print(f'✅ {a.out}（{total:.1f} 秒）；字幕 {len(srt)} 頁 → {base}.srt\n'
          f'   下一步：python <skill>/final_qa/seam_check.py {a.out} --no-chapters')


if __name__ == '__main__':
    main()
