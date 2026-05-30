import type { Song, VocabularyItem } from "./types";

const SONGS_KEY = "study-with-uta:songs";
const VOCAB_KEY = "study-with-uta:vocabulary";

export function loadSongs(): Song[] {
  return readJson<Song[]>(SONGS_KEY, []).map(sanitizeSong);
}

export function saveSongs(songs: Song[]) {
  writeJson(SONGS_KEY, songs.map(sanitizeSong));
}

export function loadVocabulary(): VocabularyItem[] {
  return readJson<VocabularyItem[]>(VOCAB_KEY, []);
}

export function saveVocabulary(items: VocabularyItem[]) {
  writeJson(VOCAB_KEY, items);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage.`, error);
  }
}

function sanitizeSong(song: Song): Song {
  return {
    ...song,
    audioStorageKey: song.audioStorageKey || `${song.id}:audio`,
    audioUrl: "",
    lines: song.lines.map((line) => ({
      ...line,
      pronunciationKo: line.pronunciationKo ?? "",
    })),
  };
}
