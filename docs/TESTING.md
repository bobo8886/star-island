# 验证指南

[返回首页](../README.md) · [开发与维护](DEVELOPMENT.md) · [项目结构](PROJECT_STRUCTURE.md) · [验收记录](../VERIFICATION.md)

这些工具用于修改代码后的检查，普通玩家不需要运行。先完成核心检查，再按本次改动选择浏览器或视觉检查；下面的分组是工具索引，不是一套必须从头到尾执行的命令。

## 日常修改：先跑这三项

在项目根目录执行：

```sh
npm test
npm run build
npm run check:bundle
```

`npm test` 包含九组核心检查：主岛路线、跨区路线、湖谷活动路线、活动存档、个性化内容、树信存档、路标布局、移动时间步与双语模板，无须安装浏览器。构建和一致性检查会核对离线包中的源码、样式、图片和完整许可。

语言改动另运行 `python tests/language-flow.py` 和 `python tests/language-offline.py`（先 `npm start`，并生成最新单文件）。检查真实 UI 选择、英文通关、信纸 PNG、390px 布局、切换保留自定义内容、离线礼物和存储不可用场景。详情见 [双语维护说明](LOCALIZATION.md)。

向 `main` 推送或提交 Pull Request 时，[GitHub Actions](https://github.com/bobo8886/star-island/actions/workflows/check.yml) 会自动运行上述检查，并确认提交的离线文件与重新构建的结果一致。首页的 Core checks 徽章展示实际结果；浏览器与视觉回归仍需按下方指南单独运行。

纯文档修改检查链接、示例和排版即可。代码或美术改动还应实际体验受影响的功能；数值通过不代替角色动作与画面的目测。

## 浏览器检查准备

- 安装 Python 及 [`requirements-dev.txt`](../requirements-dev.txt) 中的依赖，步骤见 [开发环境配置](DEVELOPMENT.md#5-可选的浏览器回归)。
- 当前脚本使用 Playwright 的 Microsoft Edge 通道，需要安装 Edge；仅安装 Chromium 不等同于安装 Edge。
- 在线检查先在另一个终端运行 `npm start`，保持 `http://127.0.0.1:4173` 可访问。标注为离线的检查使用 `file://`，无须本地服务器。
- 离线检查前重新构建；正式下载包检查还需要 `npm run release:package`。不要使用自己的私人礼物或存档充当测试数据。
- `npm test` 会创建 `output/`。只运行某个历史脚本时，可先执行 `node -e "require('fs').mkdirSync('output',{recursive:true})"`。

## 按改动选择检查

<details>
<summary><strong>剧情、移动输入与关卡路线</strong></summary>

```sh
python tests/playthrough.py
python tests/narrative-flow.py
python tests/exploration-inputs.py
npm run test:navigation
npm run test:regions
node tests/moonlake-navigation.cjs
```

前三项使用本地服务器，分别检查生日主线、自由叙事与探索输入。后三项是可单独运行的路线检查，已包含在 `npm test` 中，无须每次重复运行。

</details>

<details>
<summary><strong>礼物工坊、媒体、声音与界面</strong></summary>

```sh
node tests/personalization.cjs
python tests/studio-flow.py --gift
python tests/studio-layout-v6.py
python tests/audio-v6.py
```

工坊导出会使用离线包，先运行 `npm run build`。个性化逻辑已包含在核心检查中；其余分别覆盖实际编辑与赠礼、工坊布局、背景音乐与交互声音。

</details>

<details>
<summary><strong>许愿树信纸、保存与完整生日流程</strong></summary>

独立信纸与界面：

```sh
python tests/letter-art-v62.py
python tests/tree-letter-ui.py
```

完整生日与树信流程需按以下顺序执行：

```sh
npm run build
python tests/festival-flow-v61.py
python tests/tree-letter-flow-v62.py
python tests/tree-letter-flow-v62.py --storage-failure
python tests/tree-letter-flow-v62.py --offline-only
```

`festival-flow-v61.py` 通过真实游玩生成 `output/festival-v61/completed-birthday-backup.json`，树信在线完整流程读取它以验证通关前后写信与原结尾信相互独立。最后一项使用离线文件；保存失败模式用于检查草稿回滚与重试。

</details>

<details>
<summary><strong>角色动作、落脚与旅伴跟随</strong></summary>

```sh
python tests/character-v4.py
python tests/animation-v6.py
python tests/gait-world.py --output output/gait-world-v6 --expect-motion full-pose-atlas-v6
python tests/locomotion-v5.py
node tests/locomotion-timestep-v5.cjs
```

`character-v4.py` 检查通用图集质量；当前完整人物步态使用 `animation-v6.py` 和实景 `gait-world.py` 检查。移动时间步检查已包含在 `npm test` 中。

旧 `tests/side-walk.py` 与 `tests/gait-contact.py` 面向历史局部腿部动画，保留用于追溯，不能用于证明当前 v6 全身步态自然。角色检查后仍需查看正面、背面、侧面、慢速与实际地图中的落脚表现。

</details>

<details>
<summary><strong>地图路标、烟花与环境美术</strong></summary>

```sh
python tests/map-markers-v61.py
node tests/waypoints.cjs
python tests/waypoints-world.py
python tests/fireworks-v7.py
python tests/petals-v5.py
python tests/lake-scenery-v5.py
python tests/lake-expansion.py
python tests/sandcastle-v4.py
python tests/scenery-v4.py
```

按改动选择路标、烟花、花瓣、湖区、沙堡或水面检查。`waypoints.cjs` 已包含在核心检查中；文件名中的版本号表示脚本创建阶段，不表示全部脚本都验证同一套历史素材。

</details>

<details>
<summary><strong>日常互动、手机布局与离线活动</strong></summary>

```sh
node tests/pastimes-storage.cjs
python tests/together-flow.py
python tests/together-extras.py
python tests/together-layout.py
```

分别覆盖活动存档、日常交互、扩展活动与布局。存档检查已包含在 `npm test` 中。

离线活动和礼物导出需先重新构建，无须本地服务器：

```sh
npm run build
python tests/expanded-offline.py
python tests/together-offline.py
```

</details>

<details>
<summary><strong>正式下载包、许可保留与再次转赠</strong></summary>

```sh
npm run release:package
python tests/release-license-v621.py
```

先生成 `output/releases/v6.2.2/` 中的发布文件，再测试实际工坊导出和再次转赠。检查包含完整许可保留、ZIP 内容与 SHA-256、收礼人全新进度、私人树信不随游戏导出，以及离线脚本错误和网络请求。该流程无须本地服务器；输出位于 `output/release-v621/`。

</details>

## 怎样阅读结果

截图、报告、下载文件和测试备份写入 `output/`，不会上传到仓库。历史 [验收记录](../VERIFICATION.md) 中的本地路径指原开发环境，不意味着这些附件已经公开；可以在自己的环境生成新的报告，公开界面示例位于 [`docs/images/`](images/)。

记录实际运行的脚本、对应代码版本和观察到的结果。浏览器视口模拟不等于真机微信或 iOS Safari 验证，开发环境和字体差异也可能影响画面与文件哈希。
