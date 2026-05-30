import { NextRequest, NextResponse } from "next/server";
import { lineToRow, rowsToSong, songToRow } from "@/lib/cloud-mapping";
import { AUDIO_BUCKET, createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";
import type { Song } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, songs: [] }, { status: 503 });
  }

  const supabase = createSupabaseAdmin();
  const { data: songs, error: songError } = await supabase
    .from("songs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (songError) {
    return NextResponse.json({ error: songError.message }, { status: 500 });
  }

  const { data: lines, error: lineError } = await supabase
    .from("lyric_lines")
    .select("*")
    .order("line_index", { ascending: true });

  if (lineError) {
    return NextResponse.json({ error: lineError.message }, { status: 500 });
  }

  const songsWithAudio = await Promise.all(
    (songs ?? []).map(async (song) => {
      let audioUrl = "";
      if (song.audio_path) {
        const { data } = await supabase.storage
          .from(AUDIO_BUCKET)
          .createSignedUrl(song.audio_path, 60 * 60 * 24);
        audioUrl = data?.signedUrl ?? "";
      }

      return rowsToSong(
        song,
        (lines ?? []).filter((line) => line.song_id === song.id),
        audioUrl,
      );
    }),
  );

  return NextResponse.json({ configured: true, songs: songsWithAudio });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, error: "Supabase is not configured." }, { status: 503 });
  }

  const formData = await request.formData();
  const rawSong = formData.get("song");
  if (typeof rawSong !== "string") {
    return NextResponse.json({ error: "Missing song payload." }, { status: 400 });
  }

  const song = JSON.parse(rawSong) as Song;
  const audio = formData.get("audio");
  const supabase = createSupabaseAdmin();
  let audioPath = song.audioPath ?? null;

  if (audio instanceof File) {
    audioPath = `${song.id}/${safeStorageName(song.audioName || audio.name)}`;
    const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, audio, {
      contentType: audio.type || "audio/mpeg",
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { error: songError } = await supabase.from("songs").upsert(songToRow(song, audioPath), {
    onConflict: "id",
  });

  if (songError) {
    return NextResponse.json({ error: songError.message }, { status: 500 });
  }

  const { error: deleteLineError } = await supabase.from("lyric_lines").delete().eq("song_id", song.id);
  if (deleteLineError) {
    return NextResponse.json({ error: deleteLineError.message }, { status: 500 });
  }

  if (song.lines.length > 0) {
    const { error: lineError } = await supabase
      .from("lyric_lines")
      .insert(song.lines.map((line) => lineToRow(song.id, line)));

    if (lineError) {
      return NextResponse.json({ error: lineError.message }, { status: 500 });
    }
  }

  let audioUrl = song.audioUrl;
  if (audioPath) {
    const { data } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(audioPath, 60 * 60 * 24);
    audioUrl = data?.signedUrl ?? audioUrl;
  }

  return NextResponse.json({
    configured: true,
    song: {
      ...song,
      audioPath: audioPath ?? undefined,
      audioUrl,
    },
  });
}

function safeStorageName(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-.,'!*&$@=;:+?() ]/g, "_");
}
