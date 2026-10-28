"""Checks for real failure modes: missing assets, altered demo payloads, and HTTP media transport."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import urllib.request
import urllib.error
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
BASE = 'http://127.0.0.1:18081'

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src','href','poster','data-src','data-zoom') and value:
                self.links.append(value)

parser=Links(); parser.feed((DIST/'index.html').read_text())
for link in parser.links:
    if link.startswith(('#','http:','https:','data:')): continue
    target=(DIST / urllib.parse.urlsplit(link).path.lstrip('/')).resolve()
    assert target.exists(), f'Missing {link}'
print(f'PASS: {len(parser.links)} local page references')

provenance=json.loads((ROOT/'docs/demo-provenance.json').read_text())
for file, expected in provenance['immutableFiles'].items():
    assert hashlib.sha256((DIST/'demo'/file).read_bytes()).hexdigest()==expected, f'Changed published payload: {file}'
print(f'PASS: {len(provenance["immutableFiles"])} unchanged published demo files')

data=json.loads((DIST/'data/paper-results.json').read_text())
assert [c['count'] for c in data['simulation']['cohorts']]==[15342,2230]
assert data['reachability']['count']==3210
assert sum(a['count'] for a in data['reachability']['postures']['axes'])==3210
assert abs(data['simulation']['cohorts'][0]['series'][0]['localSuccess']-87.05514274540477)<1e-10
assert data['hardware']['thresholdFigure']['numericValuesAvailable'] is False
assert all(v is None for s in data['downstream']['autonomy']['series'] if s.get('pending') for v in s['values'])
print('PASS: paper snapshot, cohort counts, pending-result semantics')

def get(path, headers=None):
    return urllib.request.urlopen(urllib.request.Request(BASE+path,headers=headers or {}), timeout=10)

with get('/') as r: assert r.status==200 and b'Anchor-0:' in r.read()
with get('/demo?letter=Z') as r: assert r.geturl().endswith('/demo/?letter=Z')
video=DIST/'assets/videos/scenes.mp4'
with get('/assets/videos/scenes.mp4', {'Range':'bytes=0-31'}) as r:
    assert r.status==206 and r.read()==video.read_bytes()[:32]
    assert r.headers['Content-Range']==f'bytes 0-31/{video.stat().st_size}'
with get('/assets/videos/scenes.mp4', {'Range':'bytes=-64'}) as r:
    assert r.status==206 and r.read()==video.read_bytes()[-64:]
try: get('/assets/videos/scenes.mp4', {'Range':'bytes=999999999-'})
except urllib.error.HTTPError as e: assert e.code==416
else: raise AssertionError('Unsatisfiable range accepted')
for file,mime in [('demo/assets/lan-compat.js','text/javascript'),('demo/assets/ort-wasm-simd-threaded-CDsxkEtH.wasm','application/wasm')]:
    with get('/'+file, {'Range':'bytes=0-31'}) as r: assert r.headers['Content-Type'].startswith(mime)
gz=next((DIST/'demo/assets').rglob('*.gz'))
with get('/'+gz.relative_to(DIST).as_posix(), {'Range':'bytes=0-31'}) as r:
    assert r.headers.get('Content-Encoding') is None and r.read()==gz.read_bytes()[:32]
for path in ['/assets/','/.cache/evaluation.html','/../README.md']:
    try:get(path)
    except urllib.error.HTTPError as e: assert e.code in (403,404)
    else:raise AssertionError(f'Unexpected exposure: {path}')
print('PASS: HTTP pages, redirects, range streaming, raw gzip, MIME types, no directory listings')
assert max(p.stat().st_size for p in DIST.rglob('*') if p.is_file()) < 100*1024**2
print('PASS: every served asset is below the ordinary GitHub file limit')
