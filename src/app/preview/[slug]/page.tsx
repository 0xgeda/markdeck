import { notFound } from "next/navigation";
import { devStore } from "@/lib/dev-store";
import { PreviewEditor } from "./preview-editor";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const dev = devStore.get(slug);
  if (dev) {
    return <PreviewEditor deckId={dev.id} slug={slug} initialHtml={dev.html} />;
  }

  // Fallback: try Supabase (used once auth is wired up)
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("decks").select("id, html_snapshot").eq("slug", slug).single();
    if (data) return <PreviewEditor deckId={data.id} slug={slug} initialHtml={data.html_snapshot} />;
  } catch {
    // Supabase not configured — fall through to notFound
  }

  notFound();
}
