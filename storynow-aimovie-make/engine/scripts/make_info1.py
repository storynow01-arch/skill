"""「資訊科範本1」一行出片：活動說明段（storyboard.json）＋資訊科宣傳片 → 串接成一支（兩段各自 loudnorm −14）。

用法（在說明段專案資料夾裡；專案由 new_project.py 建立、node_modules 已就緒、storyboard.json 已依活動改好並經使用者審過）：
    python <skill>/engine/scripts/make_info1.py storyboard.json --name 1015研習
選項：
    --trailer remotion|python   宣傳片版本（預設 remotion）
    --rebuild-trailer           忽略快取，重算宣傳片（改了宣傳片事實後要加）
    --no-qa                     跳過說明段的品檢
    --preview                   分鏡預覽（配音前給使用者看）：edge-tts 暫配 → 每場截一張 → qa/分鏡預覽/分鏡預覽.html，不算圖
品檢（2026-10-06，跟外層工作流一致）：唸法標準題 → 建置（Gemini 過壞音檔關卡）→ AI 耳朵 → 兩個 AI 交叉聽 → 句內停頓 → 版面＋旁白品檢。
配音規則：專案自己的 .env.local 有 GEMINI_API_KEY 才用 Gemini，否則 edge-tts。
宣傳片快取在 <skill>/templates/資訊科範本1/cache/（不進 git）；沒有快取會自動在 ../trailer 重算一次再存回快取。
"""
import argparse, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..', '..'))
INFO = os.path.join(SKILL, 'templates', '資訊科範本1')
SRC = os.path.join(HERE, '..', 'template', 'src')


def sh(cmd, cwd=None, check=True):
    print('▶', cmd, flush=True)
    r = subprocess.run(cmd, shell=True, cwd=cwd)
    if check and r.returncode != 0:
        raise SystemExit(f'失敗（結束碼 {r.returncode}）：{cmd}')
    return r.returncode


def link_modules(src_nm, dst_dir):
    dst = os.path.join(dst_dir, 'node_modules')
    if os.path.exists(dst): return
    real = os.path.realpath(src_nm)
    if os.name == 'nt': sh(f'mklink /J "{dst}" "{real}"')
    else: os.symlink(real, dst)


def trailer(kind, rebuild):
    cache = os.path.join(INFO, 'cache', f'trailer_{kind}.mp4')
    if os.path.exists(cache) and not rebuild:
        print('✓ 宣傳片用快取：', cache)
        return cache
    work = os.path.abspath(os.path.join('..', 'trailer'))
    shutil.copytree(os.path.join(INFO, 'trailer'), work, dirs_exist_ok=True)
    py = sys.executable
    if kind == 'python':
        sh(f'"{py}" audio/make_music.py', cwd=work)
        sh(f'"{py}" python_trailer.py', cwd=work)
        out = os.path.join(work, 'haiching_it_trailer_python.mp4')
        if not os.path.exists(out):
            raise SystemExit('Python 版宣傳片沒有產出：請檢查 python_trailer.py 檔頭的路徑設定')
    else:
        link_modules('node_modules', work)       # 和說明段共用同一份套件（版本相同）
        sh(f'"{py}" audio/make_music.py', cwd=work)
        os.makedirs(os.path.join(work, 'public'), exist_ok=True)
        shutil.copy(os.path.join(work, 'audio', 'soundtrack.wav'), os.path.join(work, 'public', 'soundtrack.wav'))
        out = os.path.join(work, 'out', 'trailer.mp4')
        sh(f'npx remotion render src/index.ts Trailer "{out}" --concurrency=4 --crf=16 --audio-codec=aac --log=error', cwd=work)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    shutil.copy(out, cache)
    print('✓ 宣傳片已重算並存入快取：', cache)
    return cache


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard'); ap.add_argument('--name', default='活動')
    ap.add_argument('--trailer', default='remotion', choices=['remotion', 'python'])
    ap.add_argument('--rebuild-trailer', action='store_true'); ap.add_argument('--no-qa', action='store_true')
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()
    if not os.path.exists('node_modules'):
        raise SystemExit('專案裡沒有 node_modules：先 npm install（或 junction 到共用的 node_modules）')
    for d in ('lib', 'custom', 'tpl'):
        shutil.copytree(os.path.join(SRC, d), os.path.join('src', d), dirs_exist_ok=True)
    py = sys.executable
    fq = os.path.join(SKILL, 'final_qa')
    if a.preview:     # 分鏡預覽（2026-10-06）
        os.environ['TTS_FORCE_EDGE'] = '1'
        sh(f'"{py}" "{os.path.join(HERE, "build.py")}" "{a.storyboard}"')
        sh(f'node "{os.path.join(HERE, "preview_stills.mjs")}" Video qa/分鏡預覽')
        sh(f'"{py}" "{os.path.join(fq, "storyboard_page.py")}" qa/分鏡預覽')
        print('⛔ 請使用者看 qa/分鏡預覽/分鏡預覽.html，確認後拿掉 --preview 正式出片')
        return
    if not a.no_qa and sh(f'"{py}" "{os.path.join(HERE, "pron_test.py")}"', check=False) != 0:
        raise SystemExit('唸法標準題沒有全過（見上方 ✗），修好唸法規則再配音')
    sh(f'"{py}" "{os.path.join(HERE, "build.py")}" "{a.storyboard}"')
    os.makedirs('out', exist_ok=True)
    if not a.no_qa:   # 配音後：AI 耳朵（有 Gemini 金鑰才跑）→ 交叉聽 → 句內停頓（都只提醒）
        if sh(f'"{py}" "{os.path.join(HERE, "ai_listen.py")}" --out qa/聽檢', check=False) == 2 and os.path.exists('qa/聽檢/聽檢.json'):
            sh(f'"{py}" "{os.path.join(fq, "listen_crosscheck.py")}" qa/聽檢/聽檢.json', check=False)
            print('⚠ 請聽 qa/聽檢/交叉聽.html 的「確定／待聽」')
        sh(f'"{py}" "{os.path.join(fq, "pause_check.py")}"', check=False)
    if not a.no_qa:
        rc = sh(f'"{py}" "{os.path.join(HERE, "qa.py")}" --comp Video', check=False)
        if rc != 0:
            raise SystemExit('說明段品檢有必修項目，見 qa_report.md（修正後重跑）')
    sh('npx remotion render src/index.ts Video out/notice.mp4 --concurrency=4 --crf=18 --audio-codec=aac --log=error')
    tr = trailer(a.trailer, a.rebuild_trailer)
    final = f'out/{a.name}_說明+資訊科宣傳片.mp4'
    fc = ('[0:a]loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[a0];[1:a]loudnorm=I=-14:TP=-1:LRA=9,aresample=48000[a1];'
          '[0:v]fps=30,format=yuv420p,scale=1920:1080[v0];[1:v]fps=30,format=yuv420p,scale=1920:1080[v1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]')
    print('▶ ffmpeg 串接', flush=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'out/notice.mp4', '-i', tr, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final], check=True)
    print(f'\n✅ 成片：{final}')
    print('⛔ 交付前：抽 12 格（說明段每段一格＋宣傳片 3 格）、確認數字（34% 等）與個資（不放手機）')


if __name__ == '__main__':
    main()
