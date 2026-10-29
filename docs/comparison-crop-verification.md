# 双机对比视频去黑边验收

## 范围与生成

- 仅更新 **Two robots. The same intent.** 的九个短片、完整视频和十张封面；每行三个视频及其他页面布局保持不变。
- 从原始 `双机对比 pico logo/双机对比.mp4` 重新生成，固定裁剪 `1610:906:64:0`，保持有效画面的原生像素、906 px 高度及 30 fps。没有空间放大、拉伸或降采样。
- 编码使用 H.264、CRF 16、slow、yuv420p，没有码率上限；MP4 保留 faststart。完整视频约 46.78 MiB，九个短片均低于 GitHub 单文件限制。
- 全部 2,513 个源视频帧均检出同一黑边裁剪范围。Logo、两台机器人、操作者和原有动作区域均完整保留。
- 原始视频 SHA-256 未变：`62583c1742367ecd10bf62f5ebce4e4e1692ff3db264b18e79e3f778595d497b`。另外 18 个非本组媒体文件逐字节未变。
- 保留源帧 12 → 13 的单帧字幕修复，以及全部十个网页视频原有的 AAC 音频包。旧帧修复历史记录仍保留；本次输出记录以 [清晰度与音轨校验](comparison-crop-quality.json) 为准。

## 清晰度、时间轴与封面

- 对十个输出共 **5,025 帧**逐帧与修复后、相同裁剪区域的原素材进行 SSIM 对比。各视频平均值为 **0.994634–0.997801**，所有帧最低值为 **0.990239**。
- 原尺寸检查 Logo 字体、机器人手部／关节轮廓、衣物及墙面纹理，并检查 PN Link 和 PICO 两种场景。未见明显新增模糊、色块或重影。SSIM 仅作辅助证据，不等同于无损编码；本次无需改用 CRF 14。
- 九个短片仍覆盖全部 2,513 个源帧，逐段帧数、剪辑起止和时长均与旧版相同。每段在浏览器中正常播放和循环，速度为 1。
- 完整网页视频保持旧版的 **2,512 个显示帧和 83.776 秒 MP4 时长**。验收发现编码链变更最初多保留了末尾一帧，第二阶段通过显式 `fullVideoFrames: 2512` 恢复原有终点；音轨和短片边界不变。
- 十条 AAC 音轨逐字节与修改前的网页版本一致。输出完整解码无错误，原始素材保留。
- 短片封面保持 960 px 宽度并采用新比例，完整视频封面为 1610 × 906；播放和封面采用各自内容哈希版本，普通刷新即可更新。

## 页面与播放检查

- `tests/browser-rails.mjs`：桌面三张、平板两张、390 px 手机一张加下一张预览；箭头、滚动条、键盘、横向触屏、纵向滚轮、懒加载、手动暂停与返回续播通过。
- `tests/browser-media.mjs`：15 个短片加载／播放／循环、后台暂停及返回续播、主视频播放结束状态、自动播放被阻止后的手动恢复通过。
- `tests/browser-comparison-crop.mjs`：九个短片及封面均加载新版本；解码画面的左右边缘为场景内容。1440 px、1024 px 和 390 px 的卡片、完整视频弹窗及浏览器全屏检查通过；保持原生视频尺寸、控制按钮、正常比例和无横向页面溢出。
- 中英文、明暗主题及切换到其他视频组的弹窗比例正常。测试未出现 JavaScript 异常。全屏保留画面比例，屏幕比例不同产生的外部留白不通过裁切人物画面消除。
- `tests/verify-site.py`：媒体哈希、原素材、视频 Range 请求、图表数据及 134 个原发布演示文件检查通过。
- `http://172.16.3.166:18081/#videos` 已验证有效；局域网提供最终清单和十个新版视频，均支持 HTTP Range 分段加载。

## 提交与预览

第一阶段：**`75fd05e`**，视频、封面、可重复生成配置及播放器适配，已推送至 private 仓库当前分支 `codex/anchor0-site`。第二阶段保存完整视频终点修正、验收脚本、记录及以下预览。

- [桌面](previews/comparison-crop-desktop.png)、[平板](previews/comparison-crop-tablet.png)、[390 px 手机](previews/comparison-crop-mobile.png)、[中文深色](previews/comparison-crop-dark-zh.png)
- [完整视频弹窗](previews/comparison-crop-desktop-full.png)、[手机弹窗](previews/comparison-crop-mobile-full.png)、[全屏](previews/comparison-crop-fullscreen.png)、[0.400 s 字幕修复](previews/comparison-crop-subtitle.png)
- 原生像素前后对照：[PN Link 场景](previews/comparison-crop-before-after-2s.png)、[PICO 场景](previews/comparison-crop-before-after-65s.png)
- Logo：[原素材](previews/comparison-crop-original-logo-detail.png)／[新网页视频](previews/comparison-crop-cropped-logo-detail.png)
- 机器人及衣物：[原素材](previews/comparison-crop-original-motion-detail.png)／[新网页视频](previews/comparison-crop-cropped-motion-detail.png)

可使用 `tests/verify-comparison-crop.py` 重复逐帧检查；`--before` 指向修改前的视频备份，默认 `.cache/comparison-crop-before`。原始素材、备份和逐帧 SSIM 日志仅保留在本地，汇总校验值记录在本目录的 JSON 中。
