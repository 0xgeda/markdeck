# Markdeck — 设计文档

**日期：** 2026-06-10  
**域名：** markdeck.pro  
**定位：** Markdown → 高质感 HTML 提案页面生成器

---

## 产品定位

用户上传 Markdown 文件或粘贴文本（可附带图片），选择主题，AI 自动生成美化后的 HTML 提案页面。生成后支持内联文字编辑，一键下载或获取托管链接分享。

**核心差异化：**
- 内容 100% 不被 AI 修改，AI 只决定版式
- 生成后直接在浏览器内点击编辑文字
- 多套官方主题可选
- 零安装，纯 Web

---

## 目标用户

**主要：** 业务 / 市场人员 — 不懂代码，想快速把内容变成好看的提案  
**次要：** 设计师 / 创意类 — 有审美，需要可控模板 + 快速出稿

---

## 核心用户流程

1. **上传内容** — 拖拽 `.md` 文件 或 粘贴 Markdown / 纯文本；单独上传图片
2. **选择主题** — 从官方预设主题中选择风格
3. **AI 生成**（~5s）— 解析结构 → AI 选版式 → 套模板 → 输出 HTML
4. **预览 & 内联编辑** — 右上角编辑开关，点击文字直接修改，拖入图片
5. **分享 & 导出** — 下载 HTML 单文件 或 获取托管链接 `markdeck.pro/d/:slug`

---

## 技术架构

### Tech Stack

| 层级 | 技术 |
|------|------|
| 前端 + API | Next.js 15 (App Router) |
| AI | DeepSeek API (deepseek-chat) |
| 数据库 + 存储 | Supabase (Postgres + Storage) |
| 认证 | Supabase Auth |
| 托管 | Vercel |

### 生成流程（模板骨架 + AI 增强）

```
用户输入
  → POST /api/generate
    → Step A: markdown-parser（纯规则）
        输出: { slides: [{ type, title, body, images }] }
    → Step B: DeepSeek API
        输入: 结构数据（不含原始文字内容）
        任务: 为每个 slide 选择最合适的 layout type
        输出: { slides: [{ ...原数据, layout: "cover|content|quote|two-col|stat|..." }] }
    → Step C: theme-renderer（纯模板，无 AI）
        输出: 完整 HTML 字符串
  → 存入 Supabase → 返回 deck_id
```

**关键原则：** DeepSeek 只接收结构数据，不接收用户原始文字，确保内容零篡改。

---

## 数据模型

```sql
users       — id, email, created_at
decks       — id, user_id, slug, title, theme, html_snapshot, source_md, created_at
deck_assets — id, deck_id, filename, storage_url
```

---

## 内联编辑

生成的 HTML 每个可编辑元素携带 `data-editable` 属性。

```js
// 开启编辑模式
document.querySelectorAll('[data-editable]')
  .forEach(el => el.contentEditable = 'true')

// 保存 → 序列化当前 DOM → POST /api/decks/:id/save
// 导出 → 下载 document.documentElement.outerHTML 为 .html 文件
```

图片拖入：监听 `dragover` / `drop` → 上传至 Supabase Storage → 替换 `<img src>`。

---

## 主题系统

官方出品，不开放社区贡献。每个主题包含一套 CSS + 版式模板集合。

```
themes/
  editorial/    ← 编辑风，衬线字体，纸质质感
  bold/         ← 大胆风，深色背景，高对比
  modern/       ← 现代商务，渐变色，圆角卡片
  minimal/      ← 极简风，纯白，大量留白
```

每套主题包含版式：`cover` · `content` · `quote` · `two-col` · `stat` · `image-full`

---

## 竞品差异化总结

| | Gamma | Marp | Markdeck |
|---|---|---|---|
| 输入 | 自然语言 prompt | Markdown 文件 | Markdown 文件 / 粘贴文本 |
| AI 修改内容 | 是 | 否 | **否** |
| 内联编辑 | 否 | 否 | **是** |
| 无需安装 | 是 | 否 | **是** |
| 托管分享 | 是 | 否 | **是** |
| 主题风格 | 有限 | 有限 | **多套官方主题** |
