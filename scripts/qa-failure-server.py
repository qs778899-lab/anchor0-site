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
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'dist'
fail_once = {'/code/assets/manifest.json', '/demo/assets/sim.worker-B2q0D_ik.js'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
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
