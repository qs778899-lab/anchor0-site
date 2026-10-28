# Verification — 2026-10-28

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
