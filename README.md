# Markdeck

将 Markdown 转换为精美 HTML 提案幻灯片。输入 Markdown，AI 自动选择布局、渲染主题，生成可分享的静态页面。

**生产域名：** [markdeck.pro](https://markdeck.pro)

## Tech Stack

- **框架：** Next.js 15 App Router
- **AI：** DeepSeek API（布局智能选择）
- **存储：** sessionStorage（无数据库 MVP）
- **部署：** Vercel

## 功能

- Markdown 输入 → AI 布局选择 → 主题渲染 → 可分享链接
- 6 种幻灯片布局：`cover` / `content` / `quote` / `two-col` / `stat` / `image-full`
- 图片替换（Upload 面板，存为 base64 data URL）
- 编辑模式（inline contentEditable）
- 导出 HTML

## 本地开发

```bash
npm install
```

创建 `.env.local`：

```env
DEEPSEEK_API_KEY=<deepseek-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动开发服务器：

```bash
npm run dev
```

## 测试

```bash
npm test
```

## 部署到 Vercel

在 Vercel 项目设置中配置以下环境变量：

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `NEXT_PUBLIC_SITE_URL` | `https://markdeck.pro` |

推送到 `main` 分支后 Vercel 自动部署。

## 项目结构

```
src/
  app/
    api/generate/        # POST：生成 deck（调用 DeepSeek，返回 HTML）
    upload/              # Markdown 上传入口
    preview/[slug]/      # 预览 + 编辑页（读 sessionStorage）
    d/[slug]/            # 公开预览页
  lib/
    markdeck/            # 核心逻辑：parser / layout-selector / renderer
    env.ts               # Zod 环境变量校验
```
