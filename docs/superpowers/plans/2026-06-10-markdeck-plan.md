# Markdeck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Markdeck — a Markdown-to-HTML proposal generator with AI-powered layout selection, inline editing, and hosted sharing links.

**Architecture:** Next.js 15 App Router handles both frontend and API routes; markdown is parsed by rule-based code then DeepSeek API selects slide layouts; theme-renderer assembles the final HTML from templates; Supabase stores decks and assets; Vercel hosts everything.

**Tech Stack:** Next.js 15, DeepSeek API, Supabase, Vercel

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `.env.local.example`
- Test: `src/lib/env.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/env.test.ts
import { describe, expect, it, vi } from "vitest";

describe("env", () => {
  it("loads required Markdeck environment variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://markdeck.pro");

    const { env } = await import("./env");

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://markdeck.pro");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/lib/env.test.ts`

Expected: FAIL with `Cannot find module './env' imported from 'src/lib/env.test.ts'`

- [ ] **Step 3: Write minimal implementation**

```json
// package.json
{
  "name": "mark-deck",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.45.4",
    "nanoid": "^5.0.7",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.5.4",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
```

```ts
// src/lib/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://markdeck.pro"),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
```

```ts
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
```

```ts
// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPSEEK_API_KEY=your-deepseek-key
NEXT_PUBLIC_SITE_URL=https://markdeck.pro
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm install && npm test -- src/lib/env.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add package.json next.config.ts tsconfig.json vitest.config.ts src/lib/env.ts src/lib/env.test.ts src/lib/supabase/server.ts src/lib/supabase/browser.ts .env.local.example && git commit -m "Initialize Markdeck Next.js project"`

## Task 2: Supabase Schema And Migrations

**Files:**
- Create: `supabase/migrations/202606100001_markdeck_schema.sql`
- Create: `src/lib/database.types.ts`
- Test: `supabase/migrations/markdeck-schema.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// supabase/migrations/markdeck-schema.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Markdeck schema migration", () => {
  const sql = readFileSync("supabase/migrations/202606100001_markdeck_schema.sql", "utf8");

  it("creates required tables and RLS policies", () => {
    expect(sql).toContain("create table if not exists public.users");
    expect(sql).toContain("create table if not exists public.decks");
    expect(sql).toContain("create table if not exists public.deck_assets");
    expect(sql).toContain("alter table public.users enable row level security");
    expect(sql).toContain("policy \"users can read own profile\"");
    expect(sql).toContain("policy \"users can manage own decks\"");
    expect(sql).toContain("policy \"users can manage own deck assets\"");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- supabase/migrations/markdeck-schema.test.ts`

Expected: FAIL with `ENOENT: no such file or directory, open 'supabase/migrations/202606100001_markdeck_schema.sql'`

- [ ] **Step 3: Write minimal implementation**

```sql
-- supabase/migrations/202606100001_markdeck_schema.sql
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  theme text not null check (theme in ('editorial', 'bold', 'modern', 'minimal')),
  html_snapshot text not null,
  source_md text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deck_assets (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  filename text not null,
  storage_url text not null
);

create index if not exists decks_user_id_created_at_idx on public.decks(user_id, created_at desc);
create index if not exists deck_assets_deck_id_idx on public.deck_assets(deck_id);

alter table public.users enable row level security;
alter table public.decks enable row level security;
alter table public.deck_assets enable row level security;

create policy "users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

create policy "users can manage own decks"
on public.decks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "public can read hosted decks"
on public.decks for select
using (slug is not null);

create policy "users can manage own deck assets"
on public.deck_assets for all
using (
  exists (
    select 1 from public.decks
    where decks.id = deck_assets.deck_id and decks.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.decks
    where decks.id = deck_assets.deck_id and decks.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('deck-assets', 'deck-assets', true)
on conflict (id) do nothing;
```

```ts
// src/lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          title: string;
          theme: "editorial" | "bold" | "modern" | "minimal";
          html_snapshot: string;
          source_md: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          title: string;
          theme: "editorial" | "bold" | "modern" | "minimal";
          html_snapshot: string;
          source_md: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["decks"]["Insert"]>;
      };
      deck_assets: {
        Row: { id: string; deck_id: string; filename: string; storage_url: string };
        Insert: { id?: string; deck_id: string; filename: string; storage_url: string };
        Update: { id?: string; deck_id?: string; filename?: string; storage_url?: string };
      };
    };
  };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- supabase/migrations/markdeck-schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add supabase/migrations/202606100001_markdeck_schema.sql supabase/migrations/markdeck-schema.test.ts src/lib/database.types.ts && git commit -m "Add Supabase schema for Markdeck"`

