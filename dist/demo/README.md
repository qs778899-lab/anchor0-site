# S0 Tracker browser demo

Public static release: continuous multi-word writing, 26 single letters, 10 preset motions, unchanged BrainCo G1 physics and the 1020 visual appearance, MuJoCo WASM and test052 20k. Simulation, policy inference and actual right-wrist ink run on each visitor’s computer. No inference backend.

Use `?word=HELLO+WORLD` for continuous writing, or `?letter=A` for a single letter. Up to 32 letters; internal spaces are preserved. Each space adds one extra frozen r2-052 transfer (0.424 m reference displacement, 6 s movement + 3 s hold). The whole sequence uses one physical initialization and uninterrupted policy history. Final ink shows actual tracking error.

Native validation, raw NPZ files, recordings and internal reports are excluded. See release.json and the included licenses.

Rebuild in the canonical project: `npm ci`, `npm run build`, then `S0_SOURCE_COMMIT=<full-source-commit> node tools/prepare-pages.mjs /absolute/path/to/this-checkout`. Commit and push this generated repository to update the same GitHub Pages URL.
