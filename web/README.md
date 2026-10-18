# Markdeck 官网

Markdeck 桌面 Markdown 工具的产品官网，基于 **Next.js 15 App Router、React 19、TypeScript**。计划使用 `https://markdeck.pro`，部署目标为 Vercel。

## 页面与交互

- `/`：产品介绍、写作 / 梳理 / 展示交互演示、皮肤预览、常见问题。
- `/download`：Mac Apple Silicon 版本获取入口。
- `/guide`：写作、本地文件与图片、逻辑画布、章节展示、保存与分享指南。

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

默认下载页显示「官网直达下载尚未开放」，链接到仓库 Releases 查看发布情况。没有虚构版本号、安装包地址或其他系统的下载入口。

实际发布安装包后，在 Vercel 设置构建环境变量 `NEXT_PUBLIC_MAC_DOWNLOAD_URL`，值为真实的 HTTPS 安装包地址，再重新部署。未配置或配置无效时回退到发布页。安装包发布、签名和公证属于桌面发布流程，不由官网构建完成。

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

2026-10-18：生产构建和真实 Chrome 检查通过。覆盖 EN/zh 首页、指南、下载六页的 1440px / 390px 布局、语言双向切换、移动菜单、演示正文同步和便笺保留、canonical/OG URL、本地安全头、robots、sitemap 和分享图。修复了语言切换未更新 cookie 及语言按钮颜色变量错误。

浏览器回归位于 tests/browser.mjs，使用仓库根目录的 Playwright 开发依赖。先在 web/ 运行 `npm start -- --hostname localhost --port 3188`，再从仓库根目录执行 `CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node web/tests/browser.mjs`；其他环境可安装 Playwright Chromium 后省略 CHROME_PATH。当前没有 npm test 脚本，旧版本测试数量不作为当前证据。

构建仍提示 metadataBase fallback；六个公共页面的实际 canonical/OG 域名检查通过。本地响应头验收不代表线上配置已核验。

部署步骤和域名设置见 [docs/deployment.md](docs/deployment.md)。本次未部署 Vercel、未绑定域名。

设计参考：[MarkText](https://marktext.me/) 的产品体验展示、[iA Writer](https://ia.net/writer) 的内容优先与克制排版。新版使用 Markdeck 自身的写作、梳理、展示场景与品牌素材。
