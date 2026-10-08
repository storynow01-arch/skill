"""自動品檢：版面（瀏覽器內量測）＋旁白回聽（faster-whisper）＋成片（黑畫面、無聲、響度、長度）＋總覽圖 → qa_report.md

用法（在 Remotion 專案資料夾內，先跑過 build.py）：
    python <skill>/engine/scripts/qa.py                         # 版面＋旁白
    python <skill>/engine/scripts/qa.py --video out/x.mp4       # 再加成片檢查與總覽圖
    python <skill>/engine/scripts/qa.py --skip-layout --skip-asr --video out/x.mp4
結束碼：有「必修」問題 → 1，否則 0。
"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")   # cp950 主控台印 ⚠ 會當掉（2026-10-08）
import argparse, difflib, json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SR = 48000


def run(cmd, timeout=1800, **kw):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout, **kw)
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(cmd, 124, '', f'逾時 {timeout}s')


# ───────────── 1. 版面 ─────────────
def layout_check(spec, comp):
    frames = []
    for s in spec['scenes']:
        for r in (0.35, 0.7, 0.95):
            frames.append(s['from'] + int(s['dur'] * r))
    import shutil
    shutil.copy(os.path.join(HERE, 'qa_layout.mjs'), '.qa_layout.mjs')   # 放進專案，Node 才找得到專案的 @remotion 套件
    r = run(['node', '.qa_layout.mjs', ','.join(map(str, frames)), comp], shell=False)
    os.remove('.qa_layout.mjs')
    if r.returncode != 0 or not os.path.exists('qa_layout.json'):
        return [('必修', '版面', f'量測失敗：{(r.stderr or r.stdout)[-400:]}')]
    res = json.load(open('qa_layout.json', encoding='utf-8'))
    out = []
    by_scene = {s['id']: s for s in spec['scenes']}
    for item in res:
        f = item.get('frame', -1)
        sid = next((s['id'] for s in spec['scenes'] if s['from'] <= f < s['from'] + s['dur']), '?')
        for iss in item.get('issues', []):
            lvl = '必修' if iss['kind'] in ('超出畫面', '闖進字幕區', '文字超出圖形', '壓到 LOGO') else '建議'
            out.append((lvl, f'版面 {sid} @{f / spec["fps"]:.1f}s', f"{iss['kind']}：{iss['detail']}"))
    # 同一個問題在三個取樣點重複出現時只留一次
    seen, uniq = set(), []
    for o in out:
        k = (o[1].split(' @')[0], o[2])
        if k not in seen:
            seen.add(k); uniq.append(o)
    return uniq


# ───────────── 2. 旁白回聽 ─────────────
def asr_check(spec, threshold):
    lines = spec.get('voiceLines') or []
    if not lines or not spec.get('voice'):
        return [('資訊', '旁白', '沒有旁白，略過')]
    try:
        from faster_whisper import WhisperModel
        from pypinyin import lazy_pinyin
        from opencc import OpenCC
        from scipy.signal import resample_poly
    except ImportError as e:
        return [('建議', '旁白', f'缺套件 {e.name}：pip install faster-whisper pypinyin opencc-python-reimplemented')]
    with wave.open(os.path.join('public', spec['voice'])) as w:
        v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    model = WhisperModel('base', device='cpu', compute_type='int8')
    cc = OpenCC('t2s')
    NUM = re.compile(r'[0-9０-９.．\-~～零〇一二三四五六七八九十百千萬万億亿兩两點点到至]+')
    def norm(s):
        # 數字兩邊寫法不同（稿：一九二點一六八／四十二億；聽：192.168／42）→ 比對前一律拿掉，數字唸法由唸法規則保證
        s = cc.convert(s).lower()
        s = NUM.sub('', s)
        return [p for p in lazy_pinyin(re.sub(r'[^\w]', '', s)) if p.strip()]
    from build import to_speech
    out = []
    for ln in lines:
        seg = v[int(ln['from'] * SR): int(ln['to'] * SR) + int(0.15 * SR)]
        seg = resample_poly(seg, 1, 3).astype(np.float32)   # whisper 需要 16 kHz
        segs, _ = model.transcribe(seg, language='zh', beam_size=3, vad_filter=False)
        heard = ''.join(s.text for s in segs)
        a, b = norm(ln.get('say') or to_speech(ln['text'])), norm(heard)
        ratio = difflib.SequenceMatcher(None, a, b).ratio() if a else 1.0
        if ratio < threshold:
            out.append(('建議' if ratio > threshold - 0.15 else '必修', f"旁白 {ln['scene']}",
                        f"相似度 {ratio:.2f}｜稿：{ln['text']}｜聽到：{heard.strip()}"))
    if not out:
        out.append(('通過', '旁白', f'{len(lines)} 句全部相似度 ≥ {threshold}'))
    return out


# ───────────── 3. 成片 ─────────────
def video_check(spec, video, lead=0.0):
    out = []
    dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).stdout.strip() or 0)
    exp = spec['totalFrames'] / spec['fps'] + lead      # lead＝正片前接上的封面＋片頭秒數
    out.append(('通過' if abs(dur - exp) < 0.5 else '必修', '長度', f'{dur:.2f}s（預期 {exp:.2f}s）'))
    r = run(['ffmpeg', '-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.5:pix_th=0.06', '-af', 'silencedetect=n=-45dB:d=2.5,ebur128', '-f', 'null', '-'])
    log = r.stderr
    for m in re.finditer(r'black_start:([\d.]+) black_end:([\d.]+)', log):
        s, e = float(m.group(1)), float(m.group(2))
        if s > 1.0 and e < dur - 1.5:   # 開頭淡入、結尾淡出不算
            out.append(('必修', '黑畫面', f'{s:.1f}–{e:.1f}s'))
    for m in re.finditer(r'silence_start: ([\d.]+)', log):
        s = float(m.group(1))
        if 1.0 < s < dur - 3:
            out.append(('建議', '無聲', f'{s:.1f}s 起超過 2.5 秒沒有聲音'))
    lu = re.findall(r'I:\s+(-?[\d.]+) LUFS', log)
    if lu:
        L = float(lu[-1])
        out.append(('通過' if -16 <= L <= -12 else '建議', '響度', f'{L:.1f} LUFS（目標 −14；不符可用 loudnorm 只重編音訊）'))
    return out


def contact_sheet(spec, video, path='qa_contact.jpg'):
    from PIL import Image, ImageDraw
    tiles = []
    for s in spec['scenes']:
        t = (s['from'] + s['dur'] * 0.65) / spec['fps']
        png = f'_qa_{s["id"]}.png'
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', 'scale=480:270', png])
        if os.path.exists(png):
            im = Image.open(png).convert('RGB'); ImageDraw.Draw(im).rectangle([0, 0, 70, 26], fill=(0, 0, 0))
            ImageDraw.Draw(im).text((6, 6), s['id'], fill=(255, 255, 0)); tiles.append(im); os.remove(png)
    if not tiles: return None
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (480 * cols, 270 * rows))
    for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * 480, (i // cols) * 270))
    sheet.save(path, quality=85)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--video'); ap.add_argument('--comp', default='Video')
    ap.add_argument('--lead', type=float, default=0.0, help='成片前面接了封面＋片頭幾秒（長度檢查用）')
    ap.add_argument('--skip-layout', action='store_true'); ap.add_argument('--skip-asr', action='store_true')
    ap.add_argument('--asr-threshold', type=float, default=0.8)
    a = ap.parse_args()
    spec = json.load(open(os.path.join('src', 'data', 'spec.json'), encoding='utf-8'))
    rows = []
    if not a.skip_layout:
        print('① 版面量測…'); L = layout_check(spec, a.comp)
        rows += L or [('通過', '版面', '沒有重疊、溢出、超出畫面或闖進字幕區')]
    if not a.skip_asr:
        print('② 旁白回聽…'); rows += asr_check(spec, a.asr_threshold)
    sheet = None
    if a.video:
        print('③ 成片檢查…'); rows += video_check(spec, a.video, a.lead); sheet = contact_sheet(spec, a.video)
    must = [r for r in rows if r[0] == '必修']
    icon = {'必修': '❌', '建議': '⚠️', '通過': '✅', '資訊': 'ℹ️'}
    md = ['# 品檢報告', '', f"- 結果：**{'未通過（' + str(len(must)) + ' 項必修）' if must else '通過'}**",
          f"- 長度：{spec['totalFrames'] / spec['fps']:.1f}s，場景 {len(spec['scenes'])} 個", '']
    if sheet: md += [f'![總覽]({sheet})', '']
    md += ['| 等級 | 項目 | 內容 |', '|---|---|---|'] + [f'| {icon[r[0]]} {r[0]} | {r[1]} | {r[2]} |' for r in rows]
    open('qa_report.md', 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    print('\n'.join(md))
    sys.exit(1 if must else 0)


if __name__ == '__main__':
    main()
