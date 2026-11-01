# 2026-10-17 优化提案归档索引

状态核对：2026-11-01。原提案已结束，本文件不再作为实施清单或排期；完整过程保留在 Git 历史中。当前入口为 [README.md](README.md)、[UX_REVIEW.md](UX_REVIEW.md) 和 [PERFORMANCE_REVIEW.md](PERFORMANCE_REVIEW.md)。

## 已落实的方向

- 旧 PPT 模块停用并留存在 [archive/](archive/README.md)，原生入口已下线，安装包排除归档内容。
- 前端按功能拆包；图片修复、PDF 导出、文件恢复与图片持续验收已有实现及验证，证据集中在 UX_REVIEW.md。
- 操作限制以 `desktop/limits.cjs` 为准；后续保存与内存优化及其测量边界以 PERFORMANCE_REVIEW.md 为准。
- 桌面与官网共用当前仓库：桌面位于根目录，官网位于 `web/`。没有已批准的 `apps/web`／`apps/desktop` 目录迁移任务。

## 不应从旧提案自动启动的工作

- Apple 开发者账号、Developer ID、公证与 App Store 发布按用户要求暂缓；不阻塞本地 ad-hoc 打包。
- 多平台安装包、自动更新、云同步、命令面板、完整工作区迁移和视觉 CI 均不是本轮已批准的待办，不对外承诺排期。
- 外部文件同步沿用带可见性守卫和 focus 触发的轮询；章节关联沿用标题与同名次数，不向用户正文插入隐藏 ID。
- 编辑器懒加载和框架重写没有本轮实测收益依据，不保留“可节省若干 MB”的预估结论。
- `src/i18n.js` 与 `locales/` 只是未接入的原型，桌面尚无语言切换；详见 [I18N_GUIDE.md](I18N_GUIDE.md)。

## 后续入口

真实设备体验、长时间编辑及公开安装包更新的验收边界统一在 UX_REVIEW.md 维护。恢复包、归档、旧分支和临时产物须先核验并报告，再按用户确认清理；不执行旧计划中的自动删除命令。
