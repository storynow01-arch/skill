"""廣告範本（廣A、廣B…）共用出片程式（2026-10-09）。

用法（任何位置）：
  python <skill>/engine/ad/make_ad.py <範本代號或資料夾> <專案資料夾> [--stills] [--demo <示範資料夾>] [--modules <node_modules>]
例：
  python <skill>/engine/ad/make_ad.py 廣A D:/work/我的廣告          # 專案資料夾裡只要有 storyboard.json
  python <skill>/engine/ad/make_ad.py 廣A D:/work/我的廣告 --stills # 只出抽格總覽（先看畫面，不整支算圖）

流程：讀 storyboard.json → 範本的 timeline.py 檢查欄位並「依內容多寡」排出時間表（片長、每個事件第幾格、音效）
  → 複製範本的 Remotion 畫面程式到專案、寫 src/timeline.json（畫面只讀這份）
  → 範本的 music.py 依同一份時間表合成配樂與音效（音效對準畫面事件）
  → 抽格總覽（抽格/_總覽.jpg）→ 整支算圖 → 兩段式響度（I −14、TP −2＋限幅）→ 最終品檢（final_qa.py，無旁白模式）
  → 成片 out/<name>.mp4
--demo <資料夾>：另外輸出範本規格要的示範檔：示範.mp4（壓縮版）、poster.jpg、總覽.jpg（三格）、storyboard.json。

每個廣告範本資料夾的 engine/ 要有：
  timeline.py   build(sb: dict) -> dict   （必備鍵：fps、frames、name；建議：stills、poster、overview、allText）
                欄位不合格時 raise ValueError('…')，訊息寫清楚哪個欄位、上限多少（給 Claude 改 storyboard 用）
  music.py      render(tl: dict, wav_path: str)  （48 kHz 立體聲 wav，長度＝frames/fps）
  remotion/     Remotion 專案的 src/（入口 src/index.ts，Composition id 一律叫 "Ad"，片長讀 src/timeline.json）
node_modules：專案沒有時，依序找 --modules、環境變數 AD_MODULES、往上層找 _共用/node_modules；都沒有就 npm install。
"""
import sys as _s; _s.stdout.reconfigure(encoding='utf-8', errors='replace')
import argparse, importlib.util, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
TPLS = os.path.join(SKILL, 'templates')
PKG = {'name': 'ad-video', 'private': True,
       'dependencies': {'@remotion/bundler': '4.0.300', '@remotion/cli': '4.0.300', '@remotion/google-fonts': '4.0.300',
                        '@remotion/renderer': '4.0.300', 'react': '18.3.1', 'react-dom': '18.3.1', 'remotion': '4.0.300'},
       'devDependencies': {'@types/react': '18.3.3', 'typescript': '5.4.5'}}
sh = os.name == 'nt'


def log(*a): print('▶', *a, flush=True)


def find_template(arg):
    if os.path.isdir(arg): return os.path.abspath(arg)
    code = arg[2:] if arg.startswith('範本') else arg
    for d in sorted(os.listdir(TPLS)):
        if d.startswith(f'範本{code}_'): return os.path.join(TPLS, d)
    sys.exit(f'找不到範本「{arg}」（templates/範本{code}_*）')


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def junction(src, dst):
    if sh:
        import _winapi; _winapi.CreateJunction(src, dst)
    else:
        os.symlink(src, dst)


def ensure_modules(proj, opt):
    nm = os.path.join(proj, 'node_modules')
    if os.path.isdir(os.path.join(nm, 'remotion')): return
    cands = [opt, os.environ.get('AD_MODULES')]
    p = proj
    for _ in range(8):
        p = os.path.dirname(p); cands.append(os.path.join(p, '_共用', 'node_modules'))
    for c in cands:
        if c and os.path.isdir(os.path.join(c, 'remotion')) and os.path.isdir(os.path.join(c, '@remotion', 'renderer')):
            if os.path.lexists(nm): sys.exit(f'{nm} 存在但不完整，請先移除')
            junction(os.path.abspath(c), nm); log('node_modules 連到', c); return
    log('npm install（第一次會花幾分鐘）')
    subprocess.run(['npm.cmd' if sh else 'npm', 'install', '--no-audit', '--no-fund'], cwd=proj, check=True)


