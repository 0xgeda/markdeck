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
