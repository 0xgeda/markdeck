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
