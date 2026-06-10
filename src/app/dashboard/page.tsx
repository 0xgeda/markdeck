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
