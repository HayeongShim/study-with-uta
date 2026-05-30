create table if not exists public.songs (
  id text primary key,
  title text not null,
  artist text,
  audio_path text,
  audio_name text,
  raw_lyrics text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.lyric_lines (
  id text primary key,
  song_id text not null references public.songs(id) on delete cascade,
  line_index integer not null,
  text text not null,
  reading text,
  pronunciation_ko text,
  translation text,
  start_time numeric,
  vocabulary jsonb not null default '[]'::jsonb
);

create index if not exists lyric_lines_song_id_index_idx
  on public.lyric_lines(song_id, line_index);

create table if not exists public.vocabulary_archive (
  id text primary key,
  surface text not null,
  reading text not null,
  meaning_ko text not null,
  part_of_speech text,
  source_song_id text,
  source_line_id text,
  source_line_text text,
  archived_at timestamptz,
  learned boolean not null default false
);

create index if not exists vocabulary_archive_archived_at_idx
  on public.vocabulary_archive(archived_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-audio',
  'song-audio',
  false,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
    'audio/x-m4a'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
