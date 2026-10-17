# Markdeck 网站开发规则

本目录是 Next.js 15 App Router 网站的独立 Git worktree，目标域名 `markdeck.pro`。当前主要工作是桌面产品官网，不是 Electron 编辑器本体。当前页面、交互和验证状态见 README.md；部署见 docs/deployment.md。

## 边界

- 官网首页、指南、下载页无需账号、AI key 或数据库。演示只使用虚构示例，内容仅在当前页面保留。
- 不宣传未提供的云同步、协作、AI 或跨平台安装包；不填写虚构下载地址、版本或使用人数。
- Next.js 页面的正文优先使用服务端组件，交互状态集中于 `src/components/website/`。
- 官网 CSS 限定在 `.website` 下，避免影响旧路由。设计使用深森林绿、纸白与浅鼠尾草绿，本地衬线标题与清晰的无衬线正文，不引入远程字体构建依赖。
- 保留桌面应用与网页的分支边界。当前网页分支 `feat/website-rewrite` 基于 `origin/main`；桌面分支 `desktop-app` 不应用于 Vercel 生产部署。

## 保留的旧功能

AI 幻灯片上传、预览、生成 API、Supabase 相关路由保留，但不从新版官网引导。涉及旧功能时：

- `src/lib/env.ts` 保持 Proxy 懒加载，不能在模块顶层执行 `parseEnv()`，公共页面构建必须无需私钥。
- Next.js 15 的动态路由 `params` 为 Promise，需要 await。
- AI 只选择布局，不修改 Markdown 原文。

## 检查

执行 `npm test && npm run build`。交互测试位于 `src/components/website/product-demo.test.tsx`，下载入口测试位于 `src/app/download/page.test.tsx`。响应式、真实拖动和触控体验需要浏览器验收；没有启动浏览器就不能声称视觉通过。
