"""一行做出範本影片：同步引擎 → 檢查圖示 → ⓪文稿檢查 → 唸法標準題 → 建置（旁白、配樂、字幕；Gemini 過壞音檔關卡）
→ 文不對題檢查 → 範本音效 → AI 耳朵聽檢 → 兩個 AI 交叉聽 → 句內停頓 → 版面＋旁白品檢 → 算圖 → 響度 → 成片品檢。

用法（在專案資料夾裡執行；專案由 new_project.py 建立，node_modules 已就緒）：
    python <skill>/engine/scripts/make_video.py storyboard.json --template B   # A／B／C／D／H
    python <skill>/engine/scripts/make_video.py storyboard.json --template A --name 1-3_IP位址
選項：
    --no-sync     不把 skill 最新的範本程式（tpl、lib、QaProbe）同步進專案
    --no-qa       跳過品檢（不建議）
    --force       品檢有「必修」也繼續算圖
    --preview     分鏡預覽（配音前給使用者看）：edge-tts 暫配（不花 Gemini 額度）→ 建置 → 每場截一張 → qa/分鏡預覽/分鏡預覽.html，不算圖
配音選擇規則：專案自己的 .env.local 有 GEMINI_API_KEY 才用 Gemini Flash TTS，否則 edge-tts。
storyboard 沒寫 music 時，自動用範本預設配樂。
"""
import argparse, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, '..', 'template', 'src')
TPL = {
    'A': {'name': '闖關遊戲', 'dir': '範本A_闖關遊戲', 'music': {'genre': 'chiptune', 'bpm': 140, 'key': 'C'}},
    'B': {'name': '創客手稿', 'dir': '範本B_創客手稿', 'music': {'genre': 'acoustic', 'bpm': 90, 'key': 'G'}},
    'C': {'name': '動態字體快剪', 'dir': '範本C_動態字體快剪', 'music': {'genre': 'phonk', 'bpm': 145, 'key': 'Em'}},
    'D': {'name': '白板手繪', 'dir': '範本D_白板手繪', 'music': {'genre': 'marimba', 'bpm': 112, 'key': 'D'}},
    'H': {'name': '螢幕模擬', 'dir': '範本H_螢幕模擬', 'music': {'genre': 'lofi', 'bpm': 80, 'key': 'C'}},
    'I': {'name': '漫畫風', 'dir': '範本I_漫畫風', 'music': {'genre': 'comedy', 'bpm': 120, 'key': 'C'}},
    'J': {'name': '地圖風', 'dir': '範本J_地圖風', 'music': {'genre': 'acoustic', 'bpm': 120, 'key': 'G'}},
    'K': {'name': '宇宙風', 'dir': '範本K_宇宙風', 'music': {'genre': 'minimal', 'bpm': 120, 'key': 'Am'}},
    'L': {'name': '黏土玩具風', 'dir': '範本L_黏土玩具風', 'music': {'genre': 'marimba', 'bpm': 120, 'key': 'F'}},
}


def sh(cmd, check=True):
    print('▶', cmd if isinstance(cmd, str) else ' '.join(cmd), flush=True)
    r = subprocess.run(cmd, shell=isinstance(cmd, str))
    if check and r.returncode != 0:
        raise SystemExit(f'失敗（結束碼 {r.returncode}）：{cmd}')
    return r.returncode


def sync_engine():
    """範本程式以 skill 為準（專案裡的 tpl/lib 不要手改；要改就改 skill 再同步）"""
    for d in ('tpl', 'lib'):
        shutil.copytree(os.path.join(SRC, d), os.path.join('src', d), dirs_exist_ok=True)
    for f in ('QaProbe.tsx', 'Root.tsx'):
        shutil.copy(os.path.join(SRC, f), os.path.join('src', f))
    print('✓ 已同步 skill 範本程式 → src/tpl、src/lib')


