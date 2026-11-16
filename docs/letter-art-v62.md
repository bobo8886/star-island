# 可保存的树下信纸

`src/letter-art.js` 提供纯 Canvas API `IslandLetterArt`，不依赖网络、外购素材或图片生成服务。三主题 `petal / starlight / meadow` 分别是奶油樱花、星月夜蓝、鼠尾草绿。枝叶、花瓣、蝴蝶、星座、月牙、信封邮票与心形蜡封均为本项目绘制的原创装饰。

## API

- `themes`：只读的 `{id,name,color,description}` 列表。
- `normalize(raw)`：返回 `{to,from,title,date,body,theme}`。非字符串为空；无效主题回退 `petal`。字段限额依次为 60、60、80、40、6000 个 Unicode code point，不拆开代理对。日期是用户提供的自由文本，不自动生成或转换。
- 正文统一 CRLF 为 LF，清除非显示控制符，tab 转为四个空格；保留正文原有空行和首尾换行。单行字段仅压缩空白，不 trim，因此编辑器逐键调用时不会吃掉 `Jane ` 的待输入空格。
- `await render(draft,{width:1080,maxHeight:3600})`：先等待 `document.fonts.ready`。返回 `{pages,plainText,dispose}`。每页有 `{canvas,blob,url,width,height,index,total,bodyLines}`；`index` 从 1 开始，`bodyLines` 是只读排版行元数据。PNG 预览和下载应复用这一个 Blob；`bodyLines` 不能代替视觉核验。
- `dispose()`：幂等撤销本次全部 Blob 对象 URL。生成失败也会回收已创建的 URL。UI 的防抖、版本检查和丢弃过期任务由写信组件负责；过期结果同样应立即 dispose。

默认输出宽 1080，每页最多 3600 像素。短信保留约 1440 的信纸高度，长信自动分页，不截断末段。宽度参数限制在 320–2160；过小的 `maxHeight` 无法容纳信件抬头时明确报错，不隐瞒丢字或生成超限图片。正式 UI 使用默认 1080/3600。

正文使用正常的中文无衬线字体，1080 宽时为 34px、58px 行距；标题与署名使用系统楷体形成手写感。文本逐段按 `measureText` 排版，使用 grapheme 分段保护 emoji 组合；长英文单词和连续 URL 可在字符边界换行。页码每页都实际绘制；落款仅在末页，避开右下植物。导出不含按钮、占位提示或水印。空正文可以预览空白信纸，是否允许保存由 UI 判断。

## 自检与样张

运行 `python tests/letter-art-v62.py`；报告与 PNG 在 `output/letter-art-v62/`。测试直接拦截实际 `fillText`，核对正文所有字符按原顺序被绘制，逐行测量宽度、真实页码、每张 Blob 的 PNG 解码尺寸，以及 dispose 不重复撤销、没有 URL 泄漏。

覆盖三主题、最大字段、6000 code point 上限、连续键入含空格的英文姓名/标题、多段长信与空行、650 字符连续字符串、长网址、家庭 emoji 组合、最后终点句、空信无占位字。约 6000 字符样稿生成 6 页，最大高度 3571；最后一页包含完整终点句与 `6 / 6`。本机样稿首次约 335ms，后续单页约 38–52ms，长信约 448ms；这只是该环境的局部渲染计时。

已打开并目测三张主题样稿、长信末页、连续字符串/emoji 页与最大字段页：正文清楚，装饰避开文字，落款与页码完整。微信转发由使用者保存 PNG 后执行；模块本身不向任何联系人或服务发送数据。
