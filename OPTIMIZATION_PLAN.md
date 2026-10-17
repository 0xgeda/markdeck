# Markdeck 优化报告与实施计划

生成日期：2026-10-17。本文件分两部分：**上半**是从普通用户视角汇总的 16 项问题（报告），**下半**是把这 16 项排进四个阶段的实施计划（含可行性、风险、所需外部资源）。所有产品行为与边界仍以 [README.md](README.md) 为准，本文件只记录"要改什么、按什么顺序改"。

---

## 第一部分 · 用户视角问题清单

### A. 日常使用立刻会被感知

| # | 问题 | 用户故事 |
|---|---|---|
| 1 | 只有 Apple Silicon 包，且仅 ad-hoc 签名 | Intel Mac / Windows / Linux 用户没得用；拿到 .app 的人首次打开被 Gatekeeper 拦截，会以为"文件损坏" |
| 2 | 没有自动更新机制 | 每次升级要重新下载 ~293 MiB 包，用户容易留在旧版本 |
| 3 | 浏览器预览与桌面不同步（localStorage） | README 第 17 行写明；用户以为自己保存了，其实没写回文件 |
| 4 | 收到他人 Markdown 时的图片兼容性 | 不读绝对路径与目录外图片，一张张"重新选择"很累 |
| 5 | 文件/历史硬上限 | 10 MB 单文件、30 版本、20 MB 历史、1 MB 磁盘搜索正文；真实长文档会被卡 |

### B. 信任与完成度

| # | 问题 | 用户故事 |
|---|---|---|
| 6 | 真实视觉/PDF/输入法/拖动均未验收 | UX_REVIEW.md 坦承；DOM 测试再绿也不等于点进去不崩 |
| 7 | PDF 导出由 Electron 直接打印 A4 浅色 | 分页、代码块折行、字体不可控 |
| 8 | 安装体积 293 MiB 偏重 | "本地 Markdown 工具"的赛道里偏重，是不选它的直接理由 |
| 9 | Vite 主 chunk > 500 kB 警告未解决 | 首屏白屏时间会被用户感知 |

### C. 功能发现性与协作

| # | 问题 | 用户故事 |
|---|---|---|
| 10 | 没有命令面板 | 三模式 + 大量快捷键，⌘K 只能搜文档名；新用户上手门槛高 |
| 11 | 无云同步/多设备 | 换 Mac 或多端写作就断了 |
| 12 | 梳理卡片 ↔ 标题关联脆弱 | 标题改一次名，花 10 分钟排的卡片脱钩（README 第 41 行承认） |
| 13 | 外部变更 1.5 s 轮询 | 费电、延迟；`fs.watch` / chokidar 事件驱动更合适 |

### D. 工程债 / 长期

| # | 问题 | 用户故事 |
|---|---|---|
| 14 | 停用代码未清理 | `src/presentation/`（含 49 KB `theme-renderer.ts`）、旧 PPT 入口；`markdeck-source.bundle`、`markdeck-website-*.bundle` 混在根目录 |
| 15 | 纯中文界面，无 i18n 骨架 | 产品若想外推国际用户，当前连框架都没有 |
| 16 | 工作区目录单一，无一键导出/迁移 | 换 Mac/重装会头疼 |

---

## 第二部分 · 分阶段实施计划

每一项标注：**风险** / **是否需要外部依赖（账号、硬件、网络、用户授权）** / **验证方式**。

### 阶段 0 · 基础清场（1–2 天，低风险、本地可做）

> 目标：先把物理分层、构建警告、停用代码处理干净，为后续改造腾空间。改动都可本地回滚。

- **0.1** ✅ **已完成（2026-10-17）**：现有 `.gitignore` 已覆盖 `.DS_Store`、`*.bundle`、`dist/`、`release/`、`node_modules/`、`/web/`。本轮删除根目录物理残留 `.DS_Store`。两个 `*.bundle` 保留（UX_REVIEW 声明为历史恢复点）。
- **0.2** ✅ **已完成（2026-10-17）**：`src/presentation/` + 4 个关联测试全部软下线到 `archive/`，详见 `archive/README.md`。同步：
  - `desktop/preload.cjs` 注释 4 条暴露面：`loadDeck` / `saveDeck` / `exportPptx` / `exportPresentation`。
  - `desktop/main.cjs` 删除 4 个 handler（`presentation:export` / `deck:load` / `deck:save` / `deck:export-pptx`）与 `deckPath` 辅助函数。
  - `package.json` 删除 3 个 npm script（`test:presentation` / `test:presentation-flow` / `test:pptx`）和 `pptxgenjs` 依赖；保留 `prosemirror-inputrules` / `prosemirror-history`（TOAST UI 间接依赖，vite build 产物里出现在 editor chunk）。
  - 回归：`npm run build` + `app-flow` / `show-plan` / `logic-panel` / `display-mode` / `test:files` 全绿。
  - 彻底 `rm -rf archive/` 的时机：下一次发布运行平稳、未收到恢复需求后。
