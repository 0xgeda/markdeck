# Markdeck 官网部署

目标域名：`markdeck.pro`。仓库：`0xgeda/markdeck`。框架：Next.js 15 App Router。

## 分支与根目录

网页重写位于 `feat/website-rewrite`，基于原网页 `origin/main`。审阅后将网页变更合入 `main`，再将 Vercel Production Branch 设置为 `main`。桌面版保留在 `desktop-app`，不要用桌面代码覆盖网页分支。

本次基线是本地已有的 `origin/main`（`6fbac70`）；网络环境未能刷新远端。合入前先 fetch 并检查远端后续变更，再正常合并，不强制覆盖远端。

本机 `lark-markdown/web/` 是独立 worktree，**不是仓库内的 apps/web 子项目**。Vercel 导入网页分支时，Root Directory 保持仓库根目录 `./`。

## 构建与环境

- Framework Preset：Next.js。
- Node.js：22.x。
- Install Command：`npm ci`。
- Build Command：`npm run build`。
- Output Directory：Next.js 默认值。
- 官网三个公共页面不需要 DeepSeek 或 Supabase 环境变量。

可选变量 `NEXT_PUBLIC_MAC_DOWNLOAD_URL` 填入已发布、可公开访问的 HTTPS 安装包地址。该值在构建时读取，修改后需要重新部署；未配置时页面显示「查看 GitHub 发布页」。不要在安装包尚未发布时填写推测地址。

保留的旧 AI 路由需要 `DEEPSEEK_API_KEY`，相关链接使用 `NEXT_PUBLIC_SITE_URL`；登录与数据库路由需要对应 Supabase 变量。不要将私钥放进 `NEXT_PUBLIC_*` 变量。

## 验证顺序

1. 本地执行 `npm test`、`npm run build`，通过后创建网页分支的 Vercel Preview。
2. 检查首页、`/download`、`/guide`；测试三个模式高亮、编辑与展示、卡片拖动、皮肤、FAQ 和移动导航。
3. 在 375px、768px、1440px 宽度核对横向溢出、文字换行、触控操作和键盘焦点；画布允许独立横向滚动。
4. 验证 `/robots.txt`、`/sitemap.xml`、`/opengraph-image`、canonical 与真实下载链接。公开内容不需要登录。
5. 确认效果后合入 `main`，等待 Production 为 Ready，再验收生产地址。

## 绑定 markdeck.pro

在 Vercel 项目 Settings → Domains 添加 `markdeck.pro`，然后在域名服务商按 Vercel 当时提供的记录配置 DNS。添加 `www.markdeck.pro` 时设置重定向到主域名。等待域名验证和 HTTPS 证书就绪，再检查主页、下载及分享预览。

页面 canonical、sitemap、分享 URL 的统一来源是 `src/lib/site.ts`。更换主域名时修改此处。不要因为本地代码已配置域名就认为 DNS 或线上部署已经完成。

官方说明：[Vercel 自定义域名](https://vercel.com/docs/domains/working-with-domains/add-a-domain)、[Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)。

## 本次状态

官网代码、构建和交互测试已完成；浏览器视觉验收受本地运行权限阻断。Vercel 部署、GitHub 合并、公开安装包和域名绑定尚未执行。
