# 网站图表数据与固定快照

## 交互与显示

全部取值标记保存明确的 `datasetId`、`modelId` 和 `metricId`，图表与数据表读取同一数值及可用样本数。
提示显示四位小数，表格显示两位，下载 JSON 保留原始浮点精度。模型配置只在详细提示及折叠说明中出现。
选择图例中的模型会将其 SVG 图层置顶，并关闭其他模型图层的指针命中和键盘停靠。
雷达点以真实屏幕坐标解析最近点；相同坐标的模型或指标共同列出，临近但不同的坐标不会合并或移动。

每张图按稳定面板标识记录本次访问的动画状态。首次约 25% 入屏播放 700 ms 动画：柱形从零增长、
雷达从中心展开、散点原位淡入。鼠标或键盘操作立即显示最终几何位置；语言、主题、图例和数据视图
变化不重复播放。系统要求减少动态效果时直接显示最终状态。历史论文原图和机器人演示不受影响。

网站使用 `dist/data/paper-results.json` 中经用户确认的固定 **test134/46k** 仿真评测快照，不在浏览器运行时请求评测服务器，也不跟随最新 checkpoint 自动更新。数值来自用户提供的评测网页及 `S0_Report` 论文图表；没有从雷达图像的像素位置估算成功率。

原论文的 `simulation-summary.pdf` 和 `lookahead-comparison.pdf` 仍是 **test132/38k**，仅作为历史图表参考。它们不能代表当前交互图的 test134/46k 数值。真机和下游结果保留各自原实验版本，不因更新仿真 checkpoint 而改写。

## 来源与版本

- 评测网页：`http://172.16.3.99:18080/`。
- 页面内数据生成时间：`2026-10-28T13:44:30.709415+00:00`。
- 保存的 HTML SHA-256：`e33cfc4858fc96c721d7653a36ffd19f9dc58f4c63001eece7c35a93bc080b25`。
- Anchor-0 权重 SHA-256：`5757a7d5a5632ae611060508a86032af5cbc5152098aed32edcb7da71f1f31ea`，在每个选中 tracking 记录中核对。
- 历史论文仿真图元数据标题：`Figure 3 · test132 · 38k`。
- 历史论文前瞻比较图元数据标题：`Figure 4 · test132 · 38k`。
- 共同条件：Isaac Sim、domain randomization 开启。
- 本地缓存 `.cache/evaluation.html` 不纳入 Git。网站只包含所需聚合数据，不包含页面中的内部服务器路径、无关 checkpoint 或逐动作大数据。

## 配置对应

| 网站 ID | 论文模型 | In-house / Public 输入配置 | Reachability 输入配置 |
| --- | --- | --- | --- |
| `anchor-global` | Anchor-0ᴳ | `test134_46k_human_global_reference` | `test134_46k_g1_global_reference` |
| `anchor-local` | Anchor-0ᴸ | `test134_46k_human_reanchor_reference` | `test134_46k_g1_reanchor_reference` |
| `scale-global` | ScaleBFMᴳ | `scalebfm_xl_wholebody14` | 同左 |
| `scale-local` | ScaleBFMᴸ | `scalebfm_xl_wholebody14_local` | 同左 |
| `sonic` | SONIC v1.1 (G1) | `sonic_v1_1_g1` | 同左 |
| `mimic` | MimicLite v1.1 | `mimiclite_v1_1` | 同左 |

G、L 表示控制器的输入模式，与评价使用的 global、local 坐标系相互独立。Reachability 使用机器人空间参考，而前两个仿真动作集的 Anchor-0 使用人体参考。

## 指标和聚合

### 仿真结果（对应历史论文图 3A–E 的指标）

- In-house 有 15,342 条动作，Public 有 2,230 条动作。
- 成功率读取 `data.records` 的 `local.main` 和 `global.main`，单位为百分比，保留源数据浮点精度。
- 成功要求腕/踝位置误差全程不超过 10 cm、腕/踝方向误差不超过 1 rad，其他跟踪点位置误差不超过 25 cm。
- 根部 XY 误差使用 global；腕和踝误差使用 local，单位均为 mm。
- 误差先在每条动作内平均，再跨动作平均。评价窗口在任一 body14 跟踪点位置误差首次超过 25 cm 前截止，因此不同方法的误差观察窗口可能不同。
- Global 采用初始骨盆水平位置和朝向对齐；local 在此基础上去除逐帧骨盆水平平移差，保留高度和朝向差。
- 任务雷达使用 `radarData.datasets.inhouse.results` 的 `mainCounts[axis][0] / totals[axis] × 100`。不是固定 15 cm 的通用 SR。每条结果同时保留分子/分母，便于 tooltip 展示动作数量。
- 雷达类别允许重叠，同一完整动作可包含多种任务阶段。

提取脚本会将以下 local SR 四舍五入到一位小数后与确认的快照进行断言核对，同时对 Anchor-0 使用完整浮点值和 checkpoint SHA-256 核验：

| 模型 | In-house local SR | Public local SR |
| --- | ---: | ---: |
| Anchor-0ᴳ | 89.6% | 59.1% |
| Anchor-0ᴸ | 85.7% | 57.3% |
| ScaleBFMᴳ | 53.4% | 35.2% |
| ScaleBFMᴸ | 35.4% | 26.0% |
| SONIC v1.1 (G1) | 33.6% | 25.9% |
| MimicLite v1.1 | 28.8% | 18.9% |

Anchor-0 的成功数（local / global）分别为：In-house G `13744 / 13732`、L `13150 / 6793`，Public G `1319 / 1359`、L `1277 / 582`。输出保留成功数，校验成功率等于 `100 × 成功数 / 全部动作数`。

