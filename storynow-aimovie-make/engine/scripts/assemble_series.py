"""系列教學影片 丙1：把多支成片合併成一支長片（2026-10-08 從範本E assemble.py 移植，改成吃任何範本的成片）。

    python assemble_series.py --out <長片>.mp4 <成片1>.mp4 <成片2>.mp4 … [--title 章節1 --title 章節2 …]
                              [--brand <素材資料夾>] [--fit-minutes 30.5] [--lufs -14] [--force]

〔整集關 1〕每一支都要先過最終品檢：成片旁邊要有 <成片>_品檢/final_qa.json 且結果「通過」，否則停（M.合併前品檢）。
流程：（選用）封面 cover.jpg＋片頭 intro.mp4＋淡到第一支 → 各支正規化成同一組參數 → 串接 → 兩段式響度正規化。
--fit-minutes：超過就把句間 >0.7 秒的停頓縮到 0.45 秒（每支開頭 1.5 秒、換場前 0.6～後 0.9 秒不縮），再整體等比加速（不變調）。
輸出：<長片>.mp4、<長片>_合併紀錄.json（每支的起點與長度，給 seam_check.py）、<長片>_章節.txt（YouTube 章節時間軸）。
"""
import argparse, json, os, re, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'final_qa'))
from qa_record import Recorder

W, H, FPS = 1920, 1080, 30
COVER_SEC, FADE_SEC = 3.0, 0.6
VOPTS = ['-c:v', 'libx264', '-preset', 'ultrafast' if os.environ.get('QA_SELFTEST') else 'medium',   # 自我測試用快速編碼
         '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS)]
AOPTS = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
GAP_MIN, GAP_KEEP = 0.7, 0.45


def ff(*args):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *args])
    if r.returncode:
        raise SystemExit(f'ffmpeg 失敗：{" ".join(map(str, args[:10]))}…')


