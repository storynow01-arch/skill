"""C1 SRT 字幕檔（2026-10-08）：從 spec.json 的字幕產生上傳 YouTube 用的 .srt，並檢查它和畫面上燒進去的字幕一模一樣。

    python srt_tool.py make  src/data/spec.json out/<成片>.srt [--lead 秒]      # 有封面片頭時，字幕整體往後移 lead 秒
    python srt_tool.py check src/data/spec.json out/<成片>.srt [--lead 秒] [--video out/<成片>.mp4] [--out qa/品檢紀錄]

為什麼要另外上傳：YouTube 沒有字幕檔時會用語音辨識自動產生，中文專業詞常聽錯（A bar、格雷碼）；
上傳正確的 SRT 會取代自動字幕，觀眾也能開自動翻譯。畫面上燒進去的字幕照樣保留（大多數人不開 CC）。
  C1.格式（擋）    編號、時間格式、時間遞增、不重疊、不超過影片長度
  C1.不一致（擋）  頁數、文字、時間（±1 格）和 spec 的字幕不同
"""
import argparse, json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder


def ts(sec):
    ms = int(round(sec * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def parse_ts(s):
    h, m, rest = s.split(':')
    sec, ms = rest.split(',')
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def caption_text(t):
    """畫面字幕用全形空白當停頓；SRT 一樣保留，只把連續空白收成一個"""
    return re.sub(r'[ \u3000]{2,}', '\u3000', t.strip())


def expected(spec, lead):
    fps = spec.get('fps', 30)
    return [(c['from'] / fps + lead, c['to'] / fps + lead, caption_text(c['text'])) for c in spec.get('captions', []) if c.get('text', '').strip()]


def make(spec, out, lead):
    rows = expected(spec, lead)
    with open(out, 'w', encoding='utf-8-sig', newline='\r\n') as f:   # YouTube 建議 UTF-8；BOM 讓 Windows 記事本也不亂碼
        for i, (a, b, t) in enumerate(rows, 1):
            f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n')
    print(f'✓ SRT {len(rows)} 頁 → {out}' + (f'（往後移 {lead:.2f} 秒：封面片頭）' if lead else ''))


def read_srt(path):
    blocks = re.split(r'\n\s*\n', open(path, encoding='utf-8-sig').read().replace('\r\n', '\n').strip())
    out = []
    for b in blocks:
        ln = b.split('\n')
        m = re.fullmatch(r'(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)', ln[1].strip()) if len(ln) >= 3 else None
        out.append((ln[0].strip(), m and parse_ts(m.group(1)), m and parse_ts(m.group(2)), '\n'.join(ln[2:]).strip(), b[:40]))
    return out


def check(spec, path, lead, video, rec):
    fps = spec.get('fps', 30)
    got, want = read_srt(path), expected(spec, lead)
    dur = None
    if video and os.path.exists(video):
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True)
        dur = float(r.stdout.strip() or 0)
    prev = 0.0
    for k, (no, a, b, t, raw) in enumerate(got, 1):
        if no != str(k) or a is None:
            rec.problem('C1.格式', f'第 {k} 頁', f'編號或時間格式錯：{raw!r}'); continue
        if b <= a: rec.problem('C1.格式', f'第 {k} 頁', f'結束 {ts(b)} 不晚於開始 {ts(a)}')
        if a < prev - 1e-3: rec.problem('C1.格式', f'第 {k} 頁', f'和上一頁重疊（{ts(a)} 早於上一頁結束 {ts(prev)}）')
        if dur and b > dur + 0.05: rec.problem('C1.格式', f'第 {k} 頁', f'超過影片長度 {dur:.2f} 秒')
        prev = b
    if len(got) != len(want):
        rec.problem('C1.不一致', '頁數', f'SRT {len(got)} 頁，畫面字幕 {len(want)} 頁')
    tol = 1 / fps + 0.002
    for k, ((_, a, b, t, _), (wa, wb, wt)) in enumerate(zip(got, want), 1):
        if a is None: continue
        if t != wt: rec.problem('C1.不一致', f'第 {k} 頁', f'SRT「{t[:20]}」≠ 畫面「{wt[:20]}」')
        if abs(a - wa) > tol or abs(b - wb) > tol:
            rec.problem('C1.不一致', f'第 {k} 頁', f'時間 {ts(a)}→{ts(b)}，畫面 {ts(wa)}→{ts(wb)}')
    rec.note(f'{len(got)} 頁' + (f'、影片 {dur:.1f} 秒' if dur else ''))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['make', 'check']); ap.add_argument('spec'); ap.add_argument('srt')
    ap.add_argument('--lead', type=float, default=0.0); ap.add_argument('--video'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding='utf-8'))
    if a.cmd == 'make':
        make(spec, a.srt, a.lead); return
    rec = Recorder('C1 SRT 字幕檔', a.out)
    check(spec, a.srt, a.lead, a.video, rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
