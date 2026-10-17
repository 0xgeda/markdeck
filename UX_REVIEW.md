# Markdeck 当前验收与交接

核对日期：2026-10-17。产品行为只在 [README.md](README.md) 维护，本文件记录证据、边界与下一步，不保留历次界面调整流水账。

## 本轮交付范围

- 写作、梳理、展示共用导航；模式切换串行等待加载和保存，展示不会仍高亮写作。梳理是完整工作区，无弹窗边框或灰色遮罩。
- 画布按父章节分组，自适应列数，展开后预留高度；已保存的手动位置优先，便笺独立保存。
- 展示方案改为「展示」中的章节侧栏，可对照正文预览、勾选和排序；方案管理收进「⋯」。逐章展示铺满内容区，Esc 逐层返回。保存失败阻止离开，切换文档关闭全部所属展示界面。

## 验证证据

本轮通过 12 个相关回归文件：app-flow、show-plan、display-mode、logic-panel、logic-layout、logic-connections、table-controls、quick-tools、image-controls、reference-pane、save-queue、theme-layout。

覆盖实际编辑器与文件保存联动、延迟加载和连续切换、便笺和方案持久化、保存失败重试、原文保持、失效章节、Esc、连线、表格删除与撤销、图片和参考只读、九套主题排版一致性。测试为 jsdom 或纯逻辑，不能证明真实视觉和拖动手感。表格测试仍有上游 `TextSelection endpoint not pointing into a node with inline content (table)` 提示；操作与撤销断言通过。

生产构建、macOS arm64 打包、ad-hoc 签名校验和 package-size 检查通过。包内 11 个前端文件及原生入口与当前构建／源码逐字节一致；app.asar 为 6.17 MiB，未带入开发依赖与项目规则文档。构建仍提示主 chunk 大于 500 kB；打包器提示可选 `.icon` 文件不存在，实际使用已存在的 `.icns` 图标。这些提示未被隐藏。

[tests/visual-review.mjs](tests/visual-review.mjs) 覆盖写作、参考、梳理、展示、章节侧栏和逐章展示截图，并检查 1440／1024／760／390 宽度。需先运行 Vite :5173。当前沙箱 Chromium 启动报 `bootstrap_check_in … Permission denied (1100)`；Electron 检查此前报 `Process failed to launch`。本轮没有新的真实渲染截图或实际 PDF 打印证据。用户能在自己的桌面会话打开 Markdeck，不能因此说应用本身无法启动。

## 六个事实面

| 事实面 | 状态 | 结论 |
| --- | --- | --- |
| 代码 | changed-and-verified | 本地功能与相关回归已更新；尚未形成新 Git 提交 |
| 运行态 | pending | 本地构建和安装包可核对，真实桌面视觉、输入法、拖动和 PDF 验收仍待完成；不是 live verified |
| 文档 | changed-and-verified | README 合并重复条目、移除旧入口和弹窗说法；性能文档区分历史体积与当前测量 |
| 规则 | changed-and-verified | 新建精简 AGENTS.md；盘点未发现已有项目／上级规则或项目文档 fallback 配置 |
| 记忆 | out-of-scope | 未获长期记忆写入授权；未修改 Codex 生成记忆，仅使用项目文档作为交接入口 |
| 工作区 | pending | 未提交改动及复核产物保留；远端无法实时核对，未执行清场 |

## 仓库与发布状态

本地 `desktop-app` HEAD 和缓存的 `origin/desktop-app` 为 `1a2ba5cf273864981dcb3484924e860c4782284c`，此前用户截图显示成功推送。当前改动尚未提交或上传，不把缓存追踪引用当作远端实时证据。

本轮 `git ls-remote` 默认访问失败：代理 `127.0.0.1:7890` 不可达；取消代理后 `github.com` 无法解析。因此当前 GitHub、PR、远端网页分支和 Vercel 线上状态均为 pending，未部署网页。`vercel.json` 仅能证明桌面分支配置禁止自动部署。

本工作区没有 `.git`；唯一元数据位于 `/private/tmp/markdeck-upload/.git`，与源码目录分离：

```sh
git --git-dir=/private/tmp/markdeck-upload/.git --work-tree=/Users/geda/Codex-CLI/PRJ/lark-markdown status --short
```

该临时目录是现役仓库，不是清理对象。本地 `main` 是旧桌面历史，不能等同远端网页 `main`。`markdeck-source.bundle` 仅包含上述已提交版本，不含当前未提交修改；保留为历史恢复点。

## 保留现场与清理候选

未删除文件、分支或工作区。候选仅为根目录 `.DS_Store`，以及本轮一次性脚本 `/private/tmp/markdeck-plan-sidebar.py`、`/private/tmp/markdeck-show-plan-edit.py`；前者是 Finder 缓存，后两者已应用到源码。用户复核并确认后才可删除。

设计方案、当前应用包、源码 bundle、外部 Git 元数据和 GUI 失败日志均保留。`src/presentation/` 已软归档至 `archive/`（原生接口和关联测试同步下线），回滚说明见 `archive/README.md`，待下次发布平稳后可彻底删除。其他项目与全局配置不在本轮修改范围。

## 下一步

1. 用更新后的 `.app` 查看章节侧栏与正文的实际比例、长标题、九种主题及窗口缩窄后的可用性；确认三个模式选中态和 Esc 返回路径。
2. 在桌面验证图片缩放、长表格操作条、触控板连线、中文输入法和 PDF 分页。已有 DOM 证据不替代这些检查。
3. 网络可用后核对远端，再提交并推送桌面分支；Vercel 网页重写和同仓目录迁移仍是后续工作。
4. 运行内存测试不是本轮完成声明的一部分；如用户观察到卡顿或持续增长，再按性能文档采样。
