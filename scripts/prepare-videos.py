#!/usr/bin/env python3
"""Prepare the four supplied videos for the project site without changing originals.

Requires FFmpeg on PATH, FFMPEG_EXE, or project-local imageio-ffmpeg 0.6.0.
Example local install: python3 -m pip install --target .tools/video-python imageio-ffmpeg==0.6.0
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
ITEMS = [
    ("scenes", "场景/场景.mp4", "Scene capabilities", 2850, 125),
    ("comparison", "双机对比 pico logo/双机对比.mp4", "Controller comparison", 6500, 10),
    ("body-diversity", "多体型适配/多体型适配.mp4", "Body diversity", 6500, 6),
    ("input-devices", "多设备适配/多设备适配.mp4", "Input devices", 6500, 4),
]
MAX_BYTES = 90 * 1024 * 1024


def ffmpeg_path() -> str:
    explicit = os.environ.get("FFMPEG_EXE")
    if explicit:
        return explicit
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    local = ROOT / ".tools/video-python"
    sys.path.insert(0, str(local))
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as error:
        raise SystemExit("Install FFmpeg or project-local imageio-ffmpeg 0.6.0 first.") from error


def atoms(stream, start: int, end: int):
    position = start
    while position + 8 <= end:
        stream.seek(position)
        length, kind = struct.unpack(">I4s", stream.read(8))
        header = 8
        if length == 1:
            length = struct.unpack(">Q", stream.read(8))[0]
            header = 16
        elif length == 0:
            length = end - position
        if length < header or position + length > end:
            raise ValueError(f"Invalid MP4 box at {position}")
        yield kind, position, position + header, position + length
        position += length


def container_info(path: Path) -> dict:
    with path.open("rb") as stream:
        top = list(atoms(stream, 0, path.stat().st_size))
        moov = next(item for item in top if item[0] == b"moov")
        mdat = next(item for item in top if item[0] == b"mdat")
        mvhd = next(item for item in atoms(stream, moov[2], moov[3]) if item[0] == b"mvhd")
        stream.seek(mvhd[2])
        data = stream.read(32)
        if data[0] == 1:
            timescale, duration = struct.unpack(">IQ", data[20:32])
        else:
            timescale, duration = struct.unpack(">II", data[12:20])
        return {"duration_seconds": duration / timescale, "faststart": moov[1] < mdat[1]}


def metadata(ffmpeg: str, path: Path) -> dict:
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    video_line = next(line for line in result.stderr.splitlines() if "Video:" in line)
    audio_line = next((line for line in result.stderr.splitlines() if "Audio:" in line), "")
    size = re.search(r"(?<![\w:])(\d{2,5})x(\d{2,5})(?:[ ,\[])" , video_line)
    fps = re.search(r"([\d.]+) fps", video_line)
    return {
        **container_info(path),
        "width": int(size[1]),
        "height": int(size[2]),
        "fps": float(fps[1]),
        "video_codec": video_line.split("Video: ", 1)[1].split(" ", 1)[0],
        "pixel_format": "yuv420p" if "yuv420p" in video_line else "unknown",
        "audio_codec": audio_line.split("Audio: ", 1)[1].split(" ", 1)[0] if audio_line else None,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run_logged(command: list[str], log: Path):
    with log.open("w") as output:
        subprocess.run(command, stdout=output, stderr=subprocess.STDOUT, check=True)


def decoded_frame_count(ffmpeg: str, path: Path, log: Path) -> int:
    result = subprocess.run([ffmpeg, '-v', 'error', '-nostdin', '-i', str(path),
                             '-f', 'null', '-', '-progress', 'pipe:1'], capture_output=True, text=True, check=True)
    log.write_text(result.stderr)
    assert not result.stderr.strip(), f'Decode error: {path}'
    return int([line.split('=')[1] for line in result.stdout.splitlines() if line.startswith('frame=')][-1])


def video_filter_args(filters: str, repairs: list[dict]) -> list[str]:
    """Replace only declared source-frame intervals, then apply the existing web filters."""
    if not repairs:
        return ['-map', '0:v:0', '-vf', filters]
    graph = []
    current = '0:v:0'
    for i, repair in enumerate(repairs):
        start, end, replacement = (repair[k] for k in ('startFrame', 'endFrame', 'replacementFrame'))
        assert all(isinstance(n, int) and n >= 0 for n in (start, end, replacement))
        assert start < end and not start <= replacement < end
        graph.append(f'[{current}]split[main{i}][copy{i}]')
        graph.append(f'[main{i}][copy{i}]freezeframes=first={start}:last={end-1}:replace={replacement}[fixed{i}]')
        current = f'fixed{i}'
    graph.append(f'[{current}]{filters}[video]')
    return ['-filter_complex', ';'.join(graph), '-map', '[video]']


def preserve_published_audio(ffmpeg: str, temporary: Path, existing: Path, cache: Path):
    """Visual-only changes keep the already-published AAC packets unchanged."""
    remux = cache / f'{temporary.stem}-audio-preserved.mp4'
    run_logged([ffmpeg, '-hide_banner', '-nostdin', '-y', '-i', str(temporary), '-i', str(existing),
                '-map', '0:v:0', '-map', '1:a:0?', '-map_metadata', '-1', '-c', 'copy',
                '-movflags', '+faststart', str(remux)], cache / f'{temporary.stem}-audio-preserved.log')
    remux.replace(temporary)


def visual_settings(group):
    return {key: group[key] for key in ('crop', 'encoding') if key in group}


def spatial_filter(group):
    crop = group.get('crop')
    if crop:
        assert all(isinstance(crop[k], int) and crop[k] >= 0 for k in ('x', 'y', 'width', 'height'))
        assert crop['width'] > 0 and crop['height'] > 0
        assert all(crop[k] % 2 == 0 for k in ('x', 'y', 'width', 'height')), 'Align H.264 chroma samples'
        # Keep source pixels at their native resolution; only remove declared outer margins.
        return f"crop={crop['width']}:{crop['height']}:{crop['x']}:{crop['y']},setsar=1"
    return "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1"


def encoding_args(group, default_crf, maxrate):
    profile = group.get('encoding')
    if profile:
        return ['-c:v', 'libx264', '-preset', profile['preset'], '-crf', str(profile['crf']), '-pix_fmt', 'yuv420p']
    return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(default_crf), '-pix_fmt', 'yuv420p',
            '-maxrate', f'{maxrate}k', '-bufsize', f'{maxrate * 2}k']


def validate_dimensions(original, prepared, group):
    crop = group.get('crop')
    if crop:
        assert crop['x'] + crop['width'] <= original['width'] and crop['y'] + crop['height'] <= original['height']
        assert (prepared['width'], prepared['height']) == (crop['width'], crop['height']), 'Crop must preserve native pixels'
    else:
        assert abs(original['width'] / original['height'] - prepared['width'] / prepared['height']) < .005


def prepare_clips(args, ffmpeg, cache):
    """Encode exact source frame ranges, applying only declared repairs and outer crops."""
    manifest = json.loads((ROOT / 'scripts/video-clips.json').read_text())
    fps = manifest['fps']
    published = {'version': manifest['version'], 'groups': []}
    record_path = ROOT / 'docs/video-clips.json'
    previous_records = {r['id']: r for r in json.loads(record_path.read_text())['clips']} if record_path.exists() else {}
    records = []
    for group in manifest['groups']:
        source = args.source_root / group['source']
        original = metadata(ffmpeg, source)
        assert original['fps'] == fps, 'Clip manifest assumes a 30 fps source'
        original_frames = decoded_frame_count(ffmpeg, source, cache / f"{group['id']}-source-decode.log")
        published_group = {key: group[key] for key in ('id', 'title', 'description', 'fullVideo', 'fullPoster')}
        if group.get('frameRepairs') or group.get('crop'):
            published_group['fullVideoRevision'] = sha256(ROOT / 'dist' / group['fullVideo'])[:12]
        if group.get('crop'):
            full = metadata(ffmpeg, ROOT / 'dist' / group['fullVideo'])
            published_group.update(fullWidth=full['width'], fullHeight=full['height'],
                                   fullPosterRevision=sha256(ROOT / 'dist' / group['fullPoster'])[:12])
        published_group['clips'] = []
        previous_frame = 0
        for clip in group['clips']:
            assert clip['startFrame'] == previous_frame, 'Clips must cover the original continuously'
            previous_frame = clip['endFrame']
            slug = f"{group['id']}-{clip['id']}"
            repairs = [r for r in group.get('frameRepairs', []) if r['startFrame'] < clip['endFrame'] and r['endFrame'] > clip['startFrame']]
            repair_changed = previous_records.get(slug, {}).get('frameRepairs', []) != repairs
            visual_changed = visual_settings(previous_records.get(slug, {})) != visual_settings(group)
            changed = repair_changed or visual_changed
            assert not (args.verify_only and changed), f'Generate declared visual changes before verification: {slug}'
            start = clip['startFrame'] / fps
            duration = (clip['endFrame'] - clip['startFrame']) / fps
            assert 5 <= duration <= 15, f'Unexpected clip length: {slug}'
            video = ROOT / f'dist/assets/videos/clips/{slug}.mp4'
            poster = ROOT / f'dist/assets/posters/clips/{slug}.jpg'
            video.parent.mkdir(parents=True, exist_ok=True)
            poster.parent.mkdir(parents=True, exist_ok=True)
            regenerate = not args.verify_only and (args.force or not video.exists() or changed)
            if regenerate:
                temporary = cache / f'{slug}.mp4'
                print(f'Encoding clip: {slug} ({duration:.2f} s)', flush=True)
                run_logged([
                    ffmpeg, '-hide_banner', '-nostdin', '-y', '-i', str(source),
                    '-map', '0:a:0?', '-map_metadata', '-1',
                    # Decode and trim by frame index: fractional -ss can skip a boundary frame.
                    *video_filter_args(f"trim=start_frame={clip['startFrame']}:end_frame={clip['endFrame']},setpts=N/({fps}*TB),"
                           + spatial_filter(group), repairs),
                    '-af', f'atrim=start={start:.9f}:duration={duration:.9f},asetpts=PTS-STARTPTS',
                    '-r', str(fps), '-fps_mode', 'cfr',
                    *encoding_args(group, 22, 5000), '-g', '30',
                    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', str(temporary),
                ], cache / f'{slug}-encode.log')
                if (repairs or group.get('crop')) and video.exists():
                    preserve_published_audio(ffmpeg, temporary, video, cache)
                temporary.replace(video)
            if not args.verify_only and (regenerate or not poster.exists()):
                run_logged([ffmpeg, '-hide_banner', '-nostdin', '-y', '-ss', str(min(2, duration / 3)),
                            '-i', str(video), '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '2',
                            '-update', '1', str(poster)], cache / f'{slug}-poster.log')
            prepared = metadata(ffmpeg, video)
            assert abs(prepared['duration_seconds'] - duration) < .06
            validate_dimensions(original, prepared, group)
            assert prepared['fps'] == fps and prepared['faststart']
            assert prepared['video_codec'] == 'h264' and prepared['pixel_format'] == 'yuv420p'
            assert prepared['audio_codec'] == original['audio_codec'] == 'aac'
            assert prepared['bytes'] < MAX_BYTES
            prepared['frame_count'] = decoded_frame_count(ffmpeg, video, cache / f'{slug}-decode.log')
            assert prepared['frame_count'] == clip['endFrame'] - clip['startFrame'], f'Frame count changed: {slug}'
            item = {
                'id': slug, 'title': clip['title'], 'startSeconds': start, 'endSeconds': clip['endFrame'] / fps,
                'duration': duration, 'output': str(video.relative_to(ROOT / 'dist')),
                'poster': str(poster.relative_to(ROOT / 'dist')), 'width': prepared['width'], 'height': prepared['height'],
                **({'revision': prepared['sha256'][:12]} if repairs or group.get('crop') else {}),
                **({'posterRevision': sha256(poster)[:12]} if group.get('crop') else {}),
            }
            published_group['clips'].append(item)
            records.append({**item, 'source': group['source'], 'startFrame': clip['startFrame'],
                            'endFrame': clip['endFrame'], 'source_sha256': original['sha256'],
                            'source_frame_count': original_frames,
                            **({'frameRepairs': repairs} if repairs else {}),
                            **visual_settings(group),
                            'output_metadata': prepared, 'poster_sha256': sha256(poster)})
        assert abs(previous_frame / fps - original['duration_seconds']) < .06, 'Source coverage incomplete'
        assert previous_frame == original_frames, 'Source frame coverage incomplete'
        assert sha256(source) == original['sha256'], 'Original input changed'
        published['groups'].append(published_group)
    (ROOT / 'dist/data/video-clips.json').write_text(json.dumps(published, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'docs/video-clips.json').write_text(json.dumps({'editing': manifest['editing'], 'fps': fps, 'clips': records}, ensure_ascii=False, indent=2) + '\n')
    print(f'Ready: {len(records)} clips, all frame positions retained and decoded successfully.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=Path.home() / "Desktop/demo视频")
    parser.add_argument("--force", action="store_true", help="Replace generated files only; originals are never written.")
    parser.add_argument("--verify-only", action="store_true", help="Validate existing generated media and regenerate reports.")
    parser.add_argument("--clips-only", action="store_true", help="Prepare/verify action clips without reprocessing full-length web copies.")
    args = parser.parse_args()
    ffmpeg = ffmpeg_path()
    cache = ROOT / ".cache/video-preparation"
    videos = ROOT / "dist/assets/videos"
    posters = ROOT / "dist/assets/posters"
    docs = ROOT / "docs"
    for folder in (cache, videos, posters, docs):
        folder.mkdir(parents=True, exist_ok=True)
    if args.clips_only:
        prepare_clips(args, ffmpeg, cache)
        return
    version = subprocess.check_output([ffmpeg, "-version"], text=True).splitlines()[0]
    manifest = json.loads((ROOT / 'scripts/video-clips.json').read_text())
    groups = {g['id']: g for g in manifest['groups']}
    record_path = docs / 'video-assets.json'
    previous_records = {r['slug']: r for r in json.loads(record_path.read_text())['videos']} if record_path.exists() else {}
    records = []
    for slug, relative_source, title, maxrate, poster_second in ITEMS:
        source = args.source_root / relative_source
        destination = videos / f"{slug}.mp4"
        poster = posters / f"{slug}.jpg"
        group = groups.get(slug, {})
        repairs = group.get('frameRepairs', [])
        repair_changed = previous_records.get(slug, {}).get('frameRepairs', []) != repairs
        visual_changed = visual_settings(previous_records.get(slug, {})) != visual_settings(group)
        changed = repair_changed or visual_changed
        assert not (args.verify_only and changed), f'Generate declared visual changes before verification: {slug}'
        if not source.is_file():
            raise SystemExit(f"Missing input: {source}")
        regenerate = not args.verify_only and (args.force or not destination.exists() or changed)
        if regenerate:
            temporary = cache / f"{slug}.mp4"
            print(f"Encoding {slug} …", flush=True)
            run_logged([
                ffmpeg, "-hide_banner", "-nostdin", "-y", "-i", str(source),
                "-map", "0:a:0?", "-map_metadata", "-1",
                *video_filter_args(spatial_filter(group) + ',fps=30', repairs),
                *encoding_args(group, 21, maxrate),
                "-g", "60", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
                "-movflags", "+faststart", str(temporary),
            ], cache / f"{slug}-encode.log")
            if (repairs or group.get('crop')) and destination.exists():
                preserve_published_audio(ffmpeg, temporary, destination, cache)
            temporary.replace(destination)
        if not args.verify_only and (regenerate or not poster.exists()):
            run_logged([
                ffmpeg, "-hide_banner", "-nostdin", "-y", "-ss", str(poster_second), "-i", str(destination),
                "-frames:v", "1", "-q:v", "2", "-update", "1", str(poster),
            ], cache / f"{slug}-poster.log")
        if not poster.exists():
            raise SystemExit(f"Missing poster: {poster}")
        original = metadata(ffmpeg, source)
        prepared = metadata(ffmpeg, destination)
        assert abs(original["duration_seconds"] - prepared["duration_seconds"]) <= 0.1, "Duration changed"
        assert prepared["width"] <= min(1920, original["width"]), "Unexpected upscale"
        assert prepared["height"] <= min(1080, original["height"]), "Unexpected upscale"
        validate_dimensions(original, prepared, group)
        assert prepared["fps"] == 30, "Unexpected frame rate"
        assert prepared["video_codec"] == "h264", "Unexpected video codec"
        assert prepared["pixel_format"] == "yuv420p", "Unexpected pixel format"
        assert prepared["audio_codec"] == "aac", "Missing AAC audio"
        assert prepared["faststart"], "moov must precede mdat"
        assert prepared["bytes"] < MAX_BYTES, "Video exceeds 90 MiB"
        run_logged([ffmpeg, "-v", "error", "-nostdin", "-i", str(destination), "-f", "null", "-"], cache / f"{slug}-decode.log")
        assert not (cache / f"{slug}-decode.log").read_text().strip(), "Decode error; inspect log"
        records.append({
            "slug": slug, "title": title, "source": relative_source, "source_metadata": original,
            "output": f"assets/videos/{slug}.mp4", "output_metadata": prepared,
            "poster": f"assets/posters/{slug}.jpg", "poster_time_seconds": poster_second,
            "poster_bytes": poster.stat().st_size, "poster_sha256": sha256(poster),
            **({'frameRepairs': repairs} if repairs else {}),
            **visual_settings(group),
            "validation": "complete decode without errors",
        })
        (docs / "video-assets.json").write_text(json.dumps({"ffmpeg": version, "videos": records}, indent=2, ensure_ascii=False) + "\n")
        print(f"Ready: {destination.relative_to(ROOT)} ({prepared['bytes'] / 1024 ** 2:.2f} MiB)", flush=True)
    rows = ["| Video | Duration | Resolution | Size | Poster frame |", "|---|---:|---:|---:|---:|"]
    for record in records:
        meta = record["output_metadata"]
        rows.append(f"| {record['slug']}.mp4 | {meta['duration_seconds']:.3f} s | {meta['width']} × {meta['height']} | {meta['bytes'] / 1024 ** 2:.2f} MiB | {record['poster_time_seconds']} s |")
    report = """# Website video assets

