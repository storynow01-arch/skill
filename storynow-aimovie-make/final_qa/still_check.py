"""D4 畫面停太久（2026-10-08）：旁白一直在講、畫面卻超過 8 秒沒變——觀眾容易在這裡離開。只提醒（有時是刻意的，例如測驗思考）。

    python still_check.py <影片>.mp4 --spec src/data/spec.json [--lead 秒] [--sec 8] [--out qa/品檢紀錄]

ffmpeg freezedetect 找出畫面幾乎不變的段落，再看那段時間有沒有旁白（spec 的 voiceLines）：旁白佔七成以上才算。
"""
import argparse, json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder


def freezes(mp4, sec):
    r = subprocess.run(['ffmpeg', '-i', mp4, '-an', '-vf', f'scale=480:-2,freezedetect=n=-55dB:d={sec}', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    st = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', r)]
    en = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', r)]
    return list(zip(st, en + [None] * (len(st) - len(en))))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mp4'); ap.add_argument('--spec', required=True); ap.add_argument('--lead', type=float, default=0.0)
    ap.add_argument('--sec', type=float, default=8.0); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('D4 畫面停太久', a.out)
    spec = json.load(open(a.spec, encoding='utf-8'))
    talk = [(x['from'] + a.lead, x['to'] + a.lead) for x in spec.get('voiceLines', [])]
    scenes = [(s['from'] / spec.get('fps', 30) + a.lead, s['id']) for s in spec.get('scenes', [])]
    fr = freezes(a.mp4, a.sec)
    for s, e in fr:
        e = e if e is not None else s + a.sec
        spoken = sum(max(0, min(e, t1) - max(s, t0)) for t0, t1 in talk)
        if spoken >= 0.7 * (e - s):
            sid = next((i for t, i in reversed(scenes) if t <= s + 0.1), '?')
            rec.problem('D4.靜止', f'{sid} {s:.1f}～{e:.1f}s', f'畫面 {e - s:.1f} 秒沒變，旁白講了 {spoken:.1f} 秒（加一個會動的東西或拆成兩場）')
    rec.note(f'畫面停 ≥{a.sec:g} 秒的段落 {len(fr)} 處（只算旁白在講的）')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
