"""Compare cropped web videos with the original and pre-change AAC/frame inventories."""
from pathlib import Path
import argparse
import importlib.util
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare', ROOT / 'scripts/prepare-videos.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--before', type=Path, default=ROOT / '.cache/comparison-crop-before')
parser.add_argument('--report', type=Path, default=ROOT / '.cache/comparison-crop-quality/verification.json')
args = parser.parse_args()
cache = ROOT / '.cache/comparison-crop-quality'
cache.mkdir(parents=True, exist_ok=True)
ffmpeg = prepare.ffmpeg_path()
manifest = json.loads((ROOT / 'scripts/video-clips.json').read_text())
group = next(g for g in manifest['groups'] if g['id'] == 'comparison')
source = Path.home() / 'Desktop/demo视频' / group['source']
source_hash = prepare.sha256(source)
assert source_hash == '62583c1742367ecd10bf62f5ebce4e4e1692ff3db264b18e79e3f778595d497b'
assert group['crop'] == {'x':64, 'y':0, 'width':1610, 'height':906}
assert group['encoding']['crf'] in (14, 16) and group['encoding']['preset'] == 'slow'

def run(arguments):
    return subprocess.run([ffmpeg, '-hide_banner', '-nostdin', *arguments], capture_output=True, text=True, check=True)

def audio_hash(path):
    return run(['-v', 'error', '-i', str(path), '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.strip()

detected = run(['-threads', '2', '-i', str(source), '-vf', 'cropdetect=limit=24:round=2:reset=1:skip=0', '-an', '-f', 'null', '-'])
rectangles = re.findall(r'crop=(\d+:\d+:\d+:\d+)', detected.stderr)
assert len(rectangles) == 2513 and set(rectangles) == {'1610:906:64:0'}, set(rectangles)
print('PASS: all 2,513 source frames have the same removable side margins', flush=True)

items = [(ROOT / 'dist' / group['fullVideo'], None)] + [
    (ROOT / f"dist/assets/videos/clips/comparison-{clip['id']}.mp4", clip) for clip in group['clips']]
results = []
for output, clip in items:
    before = args.before / output.name
    meta, old = prepare.metadata(ffmpeg, output), prepare.metadata(ffmpeg, before)
    assert (meta['width'], meta['height'], meta['fps']) == (1610, 906, 30)
    assert meta['duration_seconds'] == old['duration_seconds'], output.name
    audio = audio_hash(output)
    assert audio == audio_hash(before), output.name
    frames = prepare.decoded_frame_count(ffmpeg, output, cache / f'{output.stem}-decode.log')
    old_frames = prepare.decoded_frame_count(ffmpeg, before, cache / f'{output.stem}-before-decode.log')
    assert frames == old_frames
    if clip:
        assert frames == clip['endFrame'] - clip['startFrame']
        filters = f"trim=start_frame={clip['startFrame']}:end_frame={clip['endFrame']},setpts=N/(30*TB),crop=1610:906:64:0,setsar=1"
    else:
        filters = 'crop=1610:906:64:0,setsar=1,fps=30,setpts=PTS-STARTPTS'
    # Apply the existing single-frame repair before trimming, exactly in source-frame space.
    stats = cache / f'{output.stem}-ssim.txt'
    graph = ('[0:v]split[main][copy];[main][copy]freezeframes=first=12:last=12:replace=13[fixed];'
             f'[fixed]{filters}[reference];[1:v]setpts=PTS-STARTPTS[encoded];'
             f'[encoded][reference]ssim=stats_file={stats}:shortest=1[checked]')
    measured = run(['-threads', '2', '-i', str(source), '-threads', '2', '-i', str(output),
                    '-filter_complex_threads', '2', '-filter_complex', graph, '-map', '[checked]', '-an', '-f', 'null', '-'])
    average = float(re.findall(r'All:([\d.]+)', measured.stderr)[-1])
    scores = [float(n) for n in re.findall(r'All:([\d.]+)', stats.read_text())]
    assert len(scores) == frames, (output.name, len(scores), frames)
    # Detect material blur or time/frame mismatches; native-size visual review is also required.
    assert average >= .98 and min(scores) >= .95, (output.name, average, min(scores))
    results.append({'file':str(output.relative_to(ROOT)), 'sha256':meta['sha256'],
                    'width':meta['width'], 'height':meta['height'], 'fps':meta['fps'],
                    'frames':frames, 'previousFrames':old_frames, 'durationSeconds':meta['duration_seconds'],
                    'previousDurationSeconds':old['duration_seconds'], 'audioSha256':audio,
                    'ssimAverage':average, 'ssimMinimumFrame':min(scores), 'bytes':meta['bytes']})
    print(f'PASS: {output.name}: {frames} unchanged frame positions, unchanged AAC, SSIM {average:.6f} (minimum {min(scores):.6f})', flush=True)

before_hashes = json.loads((args.before / 'asset-hashes.json').read_text())
untouched = {}
for path, digest in before_hashes.items():
    if not Path(path).name.startswith('comparison'):
        assert prepare.sha256(ROOT / path) == digest
        untouched[path] = digest
assert prepare.sha256(source) == source_hash
report = {'source':group['source'], 'sourceSha256':source_hash, 'sourceFrames':len(rectangles),
          'crop':group['crop'], 'encoding':group['encoding'], 'bitrateCap':None,
          'frameRepair':group['frameRepairs'], 'outputs':results, 'unchangedMedia':untouched,
          'qualityCheck':'Every encoded frame compared to its repaired, cropped source frame; SSIM is supplementary to native-size visual review.'}
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2) + '\n')
print(f'PASS: {len(untouched)} unrelated media files and original source are byte-identical; report {args.report}', flush=True)
