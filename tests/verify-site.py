"""Checks for real failure modes: missing assets, altered demo payloads, and HTTP media transport."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import math
import sys
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
    if link.startswith(('#','http:','https:','data:','mailto:')): continue
    target=(DIST / urllib.parse.urlsplit(link).path.lstrip('/')).resolve()
    assert target.exists(), f'Missing {link}'
print(f'PASS: {len(parser.links)} local page references')

clip_manifest=json.loads((ROOT/'scripts/video-clips.json').read_text())
clip_outputs=json.loads((DIST/'data/video-clips.json').read_text())
clip_records=json.loads((ROOT/'docs/video-clips.json').read_text())['clips']
assert len(clip_records)==15
by_clip={r['id']:r for r in clip_records}
for group, public in zip(clip_manifest['groups'],clip_outputs['groups']):
    assert group['id']==public['id']
    assert (DIST/public['fullVideo']).is_file() and (DIST/public['fullPoster']).is_file()
    previous=0
    for clip, output in zip(group['clips'],public['clips']):
        assert clip['startFrame']==previous, 'Source frames were dropped or reordered'
        previous=clip['endFrame']
        assert output['startSeconds']==clip['startFrame']/30 and output['endSeconds']==clip['endFrame']/30
        assert 5<=output['duration']<=15 and output['title']==clip['title']
        record=by_clip[output['id']]
        assert record.get('crop')==group.get('crop') and record.get('encoding')==group.get('encoding')
        if group.get('crop'):
            assert group['id']=='comparison'
            assert (output['width'],output['height'])==(1610,906)
            assert output['revision']==record['output_metadata']['sha256'][:12]
            assert output['posterRevision']==record['poster_sha256'][:12]
        repairs=[r for r in group.get('frameRepairs',[]) if r['startFrame']<clip['endFrame'] and r['endFrame']>clip['startFrame']]
        assert record.get('frameRepairs',[])==repairs, 'Declared subtitle repair not applied to clip'
        if repairs:
            assert output['revision']==record['output_metadata']['sha256'][:12], 'Repaired clip cache revision is stale'
        assert record['output_metadata']['frame_count']==clip['endFrame']-clip['startFrame']
        for key, digest in [('output',record['output_metadata']['sha256']),('poster',record['poster_sha256'])]:
            assert hashlib.sha256((DIST/output[key]).read_bytes()).hexdigest()==digest, f'Changed clip asset: {output[key]}'
    assert previous==by_clip[public['clips'][-1]['id']]['source_frame_count'], 'Missing source end frames'
full_records=json.loads((ROOT/'docs/video-assets.json').read_text())['videos']
for record in full_records:
    group=next((g for g in clip_manifest['groups'] if g['id']==record['slug']),{})
    assert record.get('crop')==group.get('crop') and record.get('encoding')==group.get('encoding')
    if group.get('crop'):
        public=next(g for g in clip_outputs['groups'] if g['id']==record['slug'])
        assert (public['fullWidth'],public['fullHeight'])==(1610,906)
        assert public['fullPosterRevision']==record['poster_sha256'][:12]
        assert (record['output_metadata']['width'],record['output_metadata']['height'])==(1610,906)
        assert record['fullVideoFrames']==record['output_metadata']['frame_count']==group['fullVideoFrames']==2512
    assert record.get('frameRepairs',[])==group.get('frameRepairs',[]), 'Declared subtitle repair not applied to full video'
    if group.get('frameRepairs'):
        public=next(g for g in clip_outputs['groups'] if g['id']==record['slug'])
        assert public['fullVideoRevision']==record['output_metadata']['sha256'][:12], 'Repaired full-video cache revision is stale'
    assert hashlib.sha256((DIST/record['output']).read_bytes()).hexdigest()==record['output_metadata']['sha256'], 'Full-length video changed'
    source=Path.home()/'Desktop/demo视频'/record['source']
    if source.exists():
        assert hashlib.sha256(source.read_bytes()).hexdigest()==record['source_metadata']['sha256'], 'Original video changed'
print('PASS: 15 contiguous action clips, declared frame repairs, output hashes and unchanged available originals')
print('PASS: comparison-only crop, native 1610 × 906 pixels and versioned videos/posters')

provenance=json.loads((ROOT/'docs/demo-provenance.json').read_text())
assert provenance['sourceCommit']=='cdcfef07a9109603f36532c182ad0c282e51e748'
assert len(provenance['immutableFiles'])==134, 'Published demo asset inventory changed'
for file, expected in provenance['immutableFiles'].items():
    assert hashlib.sha256((DIST/'demo'/file).read_bytes()).hexdigest()==expected, f'Changed published payload: {file}'
print(f'PASS: {len(provenance["immutableFiles"])} unchanged published demo files')

data=json.loads((DIST/'data/paper-results.json').read_text())
assert data['snapshot']['checkpoint']=='test134 / 46000'
assert data['snapshot']['checkpointSha256']=='5757a7d5a5632ae611060508a86032af5cbc5152098aed32edcb7da71f1f31ea'
assert [c['count'] for c in data['simulation']['cohorts']]==[15342,2230]
expected_anchor={
    'inhouse': [(89.58414809020988,89.50593143006127),(85.7124234128536,44.27714769912658)],
    'public': [(59.14798206278027,60.941704035874444),(57.264573991031384,26.09865470852018)],
}
for cohort in data['simulation']['cohorts']:
    for series, (local, global_) in zip(cohort['series'][:2], expected_anchor[cohort['id']]):
        assert math.isclose(series['localSuccess'],local,abs_tol=1e-10)
        assert math.isclose(series['globalSuccess'],global_,abs_tol=1e-10)
        assert series['config'].startswith('test134_46k_human_')
    for series in cohort['series']:
        assert series['count']==cohort['count']
        for frame in ('local','global'):
            assert math.isclose(series[frame+'Success'],100*series[frame+'SuccessCount']/cohort['count'],abs_tol=1e-10)
lookahead={c['id']:c for c in data['lookahead']['cohorts']}
assert set(lookahead)=={'inhouse','public'}
assert data['lookahead']['series']==lookahead['inhouse']['series'], 'Legacy alias must use In-house data'
for cohort in data['simulation']['cohorts']:
    ahead=lookahead[cohort['id']]
    assert ahead['count']==cohort['count'] and len(ahead['series'])==7
    by_model={s['id']:s for s in ahead['series']}
    assert len(by_model)==7
    for series in cohort['series']:
        other=by_model[series['id']]
        assert other['localSuccess']==series['localSuccess'], 'Mixed cohorts or checkpoints in look-ahead plot'
        assert other['config']==series['config'] and other['input']==series['input']
    smpl=by_model['sonic-smpl']
    assert smpl['config']=='sonic_v1_1_smpl' and smpl['input']=='SMPL'
    assert smpl['lookaheadSeconds']==0.18 and smpl['onlineRetargeting'] is False
    assert math.isclose(smpl['localSuccess'],{'inhouse':0.6257332811888932,'public':8.295964125560538}[cohort['id']],abs_tol=1e-10)
assert data['reachability']['count']==3210
assert sum(a['count'] for a in data['reachability']['postures']['axes'])==3210
assert data['reachability']['difficulty'] is None
for plot in [*data['radars'],data['reachability']['postures']]:
    for series in plot['series']:
        assert len(series['values'])==len(plot['axes'])==len(series['successes'])==len(series['counts'])
        if series['id'].startswith('anchor-'):
            assert series['config'].startswith('test134_46k_')
        for value,passed,count in zip(series['values'],series['successes'],series['counts']):
            assert 0<=passed<=count and count>0
            assert math.isclose(value,100*passed/count,abs_tol=1e-10)
for series in data['reachability']['postures']['series']:
    assert sum(series['counts'])==3210
    assert math.isclose(series['overallSuccess'],100*sum(series['successes'])/3210,abs_tol=1e-10)
    if series['id'] in ('anchor-global','anchor-local'):
        assert sum(series['successes'])=={'anchor-global':1909,'anchor-local':1448}[series['id']]
assert data['hardware']['provenance']['commit']=='5be61b757506e6bf0b7f8e8370bab585294bf907'
expected_hardware={'anchor':(40.61,49.02,71,72),'scale14':(58.68,61.65,71,72),'scale5':(54.74,68.42,70,71),'sonic-g1':(45.51,67.90,67,69),'sonic-smpl':(96.11,76.89,66,70),'mimic-roa':(46.53,62.98,71,72)}
for row in data['hardware']['trackingErrors']['series']:
    assert tuple(row[k] for k in ['wristError','ankleError','contributing','valid'])==expected_hardware[row['id']]
    assert row['preliminary']==(row['id']=='anchor')
assert data['hardware']['standingReach']['count']==51
assert 'nonempty windows' in data['hardware']['trackingErrors']['note']
branding_text=(DIST/'index.html').read_text()+(DIST/'data/paper-results.json').read_text()
assert all(name not in branding_text for name in ['Anchor-0','Anchor-1'])
assert ' download ' not in (DIST/'index.html').read_text()
print('PASS: main@5be61b7 measured hardware values, contributing windows and Anchor naming')
assert data['hardware']['thresholdFigure']['numericValuesAvailable'] is False
assert all(v is None for s in data['downstream']['autonomy']['series'] if s.get('pending') for v in s['values'])
print('PASS: test134/46k snapshot, cohort/look-ahead consistency, exact count aggregation, pending-result semantics')
assert max(p.stat().st_size for p in DIST.rglob('*') if p.is_file()) < 100*1024**2
print('PASS: every served asset is below the ordinary GitHub file limit')
if '--offline' in sys.argv:
    print('SKIP: HTTP QA (--offline); all checks above were read-only')
    sys.exit(0)

def get(path, headers=None):
    return urllib.request.urlopen(urllib.request.Request(BASE+path,headers=headers or {}), timeout=10)

with get('/') as r: assert r.status==200 and b'Anchor 1:' in r.read()
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
for clip in clip_records:
    with get('/'+clip['output'], {'Range':'bytes=0-31'}) as r:
        assert r.status==206 and r.headers['Content-Type'].startswith('video/mp4')
        assert r.read()==(DIST/clip['output']).read_bytes()[:32]
gz=next((DIST/'demo/assets').rglob('*.gz'))
with get('/'+gz.relative_to(DIST).as_posix(), {'Range':'bytes=0-31'}) as r:
    assert r.headers.get('Content-Encoding') is None and r.read()==gz.read_bytes()[:32]
for path in ['/assets/','/.cache/evaluation.html','/../README.md']:
    try:get(path)
    except urllib.error.HTTPError as e: assert e.code in (403,404)
    else:raise AssertionError(f'Unexpected exposure: {path}')
print('PASS: HTTP pages, redirects, range streaming, raw gzip, MIME types, no directory listings')
