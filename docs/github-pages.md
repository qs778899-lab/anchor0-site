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
