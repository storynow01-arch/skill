"""範本F 一行出片：python <skill>/templates/範本F_開發者流程線/engine/make.py <專案資料夾> [--stills] [--name 檔名]

專案資料夾裡只要有 storyboard.json。流程：
  複製引擎（scene.html、lib.js、render.mjs）→ 確認 Playwright → 配音（build_audio.py）→ 配樂（make_music.py）
  → 抽格總覽（抽格/_總覽.jpg：每段 75% 處＋每個轉場前 0.1 秒）→ 整支渲染 → 合成聲音＋響度 → out/<檔名>.mp4
--stills 只做到抽格總覽，先看畫面再決定要不要整支渲染。
--preview 分鏡預覽（配音前給使用者看，2026-10-06）：edge-tts 暫配（不花 Gemini 額度）→ 每段 75% 處截圖
          → 抽格/分鏡預覽.html（截圖＋旁白），不配樂、不渲染。
品檢（2026-10-06，跟外層工作流一致）：配音後 AI 耳朵（專案有 Gemini 金鑰才跑）→ 兩個 AI 交叉聽 → 句內停頓（只提醒）；
配音規則：專案自己的 .env.local 有 GEMINI_API_KEY 才用 Gemini，否則 edge-tts；Gemini 音檔過壞音檔關卡。"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")
import argparse, json, os, re, shutil, subprocess, sys

ENGINE = os.path.dirname(os.path.abspath(__file__))
LIB, MUSIC, LOUD = 'lib_F.js', True, 'loudnorm=I=-14:TP=-2:LRA=11'   # 2026-10-07：實際用兩次 loudnorm（見 _two_pass），單次在短片停在 -16；峰值超過 −1 再用 TP −3 重做

ap = argparse.ArgumentParser()
ap.add_argument('proj'); ap.add_argument('--stills', action='store_true'); ap.add_argument('--name')
ap.add_argument('--preview', action='store_true')
a = ap.parse_args()
proj = os.path.abspath(a.proj)
if not os.path.exists(os.path.join(proj, 'storyboard.json')): sys.exit(f'找不到 {proj}\\storyboard.json')
SB = json.load(open(os.path.join(proj, 'storyboard.json'), encoding='utf-8'))
name = a.name or SB.get('name', os.path.basename(proj))
run = lambda *c, **k: subprocess.run(list(c), check=True, **k)
sh = os.name == 'nt'

# 1. 引擎檔（每次覆寫，引擎更新會跟著進來）
shutil.copy(os.path.join(ENGINE, 'scene.html'), proj)
shutil.copy(os.path.join(ENGINE, LIB), os.path.join(proj, 'lib.js'))
shutil.copy(os.path.join(ENGINE, 'render.mjs'), proj)
# 2. Playwright（只裝一次）
if not os.path.exists(os.path.join(proj, 'node_modules', 'playwright')):
    if not os.path.exists(os.path.join(proj, 'package.json')):
        json.dump({'name': 'video', 'private': True, 'type': 'module'}, open(os.path.join(proj, 'package.json'), 'w'))
    run('npm', 'install', 'playwright', '--no-audit', '--no-fund', cwd=proj, shell=sh)
    lad = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'ms-playwright')
    if not (os.path.isdir(lad) and any(d.startswith('chromium-') for d in os.listdir(lad))):
        run('npx', 'playwright', 'install', 'chromium', cwd=proj, shell=sh)
# 3. 聲音（--preview：暫配 edge-tts）
SKILL = os.path.normpath(os.path.join(ENGINE, '..', '..', '..'))
if a.preview: os.environ['TTS_FORCE_EDGE'] = '1'
run(sys.executable, os.path.join(ENGINE, 'build_audio.py'), proj)
if a.preview:
    T = json.load(open(os.path.join(proj, 'timings.json'), encoding='utf-8'))
    ts = [round(s['start'] + s['dur'] * 0.75, 2) for s in T['segs']]
    run('node', 'render.mjs', '.', '--stills', ','.join(map(str, ts)), cwd=proj)
    rows = [{'id': f"第 {s['i']} 段", 'type': (seg.get('scene') or {}).get('type', ''), 'img': f"t{t:06.2f}.jpg",   # 檔名同 render.mjs
             'say': [s['text']]} for s, t, seg in zip(T['segs'], ts, SB['segments'])]
    json.dump({'title': name, 'template': os.path.basename(os.path.dirname(ENGINE)), 'scenes': rows},
              open(os.path.join(proj, '抽格', 'scenes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    run(sys.executable, os.path.join(SKILL, 'final_qa', 'storyboard_page.py'), os.path.join(proj, '抽格'))
    print('⛔ 請使用者看 抽格/分鏡預覽.html，確認後拿掉 --preview 正式配音出片'); sys.exit(0)
# 配音後品檢：AI 耳朵（有 Gemini 金鑰才跑）→ 交叉聽 → 句內停頓（都只提醒）
qa = lambda *c: subprocess.run(list(c), cwd=proj).returncode
if qa(sys.executable, os.path.join(SKILL, 'engine', 'scripts', 'ai_listen.py'), '--out', 'qa/聽檢') == 2:
    qa(sys.executable, os.path.join(SKILL, 'final_qa', 'listen_crosscheck.py'), 'qa/聽檢/聽檢.json')
    print('⚠ 請聽 qa/聽檢/交叉聽.html 的「確定／待聽」')
qa(sys.executable, os.path.join(SKILL, 'final_qa', 'pause_check.py'))
if MUSIC: run(sys.executable, os.path.join(ENGINE, 'make_music.py'), proj)
audio = 'audio/final.wav' if MUSIC else 'audio/narration.wav'
# 4. 抽格總覽
T = json.load(open(os.path.join(proj, 'timings.json'), encoding='utf-8'))
ts = sorted({round(s['start'] + s['dur'] * 0.75, 2) for s in T['segs']} | {round(s['start'] - 0.1, 2) for s in T['segs'][1:]})
run('node', 'render.mjs', '.', '--stills', ','.join(map(str, ts)), cwd=proj)
print(f'抽格總覽：{os.path.join(proj, "抽格", "_總覽.jpg")}')
if a.stills: sys.exit(0)
# 5. 整支渲染＋聲音
os.makedirs(os.path.join(proj, 'out'), exist_ok=True)
run('node', 'render.mjs', '.', '--video', 'out/_video.mp4', '--workers', '3', cwd=proj)
final = f'out/{name}.mp4'
def _two_pass(target_tp):
    """先壓縮再 loudnorm 兩次（2026-10-07 實測）：原始音軌約 -24 LUFS 但配樂與音效峰值尖，直接拉到 -14 會超過峰值上限，
    loudnorm 只能停在 -15.5～-16；先用壓縮器收尖峰，再量一次、用量到的值線性調整 → -14.2、峰值 -1.7"""
    pre = 'acompressor=threshold=-24dB:ratio=3:attack=5:release=120:makeup=2'
    m = subprocess.run(['ffmpeg', '-i', audio, '-af', pre + ',loudnorm=I=-14:TP=%s:LRA=11:print_format=json' % target_tp, '-f', 'null', '-'],
                       cwd=proj, capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = (pre + ',loudnorm=I=-14:TP=%s:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true'
          % (target_tp, j['input_i'], j['input_tp'], j['input_lra'], j['input_thresh'], j['target_offset']))
    run('ffmpeg', '-y', '-loglevel', 'error', '-i', 'out/_video.mp4', '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
        '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', final, cwd=proj)
_two_pass(-2)
def _peak(path):
    out = subprocess.run(['ffmpeg', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], cwd=proj, capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    m = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', out)
    return float(m[-1]) if m else None
pk = _peak(final)
if pk is not None and pk > -1.0:   # AAC 編碼後峰值會再浮一點：超過 −1 dBTP 才用更保守的上限重轉（同 make_video.py）
    print(f'峰值 {pk:.1f} dBTP 超過 −1，改用 TP −3 重轉')
    _two_pass(-3)
os.remove(os.path.join(proj, 'out', '_video.mp4'))
r = subprocess.run(['ffmpeg', '-i', final, '-af', 'ebur128=peak=true', '-f', 'null', '-'], cwd=proj, capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r); P = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
print(f'成片：{os.path.join(proj, final)}　長度 {T["total"]} 秒　響度 {I[-1] if I else "?"} LUFS　峰值 {P[-1] if P else "?"} dBFS')
