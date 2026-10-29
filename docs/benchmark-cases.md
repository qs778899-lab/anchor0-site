# Benchmark case video selection

Source: user-supplied `benchmark_mp4_only` folder (100 In-house, 100 Public, 100 Reachability, plus 3 curated examples). Reviewed 28 candidates with early/middle/late frames; selected 18 for qualitative diversity, not as a statistical summary or controller-performance comparison. Videos are reference motions, not policy rollouts.

Seven In-house examples cover wide support, upper-body reaching, low reaching, torso participation, end-effector stabilization, lower-body movement and multi-phase sequences. Six Public examples include CIRCLE, BONES-SEED, AMASS, OMOMO and the supplied jump-turn example. Five Reachability examples cover standing, shallow squat, deep squat, staggered stance and half kneeling.

The original 960 × 1020 MP4 files remain untouched. A fixed per-clip crop removes outer whitespace, enclosing the full motion and floor across every frame plus an 18-pixel safety margin. Outputs use H.264 CRF 16 slow without scaling or timing changes. Source and output SHA-256, crop rectangles and original relative paths are recorded in `dist/data/benchmark-cases.json`. Posters use the cropped midpoint frame. Players match the comparison videos’ 1610:906 ratio, with contain fitting to avoid cropping moving limbs further. Reproduce with `scripts/prepare-benchmark-cases.py`; selection inputs are in `scripts/benchmark-cases.json`.

UI: below the three benchmark summary cards; one horizontal rail per track; 3 desktop cards, 2 tablet cards, 1 mobile card with a next-card preview. Reuses the existing media controller and arrow/keyboard/touch controls. Only nearby cards load; visible clips loop muted; offscreen clips pause; user pauses persist. No model, metric or benchmark-count changes.

## Selected cases

| Track | Title | Source | Duration |
|---|---|---|---|
| inhouse | Wide-stance reach | `inhouse/001_Chingmu_Hand-Reaching_REC-11759_BVH_Take_001_xubugao/reference_motion.mp4` | 4.23 s |
| inhouse | End-effector stability | `inhouse/007_Chingmu_End-Effector-Stability_REC-11467_BVH_Take_002_huchuanxiang/reference_motion.mp4` | 8.13 s |
| inhouse | Torso-assisted reaching | `inhouse/015_Chingmu_Dual-Reaching_REC-14061_BVH_Take_001_wangshaodong/reference_motion.mp4` | 5.87 s |
| inhouse | Lower-body movement | `inhouse/021_Chingmu_Mobile_REC-12420_BVH_Take_000_zhangcong/reference_motion.mp4` | 7.37 s |
| inhouse | Coordinated reaching | `inhouse/044_Chingmu_Dual-Reaching_REC-11005_BVH_Take_001_wangshaodong/reference_motion.mp4` | 5.57 s |
| inhouse | Multi-phase coordination | `inhouse/050_Chingmu_Sequence_REC-12662_BVH_Take_000_xubugao/reference_motion.mp4` | 10.20 s |
| inhouse | Low reaching | `selected_three_sequrences/inhouse_low_reach/reference_motion.mp4` | 4.37 s |
| public | Overhead reaching | `public/002_CIRCLE_s5_closet1_shelf_10_closet1_0_001_reaching_001_reaching/reference_motion.mp4` | 5.47 s |
| public | Dance movements | `public/005_boneseed_all_230418_dancing_routine_V001_003__A332_M/reference_motion.mp4` | 12.70 s |
| public | Punch-to-kick transition | `public/007_AMASS_Transitions_mazen_c3d_punchkarate_kick_stageii/reference_motion.mp4` | 8.57 s |
| public | Bending & lifting motion | `public/010_OMOMO_smplx_test_sub17_smalltable_025/reference_motion.mp4` | 5.47 s |
| public | Sideways movement & running | `public/031_AMASS_Transitions_mazen_c3d_walksideways_running_stageii/reference_motion.mp4` | 7.33 s |
| public | Jumping & turning | `selected_three_sequrences/public_jump_turn/reference_motion.mp4` | 7.10 s |
| reachability | Standing reach | `reachability/001_standing__rw_x+060_y-040_z110_bend0/reference_motion.mp4` | 16.52 s |
| reachability | Shallow-squat reach | `reachability/009_half_squat__rw_x+060_y+020_z070_bend0/reference_motion.mp4` | 16.52 s |
| reachability | Deep-squat reach | `reachability/003_deep_squat__rw_x+000_y-040_z010_bend0/reference_motion.mp4` | 16.52 s |
| reachability | Staggered-stance reach | `reachability/012_staggered_left__rw_x+020_y+020_z110_s44/reference_motion.mp4` | 16.52 s |
| reachability | Half-kneeling reach | `reachability/013_half_kneel_left__rw_x+060_y+020_z090_bend0/reference_motion.mp4` | 16.52 s |

Validation: all 18 videos played in-browser at their recorded cropped dimensions; source hashes match the supplied originals; no horizontal page overflow at 1440, 1024 or 390 px; single-row layout, arrows, lazy loading, offscreen/manual pause and bilingual dark-theme checks passed. Screenshots in `docs/previews/benchmark-cases-*.png`.

## Whitespace crop acceptance

All 6,901 frames retained. Each cropped encode was compared with the same crop of its original source; the lowest per-video mean SSIM was 0.998419. Per-video frame counts, crop rectangles and scores are in `benchmark-crop-verification.json`. Original sources remain unchanged. Desktop and mobile player aspect ratios match the comparison group (1610:906); all 18 clips, lazy loading, scrolling, pause/resume and bilingual layouts passed browser checks.
