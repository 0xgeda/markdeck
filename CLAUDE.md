# Markdeck — Agent Rules

## 项目速查

| 项 | 值 |
|---|---|
| 域名 | markdeck.pro |
| 框架 | Next.js 15 App Router |
| AI | DeepSeek API |
| DB | Supabase (Postgres + Storage + Auth) |
| 部署 | Vercel |

## 路由清单

| 路径 | 说明 |
|---|---|
| `POST /api/generate` | 生成 deck（调用 DeepSeek） |
| `DELETE /api/decks/[id]` | 删除 deck |
| `POST /api/decks/[id]/save` | 保存 HTML snapshot |
| `POST /api/decks/[id]/assets` | 上传图片资产 |
| `/auth` | 登录 / 注册 |
| `/dashboard` | 用户 deck 列表 |
| `/upload` | Markdown 上传入口 |
| `/d/[slug]` | 公开预览页 |
| `/preview/[slug]` | 已登录预览页 |

## 硬边界规则

- **`src/lib/env.ts` 必须保持 Proxy 懒加载**：`parseEnv()` 不能在模块顶层执行，否则 Next.js build 阶段（无 env 变量）会崩溃。当前实现是 `new Proxy({}, { get: () => _env ?? parseEnv() })`，不要改回 `export const env = parseEnv()`。
- **Next.js 15 路由参数**：`params` 是 `Promise<{id: string}>`，必须 `await params`，不能解构直取。
- **AI 只选版式，不改内容**：DeepSeek 只决定每个 section 用哪种 layout，Markdown 内容原样保留。

## 设计系统

着陆页为深色编辑风，不要改回浅色：

| Token | 值 |
|---|---|
| 背景 | `bg-zinc-950` |
| 卡片背景 | `bg-zinc-900` |
| 金色 accent | `text-gold` / `bg-gold`（CSS var `--color-gold: #C5994A`） |
| 展示字体 | Cormorant Garamond → `font-display` class（`--font-display` CSS var） |
| 正文字体 | Geist（`--font-sans`） |

## 关键路径

```
src/lib/markdeck/     核心逻辑（parser / layout-selector / renderer）
src/lib/supabase/     Supabase 客户端（server.ts / browser.ts）
src/lib/env.ts        Zod env 校验（懒加载 Proxy）
supabase/migrations/  SQL 迁移文件
```

## 构建检查

```bash
npm test && npm run build
```

## 深入文档

| 文档 | 内容 |
|---|---|
| `docs/superpowers/specs/2026-06-10-markdeck-design.md` | 完整设计规格 |
| `docs/superpowers/plans/2026-06-10-markdeck-plan.md` | 12-Task 实施计划 |
| `docs/deployment.md` | Vercel 部署核查清单 |
| `README.md` | 本地开发步骤 |
