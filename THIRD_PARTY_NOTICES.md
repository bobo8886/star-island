# 素材来源与第三方说明

《星屿寻迹：给你的时光盲盒》由 [bobo8886](https://github.com/Bobo688li/star-island) 维护。项目自有内容采用 [《星屿寻迹非商业使用许可协议 1.0》](LICENSE)：允许个人游玩、修改、免费赠礼和非商业分享，禁止未经另行书面许可的商用、转卖和收费交付。具体范围以 `LICENSE` 全文为准。

本文件记录素材与工具的来源，不会把第三方内容改为项目的自定义许可，也不代表维护者拥有第三方的权利。

## 哪些内容适用什么规则

| 内容 | 来源与许可范围 |
| --- | --- |
| 游戏源码、界面、文档和项目内编写的绘图代码 | 由本项目编写的部分适用 `LICENSE`；另有声明的部分依其原有条款。 |
| 随项目提供的生成图片 | 来源记录见下表及素材清单；维护者仅在自己依法有权授予的范围内提供 `LICENSE` 中的非商业许可。来源记录不承诺每张生成图片均具有独占著作权，也不代替第三方权利核查。 |
| 程序合成的背景音乐与交互音效 | 由项目中的 Web Audio 代码生成，适用项目许可；没有随游戏打包第三方歌曲或音效录音。 |
| 本机字体及系统表情符号 | 由玩家设备或浏览器提供，保留各自的权利与使用条款，不属于项目许可所授予的字体素材。 |
| 玩家填写的文字、上传的照片、语音及其他内容 | 权利仍属于玩家或原权利人，不因使用本项目转让给维护者，也不会自动纳入项目许可。分享礼物前，应确认自己有权分享其中的内容。 |
| 开发、构建、测试工具 | 遵守相应上游许可，不适用项目的非商业许可；详情见下文。 |

软件或自带素材再次分发时，请依 `LICENSE` 保留完整许可、原项目地址、作者署名及适用声明。个人信件图片和截图无需额外加作者水印，具体以许可中的个人赠礼与声明保留条款为准。

## 游戏美术来源

主要来源记录保存在 [`assets/manifest.json`](https://github.com/Bobo688li/star-island/blob/main/assets/manifest.json)。以下图片由本项目使用 OpenAI 内置 `image_gen` 工具生成，部分角色图片以本项目已有角色设计为参考，再进行透明背景整理、帧对齐及游戏接入。

| 素材组 | 文件与用途 |
| --- | --- |
| 四张地图 | `assets/island.png`、`forest.png`、`coast.png`、`moonlake.png`：主岛、森林、海岸和月光湖场景。 |
| 角色设计及早期图集 | `assets/character-design.png`、`companion-design.png`、`character-atlas.png`、`companion-atlas.png`：女主角、男同行角色的设计和动作素材。 |
| 角色完整动作帧 | `assets/character-idle-v6.png`，以及 `character-walk-{side,front,back}-v6.png`、`companion-walk-{side,front,back}-v6.png`：站姿及侧面、正面、背面步行动作。 |
| 场景交互道具 | `assets/sandcastle-stages.png`、`lake-props.png`：堆沙城堡阶段及月光湖道具。 |

当前单文件构建使用上述 17 张 PNG。仓库内还保留了生成提示词、设计参考和制作记录，便于理解素材来源；它们不一定都进入运行包。主要记录包括：

- [地图与区域提示词](https://github.com/Bobo688li/star-island/blob/main/assets/regions-prompts.txt)、[月光湖提示词](https://github.com/Bobo688li/star-island/blob/main/assets/moonlake-prompt.txt)。
- [女主角设计](https://github.com/Bobo688li/star-island/blob/main/assets/character-prompt.txt)、[男同行角色设计](https://github.com/Bobo688li/star-island/blob/main/assets/companion-prompt.txt)、[角色图集说明](https://github.com/Bobo688li/star-island/blob/main/assets/character-atlas-prompts.txt)。
- [步行动作提示词](https://github.com/Bobo688li/star-island/blob/main/assets/walk-v6-prompts.txt)、[动作制作记录](https://github.com/Bobo688li/star-island/blob/main/assets/walk-v6-notes.md)。
- [沙堡提示词](https://github.com/Bobo688li/star-island/blob/main/assets/sandcastle-prompt.txt)、[湖区道具提示词](https://github.com/Bobo688li/star-island/blob/main/assets/lake-props-prompt.txt)。

当前素材清单没有列入从其他游戏提取的图片或外购、转载的像素素材包。《星露谷物语》等作品只作为类型和体验讨论中的参考，不是本项目素材来源，也不表示相关权利人参与、授权或背书。

水面、落叶、烟花、地标提示等效果由项目的 Canvas 代码绘制或对自带场景图进行处理。信纸中的花瓣、叶片、蝴蝶、月亮、星星、信封、邮票与火漆装饰由 [`src/letter-art.js`](https://github.com/Bobo688li/star-island/blob/main/src/letter-art.js) 绘制；烟花由 [`src/fireworks.js`](https://github.com/Bobo688li/star-island/blob/main/src/fireworks.js) 绘制，没有为这些效果另行打包第三方贴图。

## 音乐、音效与字体

仓库首页的 `docs/images/star-island-banner.svg` 和 `docs/images/star-island-mark.svg` 是本项目编写的矢量标识，沿用项目原有星形与配色，没有采用参考仓库的 Logo。它们适用项目许可，仅用于文档展示，不计入上述 17 张游戏运行 PNG。标识不附带字体文件，文字采用设备可用字体显示。

背景曲《口袋里的晴天》（代码中称为 *Pocketful of Sunlight*）以及交互音效由 [`src/audio.js`](https://github.com/Bobo688li/star-island/blob/main/src/audio.js) 使用 Web Audio 合成。乐句、音色与音量路由的记录见 [`docs/audio-v6.md`](https://github.com/Bobo688li/star-island/blob/main/docs/audio-v6.md)。玩家上传的语音是玩家自己的内容，应与项目合成音效分别看待。

样式与信纸代码引用 Microsoft YaHei、PingFang SC、Noto Serif CJK SC、Source Han Serif SC、SimSun、KaiTi 等本机字体名称，并提供系统字体回退。CSS 中的 `local()` 仅尝试使用设备已安装字体；项目没有附带这些字体文件，也没有授予它们的再分发权。不同设备实际显示的字体和表情符号可能不同。

## 开发与测试依赖

游戏运行使用浏览器原生 API，没有 npm 运行时依赖。以下 Python 包由 [`requirements-dev.txt`](https://github.com/Bobo688li/star-island/blob/main/requirements-dev.txt) 固定版本，用于开发自检；它们不打包进 H5 单文件或个人礼物 HTML。

| 工具 | 固定版本 | 本项目用途 | 对应版本的上游许可 |
| --- | --- | --- | --- |
| Playwright for Python | 1.60.0 | 浏览器交互、布局及导出功能回归检查 | [官方 LICENSE](https://github.com/microsoft/playwright-python/blob/v1.60.0/LICENSE) |
| Pillow | 12.2.0 | 图片读取、素材及截图检查 | [官方 LICENSE](https://github.com/python-pillow/Pillow/blob/12.2.0/LICENSE) |
| NumPy | 2.3.5 | 图像像素与动画自检中的数值分析 | [官方 LICENSE.txt](https://github.com/numpy/numpy/blob/v2.3.5/LICENSE.txt) |

Node.js、Python 解释器、浏览器及 Playwright 下载的浏览器组件均为另行安装的外部工具，不随项目许可重新授权。安装包或工具自身可能附带额外依赖和声明，须以相应发行物为准。如果以后分发这些工具或依赖的副本，应同时保留它们要求的许可与声明，不能仅附本项目的 `LICENSE`。

## 新增素材与来源更正

贡献新的图片、字体、音乐或其他素材时，请同时说明作者、原始来源、准确版本及许可，并确认允许按本项目的实际方式使用和分发。不要仅凭“网上可下载”或“免费”认定已获得使用权。

如发现来源记录有误、遗漏署名或存在权利问题，可通过 [仓库 Issues](https://github.com/Bobo688li/star-island/issues) 联系维护者，并提供具体文件和可核实的来源。请勿在公开 Issue 中上传私人照片、语音或完整礼物文件。
