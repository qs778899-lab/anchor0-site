# Anchor 1 project website

**Anchor 1: Precise and stable humanoid control for whole-body manipulation**

论文项目主页，包含中英双语、浅色/深色主题、交互图表、四组完整视频、VLA 任务序列、真机实验图以及本地机器人交互演示。首次打开默认英文，选择后记住访客偏好。所有运行资源均在仓库内，不依赖外部字体、CDN 或原始评测网页在线。

## 在这台 Mac 上使用

双击 `启动网站.command`；关闭时双击 `停止网站.command`。也可以在项目目录运行：

```sh
python3 scripts/site.py start
python3 scripts/site.py status
python3 scripts/site.py stop
```

- 本机：<http://localhost:18081/>
- 当前无线局域网主页：<http://172.16.3.166:18081/>
- 交互演示：<http://172.16.3.166:18081/demo/>

其他设备连接同一局域网后访问上述地址。服务监听 `0.0.0.0:18081`，运行期间 Mac 需要保持开机且不休眠。无线网络为 Mac 重新分配地址时，使用新的局域网 IP；端口仍是 18081。服务不依赖启动窗口持续打开；重启电脑后重新启动即可。

运行记录在忽略目录 `.run/`。脚本只管理本项目启动的进程，不更改系统服务或其他网站。

## 内容与数据

页面顺序：主视频 → 性能与前瞻交互大图 → 研究概述 → 三项评测基准 → 仿真组合图与可达性 → 真机阈值与跟踪实验 → ANCHOR 书写 → 遥操作与 VLA → 讨论与方法。

- `dist/data/paper-results.json`：锁定已核实的 test134 / 46k 评测快照，不随原评测网站的后续实验自动变化。
- 前置图保留反向前瞻坐标，提供 In-house / Public 切换。悬停、点击或键盘聚焦可查看四位小数、样本量与配置；重叠点的标签也可选中。图表／数据在固定高度内切换，表格显示两位小数，JSON 保留原始精度。共享图例联动突出控制器，图像点击放大。
- 桌面仿真图将 A/B（In-house）、D/E（Public）、C（两张任务雷达）放在共享框架内；F（姿态雷达）和 H（滑步及额外步数）并排，手机按实验分组排列。新版仍缺少 G 的 CoM 难度分组，旧 G 只在明确标注 test132 / 38k 的历史论文原图入口保留。真机六阈值雷达缺少逐点数值，保留原图，没有根据像素估算数字。
- Anchor-0* 是早期版本，Anchor-0† 站姿结果为初步结果；论文中待评估的当前模型结果显示为 Pending / 待评估。
- 四组视频使用完整时长的 H.264/AAC MP4，保留音频和原比例；点击播放后才加载视频，支持拖动进度。服务器支持 HTTP Range，`.gz` 资源按原始压缩文件传输。

详见 [数据来源和口径](docs/chart-data.md)、[视频记录](docs/video-assets.md) 和 [演示版本记录](docs/demo-provenance.json)。

## 原交互演示

`dist/demo/` 来自 `qs778899-lab/s0-tracker-letters` 的公开版本，提交 `cdcfef07a9109603f36532c182ad0c282e51e748`。保留原版界面、预置动作、单字母、连续书写、爱心、空格横移、视角控制、目标显示与推力扰动。

仅进行局域网 HTTP 适配：

1. 浏览器没有 Web Crypto 时使用经标准向量与实际模型分片验证的 SHA-256 实现，继续校验每个资源。
2. CacheStorage 不可用时使用 IndexedDB 缓存；存储不可用时正常回退到加载资源。
3. 添加返回主页入口；`/demo` 自动跳转 `/demo/`，保持相对资源路径正确。

134 个原始文件保持逐字节一致，包含策略权重、动作、机器人模型和 WASM。原始许可文件保留在 `dist/demo/`。

## 开发与检查

主页是无构建依赖的 HTML/CSS/JavaScript；运行服务仅需 Python 3.9+。修改 `dist/` 文件后刷新即可。

```sh
node --test tests/demo.test.mjs
python3 tests/verify-site.py
```

第二个命令需服务已运行；加 `--offline` 只执行本地检查。它检查站内文件、数据完整性、发布版演示资源哈希、静态服务器的 MIME/分段响应和目录限制。

修改视频时使用 `scripts/prepare-videos.py`，参数及工具说明见视频文档。重新提取图表时先将原评测网页保存至 `.cache/evaluation.html`，再执行 `python3 scripts/extract-paper-data.py`。原始大文件、下载工具、运行记录和数据缓存不提交。

## 配色

| 角色 | Light | Dark |
| --- | --- | --- |
| Primary | `#1769D2` | `#80B4F8` |
| Background | `#FFFFFF` | `#111418` |
| Foreground | `#212121` | `#E4E8EE` |
| Soft surface | `#F5F7FA` | `#1B2027` |
| Accent surface | `#EAF2FC` | `#21334A` |
| Secondary text | `#525252` | `#AEB8C5` |
| Border | `#A6A6A6` | `#44474B` |

图表的其他颜色只用于区分控制器，品牌与页面主题使用提供的色板。
