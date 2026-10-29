"""Crop whitespace from original reference videos and generate posters."""
import argparse, hashlib, json, re, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,default=Path('/Users/qs/Downloads/benchmark_mp4_only'))
p.add_argument('--ffmpeg',type=Path,default=ROOT/'.tools/video-python/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1')
a=p.parse_args()
manifest=json.loads((ROOT/'scripts/benchmark-cases.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def prepare(clip):
  src=a.source/clip['source'];vid=ROOT/f"dist/assets/videos/benchmark/{clip['id']}.mp4";poster=ROOT/f"dist/assets/posters/benchmark/{clip['id']}.jpg"
  vid.parent.mkdir(parents=True,exist_ok=True);poster.parent.mkdir(parents=True,exist_ok=True)
  info=subprocess.run([str(a.ffmpeg),'-hide_banner','-i',str(src)],capture_output=True,text=True).stderr
  m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',info);duration=int(m[1])*3600+int(m[2])*60+float(m[3])
  m=re.search(r'Video: .*? (\d{2,5})x(\d{2,5})',info);width,height=map(int,m.groups())
  assert sha(src)==clip['sourceSha256']
  crop=clip['crop'];width,height=crop['width'],crop['height']
  subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-y','-i',str(src),'-vf',f"crop={width}:{height}:{crop['x']}:{crop['y']}",'-c:v','libx264','-preset','slow','-crf','16','-threads','2','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(vid)],check=True)
  assert sha(src)==clip['sourceSha256']
  subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-y','-ss',str(duration*.5),'-i',str(vid),'-frames:v','1','-q:v','2',str(poster)],check=True)
  clip.update(output=str(vid.relative_to(ROOT/'dist')),poster=str(poster.relative_to(ROOT/'dist')),width=width,height=height,duration=duration,sha256=sha(vid),revision=sha(vid)[:12],posterRevision=sha(poster)[:12],bytes=vid.stat().st_size)
with ThreadPoolExecutor(max_workers=3) as pool:
 list(pool.map(prepare,[clip for group in manifest['groups'] for clip in group['clips']]))
(ROOT/'dist/data/benchmark-cases.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('Cropped 18 originals at CRF 16; source hashes unchanged; posters and revisions updated.')
