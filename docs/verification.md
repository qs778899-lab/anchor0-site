# Verification — 2026-10-28

The initial application checks below refer to the original test132 / 38k build. The revision section records the current test134 / 46k release.

## Application

- Browser checked through `http://172.16.3.166:18081/` on the serving Mac, rather than only through localhost.
- English initial page, Chinese toggle, English restoration, and persistent theme preference verified. Dark background is `rgb(17,20,24)`.
- In-house and Public cohort switch checked; Public updates to 2,230 motions and Anchor-0 global-reference local SR 57.0404%.
- Tooltip checked on Anchor-0 global-reference In-house local SR: 87.0551%.
- Hardware threshold figure opens in the image viewer, including an original-file link and close control.
- All four MP4s reached browser readyState 4 and played. Starting another video paused the previous video.
- After a fresh page load, no video had a media source loaded; only posters were shown.
- Desktop layout has no horizontal page overflow. The English homepage was visually checked in a 390 px iframe viewport. This is responsive layout QA, not a physical-phone connectivity test.
- No browser console errors or warnings observed on the homepage or the running demo. No broken images with nonempty source URLs found.

## Published demo, served on LAN HTTP

- Policy and scene successfully loaded, then the default preset ran and advanced the motion frame counter.
- Switched to letter mode, ran a letter, and applied the leftward 50 N / 100 ms disturbance; confirmation appeared.
- Continuous-writing mode accepted `A B`, preserved one explicit space, reported 2 / 32 characters, and began the 2,522-frame sequence.
- Original motion controls, camera controls, reference displays, and interface retained. Original preset selector contains 10 actions.
- SHA-256 fallback passes standard vectors, padding/block boundaries, random 16 MiB input, and an actual 16 MiB policy part against Node crypto.
- 134 unmodified original files verified against the supplied published checkout; only the worker transport adapter and index return link differ.

## Files and transport

- Paper extraction verifies selected model configurations, counts, task aggregations, and the paper snapshot.
- All four encoded videos passed full decoding; metadata and checksums are in `video-assets.json`.
- Local file references exist. Every served file is below 100 MiB.
- HTTP 200 for main page and demo; `/demo` correctly redirects while retaining query parameters.
- Partial and suffix video ranges return HTTP 206 with matching bytes; unsatisfiable ranges return 416.
- JavaScript and WASM MIME types checked. Gzip model assets are served as original compressed bytes, without Content-Encoding.
- Directory listings, source cache, and traversal outside the static directory are unavailable.
- GitHub repository visibility verified as private before uploading.

## Explicit limits

- A separate physical device on the Wi-Fi was not available for testing. The actual LAN IP was exercised from this Mac, and the server listens on all IPv4 interfaces.
- CoM-difficulty group values and exact hardware radar vertices were not present in supplied numerical data; original figures are displayed instead of inferred numbers.
- Current-model downstream results left pending in the paper remain pending in the website.

## Performance / grouped-figure revision — test134 / 46k

- All interactive simulation data uses the fixed test134 / 46k snapshot. In-house local success is 89.58414809020988% / 85.7124234128536%; Public is 59.14798206278027% / 57.264573991031384%. The extraction and verification checks enforce equality between the front performance plot and the later simulation panels.
- The performance figure follows the main video and precedes the overview. Its horizontal labels run from 1.0 s on the left to 0.0 s on the right. Three circle configurations and four diamond configurations match the retargeting metadata.
- Both overlapping Anchor-0 marks were selected separately by their labels. Keyboard Tab moved between them and displayed the corresponding configuration and sample count. In-house and Public switching, two-decimal tables, and four-decimal tooltips were checked; downloaded JSON retains full precision.
- All nine Chart / Data pairs were exercised. Stage heights before and after switching were identical. The paired task-radar panel contains 12 data rows; other simulation panels contain 6 rows, and the performance panel contains 7.
- The shared simulation legend highlights the chosen controller across A/B/C/D/E/F/H and their tables. The remaining series dim, while the selected series remains visible. Clicking again restores every series.
- The 1280 px desktop layout has A/B above D/E, with C in the right column spanning both experiment groups. F and H share the next row; H shows slips and extra steps together. No horizontal page overflow or duplicate element IDs were present.
- A temporary 390 px iframe viewport was used for mobile layout QA and then removed. Panels appear in experiment order (A/B/C, D/E, F/H) with no page overflow. The front plot uses larger narrow-screen labels. This is responsive QA, not a separate physical-device connection test.
- English / Chinese, Light / Dark, dataset preservation through translation, arrow-key view switching, and the historical test132 / 38k label were checked. Deep links are positioned after asynchronous chart rendering, preventing the added figure from shifting the destination.
- Both JavaScript modules pass syntax checks. Local data / reference / immutable demo checks and HTTP range, MIME, redirect, and directory-boundary checks pass. The clean homepage preview tab reported no console errors or warnings.
- The original robot demo remains unchanged. All 134 immutable published demo resources still match the recorded SHA-256 hashes. Hardware and downstream numerical data retain their original experiment versions.

## Floating navigation, action clips and chart interaction — 2026-10-29

The site retains the test134 / 46k evaluation and the original released demo model.
The new left navigation, front video showcase and chart interactions were checked in an isolated
Chrome profile at 1440 × 1000, 1024 × 900 and 390 × 844. The responsive menu stays available,
closes after section selection, links to `/demo/`, and the reading column has no horizontal overflow.
English/Chinese and light/dark modes were inspected visually.

