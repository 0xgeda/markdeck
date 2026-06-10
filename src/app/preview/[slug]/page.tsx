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
