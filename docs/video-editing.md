# Action clips and playback

The original 228.867-second main film and all three full-length comparison films remain available.
The front-page showcase adds 15 contiguous action clips: nine comparison clips, four body-diversity
clips and two input-device clips. Clips are 6.8–13.667 seconds long. All original frame positions are
retained at normal speed, with the isolated correction recorded below. The four operators/devices remain together in their original composite;
their movements are not perfectly synchronized, so cuts preserve the shared action phase.

`scripts/video-clips.json` is the editable manifest. Boundaries are integer source frames at 30 fps,
with an inclusive start and exclusive end. It records source paths and English/Chinese titles.
The encoder decodes the source and trims by frame index, then resets timestamps. It does not
use fractional timestamp seeks, which can skip boundary frames. Every decoded output frame
count must match its manifest range, and each group's ranges cover the source frame count exactly.
`dist/data/video-clips.json` is the public manifest with exact times, output paths and posters.
`docs/video-clips.json` records output metadata and source/output/poster SHA-256 hashes.

The comparison source contains a one-frame burned-in title at frame 12 (zero-based, 0.400 s).
Its `frameRepairs` entry substitutes the next clean frame, 13, at that position. This applies to
`comparison-standing.mp4` and the full web `comparison.mp4`; no frame is removed, no time shift
is introduced, and audio is unchanged. Original input files remain intact. The encoder
automatically rebuilds affected outputs when the declared repairs change; subsequent forced
regeneration also applies the repair. Verification refuses to certify an unapplied repair.
Repaired web copies use content-hash URL revisions so a normal page refresh bypasses the
previously cached MP4. Other video URLs and playback behavior are unchanged.
Verification: [frame/audio record](video-subtitle-repair.json) and [browser at 0.400 s](previews/comparison-subtitle-fixed.png).

The comparison group now removes only its embedded outer black margins: `crop=1610:906:64:0`.
The full film and all nine clips are encoded directly from the original at H.264 CRF 16 / slow,
without a bitrate cap or spatial resampling. Original frame boundaries, timing, the frame-12 repair,
and the previously published AAC packets are retained. All ten posters are regenerated from the
new outputs. Video and poster URLs include content hashes, and the full-film player uses the
declared 1610:906 ratio. Other groups' media remain byte-identical. `crop` and `encoding` in the
manifest trigger regeneration when changed, and verification checks the declared output size.
The full film explicitly preserves its existing 2,512 displayed frames and 83.776-second MP4
duration (including the unchanged audio). The nine source-frame clips still cover all 2,513 source
frames. `fullVideoFrames` records that existing full-film endpoint instead of relying on implicit
encoder end-of-stream behavior.

Run `python3 scripts/prepare-videos.py --clips-only` to prepare missing clips. Add `--force` to
regenerate the generated clips and posters, or `--verify-only` to decode existing clips and refresh
their validation records. The normal preparation command also prepares these clips after the
full-length files. Originals are read only; hashes are checked before and after processing.

Each of the three groups uses a single horizontal rail: three desktop cards for comparison and
body diversity (the input-device group contains only two clips), two on tablet,
and one plus a glimpse of the next on mobile. Rails support native horizontal wheel/touch scrolling,
a scrollbar, and previous/next buttons. When the rail itself has keyboard focus, Left/Right advances
one card and Home/End goes to either end. Video controls retain their own keyboard shortcuts.
Ordinary vertical wheel input continues scrolling the page. Buttons disappear when every card fits.

Once a rail is within 350 px vertically of the viewport, it attaches sources only for horizontally
visible clips and one neighboring clip on either side. Previously loaded sources stay attached so
returning does not reset playback. The main film attaches its source within 350 px of the viewport.
Videos play muted once 15% visible, accounting for the rail's horizontal clipping. Short clips loop;
the main film does not. Leaving the viewport vertically or horizontally, opening a full film, or
switching tabs pauses automatic playback. Returning resumes the same position. A viewer's deliberate
pause persists until they resume playback. Unmuting one player mutes other players. Native controls
retain seeking, volume and full screen. Rejected autoplay exposes a manual play overlay.
Full films open in a modal and load on demand. No clips or source films were re-encoded for this layout.
