# 月见湖谷交付记录

先按角色 220 世界单位/秒、16 单位导航网格做通路布局，再生成原创美术，最后按生成结果调整几何。最初布局保留在 `moonlake-blockout.json`；最终边界、湖岸与道具碰撞在 `src/regions.js`。

- 原图 `moonlake.png`：1536×1024 RGBA，完整复制生成器输出，保留透明通道；SHA-256 `0455ADA8006AD267AAE3D7ACF3DBE5F5EB4B920A50F2194C9F175A888D0ECBDF`。完整生成提示词和原文件路径在 `moonlake-prompt.txt`。
- 可走面积 512,000 世界像素²，风语花田为 479,488；第四区新增后全图可走面积约为最初拾光星屿的 5.34 倍。北、东、南、西环湖通路全部连通。湖水及有石头/芦苇的湖沿不可行走；纸船活动在码头外的干燥岸上触发。
- 入口出生点 `(610,729)`；湖谷往花田 `(230,640)`；花田往湖谷 `(880,299)`，不锁水晶进度。
- 三个新活动点：花圃 `(315,415)`、风车 `(1240,395)`、纸船 `(1015,563)`。纸船由水里 `(900,503)` 漂至 `(748,425)`；这条线不穿木码头。水面纹理遮罩已避开码头，颜色遮罩保留原图的荷花、浮叶，字段名 `sceneryWater` / `sceneryLights` / `sceneryRipples` / `fireflyPoints`。
- 5 个自由故事：`greenhouse_journal`、`moon_thread`、`silver_paper`、`moon_kite`、`lakeside_blanket`。其中温室手记和野餐杯各有两种可保存选择；月光细线 + 银纹纸完成可选风筝支线。原 5 个生日水晶及解锁顺序不变。
- 精细活动道具 `lake-props.png`：原始 1254×1254 RGBA，四格627²，空花圃/开花花圃/无叶片塔身/独立叶轮。美术与地图同一参考，完整提示词 `lake-props-prompt.txt`，裁切和轴心 `lake-props.json`，供主绘制器缓存再组合，无需按帧改原图。

验证：`node tests/regions-navigation.cjs` 全 450 对通路通过；`node tests/moonlake-navigation.cjs` 新区包含故事/活动的全100对通路和8段环路通过；`python tests/moonlake-flow.py` 通过真实 UI 的先见目标、拾两材料、完成支线、两处分支选择、刷新持久化、走实体往返入口，浏览器错误0，未取得任何生日水晶即可完成。

可视检查页 `moonlake-layout.html`、`lake-props-preview.html`；对应 `output/moonlake-collision.png`、`output/moonlake-ingame.png`、`output/lake-props-preview.png`。地图边界未拉伸原图，建筑底部和大件道具放有碰撞，原图透明背景在浏览器合成下无黑色矩形。
