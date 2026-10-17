# Markdeck 项目入口

本项目是直接编辑本地 Markdown 的 Electron 桌面工具，含写作、梳理和展示模式。

## 技术与目录

- Electron + Vite + 原生 JavaScript + TOAST UI Editor；依赖以 package-lock.json 为准。
- src/main.js 管理文档和模式切换；desktop/ 管理文件、附件、历史及原生接口。
- tests/ 包含 DOM、文件和 GUI 检查；dist/、release/ 是生成产物。
- web/ 是独立的 Next.js 网页分支 worktree，遵循 web/AGENTS.md，不使用此处的 Electron 启动与打包命令；不要将其作为桌面文件提交或打包。
- 当前产品行为与保存边界见 README.md，不在本文件重复维护。

## 启动与检查

- npm ci；npx install-electron；npm start。
- npm run dev：浏览器预览；npm run build：生产构建。
- npm run package:mac：生成 release/Markdeck-darwin-arm64/Markdeck.app。
- npm run reinstall：kill 旧进程 + 重打包 + 启动，调试打包版的默认入口。
- 模式变更运行 node tests/app-flow.mjs、node tests/show-plan.mjs；画布变更另跑 logic-panel、logic-layout、logic-connections。
- 文件变更运行 npm run test:files；图片修复变更另跑 tests/image-scan.mjs、tests/image-fix.cjs、tests/image-fix-dialog.mjs；Workspace 启动路径改动跑 tests/workspace-startup.cjs（ANR 守门）；打包后运行 node tests/package-size.mjs。
- GUI 检查需可用桌面环境，DOM 通过不能表述为视觉验收通过。

## 必须保留的边界

- 梳理、便笺和展示方案独立于正文保存，不重排或覆盖用户 Markdown。
- 模式切换和窗口关闭等待保存；失败保留当前内容，允许重试。
- 保留 com.yunjian.markdown、yun-jian:// 和旧“云笺”数据目录兼容性。
- 桌面分支为 desktop-app，不用它覆盖网页 main；桌面分支禁止 Vercel 自动部署。
- 不删除未核验的 Git 元数据、旧方案、历史稿件或恢复包。
- 新增或修改操作上限（文件大小、批量数量、扫描深度等）先改 `desktop/limits.cjs`，不要在业务代码里再硬编码阈值。
- 修改 Markdown 正文中的图片引用必须按扫描器返回的字符偏移切片替换；不要用全文 split/join，会误伤代码块。
- `Workspace` 构造函数里对磁盘的预读循环必须留在 `setImmediate` 里延迟执行；同步读会在用户授权受限目录（Documents/Downloads）时触发 sandbox 审批挂起，整个窗口 ANR。
- 打包 ignore 规则在 `desktop/package.mjs`；给渲染端用的 `.js` 若也被主进程动态 `import()`，需在 ignore 中显式放行。

## 当前状态与下一步

见 UX_REVIEW.md 的验证与待办；性能判断见 PERFORMANCE_REVIEW.md。
本工作区 Git 元数据位于 /private/tmp/markdeck-upload/.git，使用显式 --git-dir 和 --work-tree；正常克隆不需要该路径。
下一步先做真实桌面视觉验收，再决定发布。禁止把安装体积当作运行内存数据。
