# 开发、构建与维护

[返回首页](../README.md) · [游玩教程](USER_GUIDE.md) · [内容编辑](CUSTOMIZATION.md) · [网页部署](DEPLOYMENT.md)

开发参考：[项目结构](PROJECT_STRUCTURE.md) · [验证指南](TESTING.md)

## 1. 获取项目

不使用 Git：在仓库点击 **Code → Download ZIP**，解压后打开文件夹。

使用 Git：

```sh
git clone https://github.com/Bobo688li/star-island.git
cd star-island
```

直接玩离线文件不需要 Node.js。开发、打包和核心测试需要 Node.js，建议安装仍受支持的 LTS 版本。项目没有 npm 运行时依赖，因此无须先执行 `npm install`。

## 2. 启动本地开发预览

```sh
npm start
```

浏览器打开 `http://127.0.0.1:4173/`，保持终端运行。修改源码后手动刷新即可。此服务器不提供自动热更新，默认只监听本机。

端口被占用时，先检查是否已有本项目服务器；不要重复启动多个相同端口。PowerShell 也可为本次终端指定其他端口：

```powershell
$env:PORT = "4174"
npm start
```

详细浏览器回归脚本目前使用端口 4173，执行这些脚本时请保持默认端口。

## 3. 改哪里

修改姓名、生日、故事、照片、语音或长信，优先用游戏内礼物工坊。源码、地图、角色和道具的完整文件索引见 [项目结构](PROJECT_STRUCTURE.md)，按功能展开即可查找。

`星屿寻迹.html` 是自动生成的离线文件。请修改源码后重新构建；直接在这个大文件里改代码，会在下次构建时被覆盖。

场景地图是带碰撞和动态覆盖层的完整像素插画，并非通用瓦片编辑器。更换地图图片时，需要同步检查边界、河流、障碍物、地标和动态遮罩。人物全身图集的帧顺序、透明区域和鞋底锚点也要一起校准。

## 4. 核心检查与打包

在项目根目录依次执行：

```sh
npm test
npm run build
npm run check:bundle
```

`npm test` 会自动创建输出目录，独立运行八组检查：主岛路线、跨区路线、湖谷活动路线、活动存档、301 项个性化内容、树信存档与迁移、路标布局、移动时间步。它不依赖浏览器。

`npm run build` 将 19 个源码模块、样式和 17 张运行时 PNG 打包为 `星屿寻迹.html`，并在文件中保留完整的 `LICENSE`、`NOTICE` 和 `THIRD_PARTY_NOTICES.md`。`npm run check:bundle` 核对离线包与当前源码、样式、图片和许可声明是否一致；修改这些文件后需要重新打包。

### 制作正式下载包

安装 Python 后，在项目根目录执行：

```sh
npm run release:package
```

此命令只用 Python 标准库，不需要安装浏览器测试依赖。它会重新构建、检查单文件一致性，再生成 `output/releases/v6.2.2/`（版本号来自 `package.json`）：

- `star-island-v6.2.2.html`：可以直接打开的离线游戏，内嵌完整许可与来源声明。
- `star-island-v6.2.2-offline.zip`：包含游戏、`LICENSE`、`NOTICE`、`THIRD_PARTY_NOTICES.md` 和玩家说明 `START_HERE.md`。
- `SHA256SUMS.txt`：上述两个下载文件的 SHA-256 校验和。
- `build-report.json`：供本地检查的生成记录，无须作为玩家下载附件。

维护者完成检查后，可将前三项上传到对应版本的 GitHub Release；脚本本身不会创建标签、联网或发布文件。发布前请确认构建内容与版本标签一致，并保留所有适用的许可声明。GitHub 自动附带的 Source code ZIP 是源码包，与供玩家使用的 offline ZIP 不同。

发布前还应手动打开离线文件，至少体验：移动、一个交互、工坊保存与导出、树信图片下载。完整生日流程是收集五枚水晶、连星、打开盲盒、读信。

## 5. 可选的浏览器回归

浏览器回归需要 Python 和下列依赖；上面的正式下载包脚本仅需要 Python 标准库。普通玩家不用安装这些工具。