def free_gb():
    try:
        if sh:
            r = subprocess.run(['powershell', '-NoProfile', '-Command',
                                '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory'], capture_output=True, text=True)
            return int(r.stdout.strip()) / 1024 / 1024
        return os.sysconf('SC_AVPHYS_PAGES') * os.sysconf('SC_PAGE_SIZE') / 1024 ** 3
    except Exception:
        return 8.0


def stills(proj, frames, outdir, scale=0.5):
    os.makedirs(outdir, exist_ok=True)
    shutil.copy(os.path.join(HERE, 'stills.mjs'), os.path.join(proj, '_stills.mjs'))
    subprocess.run(['node', '_stills.mjs', proj, ','.join(map(str, frames)), outdir, str(scale)], cwd=proj, check=True)
    return [os.path.join(outdir, f'f{f:04d}.jpg') for f in frames]


def grid(paths, out, cols=4, labels=None):
    from PIL import Image, ImageDraw
    ims = [Image.open(p) for p in paths]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    g = Image.new('RGB', (cols * w + (cols + 1) * 8, rows * h + (rows + 1) * 8), (24, 24, 28))
    d = ImageDraw.Draw(g)
    for i, im in enumerate(ims):
        x, y = 8 + (i % cols) * (w + 8), 8 + (i // cols) * (h + 8)
        g.paste(im, (x, y))
        if labels:
            d.rectangle([x, y, x + 150, y + 26], fill=(0, 0, 0)); d.text((x + 6, y + 6), labels[i], fill=(255, 255, 255))
    g.save(out, quality=85)


def two_pass(src, dst, limit):
    m = subprocess.run(['ffmpeg', '-i', src, '-af', 'loudnorm=I=-14:TP=-2:LRA=9:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-2:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit={limit}:level=false")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart', dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('template'); ap.add_argument('proj')
    ap.add_argument('--stills', action='store_true'); ap.add_argument('--demo'); ap.add_argument('--modules')
    ap.add_argument('--limit', default='0.75', help='限幅器上限（峰值超標時用 0.6 重做）')
    a = ap.parse_args()
    tpl = find_template(a.template); eng = os.path.join(tpl, 'engine'); proj = os.path.abspath(a.proj)
    sbp = os.path.join(proj, 'storyboard.json')
    if not os.path.exists(sbp): sys.exit(f'找不到 {sbp}')
    sb = json.load(open(sbp, encoding='utf-8'))

    # 1. 時間表（欄位檢查也在這一步）
    try:
        tl = load(os.path.join(eng, 'timeline.py'), 'ad_timeline').build(sb)
    except ValueError as e:
        sys.exit(f'✗ storyboard 不符合範本欄位規定：\n{e}\n（欄位表見 {os.path.join(tpl, "README.md")}）')
    name = re.sub(r'[\\/:*?"<>|]', '_', sb.get('name') or tl.get('name') or os.path.basename(proj))
    sec = tl['frames'] / tl['fps']
    log(f'{os.path.basename(tpl)}：{tl["frames"]} 格＝{sec:.1f} 秒')

    # 2. 畫面程式
    src = os.path.join(proj, 'src')
    if os.path.isdir(src): shutil.rmtree(src)
    shutil.copytree(os.path.join(eng, 'remotion', 'src'), src)
    json.dump(tl, open(os.path.join(src, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f in ('tsconfig.json',):
        p = os.path.join(eng, 'remotion', f)
        if os.path.exists(p): shutil.copy(p, proj)
    if not os.path.exists(os.path.join(proj, 'package.json')):
        json.dump(PKG, open(os.path.join(proj, 'package.json'), 'w', encoding='utf-8'), indent=1)
    ensure_modules(proj, a.modules)

    # 3. 配樂＋音效（同一份時間表）
    os.makedirs(os.path.join(proj, 'public'), exist_ok=True)
    load(os.path.join(eng, 'music.py'), 'ad_music').render(tl, os.path.join(proj, 'public', 'music.wav'))
    log('配樂完成 public/music.wav')

    # 4. 抽格總覽
    fr = tl.get('stills') or [int(tl['frames'] * i / 12) for i in range(12)]
    shots = stills(proj, fr, os.path.join(proj, '抽格'))
    grid(shots, os.path.join(proj, '抽格', '_總覽.jpg'), labels=[f'f{f}  {f / tl["fps"]:.1f}s' for f in fr])
    log('抽格總覽：', os.path.join(proj, '抽格', '_總覽.jpg'))
    if a.stills: return

    # 5. 整支算圖
    out = os.path.join(proj, 'out'); os.makedirs(out, exist_ok=True)
    raw = os.path.join(out, '_raw.mp4')
    g = free_gb(); conc = 4 if g > 5 else 2
    if g < 2.5: log(f'⚠ 可用記憶體只剩 {g:.1f} GB，算圖可能連不上瀏覽器；先關掉其他程式')
    log(f'算圖（可用記憶體 {g:.1f} GB，concurrency={conc}）')
    subprocess.run(['npx.cmd' if sh else 'npx', 'remotion', 'render', 'src/index.ts', 'Ad', raw, f'--concurrency={conc}', '--crf=18',
                    '--audio-codec=aac', '--audio-bitrate=192k', '--timeout=180000', '--log=error'], cwd=proj, check=True)
    final = os.path.join(out, f'{name}.mp4')
    two_pass(raw, final, a.limit)
    log('成片：', final)

    # 6. 最終品檢（無旁白：不給 --spec、突跳屬於設計）
    m = sec / 60
    qa = os.path.join(proj, 'qa', '最終品檢')
    subprocess.run([sys.executable, os.path.join(SKILL, 'final_qa', 'final_qa.py'), final, '--lufs', '-14',
                    '--minutes', f'{m * 0.95:.3f},{m * 1.05:.3f}', '--jumps-by-design', '--out', qa],
                   env={**os.environ, 'PYTHONUTF8': '1'})
    log('最終品檢報告：', qa)

    # 7. 示範檔（範本規格：25～35 秒、1920×1080、有聲；壓縮比照現有示範 3～16 MB）
    if a.demo:
        d = os.path.abspath(a.demo); os.makedirs(d, exist_ok=True)
        # 畫面細節多（網點、紙紋）的範本檔案會很大：超過 14 MB 就提高壓縮再壓一次（現有示範 3～16 MB）
        for crf in (20, 23, 26, 28, 30):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', final, '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
                            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', os.path.join(d, '示範.mp4')], check=True)
            if os.path.getsize(os.path.join(d, '示範.mp4')) <= 14e6: break
        pf = tl.get('poster', int(tl['frames'] * 0.4))
        ov = tl.get('overview') or [int(tl['frames'] * x) for x in (0.2, 0.5, 0.8)]
        tmp = os.path.join(proj, '抽格', '_demo')
        p1 = stills(proj, [pf], tmp, 1.0)[0]
        shutil.copy(p1, os.path.join(d, 'poster.jpg'))
        grid(stills(proj, ov, tmp, 0.5), os.path.join(d, '總覽.jpg'), cols=3)
        shutil.copy(sbp, os.path.join(d, 'storyboard.json'))
        if not 25 <= sec <= 35: log(f'⚠ 示範片 {sec:.1f} 秒，不在範本規格 25～35 秒內：示範分鏡要加減內容')
        mb = os.path.getsize(os.path.join(d, '示範.mp4')) / 1e6
        log(f'示範檔：{d}（示範.mp4 {mb:.1f} MB）')


if __name__ == '__main__':
    main()
