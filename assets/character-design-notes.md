# 拾光旅人 · 小满（Lumi）

当前 4.0 已使用原画参考的精细角色图集替代下面记录的低分辨率代码角色。实际实现、尺寸和验证见 `assets/character-v4-notes.md`；以下为早期版本制作历史。

## 3.0 更新 · 两位旅人

保留小满的原始四视图与服装设定，优化实际像素动作的微笑、裙摆、背包高光和发梢。新增原创男性旅伴：栗棕短发、靛蓝外套、珊瑚围巾与相机。原画为 `assets/companion-design.png`，完整提示词为 `assets/companion-prompt.txt`，均由内置 image_gen 生成并保存在项目中。

两位实际角色均为 40 × 52 像素，四方向各八帧步行。当前女主使用 27 色，男伴 28 色；均提供站立、行走、坐下、仰望、跳跃、挥手、拍照和筑沙动作。`draw` / `drawPreview` 新增 `variant:'girl'|'boy'`、`pose`，`draw` 支持 `shadow:false`；`frame` 第五参数、`atlas(variant)` 与 `designImage(variant)` 可选择角色，原接口默认女主。

`tests/character-v3.py` 验证 176 个变体 / 方向 / 姿态组合：0 空帧、0 抗锯齿像素、0 顶部裁切、0 JavaScript 错误。检查页为 `assets/characters-preview.html`，动作联系图为 `assets/characters-v3-review.png`，报告为 `output/character-v3-report.json`。角色已在双人秋千、沙堡、散步和导出照片中检查。

以下保留初版制作记录。

## 同行篇更新 · 2026-11-16

新增原创男性伙伴「同行旅人 · 阿屿」：暖棕短发、靛蓝外套、奶油针织内搭、珊瑚围巾、长裤、星扣、焦糖挎包与小相机。珊瑚围巾与小满的蜜桃蝴蝶结相呼应，服装轮廓和发型独立设计。原有女性角色保持默认，男性作为可替换的陪伴外观接入。

`assets/companion-design.png` 是使用内置 OpenAI image_gen、以小满原画为视觉家族参考生成的原创四视图。完整提示词见 `assets/companion-prompt.txt`，没有使用第三方游戏角色。输出为 1536 × 1024 RGBA，透明通道已检查，原始 metadata 保留。

实际男性精灵仍为 40 × 52 原生网格，以代码逐像素实现服装、相机和表情，未通过缩放或扭曲原画生成动作。新增挥手、拍照、堆沙动作，男女均支持；女性增加微笑嘴形、裙摆与挎包高光。行走顶部发梢在检查中修正，脚锚点仍为 `(20,50)`。提灯光源纹理只创建一次并复用。

兼容接口：

```js
IslandCharacter.draw(ctx, player, {
  variant: 'boy', // 'girl' 为默认；旧调用不变
  pose: 'photo',  // idle / walk / sit / look / jump / wave / photo / build
  shadow: false,  // 可选，秋千等场景自行绘制地面影子
  time: 2, phase: 'night', scale: 1.6
});
IslandCharacter.drawPreview(canvas, {variant:'boy', pose:'wave', time:2});
IslandCharacter.frame('down', 'walk', 0, false, 'boy');
IslandCharacter.atlas('boy');
IslandCharacter.designImage('boy'); // 支持离线 ISLAND_ASSETS 内嵌数据
```

组合检查页为 `assets/characters-preview.html`，截图为 `assets/characters-v3-review.png`。运行 `python tests/character-v3.py`：男女各 88 个方向 / 帧 / 姿态组合，共 176 组绘制通过；0 个空帧、0 个半透明抗锯齿像素、0 个顶部边缘像素，旧 API 兼容，0 个浏览器 JavaScript 错误。包含相机等新动作后，女主实际使用 27 色、男性 28 色。完整结果见 `output/character-v3-report.json`。

以下为初版设计记录。

本轮先生成原创角色四视图，再按一致服装与配色制作可控的游戏精灵。没有使用或描摹其他游戏的角色素材。

## 形象

栗色短发与两束低小辫，蜜桃色蝴蝶结，棕色高光眼睛，鼠尾草绿斗篷、奶油裙、金色星扣、焦糖挎包、可发光的黄铜提灯。

轮廓使用暗梅色而非纯黑。脸部保留白色眼睛高光与低饱和腮红；头发和衣料采用较大的像素色块，移动中也能认出角色。提灯与星扣是两个明亮焦点。

## 实际实现

- `src/character.js`：40 × 52 原生像素网格，25 色固定角色调色板。
- 四个方向，各 8 帧步行动作；另有待机、坐姿、仰望、跳跃和眨眼。
- 脚锚点固定为 `(20,50)`；步行帧按支撑脚修正垂直偏移，避免脚部裁切与跳动。
- 默认世界显示比例为 1.6（64 × 83.2 世界单位），镜头放大时采用最近邻采样；不使用平滑滤镜。
- 原生动画帧在首次使用时缓存为小 Canvas，不在每个游戏帧重新构建。
- 提灯光与落地影子由角色模块绘制；支持主场景的昼夜和减少动态效果选项。

## 接口

```js
IslandCharacter.draw(ctx, player, {
  time, phase, sitting, looking, reducedMotion, scale: 1.6
});
// player: x / y（脚锚点）, direction（down/right/up/left）, walk（相位）, jump（0—0.64）

IslandCharacter.drawPreview(canvas, { pose: 'walk', direction: 'down', time: 2 });
IslandCharacter.frame('down', 'walk', 0, false); // 返回原生 Canvas
IslandCharacter.atlas();                       // 返回动作检查图
```

## 交付与检查

- `assets/character-design.png`：内置 OpenAI image_gen 生成的原创四视图，1536 × 1024，RGBA 与透明通道已验证；原始生成 metadata 保留。
- `assets/character-prompt.txt`：完整生成提示词。
- `assets/character-preview.html`：无需编译的动作与原画检查页。
- `assets/character-frames-review.png`：实际浏览器渲染的动作联系表截图。

已在 Microsoft Edge / Playwright 中执行 20 个方向与姿态组合的实际 `drawPreview` 调用，没有 JavaScript 错误；逐帧截图检查修正了长步脚部裁切与坐姿脚部遮挡。对原生动作图逐像素检测：25 种非透明颜色，0 个半透明抗锯齿像素。主游戏的全场景通关与手机检查由项目集成阶段执行。
