"""建立新影片專案：複製 template → 目標資料夾，放一份 storyboard 範本，npm install。

用法：
    python new_project.py <目標資料夾> [--example teach|promo] [--style blueprint] [--no-install]
"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")   # cp950 主控台印 ⚠ 會當掉（2026-10-08）
import argparse, json, os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, '..', 'template')
EX = os.path.join(HERE, '..', 'examples')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dest'); ap.add_argument('--example', default='teach', choices=['teach', 'promo'])
    ap.add_argument('--style'); ap.add_argument('--no-install', action='store_true')
    a = ap.parse_args()
    dest = os.path.abspath(a.dest)
    if os.path.exists(os.path.join(dest, 'package.json')):
        raise SystemExit(f'{dest} 已經是專案，不覆蓋')
    shutil.copytree(TPL, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns('node_modules', 'out', '.tts_cache'))
    sb_src = os.path.join(EX, f'{a.example}_storyboard.json')
    sb = json.load(open(sb_src, encoding='utf-8'))
    if a.style: sb['style'] = a.style
    json.dump(sb, open(os.path.join(dest, 'storyboard.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    # 配音用 Gemini Flash TTS：金鑰只放本機 .env.local，.gitignore 排除
    env = os.path.join(dest, '.env.local')
    if not os.path.exists(env):
        open(env, 'w', encoding='utf-8').write('# Gemini API 金鑰（只放本機，不要上傳）\nGEMINI_API_KEY=請貼上你的key\n')
    gi = os.path.join(dest, '.gitignore')
    old = open(gi, encoding='utf-8').read() if os.path.exists(gi) else ''
    add = [x for x in ('.env.local', '.env*', '.tts_cache/', '.gemini_voices.json') if x not in old.split('\n')]
    if add:
        open(gi, 'a', encoding='utf-8').write(('\n' if old and not old.endswith('\n') else '') + '\n'.join(add) + '\n')
    print('專案 →', dest)
    print('  ⚠ 配音規則：.env.local 填了 GEMINI_API_KEY 就用 Gemini Flash TTS，沒填就用 edge-tts')
    if not a.no_install:
        subprocess.check_call('npm install --no-audit --no-fund', cwd=dest, shell=True)
    print('下一步：\n  1. 編輯 storyboard.json\n  2. python', os.path.join(HERE, 'build.py'), 'storyboard.json\n  3. npx remotion studio  或  npm run render')


if __name__ == '__main__':
    main()