def known_icons(tpl=None):
    t = open(os.path.join(SRC, 'lib', 'sketches.ts'), encoding='utf-8').read()
    sk = set(re.findall(r'^\s{2}(\w+): \{paths', t, re.M))
    emo = dict(re.findall(r"'([^']+)': '(\w+)'", t.split('export const EMOJI_TO_SKETCH')[1]))
    if tpl == 'D':   # 範本D 先查白板彩色圖示庫（lib/whiteboard.tsx 的 WB_ICONS＋EXTRA_EMOJI），找不到才退回線稿
        w = open(os.path.join(SRC, 'lib', 'whiteboard.tsx'), encoding='utf-8').read()
        body = w.split('export const WB_ICONS')[1].split('const EXTRA_EMOJI')[0]
        sk |= set(re.findall(r'^\s{2}(\w+)(?=: \(\)|,)', body, re.M))
        emo.update(re.findall(r"'([^']+)': '(\w+)'", w.split('const EXTRA_EMOJI')[1].split('};')[0]))
    lib_icons = {'I': ('comic', 'COMIC'), 'J': ('map', 'MAP'), 'K': ('cosmos', 'COSMOS'), 'L': ('clay', 'CLAY')}
    if tpl in lib_icons:   # 範本I～L 先查自己的圖示庫（lib/<名>/icons.tsx 的 <名>_ICONS＋EMOJI_TO_<名>），找不到才退回線稿
        d, n = lib_icons[tpl]
        fp = os.path.join(SRC, 'lib', d, 'icons.tsx')
        if os.path.exists(fp):
            c = open(fp, encoding='utf-8').read()
            if f'export const {n}_ICONS' in c and f'export const EMOJI_TO_{n}' in c:
                body = c.split(f'export const {n}_ICONS')[1].split(f'export const EMOJI_TO_{n}')[0]
                sk |= set(re.findall(r'^\s{2}(\w+):', body, re.M))
                emo.update(re.findall(r"'([^']+)': '(\w+)'", c.split(f'export const EMOJI_TO_{n}')[1].split('};')[0]))
    return sk, emo


def check_icons(sb, tpl=None):
    sk, emo = known_icons(tpl)
    used = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ('icon', 'sketch') and isinstance(v, str): used.append(v)
                else: walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(sb.get('scenes', []))
    miss = sorted({u for u in used if u not in sk and u not in emo})
    if miss:
        print('⚠ 這些圖示沒有對應線稿，會退回「?」：', ' '.join(miss))
        print('  → 改用已有的線稿名（sketch 欄位），或把新線稿補進 engine/template/src/lib/sketches.ts')
    else:
        print(f'✓ 圖示 {len(used)} 個全部有線稿')
    return miss


# ── 品牌素材：封面＋片頭＋淡入正片（同範本E assemble.py 的順序；LOGO 已在畫面裡）──────────
COVER_SEC, FADE_SEC = 3.0, 0.6
VOPTS = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30']
AOPTS = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']


def ff(*args):
    sh(['ffmpeg', '-v', 'error', '-y', *args])


def black_rows(img_path):
    """封面上下緣的黑邊列數（截圖帶進來的視窗標題列：一列裡有 ≥3% 寬的連續近黑色就算）"""
    from PIL import Image
    import numpy as np
    g = np.asarray(Image.open(img_path).convert('L'))
    h, w = g.shape

    def is_bar(row):
        dark = row < 30
        run = best = 0
        for v in dark:
            run = run + 1 if v else 0
            best = max(best, run)
        return best >= w * 0.03
    top = 0
    while top < h // 6 and is_bar(g[top]): top += 1
    bot = 0
    while bot < h // 6 and is_bar(g[h - 1 - bot]): bot += 1
    return top, bot


def has_audio(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())


def first_color(video, t=1.0):
    """正片開場的底色（片頭淡出到這個顏色，接正片不跳）"""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', video, '-frames:v', '1', '-vf', 'crop=iw/3:ih/5:0:0,scale=1:1',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    b = r.stdout[:3] or b'\xef\xef\xf0'
    return '0x%02x%02x%02x' % tuple(b)


