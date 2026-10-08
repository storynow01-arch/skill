"""系列教學影片 丙2：整集品檢（2026-10-08）——對合併後的長片再量一次合併才會帶進來的問題。

    python seam_check.py <長片>.mp4 [--minutes 15,25] [--lufs -14] [--out qa/品檢紀錄]

讀 assemble_series.py 寫的 <長片>_合併紀錄.json（每支的起點）與 <長片>_章節.txt。
  M.長度  總長度在 --minutes 範圍內；也要等於各支加總（差 >1 秒＝合併時掉了東西）
  M.響度  整集響度在目標 ±1 LU、真峰值 ≤ −1 dBTP
  M.接縫  每個接點前後 1.5 秒：黑畫面 ≥0.5 秒、無聲跨過接點 ≥2.5 秒、接點 ±0.4 秒的爆音（20 毫秒的尖峰比前後都高 12 dB 以上、馬上掉回去）；
          前一支結尾和下一支開頭的說話音量落差 >3 dB
  M.章節  YouTube 章節規則：第一個 0:00、至少 3 個、時間遞增、每段 ≥10 秒、每個章節對到某一支的實際開頭（±1 秒）
範本E 的整集檢查（E3）是整片掃黑畫面與無聲；這裡改成專看每個接點，並加上爆音、音量落差、章節。
其他畫面問題（字幕閃爍、突跳、黑畫面）照樣用 final_qa.py 對長片跑一次。
"""
import argparse, json, os, re, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SR = 16000


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')


def duration(p):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).stdout.strip() or 0)


