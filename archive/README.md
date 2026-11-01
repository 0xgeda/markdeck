# archive/

本目录存放**已停用、用于回溯旧 PPT 功能的代码与测试**；不是当前产品入口，不进入安装包。

内容于 2026-10-17 归档；当前产品行为见 [README.md](../README.md)。

- `presentation/`：旧 PPT 确认稿与演示文稿导出模块。活代码（`src/main.js` + `src/display-mode.js` + `src/show-plan.js`）已不再引用；原路径为 `src/presentation/`。
- `tests-presentation/`：对应测试 `pagination.mjs` / `presentation.mjs` / `presentation-flow.mjs` / `pptx-draft.mjs`。import 路径仍指向原 `src/presentation/`，归档后不再运行；如需复测，先把两目录移回原位。

**恢复边界**：仅移动目录不足以恢复功能。主进程的对应 handler 已删除，预加载接口只保留注释；如明确需要恢复，应在独立分支中结合 Git 历史恢复主进程接口、预加载 API、测试路径、npm 脚本和 `pptxgenjs` 依赖，再做功能与打包验收。

**清理边界**：先核验恢复价值和 Git 中的完整性，向用户报告后再决定是否删除；发布成功本身不构成删除授权。
