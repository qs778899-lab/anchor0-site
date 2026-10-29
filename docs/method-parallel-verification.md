# METHOD 可选路径同步动画验收

本次仅更新 METHOD 时间线和说明。依据论文 [main@7bdfcc7 的方法说明](https://github.com/ilnehc/S0_Report/blob/7bdfcc7f280c6190d74c963995c5bd530b1d8229/sections/methods.tex#L398)，两组路径是可选接口。同步流动用于并列展示，控制栏标明 **Alternative paths (choose one)／可选路径（二选一）**，不表示两路输入叠加。

## 时间线与保留范围

| 区域 | 同步路径 | 循环内开始 | 共同用时 | 后续步骤 |
| --- | --- | --- | --- | --- |
| B | Reconstructed H* → Target selector；Reference H′ → Target selector | 7.055714 s | 1.8 s | 选择器出口单束流光 |
| C | Mode 1 → Sparse H′；Mode 2 → Motion token | 15.854286 s | 1.8 s | Sparse H′ → Motion encoder，继续编码、解码和反馈 |

- 各对采用较长路径原有用时，各自按行程计算速度；同时开始、同时结束。
- 全部 28 条路径各播放一次，合为 26 个步骤。保持 A → B → C，阶段间隔 0.3 s；完整循环为 **23.412857 s**。
- 仅上述两个步骤同时播放两束流光，其余步骤至多一束。只有当前区域的边框呼吸，周期仍为 1.4 s。
- PNG、28 条箭头的坐标／方向／遮罩和面板位置均未修改；保持 7 px 流光、2 px 亮芯、14 px 局部光晕、64 px 流段及约 30% 静态箭头对比度。
- 原图仍为 2273 × 1462、RGBA、703,863 字节；SHA-256：`aa8008e9762172bbe90088b4bd58bddbfb8696f6a047e2847633adfd8d366cf7`。来源见 [原图记录](method-figure-provenance.json)。
- 图下说明使用预留空间，非同步步骤隐藏；正文和放大窗口共用时间线、暂停状态与双语说明。

## 验收结果

- `tests/method-timeline.test.mjs`：28 条路径无遗漏和重复、26 步顺序、同步组共同起止、逐路径位置、分组后继、循环与间隔全部通过。
- `tests/browser-method.mjs`：在实际浏览器观察完整循环，核对每帧路径集合、各自位置、说明显隐及边框归属。两组以外没有双束流光，阶段切换无残留。
- `tests/browser-method-parallel.mjs`：分别在 B／C 同步步骤中暂停，两束流光、边框和说明均冻结；放大后保持同一帧，关闭后回到相同帧。C 同步步骤正常进入编码路径，说明隐藏且没有残留流光。
- 1440 px 桌面、1024 px 平板、390 px 手机布局通过；说明不挤占按钮、不造成页面溢出，显隐前后控制栏高度一致。键盘、手机真实触屏暂停／继续、中英文、明暗主题及放大窗口通过。
- 离屏／后台暂停和返回续播、手动暂停优先、减少动态效果默认静态及主动播放通过。原尺寸放大一比一显示和手机拖动通过；其他图片查看器没有新增控件。
- 117,052 个原线条像素通过中心线和颜色核对；28 条线身及 28 个固定箭头尖端的对比度保留比例为 0.298–0.303。光晕遮罩的 74,904 个新增像素均位于允许范围内。
- 三个浏览器实际渲染状态中，86,451 个箭头／边框像素变化；允许的箭头与呼吸边框区域以外，变化像素为 **0**。浏览器无 JavaScript 异常。
- `tests/verify-site.py`：现有页面资源、15 个短片及原视频校验、134 个发布演示文件校验、评测数据、HTTP Range 请求及资源类型检查通过。
- 局域网 `http://172.16.3.166:18081/#method` 已验证返回新版时间线、说明及与论文逐字节一致的版本化 PNG。无需新增服务。

## 提交与预览

第一阶段 **`9bd1318`** 已推送至现有 private 仓库的 `codex/anchor0-site` 分支。第二阶段保存本验收记录、专项浏览器检查、截图与录屏。只提交本任务相关文件。

- B 同步组：[桌面](previews/method-parallel-b-desktop.png)、[放大窗口](previews/method-parallel-b-enlarged.png)
- C 同步组：[桌面](previews/method-parallel-c-desktop.png)、[放大窗口](previews/method-parallel-c-enlarged.png)
- [中文深色](previews/method-parallel-b-dark-zh.png)、[平板](previews/method-parallel-b-tablet.png)、[390 px 手机](previews/method-parallel-b-mobile.png)、[手机放大窗口](previews/method-parallel-b-mobile-enlarged.png)
- [完整循环录屏](previews/method-parallel-motion.mp4)、[录制信息](previews/method-parallel-recording.json)

录屏来自实际浏览器，728 个捕获帧、25.166 秒，覆盖完整 23.413 秒循环及两组同步路径。保留捕获时间戳，以 30 fps 原速输出。由 `tests/record-method-preview.mjs` 可重复生成；使用现有 `FFMPEG` 和 `CDP_URL` 设置。
