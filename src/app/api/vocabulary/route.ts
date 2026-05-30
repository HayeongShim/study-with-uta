import { NextRequest, NextResponse } from "next/server";
import { rowToVocabulary, vocabularyToRow } from "@/lib/cloud-mapping";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import type { VocabularyItem } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, vocabulary: [] }, { status: 503 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocabulary_archive")
    .select("*")
    .order("archived_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    configured: true,
    vocabulary: (data ?? []).map(rowToVocabulary),
  });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  const payload = (await request.json()) as { vocabulary: VocabularyItem[] };
  const supabase = createSupabaseAdmin();

  const { error: deleteError } = await supabase
    .from("vocabulary_archive")
    .delete()
    .not("id", "is", null);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (payload.vocabulary.length > 0) {
    const { error } = await supabase
      .from("vocabulary_archive")
      .insert(payload.vocabulary.map(vocabularyToRow));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ configured: true });
}
