# GitHub Pages publication

Public URL: https://qs778899-lab.github.io/anchor0-site/

The repository is public by the owner's explicit request. GitHub Actions publishes
the tracked `dist/` files on pushes to `codex/anchor0-site`; the workflow can also
be run manually. The local LAN server remains available independently.

`python3 scripts/prepare-pages.py` produces `.cache/github-pages/` using only
Git-tracked files, excluding local duplicate media, caches, source and QA records.
The package preserves all page content and all model, motion, video, image and
runtime assets byte for byte. Its only adaptations are the homepage's Code URL
and the demo's three return-home URLs, made relative for the `/anchor0-site/`
prefix. These transformations do not modify `dist/` or the local website.

The script checks the expected replacement counts and publishes a `.nojekyll`
marker. An audit manifest outside the published directory records source and
output SHA-256 hashes. No dependency installation or video/model conversion is
required to publish. MuJoCo and ONNX run in the visitor's browser with the existing
single-threaded WASM configuration.

After deployment, verify the homepage, `/demo/` (including `?word=ANCHOR`), and
`/code/`, along with video byte ranges, model parts, WASM and gzip assets. A past
version can be restored by reverting the relevant website commit and pushing to
the same branch, which triggers publication again.

## Verified publication — 2026-10-29

- Deployment commit: `3ab1fed`; Actions run `40888852205` completed successfully.
- 234 website files, 387.94 MiB; 232 are byte-identical to `dist/`, and the
  remaining two differ only by the four navigation URLs described above.
- The source `dist/` tree is unchanged from `6679469`.
- Public HTML, adapted demo bundle, chart data and METHOD image match the
  packaged files byte for byte. Video Range requests return correct HTTP 206 data.
- A fresh browser loaded the public homepage with charts, switched languages,
  and checked 390 px width without overflow.
- The public demo loaded and validated the model, initialized MuJoCo/ONNX WASM
  and robot assets, and advanced the ANCHOR sequence using live inference.
- The public Code page loaded its compressed replay and rendered the robot.
- No page exceptions or failed HTTP resource responses occurred in this check.
- Existing offline site/resource checks passed, including the 134 unchanged
  original published demo resources and all video/image/model checks.

Repeat the public browser check with `CDP_URL=<debug-browser-url> node
tests/browser-pages.mjs` (Node 24+). `SITE_URL` optionally overrides the public URL.
