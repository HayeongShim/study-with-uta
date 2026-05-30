import type { LyricLine, Song, VocabularyItem } from "./types";

type SongRow = {
  id: string;
  title: string;
  artist: string | null;
  audio_path: string | null;
  audio_name: string | null;
  raw_lyrics: string;
  created_at: string;
  updated_at: string;
};

type LyricLineRow = {
  id: string;
  song_id: string;
  line_index: number;
  text: string;
  reading: string | null;
  pronunciation_ko: string | null;
  translation: string | null;
  start_time: number | null;
  vocabulary: VocabularyItem[] | null;
};

type VocabularyRow = {
  id: string;
  surface: string;
  reading: string;
  meaning_ko: string;
  part_of_speech: string | null;
  source_song_id: string | null;
  source_line_id: string | null;
  source_line_text: string | null;
  archived_at: string | null;
  learned: boolean;
};

export function songToRow(song: Song, audioPath: string | null): SongRow {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist || null,
    audio_path: audioPath,
    audio_name: song.audioName || null,
    raw_lyrics: song.rawLyrics,
    created_at: song.createdAt,
    updated_at: song.updatedAt,
  };
}

export function lineToRow(songId: string, line: LyricLine): LyricLineRow {
  return {
    id: line.id,
    song_id: songId,
    line_index: line.index,
    text: line.text,
    reading: line.reading || null,
    pronunciation_ko: line.pronunciationKo || null,
    translation: line.translation || null,
    start_time: line.startTime,
    vocabulary: line.vocabulary,
  };
}

export function rowsToSong(song: SongRow, lines: LyricLineRow[], audioUrl: string): Song {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist ?? "",
    audioName: song.audio_name ?? "",
    audioPath: song.audio_path ?? undefined,
    audioStorageKey: `${song.id}:audio`,
    audioUrl,
    rawLyrics: song.raw_lyrics,
    createdAt: song.created_at,
    updatedAt: song.updated_at,
    lines: lines
      .sort((a, b) => a.line_index - b.line_index)
      .map((line) => ({
        id: line.id,
        index: line.line_index,
        text: line.text,
        reading: line.reading ?? "",
        pronunciationKo: line.pronunciation_ko ?? "",
        translation: line.translation ?? "",
        startTime: line.start_time,
        vocabulary: line.vocabulary ?? [],
      })),
  };
}

export function vocabularyToRow(item: VocabularyItem): VocabularyRow {
  return {
    id: item.id,
    surface: item.surface,
    reading: item.reading,
    meaning_ko: item.meaningKo,
    part_of_speech: item.partOfSpeech ?? null,
    source_song_id: item.sourceSongId ?? null,
    source_line_id: item.sourceLineId ?? null,
    source_line_text: item.sourceLineText ?? null,
    archived_at: item.archivedAt ?? null,
    learned: item.learned ?? false,
  };
}

export function rowToVocabulary(row: VocabularyRow): VocabularyItem {
  return {
    id: row.id,
    surface: row.surface,
    reading: row.reading,
    meaningKo: row.meaning_ko,
    partOfSpeech: row.part_of_speech ?? undefined,
    sourceSongId: row.source_song_id ?? undefined,
    sourceLineId: row.source_line_id ?? undefined,
    sourceLineText: row.source_line_text ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    learned: row.learned,
  };
}
