# 项目结构

[返回首页](../README.md) · [开发与维护](DEVELOPMENT.md) · [验证指南](TESTING.md)

只修改姓名、生日、回忆或信件时，使用游戏内礼物工坊即可，无须编辑源码。修改地图、玩法和美术时，可按下面的分区查找文件。

| 位置 | 内容 |
| --- | --- |
| `index.html` 与根目录样式 | 开发版入口、游戏界面、礼物工坊和写信页 |
| `src/` | 游戏逻辑、剧情、角色、特效、音频与存档 |
| `assets/` | 地图、角色和道具图片，素材来源及预览工具 |
| `scripts/` | 单文件构建、核心检查与正式下载包生成 |
| `tests/` | 核心逻辑、浏览器流程和视觉检查 |
| `docs/` | 游玩、制作、部署和开发教程 |
| `星屿寻迹.html` | 已打包的离线游戏，由源码生成 |

## 按功能找文件

<details>
<summary><strong>界面、礼物工坊与写信</strong></summary>

| 文件 | 用途 |
| --- | --- |
| `index.html` / `style.css` | 可访问的界面、弹窗、响应式布局 |
| `studio.css` / `src/studio.js` | 礼物工坊、分组搜索、草稿、媒体编辑和实时预览 |
| `tree-letter.css` / `src/tree-letter.js` / `src/letter-art.js` | 许愿树写信页、独立草稿、三款信纸与高清 PNG / TXT 导出 |
| `src/personalization.js` | 301 项可编辑内容、称呼变量、通用模板与内容应用 |
| `src/stationery.js` | 长信排版、安全文本呈现、独立 HTML 信笺与打印样式 |

</details>

<details>
<summary><strong>地图、剧情与日常互动</strong></summary>

| 文件 | 用途 |
| --- | --- |
| `src/content.js` | 默认文案、世界内的记忆位置、北京时间配置 |
| `src/regions.js` | 四个区域的位置、碰撞、多边形和通道 |
| `src/adventure.js` | 19 个探索物件、四条支线与选择剧情 |
| `src/activities.js` | 秋千、沙堡、散步、拍照、种花、纸船、水漂和风车的位置与文案 |
| `src/pastimes.js` | 种花、纸船、水漂、风车的实景动作和道具图集渲染 |
| `src/waypoints.js` | 固定屏幕字号的交互点名牌、编号、避让和点选寻路 |
| `src/world.js` | 场景绘制、相机、碰撞、A* 寻路、跟随和粒子 |
| `src/game.js` | 剧情、收集、星座、布置、备份和礼物导出 |

</details>

<details>
<summary><strong>角色、动态风景、音频与存档</strong></summary>

| 文件 | 用途 |
| --- | --- |
| `src/character.js` | 两位精细角色的图集裁切、160 × 192 缓存帧、动作与渲染 |
| `src/sandcastle.js` | 四阶段沙堡图集、旗帜、护城河与建造动态 |
| `src/scenery.js` | 四图水面遮罩、折射、泡沫、自然落花与环境交互粒子 |
| `src/fireworks.js` | 持续四主题烟花、爱心 / 花朵 / 星环 / 莲花与七秒文字烟花 |
| `src/storage.js` | 存档校验、本地数据与媒体存储 |
| `src/audio.js` | Web Audio 轻音乐、音效和语音播放时的背景降音量 |

</details>

<details>
<summary><strong>图片、来源记录与动作预览</strong></summary>

下列文件均在 `assets/` 中。

| 文件 | 用途 |
| --- | --- |
| `island.png` / `forest.png` / `coast.png` / `moonlake.png` | 四张 1536 × 1024 透明像素风区域图 |
| `lake-props.png` | 花圃阶段、风车塔身与独立旋转叶轮；裁切与轴心见同名 JSON |
| `character-design.png` | 原创角色「拾光旅人 · 小满」四视图 |
| `companion-design.png` | 原创男性旅伴四视图 |
| `character-atlas.png` / `companion-atlas.png` | 实际用于游戏的十二姿态透明图集 |
| `*-walk-*-v6.png` / `character-idle-v6.png` | 两位角色的六张八帧完整行走图集与方向站姿 |
| `sandcastle-stages.png` | 实际用于游戏的四阶段沙堡图集 |
| `characters-preview.html` | 两位实际像素角色的动作检查页 |
| `side-walk-preview.html` | 四方向、地面线、慢速与逐帧检查 |
| `*prompt*.txt` / `manifest.json` | 生成提示词与素材来源记录 |

完整来源与授权范围见 [素材与第三方说明](../THIRD_PARTY_NOTICES.md)。

</details>

<details>
<summary><strong>构建与验证工具</strong></summary>

| 文件 | 用途 |
| --- | --- |
| `scripts/build-standalone.cjs` | 生成包含素材、样式、源码和许可声明的离线单文件 |
| `scripts/test-core.cjs` | 运行八组不依赖浏览器的核心检查 |
| `scripts/package-release.py` | 生成供玩家下载的 HTML、ZIP 和校验文件 |
| `tests/` | 关卡可达性、存档、浏览器完整流程和视觉检查，入口见 [验证指南](TESTING.md) |

</details>

## 修改时注意

`星屿寻迹.html` 是生成文件。修改源码后运行 `npm run build` 更新它；直接编辑单文件的内容会被下一次构建覆盖。

场景主体是完整像素插画，碰撞、河流遮罩和交互点由代码匹配，并非通用瓦片地图。替换地图时需一并检查边界、河流、障碍物和地标；替换角色时需校准帧顺序、透明边缘、缩放与鞋底锚点。

`output/` 保存本地检查报告、截图和临时导出，已从 Git 排除；不是供玩家下载的项目源码。历史检查结果与限制见 [验收记录](../VERIFICATION.md)。
