import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "unsupported file type — only PNG, JPEG, GIF, WebP allowed" }, { status: 415 });
  }
  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json({ error: "file must be under 5 MB" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const path = `${id}/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from("deck-assets").upload(path, file, { upsert: false });
  if (upload.error) return NextResponse.json({ error: "failed to upload asset" }, { status: 500 });
  const { data } = supabase.storage.from("deck-assets").getPublicUrl(path);
  await supabase.from("deck_assets").insert({ deck_id: id, filename: safeName, storage_url: data.publicUrl });
  return NextResponse.json({ storage_url: data.publicUrl });
}
