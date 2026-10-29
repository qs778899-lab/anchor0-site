"""Local-only browser QA: fail each route's initial load once, then serve normally.

Run explicitly, open /code/ and /demo/, and use each page's retry button.
Never used by the LAN server or deployed site.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=18082)
parser.add_argument('--screenshot-failure', action='store_true', help='Fail the first PNG encoding per page, then allow retry')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'dist'
fail_once = set() if args.screenshot_failure else {'/code/assets/manifest.json', '/demo/assets/sim.worker-interactive.js'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if args.screenshot_failure and path in ('/demo/', '/demo/index.html'):
            injection = """<script>
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            let failNextPng = true;
            HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
                if (failNextPng) { failNextPng = false; callback(null); return; }
                return originalToBlob.call(this, callback, ...args);
            };
            </script>"""
            page = (root / 'demo/index.html').read_text().replace('</head>', injection + '</head>').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(page)))
            self.end_headers()
            self.wfile.write(page)
            return
        if path in fail_once:
            fail_once.remove(path)
            self.send_response(503)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(b'Intentional one-time QA failure; retry to recover.')
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        if '503' in str(args):
            super().log_message(format, *args)

print(f'Local failure QA: http://127.0.0.1:{args.port}/', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
