import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { devStore } from "@/lib/dev-store";
import { selectLayouts } from "@/lib/markdeck/layout-selector";
import { parseMarkdownToSlides } from "@/lib/markdeck/markdown-parser";
import { renderDeckHtml } from "@/lib/markdeck/theme-renderer";
import type { ThemeName } from "@/lib/markdeck/types";

const themes: ThemeName[] = ["editorial", "bold", "modern", "minimal"];
const MAX_MARKDOWN_LENGTH = 50_000;

function titleFromMarkdown(markdown: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Untitled proposal";
}

export async function POST(request: Request) {
  const body = (await request.json()) as { markdown?: string; theme?: ThemeName };
  if (
    typeof body.markdown !== "string" ||
    body.markdown.length === 0 ||
    body.markdown.length > MAX_MARKDOWN_LENGTH ||
    !body.theme ||
    !themes.includes(body.theme)
  ) {
    return NextResponse.json({ error: "markdown and a valid theme are required" }, { status: 400 });
  }

  const title = titleFromMarkdown(body.markdown);
  const slides = parseMarkdownToSlides(body.markdown);
  const layouts = await selectLayouts(slides, env.DEEPSEEK_API_KEY);
  const html = renderDeckHtml(slides, layouts, body.theme);
  const id = nanoid();
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`;

  devStore.set(slug, { id, html, title });

  return NextResponse.json({ deck_id: id, slug, url: `${env.NEXT_PUBLIC_SITE_URL}/d/${slug}` });
}
