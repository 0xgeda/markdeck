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
