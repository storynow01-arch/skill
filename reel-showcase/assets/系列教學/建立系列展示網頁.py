"""一鍵建立（或更新）系列教學模式的展示網頁：
  1. 把程式與樣式複製到 <頻道資料夾>/_展示網頁/（每次執行都覆蓋成 skill 的最新版＝各專案同步）
  2. 在頻道資料夾、每一科資料夾寫 啟動展示網頁.bat（Big5＋CRLF；雙擊就開，同一台伺服器）
  3. 重建頻道總覽與每一科的展示網頁
用法：python 建立系列展示網頁.py <頻道資料夾>      例：python 建立系列展示網頁.py D:/claude/00_168_YT頻道/02_YT頻道影片"""
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BAT = ('@echo off\r\ncd /d "%~dp0"\r\ntitle 展示網頁（關掉這個視窗就停止）\r\n'
       'python "{prog}啟動展示網頁.py" --root "{root}" --here "%~dp0."\r\nif errorlevel 1 pause\r\n')


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    root = os.path.abspath(sys.argv[1])
    prog = os.path.join(root, '_展示網頁')
    os.makedirs(prog, exist_ok=True)
    for f in ('啟動展示網頁.py', '產生系列展示網頁.py', '產生頻道總覽.py', 'series.css', 'series.js'):
        shutil.copyfile(os.path.join(HERE, f), os.path.join(prog, f))
    shutil.copyfile(os.path.join(HERE, '..', '展示網頁樣式', 'site.css'), os.path.join(prog, 'site.css'))
    # 頻道層的 bat：程式在 .\_展示網頁\；科目層：..\_展示網頁\（路徑一律用 %~dp0，bat 裡不放中文資料夾名）
    open(os.path.join(root, '啟動展示網頁.bat'), 'w', encoding='cp950', newline='').write(
        BAT.format(prog='%~dp0_展示網頁\\', root='%~dp0.'))
    n = 0
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if os.path.isfile(os.path.join(d, '系列設定.md')):
            open(os.path.join(d, '啟動展示網頁.bat'), 'w', encoding='cp950', newline='').write(
                BAT.format(prog='%~dp0..\\_展示網頁\\', root='%~dp0..'))
            n += 1
    print(f'程式 → {prog}；啟動展示網頁.bat → 頻道層＋{n} 科')
    subprocess.run([sys.executable, os.path.join(prog, '產生頻道總覽.py')], check=True, env={**os.environ, 'PYTHONUTF8': '1'})


if __name__ == '__main__':
    main()