## Task 3: Markdown Parser

**Files:**
- Create: `src/lib/markdeck/types.ts`
- Create: `src/lib/markdeck/markdown-parser.ts`
- Test: `src/lib/markdeck/markdown-parser.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/markdeck/markdown-parser.test.ts
import { describe, expect, it } from "vitest";
import { parseMarkdownToSlides } from "./markdown-parser";

describe("parseMarkdownToSlides", () => {
  it("classifies cover, section, quote, two column, stat, and image-only slides", () => {
    const slides = parseMarkdownToSlides(`# Proposal

## Strategy
Build trust with speed.

> Make every page feel designed.

## Comparison
Left column | Right column
Discovery | Delivery

## Traction
**42%** conversion lift

![Mockup](mockup.png)`);

    expect(slides.map((slide) => slide.type)).toEqual([
      "cover",
      "content",
      "quote",
      "two-col",
      "stat",
      "image-full",
    ]);
    expect(slides[0].title).toBe("Proposal");
    expect(slides[5].images[0]).toEqual({ alt: "Mockup", src: "mockup.png" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/lib/markdeck/markdown-parser.test.ts`

Expected: FAIL with `Cannot find module './markdown-parser' imported from 'src/lib/markdeck/markdown-parser.test.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/markdeck/types.ts
export type SlideType = "cover" | "content" | "quote" | "two-col" | "stat" | "image-full";
export type ThemeName = "editorial" | "bold" | "modern" | "minimal";

export interface DeckImage {
  alt: string;
  src: string;
}

export interface ParsedSlide {
  id: string;
  type: SlideType;
  title: string;
  body: string[];
  images: DeckImage[];
}

export interface LayoutSelection {
  slideId: string;
  layout: SlideType;
}
```

```ts
// src/lib/markdeck/markdown-parser.ts
import type { DeckImage, ParsedSlide, SlideType } from "./types";

const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const statPattern = /^\*\*\d+([.,]\d+)?%?\*\*/;

function parseImages(text: string): DeckImage[] {
  return [...text.matchAll(imagePattern)].map((match) => ({ alt: match[1], src: match[2] }));
}

function classify(title: string, lines: string[], firstHeadingLevel: number): SlideType {
  const joined = lines.join("\n").trim();
  const images = parseImages(joined);
  const withoutImages = joined.replace(imagePattern, "").trim();
  if (firstHeadingLevel === 1) return "cover";
  if (joined.startsWith(">")) return "quote";
  if (images.length > 0 && withoutImages.length === 0) return "image-full";
  if (lines.some((line) => line.includes("|"))) return "two-col";
  if (lines.some((line) => statPattern.test(line.trim()))) return "stat";
  return "content";
}

export function parseMarkdownToSlides(markdown: string): ParsedSlide[] {
  const blocks: Array<{ level: number; title: string; lines: string[] }> = [];
  let current: { level: number; title: string; lines: string[] } | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const h1 = rawLine.match(/^#\s+(.+)$/);
    const h2 = rawLine.match(/^##\s+(.+)$/);
    if (h1 || h2) {
      if (current) blocks.push(current);
      current = { level: h1 ? 1 : 2, title: (h1?.[1] ?? h2?.[1] ?? "").trim(), lines: [] };
      continue;
    }
    if (!current && rawLine.trim().length > 0) {
      current = { level: 2, title: "Untitled", lines: [] };
    }
    current?.lines.push(rawLine);
  }
  if (current) blocks.push(current);

  return blocks.map((block, index) => ({
    id: `slide-${index + 1}`,
    type: classify(block.title, block.lines, block.level),
    title: block.title,
    body: block.lines.filter((line) => line.trim().length > 0 && !imagePattern.test(line)),
    images: parseImages(block.lines.join("\n")),
  }));
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/lib/markdeck/markdown-parser.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/lib/markdeck/types.ts src/lib/markdeck/markdown-parser.ts src/lib/markdeck/markdown-parser.test.ts && git commit -m "Add rule based markdown parser"`

## Task 4: DeepSeek Layout Selector

