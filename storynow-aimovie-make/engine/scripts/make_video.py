"""一行做出範本影片：同步引擎 → 檢查圖示 → 建置（旁白、配樂、字幕）→ 範本音效 → 版面＋旁白品檢 → 算圖 → 響度 → 成片品檢。

用法（在專案資料夾裡執行；專案由 new_project.py 建立，node_modules 已就緒）：
    python <skill>/engine/scripts/make_video.py storyboard.json --template B
    python <skill>/engine/scripts/make_video.py storyboard.json --template A --name 1-3_IP位址
選項：
    --no-sync     不把 skill 最新的範本程式（tpl、lib、QaProbe）同步進專案
    --no-qa       跳過品檢（不建議）
    --force       品檢有「必修」也繼續算圖
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


def known_icons():
    t = open(os.path.join(SRC, 'lib', 'sketches.ts'), encoding='utf-8').read()
    sk = set(re.findall(r'^\s{2}(\w+): \{paths', t, re.M))
    emo = dict(re.findall(r"'([^']+)': '(\w+)'", t.split('EMOJI_TO_SKETCH')[1]))
    return sk, emo


def check_icons(sb):
    sk, emo = known_icons()
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard'); ap.add_argument('--template', required=True, choices=list(TPL))
    ap.add_argument('--name'); ap.add_argument('--no-sync', action='store_true')
    ap.add_argument('--no-qa', action='store_true'); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    T = a.template; info = TPL[T]
    if not os.path.exists('node_modules'):
        raise SystemExit('專案裡沒有 node_modules：先 npm install（或 junction 到共用的 node_modules）')
    if not a.no_sync: sync_engine()
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    if not sb.get('music'):
        sb['music'] = info['music']
        json.dump(sb, open(a.storyboard, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print('✓ 配樂用範本預設：', info['music'])
    check_icons(sb)
    py = sys.executable
    sh([py, os.path.join(HERE, 'build.py'), a.storyboard])
    sh([py, os.path.join(HERE, 'tpl_sfx.py'), T])
    os.makedirs('out', exist_ok=True); os.makedirs('qa', exist_ok=True)
    comp = f'Template{T}'
    if not a.no_qa:
        rc = sh([py, os.path.join(HERE, 'qa.py'), '--comp', comp], check=False)
        shutil.copy('qa_report.md', f'qa/pre_{T}.md')
        if rc != 0 and not a.force:
            raise SystemExit(f'品檢有必修項目，見 qa/pre_{T}.md（修正後重跑，或加 --force）')
    name = a.name or os.path.splitext(os.path.basename(os.path.abspath(a.storyboard)))[0]
    raw, final = f'out/_raw_{T}.mp4', f'out/{name}_範本{T}_{info["name"]}.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', comp, raw, '--concurrency=4', '--crf=18', '--audio-codec=aac', '--audio-bitrate=192k', '--log=error'] if os.name != 'nt'
       else f'npx remotion render src/index.ts {comp} {raw} --concurrency=4 --crf=18 --audio-codec=aac --audio-bitrate=192k --log=error')
    sh(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1:LRA=9', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final])
    os.remove(raw)
    if not a.no_qa:
        sh([py, os.path.join(HERE, 'qa.py'), '--comp', comp, '--skip-layout', '--skip-asr', '--video', final], check=False)
        shutil.copy('qa_report.md', f'qa/post_{T}.md')
        if os.path.exists('qa_contact.jpg'): shutil.copy('qa_contact.jpg', f'qa/contact_{T}.jpg')
    print(f'\n✅ 成片：{final}')
    readme = os.path.join(SKILL, 'templates', info['dir'], 'README.md')
    t = open(readme, encoding='utf-8').read()
    m = re.search(r'## 概念忠實度檢查.*?\n\n(?=## )', t, re.S)
    if m:
        print('\n⛔ 交付前人工核對「概念忠實度」（用連續格看，不是只看單格）：')
        for ln in m.group(0).splitlines():
            if re.match(r'\| \d', ln): print('  ', ln.split('|')[2].strip(), '—', ln.split('|')[3].strip())


if __name__ == '__main__':
    main()
