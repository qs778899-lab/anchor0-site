# Future section

Added after Method, numbered 08 and linked from the floating navigation.
The requested heading is exactly `FUTURE / Build on Anchor-0`; this is a deliberate exception to the current Anchor 1 site branding.

Two native-resolution extracts from the original `场景/场景.mp4`:

- Stool: frames [5700, 6303), 190.000–210.100 seconds, 20.100 seconds. Includes stepping onto the stool, reaching, stepping down and walking away.
- Stairs: frames [6306, 6866), 210.200–228.8667 seconds, 18.6667 seconds. Starts after the scene transition and keeps the complete stair ascent and final stance available in the master.

Both use the original 3840 × 2160 / 30 fps picture, H.264 CRF 16 slow, original speed and composition. AAC audio is retained through re-encoding; playback starts muted. Original footage is unchanged. Reproduce using `scripts/prepare-future-videos.py`; exact hashes and sizes are recorded in `future-videos.json`.

The videos use the existing media controller: near-viewport loading, muted looping while visible, offscreen/background pause, persistent manual pause, native sound/fullscreen controls. Two columns on desktop/tablet; one column on small screens. No changes to the existing video groups or demo model.

Validation passed: desktop 1440, tablet 1024, mobile 390; bilingual/dark theme; 4K metadata and duration; muted looping, offscreen pause and persistent user pause. Full decode passed for both files. End-of-page navigation now selects Future correctly. Screenshots: `previews/future-*.png`.
