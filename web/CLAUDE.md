# Markdeck 网站开发规则

本目录是 Next.js 15 App Router 网站子项目，目标域名 `markdeck.pro`。当前主要工作是桌面产品官网，不是 Electron 编辑器本体。当前页面、交互和验证状态见 README.md；部署见 docs/deployment.md。

## 边界

- 官网首页、指南、下载页无需账号、AI key 或数据库。演示只使用虚构示例，内容仅在当前页面保留。
- 不宣传未提供的云同步、协作、AI 或跨平台安装包；不填写虚构下载地址、版本或使用人数。
- Next.js 页面的正文优先使用服务端组件，交互状态集中于 `src/components/website/`。
- 官网 CSS 限定在 `.website` 下，避免影响旧路由。设计使用深森林绿、纸白与浅鼠尾草绿，DM Serif Display 品牌标题与清晰的无衬线正文。当前品牌字体通过 next/font/google 构建时获取，构建需要字体网络可达。
- 当前 main 同时管理桌面应用与官网；Vercel Root Directory 使用 web/。保留的 desktop-app 分支不应用于 Vercel 生产部署。

## 路由与语言

- 当前官网路由位于 src/app/[locale]/，支持 en / zh，默认 en；中文页面使用 /zh 前缀。
- 当前消息按语言独立加载，尚无消息缺失时自动回退中文的逻辑。
- 旧 AI 上传、预览、生成 API 与数据库路由已移除，不将历史功能视作现有能力。
- Next.js 15 的动态路由 params 为 Promise，需要 await。

## 检查

进入 web/ 执行 `npm run build`。当前 package.json 没有 test 脚本，浏览器回归见 tests/browser.mjs，运行方法见 README.md；不能沿用旧版本“75 项测试通过”的验收结论。响应式、真实拖动和触控体验需要浏览器验收；没有启动浏览器就不能声称视觉通过。
