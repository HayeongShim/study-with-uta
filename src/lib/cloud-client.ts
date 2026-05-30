import type { Song, VocabularyItem } from "./types";

type SongsResponse = {
  configured: boolean;
  songs: Song[];
};

type SongResponse = {
  configured: boolean;
  song: Song;
};

type VocabularyResponse = {
  configured: boolean;
  vocabulary: VocabularyItem[];
};

export async function fetchCloudSongs(): Promise<Song[] | null> {
  const response = await fetch("/api/songs");
  if (response.status === 503) return null;
  if (!response.ok) throw new Error("Failed to load cloud songs.");

  const payload = (await response.json()) as SongsResponse;
  return payload.configured ? payload.songs : null;
}

export async function saveCloudSong(
  song: Song,
  audio?: Blob | null,
  audioName?: string,
): Promise<Song | null> {
  const formData = new FormData();
  formData.append("song", JSON.stringify({ ...song, audioUrl: "" }));

  if (audio) {
    formData.append("audio", audio, audioName || song.audioName || "audio.mp3");
  }

  const response = await fetch("/api/songs", {
    method: "POST",
    body: formData,
  });

  if (response.status === 503) return null;
  if (!response.ok) throw new Error("Failed to save cloud song.");

  const payload = (await response.json()) as SongResponse;
  return payload.configured ? payload.song : null;
}

export async function deleteCloudSong(songId: string) {
  const response = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
    method: "DELETE",
  });

  if (response.status === 503) return;
  if (!response.ok) throw new Error("Failed to delete cloud song.");
}

export async function fetchCloudVocabulary(): Promise<VocabularyItem[] | null> {
  const response = await fetch("/api/vocabulary");
  if (response.status === 503) return null;
  if (!response.ok) throw new Error("Failed to load cloud vocabulary.");

  const payload = (await response.json()) as VocabularyResponse;
  return payload.configured ? payload.vocabulary : null;
}

export async function saveCloudVocabulary(vocabulary: VocabularyItem[]) {
  const response = await fetch("/api/vocabulary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vocabulary }),
  });

  if (response.status === 503) return;
  if (!response.ok) throw new Error("Failed to save cloud vocabulary.");
}
