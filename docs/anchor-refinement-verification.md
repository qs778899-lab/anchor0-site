# Anchor 页面微调验收

## 第一阶段：页面、名称与真机评测

- 可见品牌统一为 `Anchor`，保留 G/L、星号和 preliminary 标记。所有项目页演示入口使用 `Interactive Demo / 交互演示`，书写入口继续预填 `ANCHOR`；演示模型、内部 ID、仓库地址和视频原文件不变。
- 01–08 章节编号一致；仿真与真机的大标题及目录名称同步。删除要求移除的重复图片、版本说明、数据下载入口、Discussion 和三张方法概括卡片。
- 浮窗仅通过顶部手柄拖动，支持方向键、Home 复位与按钮复位；位置按桌面/窄屏分别记忆并限制在视口内。1440、1024、390 px 检查均通过。
- 两组指定视频在桌面各显示 4 个完整视频，平板 2 个，手机 1 个并露出下一段。横向滑动、触屏、键盘、滚动条、离屏暂停、续播和手动暂停测试通过。原视频 SHA-256 全部未变。
- 采集结果为 3 模型 × 4 任务比较矩阵，每任务含 demos/h 和 success% 两列；手机横向滚动且模型列固定。Pending 与真实零值语义保持不变。
- 真机误差来自论文 main@5be61b7，6 个模型均更新至非空的首次 25 cm 位置失败前窗口；Anchor† 腕/踝为 40.61/49.02 mm，71/72 动作贡献均值。全部数值和计数见 `chart-data.md`。仿真 test134/46k 数值不变。
- 同提交的真机阈值 PDF 仅移除图例 `-0`，按 3414 × 2271 输出。与同分辨率原图对比，仅图例 30 × 26 像素包围框内发生变化，其他像素完全一致。原始 METHOD PNG 未改。

验证：`tests/verify-site.py`（含 HTTP、媒体 Range、MIME、134 个原始演示资源校验），`tests/browser-anchor.mjs`，`tests/browser-rails.mjs`。中英文、明暗主题、手机导航与矩阵、演示标题通过；浏览器未报告脚本异常。

第一阶段提交并推送：`87f28c8`。

## 第二阶段：METHOD 接力动画与完整验收

- 全部 32 段箭头纳入 A → B → C → Benchmark 循环，完整一轮 31.26 秒。每次只有一条箭头的一束 64 px 流光；每段 0.6–1.8 秒，阶段间停顿 0.3 秒。具体顺序、真实路径长度和时长由 `dist/method-flow-timeline.js` 定义。
- 流光宽 7 px、亮芯 2 px、局部光晕 14 px，均以原图像素计。保留前版鲜明的色系、固定箭头尖端、真实方向、折线路径和 Benchmark 虚线。静态箭头对比度保持约 30%。
- 当前 A/B/C 面板有 1.4 秒周期的轻微呼吸边框；其他面板及 Benchmark 阶段不发光。边框与流光由同一时钟更新，手动暂停同时冻结。
- 正文和放大窗口共享时间线；放大时只播放窗口中的动画，关闭后正文接续。离屏及后台暂停，返回续播。减少动态效果默认显示未增强的原图，可主动播放。
- METHOD 原图仍为 2314 × 1585，SHA-256 `3a3a2b04d4d001396ca93acd13f40ba0de7de0e18975bbe6ddf0878d709eba1e`。没有修改或重新压缩。

### 验证结果

- 时间线测试覆盖每段起止和中间位置、阶段停顿、全体 32 个 ID 的唯一性及循环首尾。
- 浏览器观察了完整一轮，32 段依次出现，每帧最多一个箭头处于激活状态，呼吸边框归属正确；没有为分离重叠而移动图像。
- 147,667 个原图线条像素与 32 条路径对齐；32 条线身及 31 个尖端静态对比度为 0.298–0.303。安全光晕区域只包含箭头及邻近浅色背景。
- 三个实际渲染状态与原图截图对比，箭头/边框区域共 98,408 个像素发生变化，允许区域之外为 **0**。文字、机器人与内部模块边界均不在边框效果区域内。
- 1440 × 1000、1024 × 900、390 × 844 浏览器检查通过：键盘暂停续播、后台和离屏暂停、共享窗口状态、1:1 原图放大、手机触屏平移、中英文、明暗主题及减少动态效果。没有脚本异常。移动设备采用 Chrome 模拟，未宣称测试实体手机或 Safari。
- 完整图表检查：405 个图表/表格数值、样本量及配置匹配 JSON；180 个选中模型的数据点通过指针及键盘检查。覆盖 100% 重合点、零值中心、相邻点、12 根真机误差柱，以及两套性能数据集。
- 演示 UI 与兼容性测试 10 项通过。仿真数据、15 个短片和 134 个原始演示资源保持校验一致。HTTP 页面、Range 视频流、MIME 与路由检查通过。

命令：`node --test tests/method-timeline.test.mjs`，`node tests/browser-method.mjs`，`node tests/browser-experience.mjs`，`python3 tests/verify-site.py`。浏览器测试使用隔离的 Chrome 调试会话。

### 预览

当前局域网：<http://172.16.3.166:18081/#method>。

- [METHOD 实际浏览器动态预览](previews/method-relay-motion.mp4)，按原时间戳编码，未加速；录制参数见 [记录](previews/method-relay-recording.json)。
- [桌面 METHOD](previews/method-relay-desktop.png)、[放大](previews/method-relay-enlarged.png)、[平板](previews/method-relay-tablet.png)、[手机](previews/method-relay-mobile.png)、[手机放大](previews/method-relay-mobile-enlarged.png)、[中文深色](previews/method-relay-dark-zh.png)。
- [四视频与浮窗](previews/anchor-desktop-videos.png)、[采集矩阵](previews/anchor-collection.png)、[真机评估](previews/anchor-hardware.png)、[手机矩阵](previews/anchor-mobile-table.png)、[手机目录](previews/anchor-mobile-nav.png)。
