import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_HTML_LENGTH = 512_000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { html } = (await request.json()) as { html?: string };
  if (!html || typeof html !== "string" || html.length > MAX_HTML_LENGTH) {
    return NextResponse.json({ error: "html is required and must be under 512 KB" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

  const { error } = await supabase.from("decks").update({ html_snapshot: html }).eq("id", id).eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: "failed to save deck" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
