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
