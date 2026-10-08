"""F1 系列一致性（2026-10-08）：系列裡每一支都要和樣片（甲5）長得像同一個系列。

    python series_check.py <成片>.mp4 --template D --make-ref <科目>/qa_reference/series_ref.json [--spec src/data/spec.json]
    python series_check.py <成片>.mp4 --template D --ref <科目>/qa_reference/series_ref.json [--spec …] [--out qa/品檢紀錄]

F1.規格（擋）    解析度、影格率、影音編碼、取樣率、範本代號、有沒有 LOGO、有沒有封面片頭和樣片不同
F1.風格（提醒後擋）整集響度差 >1 LU；整體配色（均勻取 24 格的色相＋彩度＋亮度分布）和樣片的距離太大
"""
import argparse, json, os, re, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

COLOR_LIMIT = 0.35     # 配色分布距離上限（Hellinger，0＝一模一樣、1＝完全不同）；2026-10-08 校正值見 README


def probe(mp4):
    r = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4],
                                  capture_output=True, text=True, encoding='utf-8').stdout)
    v = next((s for s in r['streams'] if s['codec_type'] == 'video'), {})
    a = next((s for s in r['streams'] if s['codec_type'] == 'audio'), {})
    return {'size': f"{v.get('width')}x{v.get('height')}", 'fps': v.get('r_frame_rate'), 'vcodec': v.get('codec_name'),
            'acodec': a.get('codec_name'), 'ar': a.get('sample_rate'), 'dur': float(r['format'].get('duration', 0))}


def loudness(mp4):
    t = subprocess.run(['ffmpeg', '-nostats', '-i', mp4, '-vn', '-af', 'ebur128', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    m = re.search(r'I:\s+(-?[\d.]+) LUFS', t[t.rfind('Summary:'):])
    return float(m.group(1)) if m else None


def palette(mp4, dur, n=24):
    """均勻取 n 格（避開頭尾 5%）→ HSV 的 色相 12 格 × 彩度 3 格 × 亮度 3 格 分布"""
    hist = np.zeros(12 * 3 * 3)
    for k in range(n):
        t = dur * (0.05 + 0.9 * k / (n - 1))
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', mp4, '-frames:v', '1', '-vf', 'scale=96:54',
                              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        if len(raw) < 96 * 54 * 3:
            continue
        x = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(float) / 255
        mx, mn = x.max(1), x.min(1)
        d = mx - mn + 1e-9
        r, g, b = x.T
        h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
        s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0)
        hi, si, vi = np.minimum((h * 12).astype(int), 11), np.minimum((s * 3).astype(int), 2), np.minimum((mx * 3).astype(int), 2)
        np.add.at(hist, hi * 9 + si * 3 + vi, 1)
    return (hist / max(hist.sum(), 1)).tolist()


def measure(mp4, template, spec_path):
    p = probe(mp4)
    spec = json.load(open(spec_path, encoding='utf-8')) if spec_path and os.path.exists(spec_path) else {}
    brand = spec.get('brand') or {}
    return {'template': template, 'size': p['size'], 'fps': p['fps'], 'vcodec': p['vcodec'], 'acodec': p['acodec'], 'ar': p['ar'],
            'logo': bool(brand.get('logo')), 'cover_intro': bool(brand.get('cover') or brand.get('intro')),
            'lufs': loudness(mp4), 'palette': palette(mp4, p['dur'])}


def compare(cur, ref, rec):
    names = {'template': '範本', 'size': '解析度', 'fps': '影格率', 'vcodec': '影像編碼', 'acodec': '聲音編碼', 'ar': '取樣率',
             'logo': 'LOGO', 'cover_intro': '封面片頭'}
    for k, label in names.items():
        if cur.get(k) != ref.get(k):
            rec.problem('F1.規格', label, f'樣片 {ref.get(k)} → 這支 {cur.get(k)}')
    if cur.get('lufs') is not None and ref.get('lufs') is not None:
        d = cur['lufs'] - ref['lufs']
        msg = f'樣片 {ref["lufs"]:.1f} → 這支 {cur["lufs"]:.1f} LUFS（差 {d:+.1f}）'
        rec.problem('F1.風格', '響度', msg) if abs(d) > 1.0 else rec.note(f'響度：{msg}')
    a, b = np.array(cur['palette']), np.array(ref['palette'])
    dist = float(np.sqrt(max(0.0, 1 - np.sum(np.sqrt(a * b)))))
    msg = f'和樣片的配色距離 {dist:.2f}（上限 {COLOR_LIMIT}）'
    rec.problem('F1.風格', '配色', msg + '——畫面整體色調和樣片不像同一個系列') if dist > COLOR_LIMIT else rec.note(f'配色：{msg}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mp4'); ap.add_argument('--template', required=True); ap.add_argument('--spec')
    ap.add_argument('--ref'); ap.add_argument('--make-ref'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    cur = measure(a.mp4, a.template, a.spec)
    if a.make_ref:
        os.makedirs(os.path.dirname(os.path.abspath(a.make_ref)), exist_ok=True)
        json.dump({**cur, 'from': os.path.abspath(a.mp4)}, open(a.make_ref, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'✓ 系列樣片基準 → {a.make_ref}（範本 {cur["template"]}、{cur["size"]}、{cur["lufs"]} LUFS）')
        return
    rec = Recorder('F1 系列一致性', a.out)
    if not a.ref or not os.path.exists(a.ref):
        rec.note('沒有系列樣片基準（--ref），跳過；樣片定案後用 --make-ref 建一次')
    else:
        compare(cur, json.load(open(a.ref, encoding='utf-8')), rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
