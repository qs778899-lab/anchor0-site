#!/usr/bin/env python3
"""LAN static server with byte-range media streaming and explicit MIME types."""
import argparse
import functools
import http.server
import os
from pathlib import Path
import re
import socketserver
import urllib.parse

ROOT = Path(__file__).resolve().parents[1] / 'dist'

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
        '.wasm':'application/wasm', '.bin':'application/octet-stream',
        '.gz':'application/octet-stream', '.mp4':'video/mp4', '.json':'application/json; charset=utf-8'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def list_directory(self, path):
        self.send_error(404, 'Not found')
        return None

    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        try:
            path.resolve().relative_to(ROOT.resolve())
        except ValueError:
            self.send_error(403); return None
        if path.is_dir():
            parts = urllib.parse.urlsplit(self.path)
            if not parts.path.endswith('/'):
                self.send_response(301)
                self.send_header('Location', urllib.parse.urlunsplit(parts._replace(path=parts.path + '/')))
                self.send_header('Content-Length', '0'); self.end_headers(); return None
            path = path / 'index.html'
        if not path.is_file():
            self.send_error(404); return None
        size = path.stat().st_size
        start, end = 0, max(0, size - 1)
        requested = self.headers.get('Range')
        if requested:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
            if match and (match[1] or match[2]) and size:
                if match[1]:
                    start = int(match[1]); end = min(int(match[2]) if match[2] else size - 1, size - 1)
                else:
                    start = max(0, size - int(match[2])); end = size - 1
                if start >= size or start > end:
                    match = None
            else: match = None
            if not match:
                self.send_response(416); self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length','0'); self.end_headers(); return None
            self.byte_range = (start, end)
        handle = path.open('rb')
        self.send_response(206 if self.byte_range else 200)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(end - start + 1 if size else 0))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Last-Modified', self.date_time_string(path.stat().st_mtime))
        self.send_header('Cache-Control', 'public, max-age=3600' if path.suffix in {'.mp4','.jpg','.png','.bin','.wasm','.gz'} else 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        if self.byte_range: self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        return handle

    def copyfile(self, source, outputfile):
        remaining = None
        if self.byte_range:
            start, end = self.byte_range
            source.seek(start); remaining = end - start + 1
        try:
            while remaining is None or remaining > 0:
                chunk = source.read(256 * 1024 if remaining is None else min(256 * 1024, remaining))
                if not chunk: break
                outputfile.write(chunk)
                if remaining is not None: remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError): pass

class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=18081)
    args = parser.parse_args()
    with Server((args.host,args.port), Handler) as server:
        print(f'Anchor-0: http://localhost:{args.port}/ (listening on {args.host})', flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
