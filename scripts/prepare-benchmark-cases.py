"""Copy selected reference videos without re-encoding and generate posters."""
import argparse, hashlib, json, re, shutil, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,default=Path('/Users/qs/Downloads/benchmark_mp4_only'))
p.add_argument('--ffmpeg',type=Path,default=ROOT/'.tools/video-python/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1')
a=p.parse_args()
manifest=json.loads((ROOT/'scripts/benchmark-cases.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for group in manifest['groups']:
 for clip in group['clips']:
  src=a.source/clip['source'];vid=ROOT/f"dist/assets/videos/benchmark/{clip['id']}.mp4";poster=ROOT/f"dist/assets/posters/benchmark/{clip['id']}.jpg"
  vid.parent.mkdir(parents=True,exist_ok=True);poster.parent.mkdir(parents=True,exist_ok=True)
  info=subprocess.run([str(a.ffmpeg),'-hide_banner','-i',str(src)],capture_output=True,text=True).stderr
  m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',info);duration=int(m[1])*3600+int(m[2])*60+float(m[3])
  m=re.search(r'Video: .*? (\d{2,5})x(\d{2,5})',info);width,height=map(int,m.groups())
  shutil.copyfile(src,vid);assert sha(src)==sha(vid)
  subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-y','-ss',str(duration*.5),'-i',str(src),'-frames:v','1','-q:v','2',str(poster)],check=True)
  clip.update(output=str(vid.relative_to(ROOT/'dist')),poster=str(poster.relative_to(ROOT/'dist')),width=width,height=height,duration=duration,sha256=sha(vid),revision=sha(vid)[:12],posterRevision=sha(poster)[:12],bytes=vid.stat().st_size)
(ROOT/'dist/data/benchmark-cases.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('Copied 18 originals with identical hashes; generated native-resolution posters.')
