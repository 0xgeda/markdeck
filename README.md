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

顶部文件夹按钮会在 Finder 中显示当前文档；尚未保存到本地的文档需先保存。打开其他文件使用左侧「打开文档」或 ⌘O。

正文中的 HTTP/HTTPS 链接（包括直接写出的网址）可单击在默认浏览器中打开；编辑链接时可按住 Option（Alt）点击。

文档列表支持拖动调整顺序，顺序保存在本机。鼠标移到文档行上可选择「从列表移除」；本地 Markdown 文件保留，未关联文件的草稿会在确认时特别提示。

设置中的常用文档操作直接显示；「导出与分享」「维护工具」默认折叠，展开后可使用导出、打包、图片修复与历史恢复。

## 飞书上传

飞书功能默认隐藏；在「设置」开启「显示飞书上传按钮」后，右上角飞书图标可将当前正文与图片上传成新的可编辑飞书文档。开关选择会保存在本机。首次选择云空间文件夹（粘贴文件夹链接，留空使用我的空间），上传成功后记住位置，之后点击图标直接上传；更换位置使用开关下方的「配置飞书账号与上传位置」。每次新建副本，不做双向同步。

当前复用电脑上安装并配置好的官方 `lark-cli`，以用户身份上传；未连接时提供授权链接和二维码，未安装／未配置时提供设置说明。凭证由 CLI 管理，不写入 Markdeck。常用 Markdown 结构与本地图片已验证；自定义 HTML 按文本保留，主题、图片尺寸和复杂排版不保证与本地一致。网络中断时请先检查目标位置再重试，避免重复创建。

## 下载

从 [Releases](https://github.com/0xgeda/markdeck/releases) 下载最新 macOS 构建，解压后把 `Markdeck.app` 拖到「应用程序」。

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
