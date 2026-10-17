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
