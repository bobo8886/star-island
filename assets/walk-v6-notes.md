# 双人完整步态图集 v6

用内置 `image_gen` 补绘整个人物的不同姿势。6张4×2步行图集包含男女侧/前/背各8帧；左行使用整帧镜像。第7张3×2图集是双人前/侧/背自然站姿。每张交付PNG是生成器原始RGBA复制，提示词、定点补绘及来源路径完整保存在 `walk-v6-prompts.txt`。

## 已阅读的一手教程

- Animation Mentor / Jason Martinsen：[Tutorial: Animating a Basic Human Walk Cycle](https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/)。采用接触、承重、交错、抬升及另一侧接触的关键姿态，再让手臂、肩部与道具有不同步的跟随。先看完整姿势，再检查循环和落脚。
- Harvey Newman（作者本人）：[Walk Cycles: How to Animate a Walk Cycle in Maya](https://anim.works/walk-cycle/)。以髋部和承重关系带动全身；脚落地后向后扫，另一脚抬起跨过。上身与腿反向转动，手腕/围巾略滞后；头只轻微起伏，避免上下啄动。

以上只用于动作原理，不复制教程中的角色或画面。

## 美术与接入约定

- 保留已认可的脸、发型、衣服配色、挎包与道具，不再拆取腿部做行走变形。身体、手臂、衣摆、靴子均在完整姿势原图里。
- runtime 帧160×192，脚底边界184，默认约100世界单位高。每个方向的8帧共享一个缩放比例；以头部横轴和实际鞋底对齐，不用含摆臂/提灯的总包围盒中心，不逐帧改变头部大小。
- 生成器在透明格缝偶尔留下独立白色块，原PNG保留；导入缓存按最大人物连通域排除这些独立非人物像素，并统一alpha。人物颜色不重画。
- 女侧提灯手连续性、男侧后一半反向摆臂、前视一帧抬膝左右各有定点补绘。完整记录见prompt文件。
- 保持现有角色API、左向整帧镜像、8相位接口；其他坐姿/仰望/摄影等继续引用既有获认可原画图集。

新增资源：`character-walk-side-v6.png`、`character-walk-front-v6.png`、`character-walk-back-v6.png`、`companion-walk-side-v6.png`、`companion-walk-front-v6.png`、`companion-walk-back-v6.png`、`character-idle-v6.png`。

## 最终清理与验证

- 首次实际导入发现男正面生成稿包含与人物接在一起的半透明棕色底，因此用内置 imagegen 单独做背景去除，保留八个姿态和全部外观。此最后一次补绘完整记录在 `walk-v6-background-cleanup.txt`，对应原始生成文件 `exec-ed4bdffe-185a-4e1c-b299-3c6455c98bd3.png`；正式 `companion-walk-front-v6.png` 已替换为该原始输出。未通过程序按颜色擦除身体区域。
- `tests/animation-v6.py` 在真实浏览器中调用正式 `IslandCharacter.frame()`：72张（双人四向8步+站姿）非空、无边界裁切、鞋底边界184且有连续接触像素；六组分别8张独立完整画面，上身每相邻帧都有实际改变。侧向接触帧下肢展开宽度明显大于交错帧。全部通过，浏览器零错误；量化记录 `output/animation-v6-report.json`。
- 全方向实际缓存联图：`output/walk-v6-girl-full.png`、`output/walk-v6-boy-full.png`。已目测身体/衣摆/腿/靴子连贯，没有旧下半身镜像或条带拼接；侧身宽接触、窄交错、抬膝清晰。
- `assets/walk-v6-preview.html` 支持正常/慢速、四向、暂停、逐帧和站姿切换，使用同一正式 draw。`tests/animation-v6-record.py` 录制四方向行走→停止→继续，保存 `output/walk-v6/complete-pose-loop.webm` 与八张移动/停止截图。正常与慢速同时展示，浏览器零错误。
- 8帧使用固定比例，头部横宽变化每组约1–2原生像素；站姿与步行头宽差约0.4–4.3原生像素（默认比例下不超过约2.5世界单位）。这是独立绘制站姿与步态的轻微差异，未把头部做程序拉伸。站姿高176，步态自然起伏范围约173–181。
- 本版是8帧风格化步行循环；跑步沿用完整步态并加快播放，不是额外的一套冲刺原画。左向整帧镜像，因此配饰随整个人物镜像；未声称解剖左右永久保持。实际游戏四方向输入/手机/并肩活动由独立 QA 继续检查。

冻结源码 SHA-256：`c26ed34d9b668f58a2e11bce6b346a09eec3cda0143e8b33a1ed89338629ca04`。七张正式 PNG 哈希：`output/walk-v6/frozen-assets.json`。公开只读标识 `IslandCharacter.motionRendering='full-pose-atlas-v6'`，资源清单 `walkFiles` / `idleFile`，元数据 `getAnimationInfo()`；兼容保留 `rendering='reference-atlas'`。
