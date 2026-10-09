"""作品集統計（網路儀表板的「作品集」分區）：從本機頻道資料夾讀每一科的進度，寫成 site/作品集.json＋site/works/<封面>.jpg，
推上 GitHub 後網路儀表板就更新（網站只讀遠端倉庫；影片不上傳，只有文字與一張封面）。

  python sync_works.py <頻道資料夾>      例：python sync_works.py D:/claude/00_168_YT頻道/02_YT頻道影片

每一科（有 系列設定.md 的資料夾）：名稱、類型、範本、播放清單、章數、全部節數、已成片、已上架、內容（各章主題）、說明、封面。"""
import datetime, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def outline(md):
    rows = []
    for ln in md.splitlines():
        c = [x.strip() for x in ln.strip().strip('|').split('|')] if ln.startswith('|') else []
        if len(c) >= 2 and re.fullmatch(r'\d+-[0-9A-Za-z統]+|\d+', c[0]):
            rows.append((c[0], re.sub(r'\*\*', '', c[1])))
        elif len(c) >= 2 and re.fullmatch(r'\*\*[一二三四五六七八九十]+\*\*', c[0]):
            rows.append(('章', re.sub(r'\*\*', '', c[1])))
    return rows


def main():
    root = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
    os.makedirs(os.path.join(HERE, 'works'), exist_ok=True)
    works = []
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if not os.path.isfile(os.path.join(d, '系列設定.md')):
            continue
        md = open(os.path.join(d, '系列設定.md'), encoding='utf-8').read()
        rows = outline(md)
        lessons = [r for r in rows if r[0] != '章']
        chapters = [t for k, t in rows if k == '章']
        vids = []
        for sub in sorted(os.listdir(d)):
            out = os.path.join(d, sub, 'out')
            if re.match(r'\d+_', sub) and os.path.isdir(out):
                mp4 = [f for f in os.listdir(out) if f.endswith('.mp4') and not f.startswith('_')]
                if mp4:
                    vids.append(os.path.join(out, mp4[0]))
        st = os.path.join(d, '展示紀錄.json')
        state = json.load(open(st, encoding='utf-8')) if os.path.exists(st) else {}
        up = sum(1 for v in (state.get('狀態') or {}).values() if v == '已上架')
        m = re.search(r'播放清單[^：:]*[：:]\s*([^\n（(]+)', md)
        tm = re.search(r'範本：\*\*([^*]+)\*\*', md)
        slug = re.sub(r'[^0-9A-Za-z]', '', name.encode('utf-8').hex())[:12]
        cover = ''
        poster = os.path.join(d, '展示網頁素材')
        cands = sorted(f for f in os.listdir(poster) if f.endswith('.jpg')) if os.path.isdir(poster) else []
        if cands:                                      # 展示網頁已經有封面：縮成 960 寬
            cover = f'{slug}.jpg'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(poster, cands[-1]), '-vf', 'scale=960:-2', '-q:v', '4', os.path.join(HERE, 'works', cover)])
        works.append({'名稱': name.split('_', 1)[-1], '科目資料夾': name, '類型': '系列教學', '範本': tm.group(1).strip() if tm else '',
                      '播放清單': m.group(1).strip().strip('「」') if m else '', '章數': len(chapters), '全部': len(lessons),
                      '已成片': len(vids), '已上架': up, '內容': chapters[:12], '封面': cover,
                      '說明': f'{len(chapters)} 章、{len(lessons)} 節的系列教學影片；已成片 {len(vids)} 節、已上架 {up} 節。',
                      '更新': datetime.date.today().isoformat()})
    json.dump(works, open(os.path.join(HERE, '作品集.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'作品集：{len(works)} 個 → site/作品集.json（記得 commit＋push，網路儀表板才會更新）')


if __name__ == '__main__':
    main()
