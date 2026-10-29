"""Extract Future clips from the untouched 4K scene master at native 30 fps."""
from pathlib import Path
import argparse, hashlib, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--source', type=Path, default=Path('/Users/qs/Desktop/demo视频/场景/场景.mp4'))
p.add_argument('--ffmpeg', type=Path, default=ROOT/'.tools/video-python/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1')
a = p.parse_args()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
source_hash=sha(a.source)
assert source_hash == '6b3652943f8444820ba767d07d4d6c8a97013fcc7fd36f950c0dac695108c9d6'
clips=[]
for name,start,end,poster in [('stool',5700,6303,7),('stairs',6306,6866,7)]:
    output=ROOT/f'dist/assets/videos/future-{name}.mp4'
    cover=ROOT/f'dist/assets/posters/future-{name}.jpg'
    subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-y','-ss',str(start/30),'-i',str(a.source),'-t',str((end-start)/30),'-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(output)],check=True)
    subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-y','-ss',str(poster),'-i',str(output),'-frames:v','1','-vf','scale=1920:-1','-q:v','2',str(cover)],check=True)
    subprocess.run([str(a.ffmpeg),'-hide_banner','-loglevel','error','-i',str(output),'-f','null','-'],check=True)
    assert output.stat().st_size < 90*1024*1024
    clips.append(dict(id=name,startFrame=start,endFrame=end,fps=30,duration=(end-start)/30,width=3840,height=2160,output=str(output.relative_to(ROOT)),sha256=sha(output),bytes=output.stat().st_size,poster=str(cover.relative_to(ROOT)),posterSha256=sha(cover)))
assert sha(a.source)==source_hash
(ROOT/'docs/future-videos.json').write_text(json.dumps(dict(source='场景/场景.mp4',sourceSha256=source_hash,encoding='H.264 CRF 16 slow; native 3840 × 2160 / 30 fps; no crop, scale or speed changes',clips=clips),indent=2,ensure_ascii=False)+'\n')
print('Extracted and decoded both Future clips; source unchanged.',flush=True)