All four supplied MP4 videos are included at full duration. Their GIF duplicates are intentionally omitted.
Original source files are read only. Logos, timing and audio are preserved; there is no upscaling.
Only the comparison group's outer black margins are cropped: 1610 × 906 at x=64, y=0, preserving
native pixels. Its full video and nine clips use H.264 CRF 16 / slow without a bitrate cap,
generated directly from the original source, with the previously published AAC packets retained.
Other groups keep their existing resolution and encoding. All web copies use H.264, yuv420p,
30 fps, AAC audio, and MP4 faststart.
Each file is below 90 MiB. Posters are real frames extracted from the generated videos, with no image generation.
Declared frame repairs in `scripts/video-clips.json` also apply to the full web copies: comparison
frame 12 (0.400 s) is replaced with clean frame 13 to remove an isolated burned-in subtitle.

""" + "\n".join(rows) + """

Recreate with `python3 scripts/prepare-videos.py --source-root '/path/to/demo视频'`.
Existing generated files are reused; `--force` replaces only generated copies.
To verify files again, use `--verify-only` with the same source root.
FFmpeg may be supplied on PATH or with `FFMPEG_EXE`. The local preparation environment used
`imageio-ffmpeg==0.6.0`, installed only under ignored `.tools/video-python`.

Verification checks complete duration (within one tenth of a second), aspect ratio, dimensions,
frame rate, codecs, faststart ordering and file size, followed by a complete decode of every output.
Exact bytes, source and output SHA-256 digests, poster digests and tool version are recorded in
[video-assets.json](video-assets.json). Encoding and decoding logs remain in ignored `.cache/video-preparation`.
"""
    (docs / "video-assets.md").write_text(report)
    prepare_clips(args, ffmpeg, cache)


if __name__ == "__main__":
    main()
