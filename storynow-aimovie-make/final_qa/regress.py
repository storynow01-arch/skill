"""F2 引擎改版回歸測試（2026-10-08）：改了引擎（engine/template、build.py…）之後，用每個範本的示範分鏡重算固定畫格，
和基準圖逐格比對——確認舊的範本沒有被改壞。

    python regress.py [--templates A,B,C,D,H] [--modules <node_modules>]          # 比對（有差異 → 擋）
    python regress.py --accept [--templates D]                                     # 差異是預期中的改進：更新基準圖

固定樣本：templates/範本X/示範/storyboard.json；不配音（--no-tts 用字數估時）、不配樂——每次結果一樣，不連網。
每個場景截 2 格（中段、結尾前），縮成 640×360。差異＝和基準圖相差 >8 色階的像素超過 0.5%。
基準圖在 final_qa/regress/基準/<範本>/；比對結果與「基準｜新版｜差異」對照頁在 final_qa/regress/結果/（不進 git）。
--modules：裝好 Remotion 的 node_modules（預設看環境變數 STORYNOW_NODE_MODULES）。
pre-push：改到 engine/ 底下的檔案時自動跑；沒過不准推（F2.回歸，擋）。
"""
import argparse, base64, io, json, os, shutil, subprocess, sys, tempfile, time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
from qa_record import Recorder

TPL = {'A': '範本A_闖關遊戲', 'B': '範本B_創客手稿', 'C': '範本C_動態字體快剪', 'D': '範本D_白板手繪', 'H': '範本H_螢幕模擬'}
BASE = os.path.join(HERE, 'regress', '基準')
OUT = os.path.join(HERE, 'regress', '結果')
TOL, RATIO = 8, 0.005     # 同一版本重跑差異是 0（渲染完全穩定），所以門檻可以很嚴；24 色階時紙色差 15 抓不到（2026-10-08）


def sh(cmd, cwd):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=isinstance(cmd, str))
    if r.returncode:
        raise RuntimeError((r.stderr or r.stdout)[-600:])
    return r.stdout


def render(T, modules, work):
    """建暫存專案 → 不配音建置 → 截固定畫格；回傳 {畫格: png 路徑}"""
    proj = os.path.join(work, T)
    py = sys.executable
    sh([py, os.path.join(SKILL, 'engine', 'scripts', 'new_project.py'), proj, '--share-modules', modules], work)
    shutil.copy(os.path.join(SKILL, 'templates', TPL[T], '示範', 'storyboard.json'), os.path.join(proj, 'storyboard.json'))
    sh([py, os.path.join(SKILL, 'engine', 'scripts', 'build.py'), 'storyboard.json', '--no-tts', '--no-music'], proj)
    if T in ('A', 'B', 'C', 'D', 'H'):                 # make_video 的範本音效檔：缺了 Remotion 會找不到 tpl_sfx.wav
        sh([py, os.path.join(SKILL, 'engine', 'scripts', 'tpl_sfx.py'), T], proj)
    spec = json.load(open(os.path.join(proj, 'src', 'data', 'spec.json'), encoding='utf-8'))
    frames = sorted({min(spec['totalFrames'] - 1, s['from'] + int(s['dur'] * r)) for s in spec['scenes'] for r in (0.5, 0.9)})
    shutil.copy(os.path.join(HERE, 'regress_stills.mjs'), os.path.join(proj, '.regress_stills.mjs'))
    out = os.path.join(work, T + '_stills')
    sh(['node', '.regress_stills.mjs', ','.join(map(str, frames)), f'Template{T}', out], proj)
    return {int(f[1:6]): os.path.join(out, f) for f in sorted(os.listdir(out))}, spec


def load(p):
    from PIL import Image
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int16)


def b64(img):
    from PIL import Image
    buf = io.BytesIO()
    Image.fromarray(img.astype(np.uint8)).save(buf, 'PNG')
    return base64.b64encode(buf.getvalue()).decode()