本次开发环境使用 Python 3.14、Microsoft Edge，Python 依赖版本记录在 `requirements-dev.txt`。可使用兼容这些依赖的 Python 版本，先创建虚拟环境：

```sh
python -m venv .venv
```

Windows PowerShell：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

macOS / Linux：

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
```

以下示例的 `python` 代表安装了这些依赖的解释器；也可以替换为上面的完整路径。已有回归脚本使用 Playwright 的 `channel='msedge'`，需要安装 Microsoft Edge；不要只安装 Chromium 后认为两个浏览器通道等价。实际真机 Safari、微信内置浏览器不在这些自动化脚本的验证范围内。

先开一个终端运行 `npm start`，再开另一个终端执行所需检查。

许可与专属礼物导出检查可以直接在离线文件上运行，无须启动服务器：

```sh
npm run release:package
python tests/release-license-v621.py
```

先生成正式下载包，再通过实际工坊操作导出新的礼物 HTML、打开礼物，检查完整许可和来源声明仍在文件中；输出位于 `output/release-v621/`。

### 树信与界面检查

```sh
python tests/letter-art-v62.py
python tests/tree-letter-ui.py
```

覆盖真实 PNG 排版、文字完整性、主题、长信分页、手机布局、输入法、异步结果、保存失败等。

### 完整游戏、烟花和树信流程

```sh
npm run build
python tests/festival-flow-v61.py
python tests/tree-letter-flow-v62.py
python tests/tree-letter-flow-v62.py --storage-failure
python tests/tree-letter-flow-v62.py --offline-only
```

顺序有意义：`festival-flow-v61.py` 通过真实交互生成通关测试备份；树信在线完整测试会读取这个备份，验证通关后写信与生日结尾信相互独立。不要把个人备份作为仓库测试素材上传。

角色、音频、活动和布局的其他脚本按功能整理在 [验证指南](TESTING.md)。其中明确区分当前全身步态检查、历史局部腿部工具，以及需要先生成备份或下载包的流程。

## 6. 输出目录与验收记录

`output/` 由检查脚本生成，包含截图、录屏、报告、下载的 HTML / PNG 和测试备份，整个目录已被 `.gitignore` 排除。首次单独运行历史脚本时，可先执行：

```sh
node -e "require('fs').mkdirSync('output',{recursive:true})"
```

`VERIFICATION.md` 保存项目各阶段的验收记录，其中的历史 `output/...` 路径指原开发环境，不意味着 GitHub 中已经上传这些文件。当前公开界面示例在 `docs/images/`；你可以在自己的环境运行对应脚本生成新报告。日期、字体、浏览器和换行方式不同，生成文件哈希也可能不同。

## 7. 提交并更新仓库

确认运行与打包通过后，查看改动，再提交：

```sh
git status
git add README.md docs src assets scripts tests index.html style.css studio.css tree-letter.css package.json requirements-dev.txt
git add 星屿寻迹.html
git commit -m "Update island content and rebuilt offline game"
git push origin main
```

按实际改动选择文件即可。新建的配置文件也应有意加入；不要使用强制添加把 `output/`、本机备份、`.env` 或 `.venv` 带入提交。凭据交给 Git Credential Manager 或你自己的正常 Git 登录配置，不要写进项目或远程 URL。

如果开启了 Pages，推送后等待 Pages 构建完成，再检查线上页面。下载的 ZIP 不自带 Git 历史；需要持续更新时建议使用 `git clone`。

## 8. 素材与技术范围

素材清单及生成来源在 [`assets/manifest.json`](../assets/manifest.json)，角色提示词与校准说明也保留在 assets 中。新增树信边饰和烟花由本项目 Canvas 代码绘制，音效由 Web Audio 生成，不调用外部图片或音乐服务。

这是纯前端、无账号的本地存档游戏。没有多人联机、云同步、自动微信发送或服务端邮件功能；若以后增加这些能力，应作为明确的新功能设计，不要仅凭新增按钮声称已经实现。

使用和分发范围见 [LICENSE](../LICENSE)，素材及开发依赖见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。免费自用、修改和非商业分享可以进行；转卖、收费定制交付、广告变现等商业用途不在许可范围内。玩家自己的文字、照片和语音仍归原权利人。