def loudness(p):
    t = run(['ffmpeg', '-nostats', '-i', p, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    t = t[t.rfind('Summary:'):]
    g = lambda pat: float(m.group(1)) if (m := re.search(pat, t, re.S)) else None
    return g(r'I:\s+(-?[\d.]+) LUFS'), g(r'Peak:\s+(-?[\d.]+) dBFS')


def audio(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def blacks(p, t0, t1):
    t = run(['ffmpeg', '-ss', f'{max(0, t0):.3f}', '-t', f'{t1 - max(0, t0):.3f}', '-i', p, '-an', '-vf',
             'blackdetect=d=0.5:pix_th=0.08:pic_th=0.98', '-f', 'null', '-']).stderr
    return [(float(a) + max(0, t0), float(b) + max(0, t0)) for a, b in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', t)]


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


def speech_level(x):
    """說話段的音量：只取 50 毫秒窗裡比最大值低 30 dB 以內的（排除停頓）"""
    if len(x) < SR // 2:
        return None
    w = SR // 20
    r = np.array([db(x[i:i + w]) for i in range(0, len(x) - w, w)])
    r = r[r > r.max() - 30]
    return float(np.median(r)) if len(r) else None


def check_seams(mp4, parts, x, rec):
    joins = [p['start'] for p in parts[1:]]
    names = [p['title'] for p in parts]
    for k, t in enumerate(joins, 1):
        where = f'接點 {k}（{names[k - 1]} → {names[k]}，{t:.1f}s）'
        for a, b in blacks(mp4, t - 1.5, t + 1.5):
            rec.problem('M.接縫', where, f'黑畫面 {a:.2f}～{b:.2f}s（{b - a:.2f} 秒）')
        i = int(t * SR)
        seg = x[max(0, i - int(1.5 * SR)): i + int(1.5 * SR)]
        w = SR // 50
        env = np.array([np.abs(seg[j:j + w]).max() for j in range(0, len(seg) - w, w)]) + 1e-6
        loud = 20 * np.log10(env)
        # 無聲跨過接點：接點附近連續低於 −45 dBFS 的長度
        quiet = loud < -45
        mid = len(quiet) // 2
        lo = hi = mid
        while lo > 0 and quiet[lo - 1]: lo -= 1
        while hi < len(quiet) and quiet[hi]: hi += 1
        if quiet[mid] and (hi - lo) * w / SR >= 2.5:
            rec.problem('M.接縫', where, f'接點前後無聲 {(hi - lo) * w / SR:.1f} 秒（像斷掉）')
        # 爆音：接點 ±0.4 秒內，「突然一下、馬上掉回去」的尖峰——比前 3 格與後 3～8 格的中位數都高 12 dB
        # （2026-10-08 實測：下一支開場配樂從無聲直接進來、之後持續同音量，是正常開場，不能算爆音）
        c, r = mid, int(0.4 * SR / w)
        for j in range(max(3, c - r), min(len(loud) - 8, c + r)):
            before, after = np.median(loud[j - 3:j]), np.median(loud[j + 3:j + 8])
            if loud[j] > -20 and loud[j] - before > 12 and loud[j] - after > 12:
                rec.problem('M.接縫', where, f'爆音：{j * w / SR - 1.5:+.2f}s 處尖峰比前後高 {loud[j] - max(before, after):.0f} dB')
                break
        # 音量落差：前一支最後 10 秒 vs 下一支最初 10 秒的說話音量
        a = speech_level(x[max(0, i - 10 * SR): i])
        b = speech_level(x[i: i + 10 * SR])
        if a is not None and b is not None and abs(a - b) > 3:
            rec.problem('M.接縫', where, f'前後音量落差 {b - a:+.1f} dB（上限 ±3）')


def check_chapters(path, parts, total, rec):
    if not os.path.exists(path):
        rec.problem('M.章節', '章節', f'找不到 {path}')
        return
    rows = []
    for ln in open(path, encoding='utf-8').read().splitlines():
        m = re.match(r'\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)', ln)
        if m:
            h, mm, ss, title = m.groups()
            rows.append((int(h or 0) * 3600 + int(mm) * 60 + int(ss), title.strip()))
    if not rows or rows[0][0] != 0:
        rec.problem('M.章節', '第一個章節', 'YouTube 規定第一個章節要從 0:00 開始')
    if len(rows) < 3:
        rec.problem('M.章節', '章節數', f'只有 {len(rows)} 個，YouTube 至少要 3 個才會顯示章節')
    starts = [p['start'] for p in parts if not p.get('brand')]
    for k, (t, title) in enumerate(rows):
        nxt = rows[k + 1][0] if k + 1 < len(rows) else total
        if nxt <= t:
            rec.problem('M.章節', title, '時間沒有遞增')
        elif nxt - t < 10:
            rec.problem('M.章節', title, f'這一段只有 {nxt - t:.0f} 秒，YouTube 每段至少 10 秒')
        if t > 0 and not any(abs(t - s) <= 1.0 for s in starts):
            rec.problem('M.章節', title, f'{t} 秒對不到任何一支的開頭')
        if t >= total:
            rec.problem('M.章節', title, '超過影片長度')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mp4'); ap.add_argument('--minutes'); ap.add_argument('--lufs', type=float)
    ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    base = os.path.splitext(a.mp4)[0]
    log = json.load(open(base + '_合併紀錄.json', encoding='utf-8'))
    parts, target = log['parts'], a.lufs if a.lufs is not None else log.get('lufs', -14.0)
    rec = Recorder('M 整集品檢', a.out)
    total = duration(a.mp4)
    if a.minutes:
        lo, hi = map(float, a.minutes.split(','))
        if not lo <= total / 60 <= hi:
            rec.problem('M.長度', '總長度', f'{total / 60:.2f} 分，不在 {lo:g}～{hi:g} 分')
    expect = sum(p['dur'] for p in parts)
    if abs(total - expect) > 1.0:
        rec.problem('M.長度', '總長度', f'{total:.1f} 秒，各支加總 {expect:.1f} 秒（差 {total - expect:+.1f}）')
    I, tp = loudness(a.mp4)
    if I is None or abs(I - target) > 1.0:
        rec.problem('M.響度', '整集響度', f'{I} LUFS（目標 {target}±1）')
    if tp is None or tp > -1.0:
        rec.problem('M.響度', '真峰值', f'{tp} dBTP（上限 −1）')
    x = audio(a.mp4)
    check_seams(a.mp4, parts, x, rec)
    check_chapters(base + '_章節.txt', parts, total, rec)
    rec.note(f'總長 {total / 60:.2f} 分、響度 {I} LUFS、峰值 {tp} dBTP、接點 {len(parts) - 1} 個')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