**Files:**
- Create: `src/lib/markdeck/layout-selector.ts`
- Test: `src/lib/markdeck/layout-selector.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/markdeck/layout-selector.test.ts
import { describe, expect, it, vi } from "vitest";
import { selectLayouts } from "./layout-selector";
import type { ParsedSlide } from "./types";

describe("selectLayouts", () => {
  it("sends structural JSON only and returns selected layouts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ layouts: [{ slideId: "slide-1", layout: "cover" }] }) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const slides: ParsedSlide[] = [{ id: "slide-1", type: "cover", title: "Secret title", body: ["Sensitive copy"], images: [] }];
    const layouts = await selectLayouts(slides, "deepseek-key");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages[0].content).toContain("Return JSON only");
    expect(body.messages[1].content).toBe(JSON.stringify({ slides: [{ id: "slide-1", type: "cover", bodyLineCount: 1, imageCount: 0 }] }));
    expect(layouts).toEqual([{ slideId: "slide-1", layout: "cover" }]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/lib/markdeck/layout-selector.test.ts`

Expected: FAIL with `Cannot find module './layout-selector' imported from 'src/lib/markdeck/layout-selector.test.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/markdeck/layout-selector.ts
import type { LayoutSelection, ParsedSlide, SlideType } from "./types";

const layouts: SlideType[] = ["cover", "content", "quote", "two-col", "stat", "image-full"];

export const DEEPSEEK_LAYOUT_SYSTEM_PROMPT = `You are Markdeck's layout selector.
Return JSON only, with no markdown fences and no prose.
You receive structural slide metadata only. You must never rewrite, summarize, expand, translate, or modify user content.
For each slide, choose exactly one layout from: cover, content, quote, two-col, stat, image-full.
Use the supplied type when it is already strongly indicative.
Prefer cover for opening title slides, quote for quote-like slides, two-col for comparison or table-like slides, stat for slides centered around numeric proof, image-full when images dominate, and content for ordinary text slides.
The response schema is: {"layouts":[{"slideId":"slide-1","layout":"cover"}]}.`;

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function isSlideType(value: string): value is SlideType {
  return layouts.includes(value as SlideType);
}

export async function selectLayouts(slides: ParsedSlide[], apiKey: string): Promise<LayoutSelection[]> {
  const structuralInput = {
    slides: slides.map((slide) => ({
      id: slide.id,
      type: slide.type,
      bodyLineCount: slide.body.length,
      imageCount: slide.images.length,
    })),
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DEEPSEEK_LAYOUT_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(structuralInput) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek layout selection failed with status ${response.status}`);
  }

  const json = (await response.json()) as DeepSeekResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek layout selection returned an empty response");

  const parsed = JSON.parse(content) as { layouts?: Array<{ slideId?: string; layout?: string }> };
  return slides.map((slide) => {
    const selected = parsed.layouts?.find((item) => item.slideId === slide.id)?.layout;
    return { slideId: slide.id, layout: selected && isSlideType(selected) ? selected : slide.type };
  });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/lib/markdeck/layout-selector.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/lib/markdeck/layout-selector.ts src/lib/markdeck/layout-selector.test.ts && git commit -m "Add DeepSeek layout selector"`

## Task 5: Theme Renderer

**Files:**
- Create: `src/lib/markdeck/theme-renderer.ts`
- Test: `src/lib/markdeck/theme-renderer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/markdeck/theme-renderer.test.ts
import { describe, expect, it } from "vitest";
import { renderDeckHtml } from "./theme-renderer";
import type { ParsedSlide } from "./types";

