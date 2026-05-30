export type VocabularyItem = {
  id: string;
  surface: string;
  reading: string;
  meaningKo: string;
  partOfSpeech?: string;
  sourceSongId?: string;
  sourceLineId?: string;
  sourceLineText?: string;
  archivedAt?: string;
  learned?: boolean;
};

export type LyricLine = {
  id: string;
  index: number;
  text: string;
  reading: string;
  pronunciationKo: string;
  translation: string;
  startTime: number | null;
  vocabulary: VocabularyItem[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  audioStorageKey: string;
  audioName: string;
  rawLyrics: string;
  lines: LyricLine[];
  createdAt: string;
  updatedAt: string;
};

export type AnalyzeResponse = {
  lines: Array<{
    text: string;
    reading: string;
    pronunciationKo: string;
    translation: string;
    vocabulary: Array<{
      surface: string;
      reading: string;
      meaningKo: string;
      partOfSpeech?: string;
    }>;
  }>;
};
