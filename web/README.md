# Markdeck 官网

Markdeck 桌面 Markdown 工具的产品官网，基于 **Next.js 15 App Router、React 19、TypeScript**。计划使用 `https://markdeck.pro`，部署目标为 Vercel。

## 页面与交互

- `/`：产品介绍、写作 / 梳理 / 展示交互演示、皮肤预览、常见问题。
- `/download`：Mac Apple Silicon 版本获取入口。
- `/guide`：写作、本地文件与图片、逻辑画布、章节展示、保存与分享指南。

首页示例可以编辑正文、切换章节、拖动卡片、修改便笺和切换四种预览皮肤。编辑后的内容会出现在展示模式；数据仅在当前页面内存中保留。它是产品演示，不是完整的浏览器编辑器，也不读写访客的本地文件。

页面主体为服务端组件，只有演示和移动导航需要客户端状态。三个官网页面均预渲染；本地字体、SVG 插画及应用图标不依赖外部字体或图片服务。包含 canonical、Open Graph、Twitter 分享图、robots 和 sitemap。

## 本地运行

使用 Node.js 22：

```sh
npm ci
npm run dev
```

访问 `http://localhost:3000`。官网首页、指南和下载页不需要 API key、数据库或账号。

```sh
npm test
npm run build
npm start
```

本工作区的网站在 `web/` 独立 Git worktree 中，分支为 `feat/website-rewrite`，从已有网页分支 `origin/main` 建立；进入这个目录执行上述命令。正常克隆网页分支时，Next.js 项目就在仓库根目录。

## 安装包入口

默认下载页显示「官网直达下载尚未开放」，链接到仓库 Releases 查看发布情况。没有虚构版本号、安装包地址或其他系统的下载入口。

实际发布安装包后，在 Vercel 设置构建环境变量 `NEXT_PUBLIC_MAC_DOWNLOAD_URL`，值为真实的 HTTPS 安装包地址，再重新部署。未配置或配置无效时回退到发布页。安装包发布、签名和公证属于桌面发布流程，不由官网构建完成。

## 代码结构

```text
src/app/page.tsx               首页（服务端组件）
src/app/website.css            官网样式与响应式规则，限定在 .website 内
src/app/download/              获取应用
src/app/guide/                 使用指南
src/app/opengraph-image.tsx    Next.js 生成的分享图
src/app/robots.ts              搜索引擎规则
src/app/sitemap.ts             官网 sitemap
src/components/website/        共享导航、页脚、品牌与交互演示
src/lib/site.ts                域名、仓库与安装包链接
```

此前网页分支中的 AI 幻灯片功能（`/upload`、`/preview/[slug]`、`/api/generate`）和登录 / 数据库代码保留，不作为新版官网入口。AI 生成功能仍需要 `DEEPSEEK_API_KEY`；数据库与登录功能需要 Supabase 配置。它们不应被宣传为桌面版已提供的云服务。不要在构建时急切解析 `src/lib/env.ts`。

## 验证与部署

2026-10-17：75 项测试通过，Next.js 生产构建通过。新增验证覆盖模式高亮、编辑内容进入展示、卡片拖动与键盘移动、便笺保留、皮肤状态、移动菜单退出及下载链接回退。

本次运行环境禁止监听本地 HTTP 端口（`listen EPERM`），Chromium 也因 macOS Mach 服务权限失败，**尚未完成真实浏览器的视觉验收**。上线前需要在普通终端启动，核对手机与桌面宽度、键盘操作及下载链接。已有幻灯片测试的 React `act` 警告、Supabase Edge Runtime 构建警告仍存在，均来自保留的旧功能。

部署步骤和域名设置见 [docs/deployment.md](docs/deployment.md)。本次未部署 Vercel、未绑定域名。

设计参考：[MarkText](https://marktext.me/) 的产品体验展示、[iA Writer](https://ia.net/writer) 的内容优先与克制排版。新版使用 Markdeck 自身的写作、梳理、展示场景与品牌素材。
