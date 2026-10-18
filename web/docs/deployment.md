# Markdeck 官网部署

目标域名：`markdeck.pro`。仓库：`0xgeda/markdeck`。框架：Next.js 15 App Router。

## 分支与根目录

当前 main 是 monorepo，同时包含桌面应用和 web/ 官网。Vercel Production Branch 使用经审阅的 main，Root Directory 设置为 web/；不能使用仓库根目录的 Vite 桌面构建。保留的 desktop-app 分支不得自动部署。

部署前核验远端分支与 Vercel 项目的实际配置；本文件描述目标配置，不代表已修改线上设置。

## 构建与环境

- Framework Preset：Next.js。
- Node.js：22.x。
- Install Command：`npm ci`。
- Build Command：`npm run build`。
- Output Directory：Next.js 默认值。
- 官网公共页面不需要 DeepSeek 或 Supabase 环境变量。
- 品牌字体使用 next/font/google，构建时需要访问字体服务。

可选变量 `NEXT_PUBLIC_MAC_DOWNLOAD_URL` 填入已发布、可公开访问的 HTTPS 安装包地址。该值在构建时读取，修改后需要重新部署；未配置时页面显示「查看 GitHub 发布页」。不要在安装包尚未发布时填写推测地址。

## 验证顺序

1. 进入 web/ 执行 `npm run build`，通过后创建 Vercel Preview。当前没有 test 脚本，旧测试数量不能作为当前验收依据。
2. 检查首页、`/download`、`/guide` 及对应 /zh 页面；测试三个模式高亮、编辑与展示、卡片拖动、皮肤、FAQ 和移动导航。
3. 在 375px、768px、1440px 宽度核对横向溢出、文字换行、触控操作和键盘焦点；画布允许独立横向滚动。
4. 验证 `/robots.txt`、`/sitemap.xml`、`/opengraph-image`、canonical 与真实下载链接。公开内容不需要登录。
5. 确认效果后合入 `main`，等待 Production 为 Ready，再验收生产地址。

## 绑定 markdeck.pro

在 Vercel 项目 Settings → Domains 添加 `markdeck.pro`，然后在域名服务商按 Vercel 当时提供的记录配置 DNS。添加 `www.markdeck.pro` 时设置重定向到主域名。等待域名验证和 HTTPS 证书就绪，再检查主页、下载及分享预览。

页面 canonical、sitemap、分享 URL 的统一来源是 `src/lib/site.ts`。更换主域名时修改此处。不要因为本地代码已配置域名就认为 DNS 或线上部署已经完成。

官方说明：[Vercel 自定义域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)、[Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)。

## 当前验收边界

2026-10-18 已核对仓库结构与脚本。本轮修正说明未执行 Vercel 部署、GitHub 合并或域名绑定，也未核验线上配置。当前版本已通过生产构建及本机 Chrome 的六页双语、桌面／移动布局与语言切换检查。线上配置与域名仍需部署时验证。