- All 405 numeric chart/table marks were compared to JSON by dataset, model and metric, including
  exact sample counts and available controller configurations. Tables use two decimal places;
  tooltips use four; downloadable JSON is unchanged.
- All 180 simulation marks were checked with each model selected using actual DOM hit testing
  at projected coordinates, followed by keyboard focus. All 12 hardware bars were also checked.
  Both In-house/Public scatter datasets were exercised; a real emulated touch event opened the
  Anchor-0 tooltip on the 390 px layout.
- Coincident 100% radar points list both Anchor variants. Adjacent points remain independently
  selectable. Zero centers were checked, including a temporary DOM-only regression fixture for
  two zero-valued metrics of the same model; the fixture never changes production data.
- The first bar animation stays at zero below the entry threshold, starts at quarter visibility,
  and completes at the original SVG geometry. Chart/Data keeps the same height. Completed
  animation state survives language, theme and dataset changes; reduced motion shows final geometry.
- All 15 short clips load, play and loop in Chrome. Visible clips play muted together at normal speed and pause offscreen. A manual
  pause persists after returning. Unmuting one player mutes the others. Full-film modal playback
  pauses other players, supports native fullscreen, and releases its source when closed.
- Switching to a different browser tab pauses playback; returning resumes the existing position.
  The completed main film stays finished after leaving and returning. Injecting a rejected play
  promise verifies the visible fallback button and successful manual recovery.
- All 15 short clips decode without errors. Their frame ranges cover all 4,070 original frames of
  the three source films, with no dropped boundary frames. First/middle/last frames and source
  timelines were inspected. Original films and full-length web copies retain their recorded hashes.
- HTTP checks cover range requests for every short clip, main-film ranges, WASM/JS MIME types,
  raw gzip delivery and directory protection. All 134 immutable demo files retain their hashes.
- Final browser suites complete with no JavaScript exceptions.

Reproduce data, asset and transport checks with `python3 tests/verify-site.py` (`--offline` skips HTTP).
For browser checks, start a separate Chrome instance with `--headless=new`,
`--remote-debugging-address=127.0.0.1 --remote-debugging-port=9223`, and a new temporary
`--user-data-dir` (never a personal browser profile). Then run sequentially with Node 24 or newer:

```sh
node tests/browser-experience.mjs
node tests/browser-media.mjs
node tests/browser-rails.mjs
```

`CDP_URL` and `SITE_URL` can override the localhost defaults. Browser screenshots are saved under
`.cache/preview/`. The browser client has no external package dependency. These suites use both
real Chrome events and bounded DOM fixtures; they do not claim testing on a physical iOS device.

The preview host currently has Wi-Fi address `192.168.71.107`, with HTTP 200 verified for the
home page, clip manifest and `/demo/` at port 18081. The previous `172.16.3.166` address is
not assigned on this Wi-Fi connection. The service still listens on all interfaces.

Saved previews: [desktop home](previews/desktop-home.png), [video showcase](previews/desktop-videos.png),
[performance](previews/desktop-performance.png), [combined results](previews/desktop-results.png),
[Chinese dark mode](previews/desktop-results-dark-zh.png), [mobile navigation](previews/mobile-navigation.png),
[mobile performance](previews/mobile-performance.png), and [mobile videos](previews/mobile-videos.png).

## Single-row video rails — 2026-10-29

The layout and playback update was committed and pushed as `aede707` on `codex/anchor0-site`.
The following acceptance checks were completed before the second commit; all three browser suites
passed sequentially in the isolated Chrome profile, with no JavaScript exceptions.

- All three groups remain single rows. At 1440 × 1000 the rail shows three cards; at 1024 × 900 it
  shows two; at 390 × 844 it shows one and a preview of the next. No viewport has page-width overflow.
- Previous/next buttons move one clip without moving another group. End and Home reach the rail
  boundaries, with the corresponding button disabled. A group that fits hides its arrows; resizing
  updates this state. Reduced-motion mode moves directly to the target card.
- Real Chrome horizontal wheel events and native scrollbar-thumb dragging reach later clips.
  Vertical wheel events over a video continue moving the page without changing the rail position.
  Emulated touch swipes on the 390 px viewport reveal and play later clips, pausing the hidden clip.
- Horizontally hidden clips pause and resume at their existing position when they return. A manual
  pause survives browsing away and back. Desktop initially attaches only the first three clips plus
  one neighbor; mobile attaches only the first clip and its neighbor. All 15 clips still load, play
  and loop; full films, fullscreen, background-tab pause and autoplay fallback remain functional.
- Chinese/English and dark/light changes preserve the browsing position and update arrow labels.
  Existing navigation, chart values, selected-model interactions and entrance animations pass the
  full experience suite. Clip manifests/hashes, original films and all 134 immutable demo assets
  pass verification; transport and video range checks also pass.
- The current Wi-Fi URL is `http://192.168.71.107:18081/`. This Mac received HTTP 200 at that address
  for the homepage, clip manifest and `/demo/`. Touch testing uses Chrome emulation; a separate
  physical phone and Safari were not tested.

Current rail previews: [desktop](previews/desktop-video-rails.png),
[tablet](previews/tablet-video-rails.png), [mobile](previews/mobile-video-rails.png),
[mobile after swiping](previews/mobile-video-rails-scrolled.png), and
[Chinese dark mode](previews/desktop-video-rails-dark-zh.png).