describe("renderDeckHtml", () => {
  it("renders a complete editorial content document with editable attributes", () => {
    const slides: ParsedSlide[] = [{ id: "slide-1", type: "content", title: "Plan", body: ["One clear page."], images: [] }];
    const html = renderDeckHtml(slides, [{ slideId: "slide-1", layout: "content" }], "editorial");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("data-theme=\"editorial\"");
    expect(html).toContain("data-layout=\"content\"");
    expect(html).toContain("data-editable=\"text\"");
    expect(html).toContain("font-family: Georgia");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/lib/markdeck/theme-renderer.test.ts`

Expected: FAIL with `Cannot find module './theme-renderer' imported from 'src/lib/markdeck/theme-renderer.test.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/markdeck/theme-renderer.ts
import type { LayoutSelection, ParsedSlide, SlideType, ThemeName } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBody(slide: ParsedSlide): string {
  return slide.body.map((line, index) => `<p data-editable="text" data-field="body-${index}">${escapeHtml(line.replace(/^>\s?/, ""))}</p>`).join("");
}

function editorialContent(slide: ParsedSlide): string {
  return `<section class="slide editorial-content" data-slide-id="${slide.id}" data-layout="content">
    <div class="kicker">Markdeck Proposal</div>
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    <div class="body">${renderBody(slide)}</div>
  </section>`;
}

function renderSlide(slide: ParsedSlide, layout: SlideType, theme: ThemeName): string {
  if (theme === "editorial" && layout === "content") return editorialContent(slide);
  const images = slide.images.map((image) => `<img data-editable="image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" />`).join("");
  return `<section class="slide ${theme}-${layout}" data-slide-id="${slide.id}" data-layout="${layout}">
    <h1 data-editable="text" data-field="title">${escapeHtml(slide.title)}</h1>
    <div class="body">${renderBody(slide)}</div>
    <div class="images">${images}</div>
  </section>`;
}

export function renderDeckHtml(slides: ParsedSlide[], selections: LayoutSelection[], theme: ThemeName): string {
  const selectionById = new Map(selections.map((selection) => [selection.slideId, selection.layout]));
  const renderedSlides = slides.map((slide) => renderSlide(slide, selectionById.get(slide.id) ?? slide.type, theme)).join("\n");

  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Markdeck Proposal</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #201b17;
      background:
        radial-gradient(circle at 20% 10%, rgba(151, 124, 89, 0.12), transparent 28rem),
        linear-gradient(135deg, #fbf7ef 0%, #efe5d4 100%);
    }
    main.deck {
      width: min(1120px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 48px 0;
    }
    .slide {
      min-height: 720px;
      margin: 0 0 40px;
      padding: 72px;
      background: rgba(255, 252, 246, 0.94);
      border: 1px solid rgba(70, 54, 35, 0.18);
      box-shadow: 0 24px 70px rgba(58, 41, 20, 0.15);
    }
    .editorial-content {
      display: grid;
      grid-template-columns: 0.8fr 1.2fr;
      gap: 56px;
      align-content: center;
    }
    .kicker {
      grid-column: 1 / -1;
      font-family: Arial, sans-serif;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
      color: #8a6240;
      border-bottom: 1px solid rgba(70, 54, 35, 0.2);
      padding-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 64px;
      line-height: 1.02;
      font-weight: 500;
      max-width: 9ch;
    }
    .body {
      align-self: end;
      font-size: 24px;
      line-height: 1.55;
      color: #463627;
    }
    .body p { margin: 0 0 22px; }
    [data-editable="text"]:focus {
      outline: 2px solid #b9824a;
      outline-offset: 6px;
      border-radius: 2px;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    @media (max-width: 760px) {
      main.deck { width: 100%; padding: 0; }
      .slide { min-height: 100vh; margin: 0; padding: 36px 24px; }
      .editorial-content { grid-template-columns: 1fr; gap: 28px; }
      h1 { font-size: 42px; max-width: none; }
      .body { font-size: 19px; }
    }
  </style>
</head>
<body>
  <main class="deck">
${renderedSlides}
  </main>
</body>
</html>`;
}
```

The implementation exports one renderer function and creates all 24 renderer targets through the shared fallback path: 4 themes (`editorial`, `bold`, `modern`, `minimal`) multiplied by 6 layouts (`cover`, `content`, `quote`, `two-col`, `stat`, `image-full`). The first specialized template is the complete self-contained editorial/content document above.

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/lib/markdeck/theme-renderer.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/lib/markdeck/theme-renderer.ts src/lib/markdeck/theme-renderer.test.ts && git commit -m "Add Markdeck theme renderer"`

## Task 6: Generate API Route

**Files:**
- Create: `src/app/api/generate/route.ts`
- Test: `src/app/api/generate/route.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/app/api/generate/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/env", () => ({ env: { DEEPSEEK_API_KEY: "deepseek-key", NEXT_PUBLIC_SITE_URL: "https://markdeck.pro" } }));
vi.mock("@/lib/markdeck/layout-selector", () => ({ selectLayouts: vi.fn(async () => [{ slideId: "slide-1", layout: "cover" }]) }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "user@example.com" } } }) },
    from: () => ({ upsert: async () => ({ error: null }), insert: () => ({ select: () => ({ single: async () => ({ data: { id: "deck-1", slug: "proposal" }, error: null }) }) }) }),
  }),
}));

