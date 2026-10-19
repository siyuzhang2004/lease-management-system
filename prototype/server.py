"""Local-only prototype server. Run: python prototype/server.py"""
import json
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from lease_engine import calculate

BASE = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def respond(self, status, data, content_type='application/json; charset=utf-8', filename=None):
        if isinstance(data, (dict, list)): data = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        if filename: self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers(); self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/health': return self.respond(200, dict(ok=True))
        if path == '/api/default-contract':
            with open(BASE/'default-contract.json','r',encoding='utf-8') as source:
                params=json.load(source)
            result=calculate(params)
            return self.respond(200,dict(id=result['params']['recordId'],params=result['params'],result=result))
        if path.startswith('/api/'): return self.respond(404, dict(error='接口不存在。'))
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path!='/api/calculate':return self.respond(404,dict(error='接口不存在。'))
        if self.headers.get('Origin') not in (None, 'http://127.0.0.1:8765', 'http://localhost:8765'):
            return self.respond(403, dict(error='仅接受本机原型页面请求。'))
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 2_000_000: raise ValueError('请求大小不正确。')
            raw=self.rfile.read(length)
            payload = json.loads(raw)
            if not isinstance(payload, dict): raise ValueError('参数格式不正确。')
            result = calculate(payload)
            if self.path == '/api/calculate': return self.respond(200, result)
            return self.respond(404, dict(error='接口不存在。'))
        except (ValueError, KeyError, TypeError) as e:
            self.respond(400, dict(error=str(e)))
        except Exception:
            traceback.print_exc()
            self.respond(500, dict(error='计算失败，请查看服务日志。'))


if __name__ == '__main__':
    print('Lease prototype: http://127.0.0.1:8765/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