def dur(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def qa_passed(mp4):
    """成片的最終品檢紀錄：final_qa.py 預設輸出到 <成片>_品檢/final_qa.json"""
    f = os.path.join(os.path.splitext(mp4)[0] + '_品檢', 'final_qa.json')
    if not os.path.exists(f):
        return False, f'找不到最終品檢紀錄 {f}'
    r = json.load(open(f, encoding='utf-8')).get('result')
    return (True, '通過') if r == '通過' else (False, f'最終品檢沒過：{str(r)[:120]}')


def spec_of(mp4):
    """成片所屬專案的 spec.json（out/ 的上一層）：換場時間用來保護動畫，不縮"""
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(mp4))), 'src', 'data', 'spec.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def keep_spans(mp4):
    total = dur(mp4)
    protect, bounds = [(0.0, 1.5), (total - 1.0, total)], []
    sp = spec_of(mp4)
    if sp and abs(sp.get('totalFrames', 0) / sp.get('fps', 30) - total) < 1.5:
        fps = sp.get('fps', 30)
        bounds = [s['from'] / fps for s in sp.get('scenes', [])[1:]]
        protect += [(s['from'] / fps, (s['from'] + s['dur']) / fps) for s in sp.get('scenes', []) if s.get('type') in ('quiz', 'qaEnd')]
    r = subprocess.run(['ffmpeg', '-i', mp4, '-vn', '-af', f'silencedetect=noise=-38dB:d={GAP_MIN}', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    cuts = []
    for a, b in zip(st, en):
        if any(a < z1 and b > z0 for z0, z1 in protect):
            continue
        segs = [(a + 0.25, b - 0.2)]
        for t0 in bounds:
            w0, w1 = t0 - 0.6, t0 + 0.9
            segs = [y for (x0, x1) in segs for y in ([(x0, min(x1, w0)), (max(x0, w1), x1)] if x0 < w1 and x1 > w0 else [(x0, x1)])]
        cuts += [(x0, x1) for x0, x1 in segs if x1 - x0 > 0.1]
    keep, t = [], 0.0
    for a, b in sorted(cuts):
        keep.append((t, a)); t = b
    keep.append((t, total))
    return keep, sum(b - a for a, b in keep)


def norm_part(src, dst, keep=None, speed=1.0):
    vf = f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={FPS}'
    if not keep and speed == 1.0:
        ff('-i', src, '-vf', vf, *VOPTS, *AOPTS, dst)
        return
    expr = '+'.join(f'between(t,{a:.3f},{b:.3f})' for a, b in keep)
    ff('-i', src, '-vf', f"select='{expr}',setpts=N/FRAME_RATE/TB/{speed:.5f},{vf}",
       '-af', f"aselect='{expr}',asetpts=N/SR/TB,atempo={speed:.5f}", *VOPTS, *AOPTS, dst)


def brand_parts(brand, work, first_mp4):
    parts = []
    cover, intro = os.path.join(brand, 'cover.jpg'), os.path.join(brand, 'intro.mp4')
    if os.path.exists(cover):
        dst = os.path.join(work, 'cover.mp4')
        ff('-loop', '1', '-t', str(COVER_SEC), '-i', cover, '-f', 'lavfi', '-t', str(COVER_SEC), '-i', 'anullsrc=r=48000:cl=stereo',
           '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1', *VOPTS, *AOPTS, '-shortest', dst)
        parts.append(('封面', dst))
    if os.path.exists(intro):
        dst = os.path.join(work, 'intro.mp4')
        ff('-i', intro, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a', '-map', '0:a?',
           '-vf', f'scale={W}:-2:flags=lanczos,crop={W}:{H},setsar=1', *VOPTS, *AOPTS, '-shortest', dst)
        parts.append(('片頭', dst))
        last, fade = os.path.join(work, 'last.png'), os.path.join(work, 'fade.mp4')
        ff('-sseof', '-0.1', '-i', dst, '-frames:v', '1', last)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '1', '-i', first_mp4, '-frames:v', '1', '-vf', 'crop=iw/3:ih/5:0:0,scale=1:1',
                            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
        color = '0x%02x%02x%02x' % tuple(r.stdout[:3] or b'\x18\x18\x18')
        ff('-loop', '1', '-t', str(FADE_SEC), '-i', last, '-f', 'lavfi', '-t', str(FADE_SEC), '-i', 'anullsrc=r=48000:cl=stereo',
           '-vf', f'fade=t=out:st=0:d={FADE_SEC}:color={color},setsar=1', *VOPTS, *AOPTS, '-shortest', fade)
        parts.append(('過渡', fade))
    return parts


def loudnorm(src, dst, target):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-vn', '-af', f'loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
    af = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    ff('-i', src, '-c:v', 'copy', '-af', af, *AOPTS, '-movflags', '+faststart', dst)


def stamp(t):
    t = int(round(t))
    return f'{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}' if t >= 3600 else f'{t // 60}:{t % 60:02d}'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('parts', nargs='+'); ap.add_argument('--out', required=True)
    ap.add_argument('--title', action='append', default=[]); ap.add_argument('--brand')
    ap.add_argument('--fit-minutes', type=float, default=0); ap.add_argument('--lufs', type=float, default=-14.0)
    ap.add_argument('--force', action='store_true', help='合併前品檢沒過也合併（不建議；報告會記下）')
    a = ap.parse_args()
    if a.title and len(a.title) != len(a.parts):
        raise SystemExit(f'--title 有 {len(a.title)} 個，成片有 {len(a.parts)} 支，數量要一樣')
    base = os.path.splitext(a.out)[0]
    rec = Recorder('M0 合併前品檢', os.path.join(os.path.dirname(os.path.abspath(a.out)) or '.', 'qa', '品檢紀錄'))
    for p in a.parts:                                   # 〔整集關 1〕
        if not os.path.exists(p):
            rec.problem('M.合併前品檢', os.path.basename(p), '找不到成片')
            continue
        ok, why = qa_passed(p)
        if not ok:
            rec.problem('M.合併前品檢', os.path.basename(p), why)
    if rec.finish() and not a.force:
        raise SystemExit('有成片沒過最終品檢，不合併（先修好那一支；真的要合併加 --force）')
    work = base + '_work'
    os.makedirs(work, exist_ok=True)
    parts = brand_parts(a.brand, work, a.parts[0]) if a.brand else []
    plan, speed = {}, 1.0
    if a.fit_minutes:
        plan = {p: keep_spans(p) for p in a.parts}
        fixed = sum(dur(x) for _, x in parts)
        trimmed = sum(v[1] for v in plan.values())
        speed = max(1.0, trimmed / (a.fit_minutes * 60 - 3.0 - fixed))
        orig = sum(dur(p) for p in a.parts)
        print(f'縮停頓：{orig:.0f} → {trimmed:.0f} 秒；加速 ×{speed:.3f}' + ('　⚠ 超過 1.12，語速會明顯變快' if speed > 1.12 else ''))
    for i, p in enumerate(a.parts):
        title = a.title[i] if a.title else os.path.splitext(os.path.basename(p))[0]
        dst = os.path.join(work, f'part{i + 1:02d}.mp4')
        print(f'  第 {i + 1} 支：{title}…', flush=True)
        norm_part(p, dst, plan.get(p, (None,))[0], speed)
        parts.append((title, dst))
    lst = os.path.join(work, 'concat.txt')
    open(lst, 'w', encoding='utf-8').write(''.join(f"file '{os.path.abspath(x).replace(os.sep, '/')}'\n" for _, x in parts))
    raw = os.path.join(work, 'raw.mp4')
    ff('-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', raw)
    print('  響度正規化…', flush=True)
    loudnorm(raw, a.out, a.lufs)
    log, t = [], 0.0
    for title, x in parts:
        d = dur(x)
        log.append({'title': title, 'start': round(t, 3), 'dur': round(d, 3), 'brand': title in ('封面', '片頭', '過渡')})
        t += d
    total = dur(a.out)
    json.dump({'out': os.path.abspath(a.out), 'total': round(total, 3), 'lufs': a.lufs, 'speed': round(speed, 4),
               'sources': [os.path.abspath(p) for p in a.parts], 'parts': log, 'forced': bool(rec.items)},
              open(base + '_合併紀錄.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    chapters = [x for x in log if not x['brand']]
    if log[0]['brand']:                                  # 有封面片頭：YouTube 章節第一個一定要 0:00
        lines = ['0:00 開場'] + [f'{stamp(x["start"])} {x["title"]}' for x in chapters]
    else:
        lines = [f'0:00 {chapters[0]["title"]}'] + [f'{stamp(x["start"])} {x["title"]}' for x in chapters[1:]]
    open(base + '_章節.txt', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    for x in log:
        print(f'   {x["start"]:8.2f}s  +{x["dur"]:7.2f}s  {x["title"]}')
    print(f'✅ {a.out}（{total / 60:.2f} 分）\n   合併紀錄：{base}_合併紀錄.json\n   章節：{base}_章節.txt'
          f'\n   下一步：python <skill>/final_qa/seam_check.py {a.out}（整集品檢）')


if __name__ == '__main__':
    main()