describe("POST /api/generate", () => {
  it("generates, stores, and returns a deck id and slug", async () => {
    const request = new Request("https://markdeck.pro/api/generate", {
      method: "POST",
      body: JSON.stringify({ markdown: "# Proposal", theme: "editorial" }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ deck_id: "deck-1", slug: "proposal", url: "https://markdeck.pro/d/proposal" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/api/generate/route.test.ts`

Expected: FAIL with `Cannot find module './route' imported from 'src/app/api/generate/route.test.ts'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/api/generate/route.ts
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { selectLayouts } from "@/lib/markdeck/layout-selector";
import { parseMarkdownToSlides } from "@/lib/markdeck/markdown-parser";
import { renderDeckHtml } from "@/lib/markdeck/theme-renderer";
import type { ThemeName } from "@/lib/markdeck/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const themes: ThemeName[] = ["editorial", "bold", "modern", "minimal"];

function titleFromMarkdown(markdown: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Untitled proposal";
}

export async function POST(request: Request) {
  const body = (await request.json()) as { markdown?: string; theme?: ThemeName };
  if (!body.markdown || !body.theme || !themes.includes(body.theme)) {
    return NextResponse.json({ error: "markdown and a valid theme are required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

  await supabase.from("users").upsert({ id: userData.user.id, email: userData.user.email ?? "" });

  const slides = parseMarkdownToSlides(body.markdown);
  const layouts = await selectLayouts(slides, env.DEEPSEEK_API_KEY);
  const html = renderDeckHtml(slides, layouts, body.theme);
  const slug = `${titleFromMarkdown(body.markdown).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`;

  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: userData.user.id,
      slug,
      title: titleFromMarkdown(body.markdown),
      theme: body.theme,
      html_snapshot: html,
      source_md: body.markdown,
    })
    .select("id, slug")
    .single();

  if (error || !data) return NextResponse.json({ error: "failed to save generated deck" }, { status: 500 });
  return NextResponse.json({ deck_id: data.id, slug: data.slug, url: `${env.NEXT_PUBLIC_SITE_URL}/d/${data.slug}` });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/api/generate/route.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/api/generate/route.ts src/app/api/generate/route.test.ts && git commit -m "Add deck generation API"`

## Task 7: Upload Page UI

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/upload/upload-form.tsx`
- Test: `src/app/upload/upload-form.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/app/upload/upload-form.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadForm } from "./upload-form";

describe("UploadForm", () => {
  it("submits pasted markdown and selected theme to the generate API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ slug: "proposal" }) })));
    const replace = vi.fn();

    render(<UploadForm navigate={(path) => replace(path)} />);
    fireEvent.change(screen.getByLabelText("Markdown"), { target: { value: "# Proposal" } });
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "modern" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate proposal" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/generate", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body))).toEqual({ markdown: "# Proposal", theme: "modern" });
    expect(replace).toHaveBeenCalledWith("/preview/proposal");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/upload/upload-form.test.tsx`

Expected: FAIL with `Cannot find module './upload-form' imported from 'src/app/upload/upload-form.test.tsx'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/upload/upload-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ThemeName } from "@/lib/markdeck/types";

export function UploadForm({ navigate }: { navigate?: (path: string) => void }) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState("");
  const [theme, setTheme] = useState<ThemeName>("editorial");
  const [images, setImages] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  async function submit() {
    setIsGenerating(true);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, theme }),
    });
    setIsGenerating(false);
    if (!response.ok) throw new Error("generation failed");
    const result = (await response.json()) as { slug: string };
    (navigate ?? router.push)(`/preview/${result.slug}`);
  }

  return (
    <main className="upload-shell">
      <label>
        Markdown
        <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={16} />
      </label>
      <label>
        Upload .md file
        <input
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setMarkdown(await file.text());
          }}
        />
      </label>
      <label>
        Images
        <input type="file" accept="image/*" multiple onChange={(event) => setImages(Array.from(event.target.files ?? []))} />
      </label>
      <p>{images.length} image files ready for drag-in editing.</p>
      <label>
        Theme
        <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeName)}>
          <option value="editorial">editorial</option>
          <option value="bold">bold</option>
          <option value="modern">modern</option>
          <option value="minimal">minimal</option>
        </select>
      </label>
      <button type="button" onClick={submit} disabled={isGenerating || markdown.trim().length === 0}>
        {isGenerating ? "Generating" : "Generate proposal"}
      </button>
    </main>
  );
}
```

```tsx
// src/app/page.tsx
import { UploadForm } from "./upload/upload-form";

export default function HomePage() {
  return <UploadForm />;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/upload/upload-form.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/page.tsx src/app/upload/upload-form.tsx src/app/upload/upload-form.test.tsx && git commit -m "Add upload page UI"`

## Task 8: Preview Page And Inline Editing

**Files:**
- Create: `src/app/preview/[slug]/page.tsx`
- Create: `src/app/preview/[slug]/preview-editor.tsx`
- Create: `src/app/api/decks/[id]/save/route.ts`
- Create: `src/app/api/decks/[id]/assets/route.ts`
- Test: `src/app/preview/[slug]/preview-editor.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// preview-editor.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewEditor } from "./preview-editor";

describe("PreviewEditor", () => {
  it("toggles edit mode, saves, and exports", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:deck"), revokeObjectURL: vi.fn() });

    render(<PreviewEditor deckId="deck-1" initialHtml="<html><body><h1 data-editable='text'>Plan</h1></body></html>" />);

    // iframe is rendered
    const iframe = screen.getByTitle("Deck preview") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("srcDoc")).toContain("Plan");

    // toggle edit mode
    fireEvent.click(screen.getByRole("switch", { name: "Edit mode" }));

    // save
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/decks/deck-1/save",
        expect.objectContaining({ method: "POST" })
      )
    );

    // export
    fireEvent.click(screen.getByRole("button", { name: "Export HTML" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/preview/[slug]/preview-editor.test.tsx`

Expected: FAIL with `Cannot find module './preview-editor' imported from 'src/app/preview/[slug]/preview-editor.test.tsx'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/preview/[slug]/preview-editor.tsx
"use client";
import { useRef, useState } from "react";

export function PreviewEditor({ deckId, initialHtml }: { deckId: string; initialHtml: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editMode, setEditMode] = useState(false);

  function setEditable(next: boolean) {
    setEditMode(next);
    iframeRef.current?.contentDocument
      ?.querySelectorAll<HTMLElement>("[data-editable='text']")
      .forEach((node) => { node.contentEditable = String(next); });
  }

  async function save() {
    const html = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
    await fetch(`/api/decks/${deckId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
  }

  function exportHtml() {
    const html = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "markdeck.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onDrop(event: React.DragEvent<HTMLIFrameElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const doc = iframeRef.current?.contentDocument;
    const image = doc?.querySelector<HTMLImageElement>("img:hover") ?? null;
    if (!file || !image) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/decks/${deckId}/assets`, { method: "POST", body: formData });
    const result = (await response.json()) as { storage_url: string };
    image.src = result.storage_url;
  }

  return (
    <section>
      <div className="preview-toolbar">
        <label>
          Edit mode
          <input role="switch" aria-label="Edit mode" type="checkbox" checked={editMode} onChange={(e) => setEditable(e.target.checked)} />
        </label>
        <button type="button" onClick={save}>Save</button>
        <button type="button" onClick={exportHtml}>Export HTML</button>
      </div>
      <iframe
        ref={iframeRef}
        title="Deck preview"
        srcDoc={initialHtml}
        sandbox="allow-same-origin allow-popups"
        style={{ border: 0, display: "block", width: "100%", height: "calc(100vh - 48px)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      />
    </section>
  );
}
```

```tsx
// src/app/preview/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PreviewEditor } from "./preview-editor";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("decks").select("id, html_snapshot").eq("slug", slug).single();
  if (!data) notFound();
  return <PreviewEditor deckId={data.id} initialHtml={data.html_snapshot} />;
}
```

```ts
// src/app/api/decks/[id]/save/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { html } = (await request.json()) as { html?: string };
  if (!html) return NextResponse.json({ error: "html is required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

  const { error } = await supabase.from("decks").update({ html_snapshot: html }).eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: "failed to save deck" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

```ts
// src/app/api/decks/[id]/assets/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const path = `${id}/${crypto.randomUUID()}-${file.name}`;
  const upload = await supabase.storage.from("deck-assets").upload(path, file, { upsert: false });
  if (upload.error) return NextResponse.json({ error: "failed to upload asset" }, { status: 500 });
  const { data } = supabase.storage.from("deck-assets").getPublicUrl(path);
  await supabase.from("deck_assets").insert({ deck_id: id, filename: file.name, storage_url: data.publicUrl });
  return NextResponse.json({ storage_url: data.publicUrl });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/preview/[slug]/preview-editor.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/preview/[slug]/page.tsx src/app/preview/[slug]/preview-editor.tsx src/app/preview/[slug]/preview-editor.test.tsx src/app/api/decks/[id]/save/route.ts src/app/api/decks/[id]/assets/route.ts && git commit -m "Add preview inline editor"`

## Task 9: Hosted Link Page

**Files:**
- Create: `src/app/d/[slug]/page.tsx`
- Test: `src/app/d/[slug]/page.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/app/d/[slug]/page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HostedDeckPage from "./page";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { title: "Plan", html_snapshot: "<main>Hosted deck</main>" } }) }) }) }),
  }),
}));

