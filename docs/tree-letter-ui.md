# 许愿树写信页

`IslandTreeLetter.open({draft,defaults,show,close,save,toast})` 打开独立的树下邮局。`save(draft)` 必须同步返回真实的保存成功布尔值。界面不修改生日结尾长信或探索进度；主流程的数据接入由游戏控制。

`defaults` 支持 `to/from/title/date/theme`，另支持可自定义的页面 `heading/intro/example`。没有已保存草稿时正文始终为空；示例只在用户点击后填入，已有正文必须再次确认替换。所有 HTML 文案转义，输入内容按纯文字传入信纸渲染器。

输入 350 毫秒后保存本机草稿，关闭、Esc、切换弹窗、页面隐藏和 pagehide 均同步补存。失败会显示错误，并在当前页面会话中保留尚未保存的内容，重新打开可找回。中文输入法组合期间不归一化或回写输入框，组合结束再处理长度与保存。正文上限 6000 Unicode 字符，HTML maxlength 留出 12000 UTF-16 单元以容纳 emoji。

桌面提供双栏编辑与 PNG 预览；手机可以切换写信/预览。短横屏使用内部滚动，底部操作不随正文滚走。所有预览都来自 `IslandLetterArt.render()` 的原 PNG，不使用另一套 DOM 排版。预览变化防抖、旧异步结果废弃并释放 URL；关闭时释放全部页面资源。

“生成信件图片”打开同一弹窗内的导出页，支持长按预览、逐页 PNG 和完整 TXT。设备通过 `navigator.canShare({files})` 后才显示系统分享；点击后直接用已生成的 File 调用 `navigator.share`，不在调用前等待异步生成。用户取消不显示错误，分享失败仍可下载图片。微信说明为“保存图片后，在微信聊天中从相册选取发送”，不承诺直接发送或系统菜单中一定包含微信。

独立验证脚本：`python tests/tree-letter-ui.py`。使用实际信纸渲染器，覆盖空稿、样例确认、纯文本安全、逐键空格、IME、失败保存重开、Esc即时保存、异步关闭清理、1440×900 / 390×844 / 375×667 / 844×390 布局。报告和截图见 `output/tree-letter-ui/`。真实游戏跨流程与 PNG 下载校验由 `tests/tree-letter-flow-v62.py` 单独完成。