def compare(T, shots, rec, html):
    base = os.path.join(BASE, TPL[T])
    if not os.path.isdir(base):
        rec.problem('F2.回歸', TPL[T], '沒有基準圖：先確認目前畫面正確，再跑 --accept 建立')
        return
    old = {int(f[1:6]): os.path.join(base, f) for f in os.listdir(base) if f.endswith('.png')}
    if set(old) != set(shots):
        rec.problem('F2.回歸', TPL[T], f'截圖畫格不同（場景時間變了）：基準 {len(old)} 格、這次 {len(shots)} 格')
    for fr in sorted(set(old) & set(shots)):
        a, b = load(old[fr]), load(shots[fr])
        if a.shape != b.shape:
            rec.problem('F2.回歸', f'{TPL[T]} 第 {fr} 格', f'尺寸不同 {a.shape} → {b.shape}'); continue
        d = np.abs(a - b).max(2)
        ratio = float((d > TOL).mean())
        if ratio > RATIO:
            rec.problem('F2.回歸', f'{TPL[T]} 第 {fr} 格', f'{ratio:.1%} 的像素和基準不同')
            heat = np.zeros_like(a); heat[..., 0] = np.where(d > TOL, 255, a.mean(2) * 0.3); heat[..., 1] = heat[..., 2] = a.mean(2) * 0.3
            html.append(f'<h3>{TPL[T]}　第 {fr} 格　{ratio:.1%} 不同</h3><div class="row">'
                        + ''.join(f'<figure><img src="data:image/png;base64,{b64(x)}"><figcaption>{c}</figcaption></figure>'
                                  for x, c in ((a, '基準'), (b, '新版'), (heat, '差異（紅）'))) + '</div>')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--templates', default='A,B,C,D,H'); ap.add_argument('--modules', default=os.environ.get('STORYNOW_NODE_MODULES'))
    ap.add_argument('--accept', action='store_true'); ap.add_argument('--out', default=os.path.join(OUT, '品檢紀錄'))
    a = ap.parse_args()
    if not a.modules or not os.path.isdir(os.path.join(a.modules, 'remotion')):
        sys.exit('找不到 Remotion 的 node_modules：加 --modules <路徑>，或設環境變數 STORYNOW_NODE_MODULES（例：<頻道>/01_通用工作流與範本開發/_共用引擎/node_modules）')
    rec = Recorder('F2 回歸測試', a.out)
    html = []
    work = tempfile.mkdtemp(prefix='regress_')
    try:
        for T in a.templates.split(','):
            t0 = time.time()
            try:
                shots, spec = render(T, a.modules, work)
            except RuntimeError as e:
                rec.problem('F2.回歸', TPL[T], f'建置或算圖失敗：{str(e)[-300:]}'); continue
            if a.accept:
                dst = os.path.join(BASE, TPL[T])
                shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)
                for fr, p in shots.items(): shutil.copy(p, dst)
                print(f'✓ {TPL[T]}：基準圖更新 {len(shots)} 格（{time.time() - t0:.0f}s）')
            else:
                compare(T, shots, rec, html)
                print(f'  {TPL[T]}：比對 {len(shots)} 格（{time.time() - t0:.0f}s）', flush=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    if a.accept:
        return
    if html:
        os.makedirs(OUT, exist_ok=True)
        page = os.path.join(OUT, '回歸差異.html')
        open(page, 'w', encoding='utf-8').write(
            '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>回歸差異</title><style>body{font-family:"Microsoft JhengHei",sans-serif;margin:20px}'
            '.row{display:flex;gap:8px}figure{margin:0}img{width:420px;border:1px solid #ccc}</style><h1>引擎改版回歸差異</h1>'
            '<p>差異是預期中的改進 → <code>python final_qa/regress.py --accept --templates X</code> 更新基準；不是 → 修引擎</p>' + ''.join(html))
        rec.note(f'對照頁：{page}')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
