# Hardware threshold radar — 2026-10-29

Replaced the static six-panel image with six interactive SVG radars. The supplied JSON is preserved byte-for-byte at `dist/data/hardware-thresholds.json`, SHA-256 `e39db29d20a620c7cf9d31e73177ed64f912dbfb11664fe4addc63ba32163388`.

Source folder: `/Users/qs/Downloads/radar_success_rates_old_mimiclite_20261029/`. Input CSV and JSON contain 252 observations: six thresholds × six models × seven categories. All percentages and successful/evaluated motion counts agree exactly between files; percentages also agree with the count ratios. Source README identifies test134 / 59k reference-local Anchor and original MimicLite ROA, not MimicLite v1.1. These data are separate from the existing simulation snapshot and tracking-error tables, which remain unchanged.

Local success evaluates all valid recorded active-control samples, ignores missing tails, and does not truncate at first failure. Wrist/ankle orientation threshold is 1 rad; the remaining ten body points use 25 cm. Denominators are each controller/category's valid evaluated motion counts, not automatically the target counts.

No version note, new explanatory small text, or download button appears on the page, per user request. Source provenance is recorded here only. Tooltips identify hardware/local/threshold, model, metric, four-decimal success rate, successful count and evaluated count. Tables display two decimals. Input precision is unchanged. Old PNG remains on disk but is no longer displayed.

Reproduce import:

```sh
python3 scripts/import-hardware-thresholds.py /path/to/radar_success_rates_old_mimiclite_20261029
```

Validation:
- `tests/browser-hardware-thresholds.mjs`: all 252 data bindings and keyboard tooltips, all 252 selected-model pointer tooltips, six shared legend selections, paint order, muted-model focus exclusion, six Chart/Data toggles.
- Unselected coincident points: 24 zero-value entries at 10 cm, five 100% locomotion entries at 25 cm all appear together.
- Actual CDP touch tap shows the corresponding tooltip on the 390 px layout.
- 1440 px: three columns; 1024 px: two columns; 390 px: one column. No horizontal page overflow. English/Chinese and mobile dark-theme rendering checked.
- Existing animation helper retained: radar expansion on first entry, completed before interaction, no replays for language/legend changes, reduced-motion static behavior.
- `tests/verify-site.py --offline` passed (media hashes, demo assets, prior simulation/hardware data and local resources).
- Screenshots: `docs/previews/hardware-thresholds-{1440,1024,390}.png` and `hardware-thresholds-mobile-dark.png`.
