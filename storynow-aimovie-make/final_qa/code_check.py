"""A1 程式碼自動執行（2026-10-08）：影片裡的每段程式都實際編譯執行，輸出要和預期一樣、也要真的出現在畫面上。

    python code_check.py storyboard.json [--out qa/品檢紀錄]

場景的 "verify" 清單：
  {"type": "code", "lang": "c",      "src": "#include <stdio.h>\\nint main(){printf(\\"%d\\\\n\\", 3+4);}", "stdout": "7"}
  {"type": "code", "lang": "python", "file": "code/陣列.py", "stdin": "5\\n", "stdout": "15"}
選用：
  "nondeterministic": true   用到亂數、時間的程式：只檢查能編譯、正常結束，不比對輸出
  "screen": false            輸出不顯示在畫面上（不檢查 A1.畫面）
  "timeout": 10              秒
語言：python（本機 Python）、c（gcc）、cpp（g++）。缺編譯器 → A1.環境（擋），裝好再跑。
C／C++ 用 -Wall -Wextra -O2 編譯：有警告 → A1.警告（提醒後擋；陣列越界這類「碰巧印對」的錯程式會在這裡現形）。
沒標 verify、但畫面文字看起來是程式碼的場景 → A1.未標（提醒）。
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

LOOKS_LIKE_CODE = re.compile(r'#include\s*<|\bprintf\s*\(|\bscanf\s*\(|\bint\s+main\s*\(|\bdef\s+\w+\s*\(|\bprint\s*\(|\bfor\s*\(.*;.*;')
TOOLS = {'python': None, 'c': 'gcc', 'cpp': 'g++'}
WARNINGS = []      # 這一段程式的編譯警告（run_code 填入）


def find_tool(name):
    """先找 PATH；找不到再看 winget 裝 WinLibs 的預設位置（剛裝好、還沒重開的程式 PATH 裡沒有）"""
    hit = shutil.which(name)
    if hit or os.name != 'nt':
        return hit
    import glob
    for d in glob.glob(os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Packages', 'BrechtSanders.WinLibs*', 'mingw64', 'bin')):
        p = os.path.join(d, name + '.exe')
        if os.path.exists(p):
            return p
    return None


def texts(o):
    """場景畫面上的文字（props 裡所有字串）"""
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in ('cue', 'icon', 'sketch', 'color', 'media'):
                yield from texts(v)
    elif isinstance(o, list):
        for v in o:
            yield from texts(v)


def norm(s):
    return '\n'.join(ln.rstrip() for ln in s.replace('\r\n', '\n').strip('\n').split('\n'))


def run_code(v, base, work):
    """回傳 (錯誤訊息或 None, 實際輸出)"""
    lang = v.get('lang', '').lower()
    if lang not in TOOLS:
        return f'不支援的語言「{lang}」（可用：{"、".join(TOOLS)}）', ''
    src = v.get('src')
    if src is None:
        path = os.path.join(base, v.get('file', ''))
        if not os.path.isfile(path):
            return f'找不到程式檔 {path}', ''
        src = open(path, encoding='utf-8').read()
    to = v.get('timeout', 10)
    ext = {'python': '.py', 'c': '.c', 'cpp': '.cpp'}[lang]
    f = os.path.join(work, 'prog' + ext)
    open(f, 'w', encoding='utf-8').write(src)
    if lang == 'python':
        cmd = [sys.executable, '-I', f]
    else:
        exe = os.path.join(work, 'prog.exe')
        # -Wall -Wextra -O2：讓 gcc 抓出「碰巧印對」的錯程式（陣列越界、未初始化變數…，2026-10-08 實測 i<=5 越界照樣印出 15）
        r = subprocess.run([find_tool(TOOLS[lang]), f, '-o', exe, '-std=c11' if lang == 'c' else '-std=c++17', '-Wall', '-Wextra', '-O2'],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60)
        warns = [ln.split(os.sep)[-1] for ln in r.stderr.splitlines() if ' warning: ' in ln]
        if r.returncode:
            lines = r.stderr.strip().splitlines() or ['?']
            err = next((ln for ln in lines if ' error: ' in ln or ln.startswith('error')), lines[0])
            return '編譯失敗：' + err.split(os.sep)[-1][:200], ''
        cmd = [exe]
        if warns:
            WARNINGS.append(warns[0][:200])
    try:
        r = subprocess.run(cmd, input=v.get('stdin', ''), capture_output=True, text=True,
                           encoding='utf-8', errors='replace', timeout=to, cwd=work)
    except subprocess.TimeoutExpired:
        return f'執行超過 {to} 秒（無窮迴圈或在等輸入？）', ''
    if r.returncode:
        return f'執行失敗（結束碼 {r.returncode}）：' + (r.stderr.strip().splitlines() or [''])[-1][:200], r.stdout
    return None, r.stdout


def check(sb, base, rec):
    n = 0
    for sc in sb.get('scenes', []):
        sid = sc.get('id', '?')
        items = [v for v in sc.get('verify', []) if v.get('type') == 'code']
        screen = '\n'.join(texts(sc.get('props', {})))
        if not items and LOOKS_LIKE_CODE.search(screen):
            rec.problem('A1.未標', sid, '畫面上看起來有程式碼，但沒有標 verify（沒驗證過）', sc)
        for k, v in enumerate(items, 1):
            n += 1
            where = f'{sid} 第 {k} 段（{v.get("lang", "?")}）'
            tool = TOOLS.get(v.get('lang', '').lower())
            if tool and not find_tool(tool):
                rec.problem('A1.環境', where, f'這台電腦沒有 {tool}，無法驗證（Windows 可裝 MSYS2 或 WinLibs 的 gcc）', sc)
                continue
            WARNINGS.clear()
            with tempfile.TemporaryDirectory() as work:
                err, out = run_code(v, base, work)
            for w in WARNINGS:
                rec.problem('A1.警告', where, f'編譯警告（程式可能碰巧印對）：{w}', sc)
            if err:
                rec.problem('A1.執行', where, err, sc)
                continue
            if v.get('nondeterministic'):
                continue
            want = norm(str(v.get('stdout', '')))
            if norm(out) != want:
                rec.problem('A1.執行', where, f'實際輸出「{norm(out)[:80]}」≠ 預期「{want[:80]}」', sc)
                continue
            if v.get('screen', True):
                missing = [ln for ln in want.split('\n') if ln.strip() and ln.strip() not in screen]
                if missing:
                    rec.problem('A1.畫面', where, f'預期輸出沒出現在畫面上：{missing[:3]}', sc)
    rec.note(f'驗證 {n} 段程式')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('storyboard'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('A1 程式碼執行', a.out)
    check(json.load(open(a.storyboard, encoding='utf-8')), os.path.dirname(os.path.abspath(a.storyboard)), rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
