# METHOD 与论文 main 同步验收

## 来源与显示

- 论文来源：[main@7bdfcc7 的 figures/method.png](https://github.com/ilnehc/S0_Report/blob/7bdfcc7f280c6190d74c963995c5bd530b1d8229/figures/method.png)。完整来源记录见 [method-figure-provenance.json](method-figure-provenance.json)。
- 网站 PNG 与源文件逐字节一致：2273 × 1462，RGBA，703,863 字节；SHA-256 为 `aa8008e9762172bbe90088b4bd58bddbfb8696f6a047e2847633adfd8d366cf7`。没有重采样、压缩或修改透明通道。
- 正文与放大窗口使用相同的白色图面和版本化图片地址。原图入口仍指向源 PNG；原尺寸放大为一比一显示。
- 最新论文图已删除 Benchmark 框和回路。网站同步移除对应四段动画，保留 A/B/C 的全部 28 条箭头。放大提示移到图下，避免覆盖新图底部文字。

## 动画与像素检查

- A/B/C 分别包含 4/14/10 条路径，保留各区内部顺序，完整一轮为 25.405714 秒；每段 0.6–1.8 秒，阶段之间停顿 0.3 秒。
- 每帧最多一条箭头播放单束流光。仅当前区的外边框呼吸，周期 1.4 秒；阶段停顿时没有亮起的边框。
- 保持 7 px 流光、2 px 亮芯、14 px 局部光晕、64 px 流段。C 区错误反馈箭头使用绿色，机器人状态反馈箭头使用灰色，与新图一致。
- 117,052 个原线条像素通过颜色和中心线对齐检查。28 条线身及 28 个固定尖端的抽样对比度保留比例为 0.298–0.303。
- 扩展的 74,904 个光晕遮罩像素均位于原箭头 7 px 范围内，背景最小通道值为 229.1；无越界、文字或深色模块边界覆盖。
- 三个实际浏览器画面的对比中，87,397 个箭头／边框像素发生变化；允许区域之外的变化像素为 0。比较基准为新版原图关闭动画时的画面。

## 行为与回归验证

- `tests/method-timeline.test.mjs`：28 段路径覆盖、分组、顺序、时长、阶段间隔、首尾循环和面板边界通过。
- `tests/browser-method.mjs`：1440 px 桌面、1024 px 平板、390 px 手机的正文与放大窗口对齐通过；中英文、明暗主题、键盘暂停、离屏／后台暂停、手动续播、手机原尺寸拖动和减少动态效果模式通过。完整一轮未出现同时播放多条箭头或错误的呼吸边框。
- `tests/verify-site.py`：页面资源、视频 Range 请求、MIME、图表数据及 134 个原发布演示文件校验通过；其他图片的放大查看行为保持正常。
- 局域网 `http://172.16.3.166:18081/#method` 返回正常，新图片请求含版本 `aa8008e976217`，返回内容的 SHA-256 与论文一致。浏览器普通刷新（不绕过缓存）后仍显示 2273 × 1462 原图及 28 条路径。
- 浏览器未报告 JavaScript 异常。图片、图层、路径和源码变更仅限 METHOD；视频、模型权重及评测数值没有修改。

## 提交与预览

第一阶段提交：`b74b26b`，已推送至现有 private 仓库 `codex/anchor0-site` 分支。

- [桌面](previews/method-main-desktop.png)、[图面](previews/method-main-figure.png)、[静态对照](previews/method-main-original.png)
- [放大窗口](previews/method-main-enlarged.png)、[中文深色](previews/method-main-dark-zh.png)
- [平板](previews/method-main-tablet.png)、[手机](previews/method-main-mobile.png)、[手机放大窗口](previews/method-main-mobile-enlarged.png)
- [完整循环动态预览](previews/method-main-motion.mp4)、[浏览器录制元数据](previews/method-main-recording.json)

动态预览由 `tests/record-method-preview.mjs` 录制真实浏览器画面：790 个捕获帧、27.166 秒，覆盖完整一轮循环。保留帧时间戳，以 30 fps 输出且不加速，成片解码检查通过。运行时通过 `FFMPEG` 指定现有 `.tools/video-python/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1`；浏览器调试地址为 `CDP_URL=http://127.0.0.1:9225`。