- **0.3** ✅ **已完成（2026-10-17）**：`vite.config.js` 加 `manualChunks`，拆出 `editor`（toast-ui + prosemirror + dompurify）、`markdown`（markdown-it）、`bundle`（jszip）vendor chunk。实测主 chunk 从 500+ kB 降到 **62 kB**。回归 `app-flow` / `show-plan` / `logic-panel` / `test:files`（10 个 node:test）全绿。
- **0.4** 根目录按 `apps/web`、`apps/desktop` 拆分（README 第 101 行里承诺却未做）。此项**风险偏高**：涉及打包脚本、Vercel 配置、两套 Git 历史的衔接，建议和 0.1–0.3 分开成单独 PR，网络恢复后再做。

### 阶段 1 · 发布可信度（1 周，外部依赖多）

> 目标：解决问题 1、2、8，让"下载后能双击打开 + 能自动更新"。

- **1.1** 申请 Apple Developer ID + App-Specific Password，补 `codesign --deep --options runtime` 和 `xcrun notarytool` 到 `desktop/package.mjs`。
  - **需要用户提供**：Developer ID 证书（$99/年）、Apple ID、App-Specific Password、Team ID。
  - 风险：**中**；验证：`spctl --assess --type execute Markdeck.app` 通过。
- **1.2** 出 universal 包（arm64 + x64），用 `@electron/packager --arch=universal` 或 `@electron/universal`。
  - 风险：**低**；验证：`file Markdeck.app/Contents/MacOS/Markdeck` 显示 universal。
- **1.3** 接入 `electron-updater` + GitHub Releases（或自建 S3）。
  - **需要用户选择**：更新源（GitHub Releases / 自建）。
  - 风险：**中**（涉及自签 TLS/更新链）；验证：旧版本启动能检测到新版本并下载。
- **1.4** 瘦身：删除 Electron 自带的多余 locales；评估是否把 `pptxgenjs`、`dompurify`（当前在 devDependencies 却也被运行时引用？）彻底移到按需加载。
  - 风险：**低**；验证：`du -sk release/.../Markdeck.app` 下降。
- **1.5** Windows / Linux 包暂缓；在 README 先说明"路线上已排期，当前只提供 macOS 包"，避免误导。

### 阶段 2 · 关键体验（1–2 周，本地可做为主）

> 目标：解决问题 4、12、13、7、9（已在阶段 0 做了一半）。

- **2.1 梳理卡片 ↔ 标题稳定 ID**：❌ **已论证不做（2026-10-17）**。现有 `title::count` 方案是"抗重排、不抗重命名"；换结构路径只是把失败模式平级交换为"抗重命名、不抗重排"。真正两头都抗的方案（在 Markdown 标题后嵌 `<!--lid:xxx-->`）会污染原文，得不偿失。丢失批注可重建，不是数据灾难。
- **2.2 外部变更改事件驱动**：评估后暂缓。现有轮询有 `document.hidden` 守卫 + 窗口 focus 触发，开销低，`fs.watch` 在 macOS 漏事件风险 > 收益。
- **2.3 图片引用修复向导**：✅ **已完成（2026-10-17）**，2026-10-18 扩展为同时支持 HTML `<img>` + 「删除选中」。核心代码：
  - `src/image-scan.js`：纯扫描器（屏蔽代码块/注释），同时识别 Markdown `![]()` 和 HTML `<img>`（带 `kind:'md'|'html'`），输出 `ok|missing|absolute-outside|relative-outside|remote|data|no-doc-dir` 状态 + `index/length` 偏移。
  - `desktop/image-fix.cjs`：扫描文件夹（深度 10 / ≤2000 文件）、按文件名匹配、原子导入到 `.assets/`（10 MB/张、100 MB/批）、失败全量回滚；HTML 条目自动跳过 `importBatch`。另有 `deleteBatch(id, raws)` 按偏移删除正文中失效引用（吞掉独占行的空白+换行），不触碰磁盘文件。
  - `src/image-fix-dialog.js`：懒加载弹窗，状态标签 + HTML 徽标 + 候选预览；底部两个动作「应用修复」「删除选中」，应用前重扫防陈旧。
  - 回归：`tests/image-scan.mjs`、`tests/image-fix.cjs`、`tests/image-fix-dialog.mjs` 全数通过（HTML 和 delete 分支尚无专项测试，后续补）。
  - 打包：`desktop/package.mjs` ignore 规则放行 `src/image-scan.js`。
