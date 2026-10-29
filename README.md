# Markdeck

一款本地优先的 Markdown 桌面工具：在排版后的正文里直接写作，也能把章节关系梳理成卡片画布，并一键切换到展示模式。

- 官网：https://www.markdeck.pro
- 桌面端：macOS（Apple Silicon），后续覆盖更多平台

## 特性

- **写作**：所见即所得的 Markdown 编辑，九套皮肤、斜杠菜单、表格与查找替换
- **梳理**：把标题变成可拖动的卡片，便笺、连线、分组框自由组织
- **展示**：同一份文档一键演示，无需额外导出
- **本地优先**：所有文件保存在本地磁盘，无云端账号，无追踪
- **自动保存**：输入自动落盘，外部修改冲突可选择性合并

将 `.md`、`.markdown` 或 `.txt` 文件拖入窗口即可打开并关联原文件；拖动时显示「松开以打开文档」，平时不显示提示。重复拖入同一文件会切换到已有文档，图片仍由正文编辑器处理。

本地新版安装包支持 Finder「打开方式 → Markdeck」，也可将文件拖到 Dock 中的应用图标。要让 `.md` 双击默认用 Markdeck 打开，在 Finder 选中文件，按 ⌘I，在「打开方式」选择 Markdeck 后点「全部更改」。此功能无需 Apple 开发者账号；已发布的 `v1.0.0-preview.1` 尚不包含这项修复。

顶部文件夹按钮会在 Finder 中显示当前文档；尚未保存到本地的文档需先保存。打开其他文件使用左侧「打开文档」或 ⌘O。

正文中的 HTTP/HTTPS 链接（包括直接写出的网址）可单击在默认浏览器中打开；编辑链接时可按住 Option（Alt）点击。

文档列表支持拖动调整顺序，顺序保存在本机。鼠标移到文档行上可选择「从列表移除」；本地 Markdown 文件保留，未关联文件的草稿会在确认时特别提示。

设置中的常用文档操作直接显示；「导出与分享」「维护工具」默认折叠，展开后可使用导出、打包、图片修复与历史恢复。

## 飞书上传

飞书功能默认隐藏；在「设置」开启「显示飞书上传按钮」后，点击右上角飞书图标选择「新建文档」或「更新已有文档」。新建时可粘贴云空间文件夹链接，留空使用我的空间，上传成功后记住位置。「飞书账号配置」也可打开此窗口；打开窗口本身不会上传或覆盖。

更新已有文档时，粘贴 `/docx/` 或 `/wiki/` 文档链接，点击「读取目标」，核对标题后点击「覆盖更新」。当前 Markdown 正文与图片将替换目标全部正文，保留目标标题和链接；旧正文上的评论和未包含在本地文档中的资源可能丢失。成功后按本地文档记住目标，下次仍需确认覆盖；不同本地文档及飞书账号的目标相互隔离，不做双向同步。

覆盖前核对本地内容和飞书版本，保存目标完整读取响应到本机数据目录的 `feishu-backups/`，然后执行更新并回读版本。快照保留正文及资源引用，不是包含所有媒体和评论的完整恢复包。权限不足、目标变化、部分成功或网络中断时提示检查，不自动重试写入。

当前复用电脑上安装并配置好的官方 `lark-cli`，以用户身份上传；未连接时提供授权链接和二维码，未安装／未配置时提供设置说明。凭证由 CLI 管理，不写入 Markdeck。常用 Markdown 结构与本地图片已验证；自定义 HTML 按文本保留，主题、图片尺寸和复杂排版不保证与本地一致。网络中断时请先检查目标位置再重试，避免重复创建。

## 下载

当前提供 [v1.0.0-preview.1 预览版](https://github.com/0xgeda/markdeck/releases/tag/v1.0.0-preview.1)，适用于 **macOS 13 及以上、Apple Silicon（M 系列）Mac**。

下载发布页 Assets 中的 `Markdeck-1.0.0-preview.1-macos-arm64.zip`，解压后进入 `Markdeck-darwin-arm64` 文件夹，将 `Markdeck.app` 拖到「应用程序」。同时提供 `SHA256SUMS.txt` 校验文件；GitHub 自动生成的 Source code 压缩包是源码，不是应用安装包。

当前预览包使用 ad-hoc 签名，尚未使用 Developer ID 证书或完成 Apple 公证。首次运行如提示无法验证开发者，确认下载来源后，可按 [Apple 官方说明](https://support.apple.com/zh-cn/102445)，在尝试打开应用后进入「系统设置 → 隐私与安全性 → 仍要打开」。

数据保存在 `~/Library/Application Support/云笺/`。

## 本地开发

需要 Node.js 22+。

```sh
# 桌面端
npm ci
npx install-electron
npm start           # 构建并启动 Electron
npm run dev         # 浏览器预览 http://127.0.0.1:5173

# 展示站 (Next.js)
cd web
npm install
npm run dev         # http://localhost:3000
```

## 目录结构

```
.
├── src/           # 编辑器核心（三种模式共享导航）
├── desktop/       # Electron 主进程、文件、打包
├── tests/         # DOM、文件、打包、Playwright 检查
├── locales/       # 多语言资源
└── web/           # Next.js 官网 (markdeck.pro)
```

## 技术栈

- 桌面端：Electron + Vite + 原生 JavaScript + TOAST UI Editor
- 展示站：Next.js + Tailwind CSS

## License

[MIT](LICENSE)
