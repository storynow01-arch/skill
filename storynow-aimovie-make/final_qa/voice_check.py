"""B1 聲音一致性（2026-10-08）：系列裡每一支的配音，要和樣片（甲5）是同一把聲音。

    python voice_check.py <專案> --make-ref <系列>/qa_reference/voice_ref.json   # 樣片定案後建一次
    python voice_check.py <專案> --ref <系列>/qa_reference/voice_ref.json [--out qa/品檢紀錄]

讀專案的 qa/voice_meta.json（build.py 寫的：實際用的供應者、模型、聲音）、public/voice.wav（純旁白，沒有配樂）、
src/data/spec.json 的 voiceLines（算語速）。
  B1.模型（擋）：主旁白的供應者、模型版本、聲音、風格、語速設定和樣片不同
                  ——Gemini 設成 model="auto" 會自動換最新版，系列做到一半聲音可能悄悄變了
  B1.聲紋（提醒後擋）：音高中位數、語速（字/秒）、音色（平均頻譜）和樣片差太多
"""
import argparse, json, os, re, sys, wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

LIMITS = {'pitch': 0.08, 'rate': 0.10, 'timbre': 0.30}
# 音高 ±8%、語速 ±10%（逐句中位數）、音色倒譜距離 ≤0.30。
# 2026-10-08 校正：同一支前後半 0.089、同聲音兩支 0.092、不同聲音（克隆 vs 雲哲）0.930；
# 原本用平均頻譜的相似度，不同聲音也有 0.991，分不開，改用倒譜


def load_wav(path):
    with wave.open(path) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    return x, sr


def frames(x, sr, win=0.04, hop=0.02):
    w, h = int(win * sr), int(hop * sr)
    n = max(0, (len(x) - w) // h)
    idx = np.arange(w)[None, :] + h * np.arange(n)[:, None]
    return x[idx] * np.hanning(w)[None, :]


def features(x, sr):
    f = frames(x, sr)
    rms = np.sqrt((f ** 2).mean(1) + 1e-12)
    speech = f[rms > max(rms.max() * 0.05, 1e-3)]
    if len(speech) < 20:
        return None
    # 音高：自相關找 70～400 Hz 的週期，只取明顯有週期的格（有聲段）
    lo, hi = int(sr / 400), int(sr / 70)
    pitches = []
    for fr in speech[:: max(1, len(speech) // 1500)]:
        ac = np.fft.irfft(np.abs(np.fft.rfft(fr, 2 * len(fr))) ** 2)[: len(fr)]
        if ac[0] <= 0:
            continue
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] / ac[0] > 0.45:
            pitches.append(sr / k)
    # 音色：每格 40 個對數頻帶 → DCT 取第 1～13 個倒譜係數（類似 MFCC），記平均與標準差
    from scipy.fft import dct
    spec = np.abs(np.fft.rfft(speech, axis=1)) ** 2
    freqs = np.fft.rfftfreq(speech.shape[1], 1 / sr)
    edges = np.geomspace(80, min(8000, sr / 2), 41)
    bands = np.stack([spec[:, (freqs >= a) & (freqs < b)].sum(1) for a, b in zip(edges[:-1], edges[1:])], 1)
    cep = dct(np.log10(bands + 1e-10), axis=1, norm='ortho')[:, 1:14]
    return {'pitch': float(np.median(pitches)) if pitches else None,
            'timbre': {'mean': cep.mean(0).tolist(), 'std': cep.std(0).tolist()}}


def speech_rate(spec_path):
    """字/秒：逐句（實際念的中文字＋英數字母 ÷ 這一句長度）取中位數——念數字串的慢句不會拉偏整體"""
    if not os.path.exists(spec_path):
        return None
    vl = json.load(open(spec_path, encoding='utf-8')).get('voiceLines', [])
    rates = [len(re.findall(r'[一-鿿A-Za-z0-9]', x.get('say') or x.get('text', ''))) / (x['to'] - x['from'])
             for x in vl if x['to'] - x['from'] > 0.5]
    return float(np.median(rates)) if rates else None


def main_voice(meta):
    vs = sorted(meta.get('voices', []), key=lambda v: -v.get('lines', 0))
    return {k: v for k, v in vs[0].items() if k != 'lines'} if vs else None


def measure(proj):
    meta = json.load(open(os.path.join(proj, 'qa', 'voice_meta.json'), encoding='utf-8'))
    x, sr = load_wav(os.path.join(proj, meta.get('voice_wav') or os.path.join('public', 'voice.wav')))
    ft = features(x, sr) or {}
    return {'voice': main_voice(meta), 'pitch': ft.get('pitch'), 'timbre': ft.get('timbre'),
            'rate': speech_rate(os.path.join(proj, 'src', 'data', 'spec.json'))}


def compare(cur, ref, rec):
    if cur['voice'] != ref['voice']:
        diff = [f'{k}：樣片 {ref["voice"].get(k)!r} → 這支 {cur["voice"].get(k)!r}'
                for k in ref['voice'] if (cur['voice'] or {}).get(k) != ref['voice'].get(k)]
        rec.problem('B1.模型', '主旁白', '；'.join(diff) or '聲音設定不同')
    for k, label in (('pitch', '音高'), ('rate', '語速')):
        if cur.get(k) and ref.get(k):
            d = cur[k] / ref[k] - 1
            unit = 'Hz' if k == 'pitch' else '字/秒'
            msg = f'樣片 {ref[k]:.1f} → 這支 {cur[k]:.1f} {unit}（{d:+.0%}，容許 ±{LIMITS[k]:.0%}）'
            if abs(d) > LIMITS[k]:
                rec.problem('B1.聲紋', label, msg)
            else:
                rec.note(f'{label}：{msg}')
    if cur.get('timbre') and ref.get('timbre'):
        mu_r, sd_r = np.array(ref['timbre']['mean']), np.array(ref['timbre']['std']) + 1e-9
        dist = float(np.sqrt((((np.array(cur['timbre']['mean']) - mu_r) / sd_r) ** 2).mean()))
        msg = f'和樣片的距離 {dist:.3f}（上限 {LIMITS["timbre"]}；同一個聲音約 0.1）'
        if dist > LIMITS['timbre']:
            rec.problem('B1.聲紋', '音色', msg)
        else:
            rec.note(f'音色：{msg}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project', nargs='?', default='.')
    ap.add_argument('--ref'); ap.add_argument('--make-ref'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    cur = measure(a.project)
    if a.make_ref:
        os.makedirs(os.path.dirname(os.path.abspath(a.make_ref)), exist_ok=True)
        json.dump({**cur, 'from': os.path.abspath(a.project)}, open(a.make_ref, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'✓ 樣片聲音基準 → {a.make_ref}（{cur["voice"]}，音高 {cur["pitch"]:.1f} Hz，語速 {cur["rate"]:.2f} 字/秒）')
        return
    rec = Recorder('B1 聲音一致性', a.out)
    if not a.ref or not os.path.exists(a.ref):
        rec.note('沒有樣片聲音基準（--ref），跳過；系列樣片定案後用 --make-ref 建一次')
    else:
        compare(cur, json.load(open(a.ref, encoding='utf-8')), rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
