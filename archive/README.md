# archive/

本目录存放**已停用但保留一个版本以便回滚**的代码与测试。

内容由 `OPTIMIZATION_PLAN.md` 阶段 0.2 迁入，2026-10-17。

- `presentation/`：旧 PPT 确认稿与演示文稿导出模块。活代码（`src/main.js` + `src/display-mode.js` + `src/show-plan.js`）已不再引用；原路径为 `src/presentation/`。
- `tests-presentation/`：对应测试 `pagination.mjs` / `presentation.mjs` / `presentation-flow.mjs` / `pptx-draft.mjs`。import 路径仍指向原 `src/presentation/`，归档后不再运行；如需复测，先把两目录移回原位。

**回滚**：
```sh
mv archive/presentation src/presentation
mv archive/tests-presentation/*.mjs tests/
```
并在 `package.json` 恢复 `test:presentation` / `test:presentation-flow` / `test:pptx` 脚本与 `pptxgenjs` 依赖；在 `desktop/preload.cjs`、`desktop/main.cjs` 取消注释对应 handler。

**彻底删除时机**：确认至少一个发布版本运行平稳、无用户反馈需要恢复后，再 `rm -rf archive/`。
