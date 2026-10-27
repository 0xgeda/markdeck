# Markdeck 官网

Markdeck 桌面 Markdown 工具的产品官网，基于 **Next.js 15 App Router、React 19、TypeScript**。线上地址为 `https://www.markdeck.pro`，由 Vercel 部署；`https://markdeck.pro` 重定向到 www。

## 页面与交互

- `/`：产品介绍、写作 / 梳理 / 展示交互演示、皮肤预览、常见问题。
- `/download`：Mac Apple Silicon 安装包直达下载、版本与系统要求、首次安装说明。
- `/guide`：写作、本地文件与图片、逻辑画布、章节展示、保存与分享、飞书上传指南。

首页示例可以编辑正文、切换章节、拖动卡片、修改便笺和切换四种预览皮肤。编辑后的内容会出现在展示模式；数据仅在当前页面内存中保留。它是产品演示，不是完整的浏览器编辑器，也不读写访客的本地文件。

页面主体为服务端组件，只有演示和移动导航需要客户端状态。官网包含 en / zh 两套页面，默认英文，中文路径为 /zh、/zh/download、/zh/guide。消息按语言独立加载，尚无缺失翻译回退链。品牌字体 DM Serif Display 使用 next/font/google，构建时需要访问字体服务；SVG 插画及应用图标随项目提供。包含 canonical、Open Graph、Twitter 分享图、robots 和 sitemap。

## 本地运行

使用 Node.js 22：

```sh
npm ci
npm run dev
```

访问 `http://localhost:3000`。官网首页、指南和下载页不需要 API key、数据库或账号。

```sh
npm run build
npm start
```

官网位于同一仓库的 `web/` 子目录；进入该目录执行上述命令。Vercel 构建根目录设为 `web/`。

## 安装包入口

当前下载 `v1.0.0-preview.1`，适用于 macOS 13 及以上的 Apple Silicon Mac。公开 ZIP 约 131 MB，版本、系统要求和下载地址统一维护在 `src/lib/site.ts` 的 `macRelease` 中，不依赖构建环境变量。页面同时提供发布记录和 SHA-256 校验文件入口。

更新版本时，先确认 GitHub Release 和安装包已公开可下载，再一起更新上述元数据并部署。原 `NEXT_PUBLIC_MAC_DOWNLOAD_URL` 已不使用。当前预览包尚未完成 Apple 公证，页面按实际状态说明首次打开方式；安装包发布、签名和公证属于桌面发布流程，不由官网构建完成。

## 代码结构

```text
src/app/[locale]/page.tsx               首页（服务端组件）
src/app/website.css            官网样式与响应式规则，限定在 .website 内
src/app/[locale]/download/              获取应用
src/app/[locale]/guide/                 使用指南
src/app/opengraph-image.tsx    Next.js 生成的分享图
src/app/robots.ts              搜索引擎规则
src/app/sitemap.ts             官网 sitemap
src/components/website/        共享导航、页脚、品牌与交互演示
src/lib/site.ts                域名、仓库与安装包链接
```

旧 AI 幻灯片、登录与数据库路由已移除；当前官网不需要相关私钥。

## 验证与部署

2026-10-28：补齐公开预览包的直达下载、版本／系统要求、首次安装步骤、发布记录与校验文件入口。指南新增飞书新建／覆盖更新的条件和边界，修正历史恢复入口。平板布局提前折叠导航，canonical／OG／sitemap 统一指向实际主域名 www。

本轮生产构建通过，`c2d89d4` 已通过 GitHub → Vercel 上线。真实 Chrome 在本地和正式站点通过六个双语页面的 375 / 768 / 1440px 检查，包括下载信息、导航与语言切换、演示交互、首次响应安全头、robots／sitemap／分享图；已人工查看桌面、平板及手机截图。浏览器缓存重验证可能省略原响应头，因此响应头按每条路由首次访问检查。

正式站 `tests/download.mjs` 也已通过：未登录浏览器点击中文下载按钮后取得完整 ZIP，文件名、131,409,186 字节和 SHA-256 与发布记录一致。GitHub 下载在本次网络环境下较慢，测试已等待完整下载完成，不以响应状态或开始下载代替文件校验。

2026-10-18：生产构建和真实 Chrome 检查通过。覆盖 EN/zh 首页、指南、下载六页的 1440px / 390px 布局、语言双向切换、移动菜单、演示正文同步和便笺保留、canonical/OG URL、本地安全头、robots、sitemap 和分享图。修复了语言切换未更新 cookie 及语言按钮颜色变量错误。

浏览器回归位于 tests/browser.mjs，使用仓库根目录的 Playwright 开发依赖。先在 web/ 运行 `npm start -- --hostname localhost --port 3188`，再从仓库根目录执行 `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node web/tests/browser.mjs`；其他环境可安装 Playwright Chromium 后省略 CHROME_PATH。当前没有 npm test 脚本，旧版本测试数量不作为当前证据。

当前浏览器回归覆盖 375 / 768 / 1440px，增加直达下载、安装说明、飞书指南、四套皮肤、FAQ、键盘切换、卡片拖动和章节翻页检查。`tests/download.mjs` 从真实网页点击下载到临时目录，验证 ZIP 文件名、131,409,186 字节和 SHA-256；默认检查生产站，下载约 131 MB。两个脚本均支持 `MARKDECK_WEB_URL` 覆盖站点地址。

构建仍提示 metadataBase fallback；六个公共页面的实际 canonical/OG 域名及线上首次响应头检查通过。

部署步骤和域名设置见 [docs/deployment.md](docs/deployment.md)。main 推送会触发现有 Vercel 官网项目部署；部署结果及线上检查需要单独核验。

设计参考：[MarkText](https://marktext.me/) 的产品体验展示、[iA Writer](https://ia.net/writer) 的内容优先与克制排版。新版使用 Markdeck 自身的写作、梳理、展示场景与品牌素材。