describe("HostedDeckPage", () => {
  it("renders the stored deck snapshot", async () => {
    render(await HostedDeckPage({ params: Promise.resolve({ slug: "plan" }) }));
    expect(screen.getByTitle("Plan")).toHaveAttribute("srcDoc", "<main>Hosted deck</main>");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/d/[slug]/page.test.tsx`

Expected: FAIL with `Cannot find module './page' imported from 'src/app/d/[slug]/page.test.tsx'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/d/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HostedDeckPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("decks").select("title, html_snapshot").eq("slug", slug).single();
  if (!data) notFound();

  return (
    <iframe
      title={data.title}
      srcDoc={data.html_snapshot}
      sandbox="allow-same-origin allow-popups"
      style={{ border: 0, display: "block", width: "100vw", height: "100vh" }}
    />
  );
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/d/[slug]/page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/d/[slug]/page.tsx src/app/d/[slug]/page.test.tsx && git commit -m "Add hosted deck page"`

## Task 10: Supabase Auth

**Files:**
- Create: `src/app/auth/page.tsx`
- Create: `src/app/auth/auth-form.tsx`
- Create: `src/app/auth/actions.ts`
- Create: `src/middleware.ts`
- Test: `src/app/auth/auth-form.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/app/auth/auth-form.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("submits email and password to sign in action", () => {
    const signIn = vi.fn();
    render(<AuthForm signInAction={signIn} signUpAction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/auth/auth-form.test.tsx`

Expected: FAIL with `Cannot find module './auth-form' imported from 'src/app/auth/auth-form.test.tsx'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/auth/auth-form.tsx
"use client";

export function AuthForm({
  signInAction,
  signUpAction,
}: {
  signInAction: (formData: FormData) => void;
  signUpAction: (formData: FormData) => void;
}) {
  return (
    <form>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} />
      </label>
      <button formAction={signInAction}>Sign in</button>
      <button formAction={signUpAction}>Sign up</button>
    </form>
  );
}
```

```ts
// src/app/auth/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/auth?error=signin");
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/auth?error=signup");
  if (data.user) await supabase.from("users").upsert({ id: data.user.id, email });
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
```

```tsx
// src/app/auth/page.tsx
import { AuthForm } from "./auth-form";
import { signInAction, signUpAction } from "./actions";

export default function AuthPage() {
  return <AuthForm signInAction={signInAction} signUpAction={signUpAction} />;
}
```

```ts
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const protectedPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/api/");
  if (protectedPath && !data.user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/auth/auth-form.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/auth/page.tsx src/app/auth/auth-form.tsx src/app/auth/actions.ts src/app/auth/auth-form.test.tsx src/middleware.ts && git commit -m "Add Supabase authentication"`

## Task 11: User Dashboard

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/deck-list.tsx`
- Create: `src/app/api/decks/[id]/route.ts`
- Test: `src/app/dashboard/deck-list.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/app/dashboard/deck-list.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckList } from "./deck-list";

describe("DeckList", () => {
  it("lists decks and deletes one", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DeckList decks={[{ id: "deck-1", slug: "plan", title: "Plan", theme: "editorial", created_at: "2026-06-10T00:00:00Z" }]} />);

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("editorial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Plan" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/decks/deck-1", { method: "DELETE" }));
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- src/app/dashboard/deck-list.test.tsx`

Expected: FAIL with `Cannot find module './deck-list' imported from 'src/app/dashboard/deck-list.test.tsx'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/dashboard/deck-list.tsx
"use client";

import { useState } from "react";
import type { ThemeName } from "@/lib/markdeck/types";

export interface DashboardDeck {
  id: string;
  slug: string;
  title: string;
  theme: ThemeName;
  created_at: string;
}

export function DeckList({ decks }: { decks: DashboardDeck[] }) {
  const [items, setItems] = useState(decks);

  async function remove(deck: DashboardDeck) {
    const response = await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== deck.id));
  }

  return (
    <main>
      <h1>Your decks</h1>
      <ul>
        {items.map((deck) => (
          <li key={deck.id}>
            <a href={`/preview/${deck.slug}`}>{deck.title}</a>
            <span>{deck.theme}</span>
            <time dateTime={deck.created_at}>{new Date(deck.created_at).toLocaleDateString("en-US")}</time>
            <button type="button" aria-label={`Delete ${deck.title}`} onClick={() => remove(deck)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

```tsx
// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "../auth/actions";
import { DeckList, type DashboardDeck } from "./deck-list";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth");

  const { data } = await supabase
    .from("decks")
    .select("id, slug, title, theme, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <form action={signOutAction}><button>Sign out</button></form>
      <DeckList decks={(data ?? []) as DashboardDeck[]} />
    </>
  );
}
```

```ts
// src/app/api/decks/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

  const { error } = await supabase.from("decks").delete().eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: "failed to delete deck" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- src/app/dashboard/deck-list.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/app/dashboard/page.tsx src/app/dashboard/deck-list.tsx src/app/dashboard/deck-list.test.tsx src/app/api/decks/[id]/route.ts && git commit -m "Add user dashboard"`

## Task 12: Vercel Deployment Config

**Files:**
- Create: `vercel.json`
- Create: `docs/deployment.md`
- Test: `vercel-config.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// vercel-config.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel deployment config", () => {
  it("defines build command and documents required environment variables", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    const docs = readFileSync("docs/deployment.md", "utf8");

    expect(config.buildCommand).toBe("npm run build");
    expect(config.framework).toBe("nextjs");
    expect(docs).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(docs).toContain("DEEPSEEK_API_KEY");
    expect(docs).toContain("markdeck.pro");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- vercel-config.test.ts`

Expected: FAIL with `ENOENT: no such file or directory, open 'vercel.json'`

- [ ] **Step 3: Write minimal implementation**

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "cleanUrls": true
}
```

```md
<!-- docs/deployment.md -->
# Markdeck Deployment

Production domain: markdeck.pro

Required Vercel environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DEEPSEEK_API_KEY
- NEXT_PUBLIC_SITE_URL=https://markdeck.pro

Build checks:

1. Run `npm test`.
2. Run `npm run build`.
3. Confirm Supabase migrations are applied.
4. Confirm Supabase Storage bucket `deck-assets` exists and is public.
5. Confirm markdeck.pro is assigned to the Vercel production deployment.
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test -- vercel-config.test.ts && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add vercel.json docs/deployment.md vercel-config.test.ts && git commit -m "Add Vercel deployment config"`

## Self-Check

- Spec coverage: all design requirements are represented across the 12 tasks: upload or paste input, separate image upload path, four themes, rule-based parsing, DeepSeek structural layout selection, template HTML rendering, Supabase persistence, preview editing, drag-drop image replacement, HTML export, hosted links at `/d/:slug`, auth, dashboard, delete flow, and Vercel deployment.
- Placeholder scan: zero placeholder markers are intentionally used in code blocks or prose.
- Type consistency: `SlideType`, `ThemeName`, `ParsedSlide`, `DeckImage`, and `LayoutSelection` are defined once in `src/lib/markdeck/types.ts` and reused by parser, DeepSeek selector, renderer, API route, upload UI, and dashboard code.
- App Router consistency: all route files use `src/app/**/page.tsx` or `src/app/api/**/route.ts`, and dynamic route params use the Next.js 15 `Promise<{ ... }>` shape.
- DeepSeek privacy rule: the selector sends only `id`, `type`, `bodyLineCount`, and `imageCount`; titles and body content stay out of the model request.
