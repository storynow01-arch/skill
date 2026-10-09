"""由 啟動展示網頁.bat 執行（雙擊那個批次檔）打開展示網頁。會在本機開一個小伺服器（只有這台電腦連得到），
網頁上按「要／不要」「收進 skill」會自動存到同資料夾的 挑選紀錄.json，Claude 讀這個檔就知道你挑了什麼。
關掉這個黑色視窗＝關掉伺服器。"""
import json, os, sys, threading, webbrowser, urllib.parse, datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, '挑選紀錄.json')
PORT = 8765


class H(SimpleHTTPRequestHandler):
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

    def do_GET(self):
        if self.path.startswith('/api/state'):
            try:
                return self._json(200, json.load(open(STATE, encoding='utf-8')))
            except (OSError, ValueError):
                return self._json(200, {})
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith('/api/state'):
            return self._json(404, {'錯誤': '找不到'})
        try:
            n = int(self.headers.get('Content-Length', 0))
            s = json.loads(self.rfile.read(min(n, 1_000_000)).decode('utf-8'))
            d = {'待挑選': {k: v for k, v in dict(s.get('待挑選', {})).items() if v in ('要', '不要')},
                 '收進skill': [x for x in list(s.get('收進skill', [])) if isinstance(x, str)],
                 '更新時間': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        except (ValueError, TypeError, AttributeError):
            return self._json(400, {'錯誤': '格式不對'})
        tmp = STATE + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        os.replace(tmp, STATE)
        return self._json(200, d)


if __name__ == '__main__':
    no_open = '--no-open' in sys.argv
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), partial(H, directory=HERE))
    url = f'http://localhost:{PORT}/' + urllib.parse.quote('展示網頁.html')
    print('展示網頁已啟動：', url)
    print('挑選結果會自動存到：', STATE)
    print('關掉這個視窗就會停止。')
    if not no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    srv.serve_forever()
