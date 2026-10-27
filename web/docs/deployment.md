# Markdeck 官网部署

线上主域名：`www.markdeck.pro`，`markdeck.pro` 重定向到 www。仓库：`0xgeda/markdeck`。框架：Next.js 15 App Router。

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

安装包元数据在 `src/lib/site.ts` 的 `macRelease` 中维护，不依赖 `NEXT_PUBLIC_MAC_DOWNLOAD_URL`。当前为已公开的 `v1.0.0-preview.1`，ZIP 适用于 macOS 13+ / Apple Silicon。发布新版时先验证公开附件和 SHA-256，再同步修改版本、系统要求、体积、下载与发布记录链接，重新部署官网。无需把任何 GitHub 凭证放入网页或构建变量。

## 验证顺序

1. 进入 web/ 执行 `npm run build`，通过后创建 Vercel Preview。当前没有 test 脚本，旧测试数量不能作为当前验收依据。
2. 检查首页、`/download`、`/guide` 及对应 /zh 页面；测试三个模式高亮、编辑与展示、卡片拖动、皮肤、FAQ 和移动导航。
3. 在 375px、768px、1440px 宽度核对横向溢出、文字换行、触控操作和键盘焦点；画布允许独立横向滚动。
4. 验证 `/robots.txt`、`/sitemap.xml`、`/opengraph-image`、canonical 与真实下载链接。公开内容不需要登录。
5. 确认效果后合入 `main`，等待 Production 为 Ready，再验收生产地址。

## 绑定 markdeck.pro

现有域名使用 `www.markdeck.pro` 为主域名，`markdeck.pro` 重定向到 www。迁移时在 Vercel 项目 Settings → Domains 核对这两个域名，按服务商提供的记录配置 DNS。等待域名验证和 HTTPS 证书就绪，再检查主页、下载及分享预览，不要反转现有重定向方向。

页面 canonical、sitemap、分享 URL 的统一来源是 `src/lib/site.ts`。更换主域名时修改此处。不要因为本地代码已配置域名就认为 DNS 或线上部署已经完成。

官方说明：[Vercel 自定义域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)、[Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)。

## 当前验收边界

2026-10-28：`c2d89d4` 推送 main 后，现有 Vercel 项目 `0xgedas-projects/markdeck` 返回 Deployment has completed。正式域名 `www.markdeck.pro` 已出现新的 ZIP 直达下载、版本和安装步骤；六个中英文页面在 375 / 768 / 1440px 下的真实 Chrome 回归通过，包含交互、canonical／OG、首次响应安全头、robots、sitemap 与分享图。未改动 Vercel 账号或域名绑定配置。实际可访问与部署状态已核验，不以本地构建代替上线验收。
