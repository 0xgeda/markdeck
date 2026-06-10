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