def brand_assemble(spec, main, out):
    """封面（3 秒，裁掉黑邊）→ 片頭（放大到 1080p）→ 片頭最後一格淡到正片底色 → 正片。回傳正片前面加了幾秒"""
    b = spec.get('brand') or {}
    if not (b.get('cover') or b.get('intro')):
        return 0.0
    work = os.path.join('out', '_brand'); os.makedirs(work, exist_ok=True)
    parts, lead = [], 0.0
    if b.get('cover'):
        top, bot = black_rows(b['cover'])
        if top or bot: print(f'✓ 封面裁掉黑邊：上 {top} 列、下 {bot} 列')
        ff('-loop', '1', '-t', str(COVER_SEC), '-i', b['cover'], '-f', 'lavfi', '-t', str(COVER_SEC), '-i', 'anullsrc=r=48000:cl=stereo',
           '-vf', f'crop=iw:ih-{top + bot}:0:{top},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
           *VOPTS, *AOPTS, '-shortest', os.path.join(work, 'cover.mp4'))
        parts.append(os.path.join(work, 'cover.mp4')); lead += COVER_SEC
    if b.get('intro'):
        vf = 'scale=1920:-2:flags=lanczos,crop=1920:1080,setsar=1'
        if has_audio(b['intro']):
            ff('-i', b['intro'], '-vf', vf, *VOPTS, *AOPTS, os.path.join(work, 'intro.mp4'))
        else:
            ff('-i', b['intro'], '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-vf', vf, *VOPTS, *AOPTS, '-shortest', os.path.join(work, 'intro.mp4'))
        parts.append(os.path.join(work, 'intro.mp4'))
        last = os.path.join(work, 'last.png')
        ff('-sseof', '-0.1', '-i', os.path.join(work, 'intro.mp4'), '-frames:v', '1', last)
        color = first_color(main)
        ff('-loop', '1', '-t', str(FADE_SEC), '-i', last, '-f', 'lavfi', '-t', str(FADE_SEC), '-i', 'anullsrc=r=48000:cl=stereo',
           '-vf', f'fade=t=out:st=0:d={FADE_SEC}:color={color},setsar=1', *VOPTS, *AOPTS, '-shortest', os.path.join(work, 'fade.mp4'))
        parts.append(os.path.join(work, 'fade.mp4'))
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(work, 'intro.mp4')], capture_output=True, text=True)
        lead += float(r.stdout.strip() or 0) + FADE_SEC
    parts.append(main)
    ins = sum((['-i', x] for x in parts), [])
    fc = ''.join(f'[{i}:v]setsar=1,fps=30,format=yuv420p[v{i}];[{i}:a]aresample=48000,aformat=channel_layouts=stereo[a{i}];' for i in range(len(parts)))
    fc += ''.join(f'[v{i}][a{i}]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=1[v][a]'
    ff(*ins, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', *VOPTS, *AOPTS, out)
    shutil.rmtree(work, ignore_errors=True)
    print(f'✓ 已接上品牌素材：正片前 {lead:.1f} 秒（' + '、'.join(k for k in ('cover', 'intro') if b.get(k)) + '）')
    return lead


def true_peak(path):
    """成片的真峰值（dBTP，EBU R128 量測）；量不到回傳 None"""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, errors='replace')
    m = re.findall(r'Peak:\s*(-?[\d.]+|-inf) dBFS', r.stderr)
    try:
        return float(m[-1]) if m else None
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard'); ap.add_argument('--template', required=True, choices=list(TPL))
    ap.add_argument('--name'); ap.add_argument('--no-sync', action='store_true')
    ap.add_argument('--no-qa', action='store_true'); ap.add_argument('--force', action='store_true')
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()
    T = a.template; info = TPL[T]
    if not os.path.exists('node_modules'):
        raise SystemExit('專案裡沒有 node_modules：先 npm install（或 junction 到共用的 node_modules）')
    if not a.no_sync: sync_engine()
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    build_sb = a.storyboard
    if not sb.get('music'):                       # 不改使用者的分鏡：寫一份暫存副本（同資料夾，mediaDir 相對路徑才對）
        sb['music'] = info['music']
        build_sb = os.path.join(os.path.dirname(os.path.abspath(a.storyboard)), f'.build_{T}.json')
        json.dump(sb, open(build_sb, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print('✓ 配樂用範本預設：', info['music'])
    check_icons(sb, T)
    py = sys.executable
    os.makedirs('qa', exist_ok=True)
    if not a.no_qa:   # ⓪ 文稿檢查（2026-10-05）：網址／協定／產品名寫法、年份百分比、大陸用語、唸法寫進稿子
        rc = sh([py, os.path.join(SKILL, 'final_qa', 'term_check.py'), a.storyboard, '--out', 'qa/文稿檢查'], check=False)
        if rc != 0 and not a.force:
            raise SystemExit('文稿檢查有「必改」，見 qa/文稿檢查/文稿檢查報告.html（改完重跑，或加 --force）')
    if a.preview:     # 分鏡預覽：暫配 → 建置 → 截圖 → 預覽頁（2026-10-06）
        os.environ['TTS_FORCE_EDGE'] = '1'
        sh([py, os.path.join(HERE, 'build.py'), build_sb])
        sh(['node', os.path.join(HERE, 'preview_stills.mjs'), f'Template{T}', 'qa/分鏡預覽'])
        sh([py, os.path.join(SKILL, 'final_qa', 'storyboard_page.py'), 'qa/分鏡預覽'])
        print()
        print('⛔ 請使用者看 qa/分鏡預覽/分鏡預覽.html（畫面文字、圖示、比喻、順序），確認後再拿掉 --preview 正式配音出片')
        return
    if not a.no_qa:   # 唸法標準題（2026-10-06）：Gemini 規則或專案 唸法標準題.json 沒全過就不配音
        if sh([py, os.path.join(HERE, 'pron_test.py')], check=False) != 0 and not a.force:
            raise SystemExit('唸法標準題沒有全過（見上方 ✗），修好唸法規則再配音（或加 --force）')
    sh([py, os.path.join(HERE, 'build.py'), build_sb])
    tc = json.load(open('qa/text_check.json', encoding='utf-8')) if os.path.exists('qa/text_check.json') else {}
    if tc.get('文不對題') and not a.no_qa and not a.force:
        raise SystemExit('物件文字跟旁白對不上（文不對題）：' + '；'.join(tc['文不對題'])
                         + '\n→ 把物件文字改成旁白裡的說法；刻意不唸的場景在 storyboard 加 "allowStatic": true（或加 --force）')
    sh([py, os.path.join(HERE, 'tpl_sfx.py'), T])
    os.makedirs('out', exist_ok=True); os.makedirs('qa', exist_ok=True)
    comp = f'Template{T}'
    if not a.no_qa:   # 配音後 AI 耳朵聽檢：只提醒，不擋（AI 標出的要人工聽過才算）
        if sh([py, os.path.join(HERE, 'ai_listen.py'), '--out', 'qa/聽檢'], check=False) == 2 and os.path.exists('qa/聽檢/聽檢.json'):
            # 兩個 AI 交叉聽：whisper 再聽一次，分確定／待聽／可接受／誤報，只有前兩種要人聽
            sh([py, os.path.join(SKILL, 'final_qa', 'listen_crosscheck.py'), 'qa/聽檢/聽檢.json'], check=False)
            print('⚠ 請聽 qa/聽檢/交叉聽.html 的「確定／待聽」（確認唸錯就改稿或唸法規則後重跑）')
        sh([py, os.path.join(SKILL, 'final_qa', 'pause_check.py')], check=False)   # 句內長停頓（只提醒）
    if not a.no_qa:
        rc = sh([py, os.path.join(HERE, 'qa.py'), '--comp', comp], check=False)
        shutil.copy('qa_report.md', f'qa/pre_{T}.md')
        if rc != 0 and not a.force:
            raise SystemExit(f'品檢有必修項目，見 qa/pre_{T}.md（修正後重跑，或加 --force）')
    name = a.name or os.path.splitext(os.path.basename(os.path.abspath(a.storyboard)))[0]
    raw, final = f'out/_raw_{T}.mp4', f'out/{name}_範本{T}_{info["name"]}.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', comp, raw, '--concurrency=4', '--crf=18', '--audio-codec=aac', '--audio-bitrate=192k', '--log=error'] if os.name != 'nt'
       else f'npx remotion render src/index.ts {comp} {raw} --concurrency=4 --crf=18 --audio-codec=aac --audio-bitrate=192k --log=error')
    spec = json.load(open(os.path.join('src', 'data', 'spec.json'), encoding='utf-8'))
    joined = f'out/_joined_{T}.mp4'
    lead = brand_assemble(spec, raw, joined)          # storyboard 有 "brand" 才會接封面／片頭
    src = joined if lead else raw
    # 峰值上限 −1.5 dBTP（−1 在 AAC 編碼後會浮到 −0.7，2026-10-05 最終品檢 F6 抓到）
    sh(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
    tp = true_peak(final)                          # AAC 編碼後峰值會再浮 0.3～0.6 dB：實際量一次，超過 −1 dBTP 才用更保守的上限重轉聲音
    if tp is not None and tp > -1.0:
        print(f'⚠ 成片峰值 {tp:.1f} dBTP 超過 −1，聲音改用 TP −2.5 重轉（2026-10-07 範本H 最終品檢 F6 抓到）')
        tmp = final + '.tmp.mp4'
        sh(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-2.5:LRA=9', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp])
        os.replace(tmp, final)
        print(f'  重轉後峰值 {true_peak(final):.1f} dBTP')
    for x in (raw, joined):
        if os.path.exists(x): os.remove(x)
    if lead:
        json.dump({'lead': lead}, open(os.path.join('qa', 'brand_lead.json'), 'w', encoding='utf-8'))
    if not a.no_qa:
        sh([py, os.path.join(HERE, 'qa.py'), '--comp', comp, '--skip-layout', '--skip-asr', '--video', final, '--lead', f'{lead:.3f}'], check=False)
        shutil.copy('qa_report.md', f'qa/post_{T}.md')
        if os.path.exists('qa_contact.jpg'): shutil.copy('qa_contact.jpg', f'qa/contact_{T}.jpg')
    print(f'\n✅ 成片：{final}')
    if lead:
        print(f'   （前 {lead:.1f} 秒是封面＋片頭；最終品檢請加 --jump-skip 0-{lead:.1f} --silence-ok {COVER_SEC + 0.5:.1f}）')
    readme = os.path.join(SKILL, 'templates', info['dir'], 'README.md')
    t = open(readme, encoding='utf-8').read()
    m = re.search(r'## 概念忠實度檢查.*?\n\n(?=## )', t, re.S)
    if m:
        print('\n⛔ 交付前人工核對「概念忠實度」（用連續格看，不是只看單格）：')
        for ln in m.group(0).splitlines():
            if re.match(r'\| \d', ln): print('  ', ln.split('|')[2].strip(), '—', ln.split('|')[3].strip())


if __name__ == '__main__':
    main()
