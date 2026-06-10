# Markdeck

将 Markdown 转换为精美 HTML 提案幻灯片。输入 Markdown，AI 自动选择布局、渲染主题，生成可分享的静态页面。

**生产域名：** [markdeck.pro](https://markdeck.pro)

## Tech Stack

- **框架：** Next.js 15 App Router
- **AI：** DeepSeek API（布局智能选择）
- **数据库：** Supabase（Postgres + Storage + Auth）
- **部署：** Vercel

## 功能

- Markdown 输入 → AI 布局选择 → 主题渲染 → 可分享链接
- 6 种幻灯片布局：`cover` / `content` / `quote` / `two-col` / `stat` / `image-full`
- 图片资产上传（PNG / JPEG / GIF / WebP，最大 5 MB）
- 用户 Dashboard：查看、删除已生成的 deck
- Supabase Auth 登录注册
- 公开预览页（`/d/:slug`）

## 本地开发

```bash
npm install
```

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DEEPSEEK_API_KEY=<deepseek-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

应用 Supabase 迁移：

```bash
supabase db push
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

1. 在 Vercel 项目设置中配置以下环境变量：

   | 变量 | 说明 |
   |------|------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `DEEPSEEK_API_KEY` | DeepSeek API key |
   | `NEXT_PUBLIC_SITE_URL` | `https://markdeck.pro` |

2. 确认 Supabase 迁移已应用。
3. 确认 Supabase Storage 存在名为 `deck-assets` 的公开 bucket。
4. 将 `markdeck.pro` 绑定到 Vercel 生产部署。

## 项目结构

```
src/
  app/
    api/generate/        # POST：生成 deck（调用 DeepSeek）
    api/decks/[id]/      # DELETE：删除 deck
    api/decks/[id]/save/ # POST：保存 HTML
    api/decks/[id]/assets/ # POST：上传图片资产
    auth/                # 登录 / 注册页面
    dashboard/           # 用户 deck 列表
    upload/              # Markdown 上传入口
    d/[slug]/            # 公开预览页
    preview/[slug]/      # 已登录用户预览页
  lib/
    markdeck/            # 核心逻辑：parser / layout-selector / renderer
    supabase/            # Supabase 客户端（server / client）
    env.ts               # Zod 环境变量校验
supabase/migrations/     # SQL 迁移文件
```
