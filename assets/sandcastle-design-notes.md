# 海边的小城堡 · 四阶段美术

素材 `sandcastle-stages.png` 由内置 OpenAI image_gen 原创生成，参考 `coast.png` 的暖砂色、光照与等距视角，不复用第三方游戏贴图。原始生成 PNG 保持不变，完整提示词见 `sandcastle-prompt.txt`。

## 视觉与阶段

1. 准备：一小片沙地、带星星的小桶、木柄铲、贝壳。
2. 地基：低矮的圆形沙墙和浅浅的护城河。
3. 双塔：圆柱塔楼、城垛、拱门、沙砖、贝壳门饰与阶梯。
4. 完成：三塔城堡、星旗、栏杆木桥、海星与珊瑚、灯笼、完整城墙和浅水护城河。

四阶段以一致脚底点对齐。地图中最终形态约 166 世界单位宽、171 高（含旗杆），人物站在两侧。原图是细密栅格插画，运行时最近邻采样；不再用几块大矩形代替模型。

## 规范化与动态

图集尺寸 1254 × 1254，规则 2 × 2 网格、RGBA 真透明。`src/sandcastle.js` 在加载时将四格分别裁到 576 × 576 缓存画布，按 alpha 阈值和小连通区域清理透明边缘噪点，保持源文件与 provenance 信息不变。每个阶段底部位于缓存 y ≈ 558，世界锚点统一。

旗帜使用源贴图分条轻摆；护城河和贝壳有微小水光；搭建中有飞落沙粒，完成后有少量局部闪光。设置减少动态效果时，所有这些动画保持静止。缓存只在加载时生成，逐帧不会读取像素或重建模型。

```js
await IslandSandcastle.ready;
IslandSandcastle.draw(ctx, {
  x, y, stage: 0, time: 0, reducedMotion: false,
  active: false, building: false
});
// ready 加载成功 resolve(true)，失败 resolve(false)；draw 未就绪返回 false。
// 可选 scale 默认为 .31；主场景使用默认比例。
```

## 验证

`python tests/sandcastle-v4.py` 检查实际模型透明度、四格独立性、底点、动静帧差异。四阶段没有空帧、贴边截断、半透明残边或 JavaScript 错误；共清除 71897 个低 alpha / 碎片像素，动态帧有可测变化，减少动态模式帧差为 0。

预览页：`assets/sandcastle-preview.html`。四阶段截图：`output/sandcastle-v4-review.png`。实际沙滩完成城堡截图：`output/sandcastle-v4-world.png`。实景检查经过真实界面前往海滩、三次搭建按钮和男伴切换，城堡与两位人物没有裁切，零 JavaScript 错误。
