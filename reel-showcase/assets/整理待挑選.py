"""使用者說「挑完了」時執行：依 挑選紀錄.json 整理 待挑選/。
  選「要」  → 依該版本 版本.json 的「分區」移到 無配音_廣告/ 或 有配音/
  選「不要」→ 移到資源回收筒（不是永久刪除）
  還沒決定  → 留在 待挑選/
做完會更新 挑選紀錄.json（清掉已處理的）並重建展示網頁。
「收進 skill」的標記不在這裡處理（要照 skill 的 範本規格.md 做，且 commit／push 前要使用者同意）。
用法：在 04_版本庫/ 執行  PYTHONUTF8=1 py 整理待挑選.py          （先看會做什麼：加 --dry-run）"""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
DRY = '--dry-run' in sys.argv
STATE = '挑選紀錄.json'
s = json.load(open(STATE, encoding='utf-8')) if os.path.exists(STATE) else {}
picks = s.get('待挑選', {})
slug = lambda x: re.sub(r'[\\/:*?"<>|\s]+', '_', x)


def to_recycle(path):
    p = os.path.abspath(path).replace("'", "''")
    ps = ("Add-Type -AssemblyName Microsoft.VisualBasic; "
          f"[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('{p}', 'OnlyErrorDialogs', 'SendToRecycleBin')")
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)


moved, binned, left = [], [], []
for name in sorted(os.listdir('待挑選')) if os.path.isdir('待挑選') else []:
    d = os.path.join('待挑選', name)
    meta = os.path.join(d, '版本.json')
    if not os.path.isfile(meta):
        continue
    sid, v = slug(name), picks.get(slug(name))
    if v == '要':
        m = json.load(open(meta, encoding='utf-8'))
        dest = m.get('分區', '無配音_廣告')
        if dest not in ('無配音_廣告', '有配音'):
            print('✗ 分區寫錯，略過：', name, dest); left.append(name); continue
        target = os.path.join(dest, name)
        if os.path.exists(target):
            print('✗ 目的地已經有同名資料夾，略過：', target); left.append(name); continue
        if os.path.isdir(os.path.join(d, 'node_modules')):
            print('✗ 裡面有 node_modules（可能是 junction），請先拆掉，略過：', name); left.append(name); continue
        print(f'要　 {name} → {dest}/')
        if not DRY:
            shutil.move(d, target)
        moved.append(sid)
    elif v == '不要':
        if os.path.isdir(os.path.join(d, 'node_modules')):
            print('✗ 裡面有 node_modules（可能是 junction），請先拆掉，略過：', name); left.append(name); continue
        print(f'不要 {name} → 資源回收筒')
        if not DRY:
            to_recycle(d)
            for f in (f'展示網頁素材/{sid}.jpg', f'展示網頁素材/preview/{sid}.mp4'):
                if os.path.exists(f):
                    os.remove(f)  # 自動產生的封面與預覽，可重建
        binned.append(sid)
    else:
        left.append(name)

print(f'\n要 {len(moved)} 支、不要 {len(binned)} 支、還沒決定 {len(left)} 支')
if DRY:
    print('（--dry-run：沒有真的動檔案）')
    sys.exit()
for sid in moved + binned:
    picks.pop(sid, None)
s['待挑選'] = picks
json.dump(s, open(STATE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
subprocess.run([sys.executable, '產生展示網頁.py'], check=True)