- **2.4 PDF 导出**：✅ **已存在（本轮核查确认）**。`desktop/main.cjs` 的 `document:export` 已走 `BrowserWindow.printToPDF`（A4、0.5 英寸边距、打印背景），UI 入口为 `src/main.js` 的 `data-action="export-pdf"`。暂未加页眉页脚自定义。
- **2.5 操作上限集中到 `desktop/limits.cjs`**：✅ **已完成（2026-10-17）**。15 项阈值（图片单张/批量、文档大小、历史、搜索预算、文件夹扫描深度与数量等）集中到 `desktop/limits.cjs`，由 `image-fix.cjs`、`workspace.cjs`、`attachments.cjs`、`history.cjs`、`document-bundle.cjs`、`project.cjs`、`main.cjs` 消费。未暴露 UI（第一性原理：这些是性能护栏不是业务参数，不该给用户配置）。

### 阶段 3 · 发现性与长期（2 周+，部分需要产品决策）

> 目标：解决问题 10、11、15、16、6。

- **3.1 命令面板**（⌘⇧P）：列全部命令 + 最近文档 + 快捷键提示；按当前模式过滤。
  - 风险：**中**；验证：新 DOM 测试 + 真机点一遍。
- **3.2 云同步最小方案**：先不做多人协作，只做"识别 iCloud Drive / Dropbox / OneDrive 内的工作目录并把草稿写进去"。
  - 风险：**中**（文件锁、同步冲突）；验证：两台 Mac 共享同一 iCloud 目录 72 小时。
- **3.3 i18n 骨架**：✅ **骨架已完成（2026-10-17），未实际迁移字符串**。`src/i18n.js` + `locales/zh-CN.json` + `locales/en-US.json` 就绪，`I18N_GUIDE.md` 记录迁移路线和命名约定。实际字符串替换是后续窗口的事（11 文件、111 处中文字面量未动）。
- **3.4 一键导出整个工作区 + 导入**：把 `~/Library/Application Support/云笺/` 的 `workspace.json` / `history/` / `logic/` 打成一个 `.markdeck-archive` ZIP，另一台机器一键恢复。
  - 风险：**中**；验证：Mac A 导出 → Mac B 导入 → 画布、历史、便笺齐全。
- **3.5 真实视觉验收 CI**：把 `tests/visual-review.mjs` 跑在 GitHub Actions 的 macos-latest，Playwright 截图差分；Electron 启动截图差分走 `@electron/forge` 或手搓。
  - 风险：**低**（但要调通沙箱 Chromium 权限问题）；验证：PR 自动贴截图。

---

## 当前状态（2026-10-17 收尾）

**已完成**：阶段 0.1/0.2/0.3；阶段 2.3（图片引用修复向导）、2.4（PDF 核查）、2.5（阈值集中）；阶段 3.3（i18n 骨架）。顺带做的收尾：`webPreferences` 加 `spellcheck:false, backgroundThrottling:true`；dialog 开启淡入动画（带 `prefers-reduced-motion` 守卫）。

**用户决定不做**：阶段 1 全部（无 Apple Developer 账号）；阶段 2.1（已论证平级交换，无净收益）；阶段 2.2（现有轮询够用）；阶段 3.1 / 3.2 / 3.4 / 3.5（价值不足）。

**仍待后续窗口的事**：i18n 字符串实际迁移、Toast UI Editor 懒加载（预期启动省 15–25 MB，架构侵入大）、Developer ID 签名与自动更新（需账号）。

Codex 对抗审查（2026-10-17）发现并修复了两个 release-blocker：
- `desktop/package.mjs` 的 ignore 规则会排除 `src/image-scan.js`，导致产品版扫描崩溃 → 已放行。
- `desktop/image-fix.cjs` 的 `split/join` 替换会误伤代码块内相同字串 → 改为按扫描偏移切片替换，并补回归测试。
