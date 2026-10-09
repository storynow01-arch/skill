"""系列教學模式的本機伺服器（由 啟動展示網頁.bat 執行）。
一台伺服器服務整個頻道資料夾（例 02_YT頻道影片/）：頻道總覽、每一科的展示網頁、每一節的成片都從這裡讀。
網頁上按「確定使用／要修改／已上架」、填 YouTube 網址、勾上架清單，會自動存到該科資料夾的 展示紀錄.json。
已經有一個伺服器在跑（例如先開了頻道總覽、又雙擊某一科的 bat）就只打開網頁，不重開。關掉黑色視窗＝關掉伺服器。

用法：python 啟動展示網頁.py --root <頻道資料夾> [--here <bat 所在資料夾>｜--open <頁面相對路徑>] [--no-open]"""
import argparse, datetime, json, os, socket, threading, urllib.parse, webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8766            # 挑版本模式用 8765；分開，兩種網頁可以同時開
STATUS = ('待確認', '要修改', '確定使用', '已上架')


def state_path(root, subject):
    """subject＝頻道資料夾底下的科目資料夾名稱；只接受真的存在、有 系列設定.md 的直接子資料夾"""
    if not subject or '/' in subject or '\\' in subject or subject.startswith('.'):
        return None
    d = os.path.join(root, subject)
    return os.path.join(d, '展示紀錄.json') if os.path.isfile(os.path.join(d, '系列設定.md')) else None


def clean(s):
    st = {k: v for k, v in dict(s.get('狀態', {})).items() if v in STATUS}
    yt = {k: str(v).strip() for k, v in dict(s.get('YouTube', {})).items() if str(v).strip().startswith('http')}
    note = {k: str(v)[:2000] for k, v in dict(s.get('修改備註', {})).items() if str(v).strip()}
    chk = {k: [bool(x) for x in list(v)[:20]] for k, v in dict(s.get('上架清單', {})).items()}
    return {'狀態': st, 'YouTube': yt, '修改備註': note, '上架清單': chk,
            '更新時間': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}


class H(SimpleHTTPRequestHandler):
    root = '.'

    def log_message(self, *a):
        pass

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(b)

    def _subject(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        return state_path(self.root, (q.get('s') or [''])[0])

    def do_GET(self):
        if self.path.startswith('/api/state'):
            p = self._subject()
            if not p:
                return self._json(400, {'錯誤': '科目不對'})
            try:
                return self._json(200, json.load(open(p, encoding='utf-8')))
            except (OSError, ValueError):
                return self._json(200, {})
        return super().do_GET()

    def do_POST(self):
        p = self._subject() if self.path.startswith('/api/state') else None
        if not p:
            return self._json(404, {'錯誤': '找不到'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            d = clean(json.loads(self.rfile.read(min(n, 2_000_000)).decode('utf-8')))
        except (ValueError, TypeError, AttributeError):
            return self._json(400, {'錯誤': '格式不對'})
        tmp = p + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        os.replace(tmp, p)
        return self._json(200, d)


def busy(port):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True); ap.add_argument('--open', default='展示網頁.html'); ap.add_argument('--no-open', action='store_true')
    ap.add_argument('--here', help='bat 所在資料夾：打開那一層的 展示網頁.html')
    a = ap.parse_args()
    root = os.path.abspath(a.root.strip('"'))
    if a.here:
        rel = os.path.relpath(os.path.abspath(a.here.strip('"')), root)
        a.open = '展示網頁.html' if rel in ('.', '') else rel.replace(os.sep, '/') + '/展示網頁.html'
    url = f'http://localhost:{PORT}/' + urllib.parse.quote(a.open.replace('\\', '/'))
    if busy(PORT):                      # 已經開著：只開網頁
        print('展示網頁伺服器已經在跑，直接打開：', url)
        if not a.no_open:
            webbrowser.open(url)
        raise SystemExit(0)
    H.root = root
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), partial(H, directory=root))
    print('展示網頁已啟動：', url)
    print('按鈕會自動存到各科資料夾的 展示紀錄.json。關掉這個視窗就會停止。')
    if not a.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    srv.serve_forever()