### Reachability（对应历史论文图 3F、H 的指标）

- 使用 `reachData` 的全部 3,210 条参考。
- 任务窗口为 `[5.5, 16.5]` 秒，包含末端采样。
- 成功使用 `mainComplete == 1 && feetAvailable == 1 && taskSuccess == 1`，分母为所在组的全部动作。
- 六种所选控制器均具有完整的 3,210 条 tracking 和 foot-event 记录，脚部事件均值的分母也为 3,210。
- 七个存储姿态合并为五组：standing 804、half_squat 766、deep_squat 482、staggered_left/right 720、half_kneel_left/right 438。左右手、原始/镜像动作均保留。
- 脚步事件使用每条动作的 `slipCount` 和 `stepCount`，单位为 events / motion；`touchdownCount` 一并保存。
- test134/46k 的全体任务成功数为 G `1909 / 3210`（59.4704049844%）、L `1448 / 3210`（45.1090342679%）。姿态组的成功数之和必须与全体成功率一致。

图 3G 的 reference CoM difficulty 分组没有包含在给定网页的 `reachData` 中。论文描述了 support-margin 五分位分组，但页面没有逐动作 margin 或分组索引。因此 `reachability.difficulty` 明确设为 `null`，不生成精确数值 tooltip。可保留原论文图展示，待取得原始分组后再扩展。

### 前瞻比较（In-house / Public）

`lookahead.cohorts` 分别包含 In-house（15,342 条）和 Public（2,230 条）的七种配置。Local SR 读取各自数据集的 `local.main`，前六种配置必须与同数据集仿真图完全一致。额外的 SONIC v1.1 SMPL 配置为 `sonic_v1_1_smpl`，输入 `SMPL`；两数据集的 local SR 分别为 `0.6257332811888932%` 和 `8.295964125560538%`。每个点明确保存 `config` 和 `input`，避免将 SONIC 的 G1/SMPL 编码器混淆。

前瞻时间和在线重定向标记保留论文图 4 和对应正文记录的控制器设置：Anchor-0ᴳ/ᴸ 0.06 s、ScaleBFMᴳ/ᴸ 0.10 s、SONIC G1 0.90 s、SONIC SMPL 0.18 s、MimicLite 0.08 s。成功率已更新为 test134/46k 固定快照，不再沿用原图的 test132/38k 成功率。

两种 Anchor-0 和 SONIC SMPL 不需要在线人体到机器人重定向，其余配置需要。该图比较完整控制器配置，不能解释成前瞻长度的单变量因果实验，也不是端到端推理延迟。

### 真机与下游结果

- `hardware.trackingErrors` 是论文真机图中明确打印的腕/踝误差。保留各方法 retained/valid 动作数，提示均值来自不同的保留动作集。
- `hardware.standingReach` 是论文 51 条站立触达动作表；Anchor-0† 数值在稿件中标为 preliminary，JSON 同样保留该状态。
- 用户新增的六阈值真机雷达图没有打印逐点数值，`hardware.thresholdFigure.numericValuesAvailable` 为 `false`，只展示原图及放大功能。
- 网页中名为 `real_robot` 的原始数据集是对真机动作参考做的仿真评估，不作为实测真机结果使用。
- `downstream` 保留论文的示范采集与 VLA 表格数据。Anchor-0* 明确为较早的 test101/59000、encoder 接收误差反馈的版本。当前版本尚未完成的结果使用 `null` 与 `pending: true`，没有以早期结果代替，也没有把缺失值当作零。

## 前端字段

顶层字段为 `snapshot`、`models`、`simulation`、`radars`、`reachability`、`lookahead`、`hardware`、`downstream`、`notes`。

- 多序列雷达数据统一采用 `{axes, series:[{id,label,values,successes,counts}], unit}`。
- 各轴含英文 `label`、中文 `labelZh` 和 `count`。
- 柱状图按 `series` 中的命名指标读取，单位由对应 `unit` 或 metric 元数据指定。
- `lookahead.cohorts` 采用 `{id,label,labelZh,count,series:[{id,label,config,input,lookaheadSeconds,localSuccess,onlineRetargeting}]}`。为兼容旧页面，`lookahead.series` 和 `lookahead.count` 仍指向 In-house 数据。
- `snapshot.historicalPaperFigures` 标记原论文图的 test132/38k 版本，`snapshot.checkpoint` 和 `checkpointSha256` 标记当前交互仿真数据。
- 数字保留源数据精度；表格显示两位小数，详细 tooltip 显示四位小数，下载 JSON 不截断原始精度。

## 重新生成与验证

在项目根目录运行：

```sh
python3 scripts/extract-paper-data.py --input .cache/evaluation.html
```

脚本只读取 JSON，不执行来源 HTML 的脚本；每个选择条件必须唯一。除快照 SR 和权重 SHA-256 断言外，还验证参考数量、评价窗口、完整性和输出中没有内部绝对路径。数据是随代码保存的静态快照，重新运行脚本也不会自行请求网络。

只读离线核验（不请求网站 HTTP）：

```sh
python3 tests/verify-site.py --offline
```

该核验保留全部 134 个原 letters 演示不可变资源的 SHA-256 检查，同时检查 test134/46k 数值、In-house/Public 与前瞻图的一致性、各 radar 的成功数/分母、Reachability 分组总和，以及待完成结果必须保留 `null` 的语义。去掉 `--offline` 才会继续执行现有 HTTP、媒体分段和资源 MIME 检查。
