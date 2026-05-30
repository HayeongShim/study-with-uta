import { NextRequest, NextResponse } from "next/server";
import { AUDIO_BUCKET, createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdmin();
  const { data: song } = await supabase.from("songs").select("audio_path").eq("id", id).maybeSingle();

  if (song?.audio_path) {
    await supabase.storage.from(AUDIO_BUCKET).remove([song.audio_path]);
  }

  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true });
}
