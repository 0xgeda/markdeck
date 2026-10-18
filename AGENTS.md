# Markdeck 项目入口

本项目是直接编辑本地 Markdown 的 Electron 桌面工具，含写作、梳理和展示模式。

## 技术与目录

- Electron + Vite + 原生 JavaScript + TOAST UI Editor；依赖以 package-lock.json 为准。
- src/main.js 管理文档和模式切换；desktop/ 管理文件、附件、历史及原生接口。
- tests/ 包含 DOM、文件和 GUI 检查；dist/、release/ 是生成产物。
- web/ 是同一仓库内的 Next.js 官网子项目，遵循 web/AGENTS.md，进入 web/ 执行其安装与构建命令；桌面打包必须排除 web/。
- 当前产品行为与保存边界见 README.md，不在本文件重复维护。

## 启动与检查

- npm ci；npx install-electron；npm start。
- npm run dev：浏览器预览；npm run build：生产构建。
- npm run package:mac：生成 release/Markdeck-darwin-arm64/Markdeck.app。
- npm run reinstall：kill 旧进程 + 重打包 + 启动，调试打包版的默认入口。
- 模式变更运行 node tests/app-flow.mjs、node tests/show-plan.mjs；画布变更另跑 logic-panel、logic-layout、logic-connections。
- 文件变更运行 npm run test:files；图片修复变更另跑 tests/image-scan.mjs、tests/image-fix.cjs、tests/image-fix-dialog.mjs；Workspace 启动路径改动跑 tests/workspace-startup.cjs（ANR 守门）；打包后运行 node tests/package-size.mjs。
- GUI 检查需可用桌面环境，DOM 通过不能表述为视觉验收通过。安装版回归使用 YUNJIAN_EXECUTABLE 指向 .app/Contents/MacOS/Markdeck，运行 tests/desktop.mjs、desktop-images、desktop-clipboard、desktop-export、desktop-boundaries、desktop-interactions（后五项同目录 .mjs）；PDF 检查需 Poppler 的 pdfinfo/pdftotext/pdftoppm。测试只操作隔离临时文档。
- `tests/desktop-memory.mjs` 采样安装版 60 轮切换及空闲后的进程 RSS 和渲染堆；最后的强制 GC 样本仅为诊断，不能代替自然空闲或长期泄漏验收。
- `MARKDECK_HEAP_DIAGNOSTICS=1` 开启多阶段 GC 与堆快照诊断；依赖生命周期修补变更需跑 `node tests/editor-lifecycle.mjs`，验证旧文档索引释放且另一编辑器不受影响。
- 图片排版或加载变更跑 `node tests/image-controls.mjs`；安装版多图持续验收为 `node tests/desktop-image-stress.mjs`，覆盖重复引用尺寸、首次点击与拖动、30 轮保存及重启。其堆采样主动 GC，不等于自然空闲内存。
- 保存边界变更另跑 `node tests/desktop-recovery.mjs`；只修改隔离临时文件权限，SIGKILL 仅用于测试启动的进程，并在草稿持久化确认后执行。

## 必须保留的边界

- 梳理、便笺和展示方案独立于正文保存，不重排或覆盖用户 Markdown。
- 模式切换和窗口关闭等待保存；失败保留当前内容，允许重试。
- 保留 com.yunjian.markdown、yun-jian:// 和旧“云笺”数据目录兼容性。
- 当前 main 同时管理桌面端与 web/ 官网；Vercel 网站构建根目录应为 web/，不能执行仓库根目录的桌面构建。保留的 desktop-app 分支禁止 Vercel 自动部署。
- 不删除未核验的 Git 元数据、旧方案、历史稿件或恢复包。
- 新增或修改操作上限（文件大小、批量数量、扫描深度等）先改 `desktop/limits.cjs`，不要在业务代码里再硬编码阈值。
- 修改 Markdown 正文中的图片引用必须按扫描器返回的字符偏移切片替换；不要用全文 split/join，会误伤代码块。
- `Workspace` 构造函数里对磁盘的预读循环必须留在 `setImmediate` 里延迟执行；同步读会在用户授权受限目录（Documents/Downloads）时触发 sandbox 审批挂起，整个窗口 ANR。
- 打包 ignore 规则在 `desktop/package.mjs`；给渲染端用的 `.js` 若也被主进程动态 `import()`，需在 ignore 中显式放行。

## 当前状态与下一步

见 UX_REVIEW.md 的验证与待办；性能判断见 PERFORMANCE_REVIEW.md。
本工作区使用根目录 .git，正常执行 git 命令。/private/tmp/markdeck-upload/.git 是旧元数据，不再用于本工作区；未经核验不要删除。
当前按用户要求暂不处理 Apple 开发者账号、Developer ID 证书、公证或 App Store 发布；本地 ad-hoc 打包和功能验收继续。验证范围见 UX_REVIEW.md。禁止把安装体积当作运行内存数据。
