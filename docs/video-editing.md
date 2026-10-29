# Action clips and playback

The original 228.867-second main film and all three full-length comparison films remain available.
The front-page showcase adds 15 contiguous action clips: nine comparison clips, four body-diversity
clips and two input-device clips. Clips are 6.8–13.667 seconds long. All original video frames are
retained at normal speed. The four operators/devices remain together in their original composite;
their movements are not perfectly synchronized, so cuts preserve the shared action phase.

`scripts/video-clips.json` is the editable manifest. Boundaries are integer source frames at 30 fps,
with an inclusive start and exclusive end. It records source paths and English/Chinese titles.
The encoder decodes the source and trims by frame index, then resets timestamps. It does not
use fractional timestamp seeks, which can skip boundary frames. Every decoded output frame
count must match its manifest range, and each group's ranges cover the source frame count exactly.
`dist/data/video-clips.json` is the public manifest with exact times, output paths and posters.
`docs/video-clips.json` records output metadata and source/output/poster SHA-256 hashes.

Run `python3 scripts/prepare-videos.py --clips-only` to prepare missing clips. Add `--force` to
regenerate the generated clips and posters, or `--verify-only` to decode existing clips and refresh
their validation records. The normal preparation command also prepares these clips after the
full-length files. Originals are read only; hashes are checked before and after processing.

Each of the three groups uses a single horizontal rail: three cards on desktop, two on tablet,
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
