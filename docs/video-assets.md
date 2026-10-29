# Website video assets

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

| Video | Duration | Resolution | Size | Poster frame |
|---|---:|---:|---:|---:|
| scenes.mp4 | 228.878 s | 1920 × 1080 | 67.15 MiB | 125 s |
| comparison.mp4 | 83.776 s | 1610 × 906 | 46.80 MiB | 10 s |
| body-diversity.mp4 | 32.321 s | 1920 × 1080 | 9.32 MiB | 6 s |
| input-devices.mp4 | 19.620 s | 1920 × 1080 | 6.38 MiB | 4 s |

Recreate with `python3 scripts/prepare-videos.py --source-root '/path/to/demo视频'`.
Existing generated files are reused; `--force` replaces only generated copies.
To verify files again, use `--verify-only` with the same source root.
FFmpeg may be supplied on PATH or with `FFMPEG_EXE`. The local preparation environment used
`imageio-ffmpeg==0.6.0`, installed only under ignored `.tools/video-python`.

Verification checks complete duration (within one tenth of a second), aspect ratio, dimensions,
frame rate, codecs, faststart ordering and file size, followed by a complete decode of every output.
Exact bytes, source and output SHA-256 digests, poster digests and tool version are recorded in
[video-assets.json](video-assets.json). Encoding and decoding logs remain in ignored `.cache/video-preparation`.
