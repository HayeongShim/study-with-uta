"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnalyzeResponse, LyricLine, Song, VocabularyItem } from "@/lib/types";
import { loadSongs, loadVocabulary, saveSongs, saveVocabulary } from "@/lib/storage";

type View = "setup" | "sync" | "study" | "words";

const emptySongForm = {
  title: "",
  artist: "",
  rawLyrics: "",
  audioName: "",
  audioUrl: "",
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [view, setView] = useState<View>("setup");
  const [form, setForm] = useState(emptySongForm);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState("");
  const [display, setDisplay] = useState({
    original: true,
    reading: true,
    translation: true,
  });

  useEffect(() => {
    const storedSongs = loadSongs();
    const storedVocabulary = loadVocabulary();
    setSongs(storedSongs);
    setVocabulary(storedVocabulary);

    if (storedSongs[0]) {
      setSelectedSongId(storedSongs[0].id);
      setSelectedLineId(storedSongs[0].lines[0]?.id ?? "");
    }
  }, []);

  useEffect(() => {
    saveSongs(songs);
  }, [songs]);

  useEffect(() => {
    saveVocabulary(vocabulary);
  }, [vocabulary]);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedSongId) ?? null,
    [selectedSongId, songs],
  );

  const activeLine = useMemo(() => {
    if (!selectedSong) return null;
    return getActiveLine(selectedSong.lines, currentTime);
  }, [currentTime, selectedSong]);

  const archivedIds = useMemo(() => {
    return new Set(vocabulary.map((item) => `${item.sourceSongId}:${item.surface}`));
  }, [vocabulary]);

  async function handleAudioFile(file: File | null) {
    if (!file) return;

    const audioUrl = await fileToDataUrl(file);
    setForm((previous) => ({
      ...previous,
      audioName: file.name,
      audioUrl,
    }));
  }

  function createSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const lyricTexts = splitLyrics(form.rawLyrics);
    if (!form.title.trim() || !form.rawLyrics.trim() || !form.audioUrl || lyricTexts.length === 0) {
      setNotice("곡 제목, 오디오 파일, 가사를 모두 넣어줘.");
      return;
    }

    const now = new Date().toISOString();
    const song: Song = {
      id: createId("song"),
      title: form.title.trim(),
      artist: form.artist.trim(),
      audioName: form.audioName,
      audioUrl: form.audioUrl,
      rawLyrics: form.rawLyrics,
      lines: lyricTexts.map((text, index) => ({
        id: createId("line"),
        index,
        text,
        reading: "",
        translation: "",
        startTime: null,
        vocabulary: [],
      })),
      createdAt: now,
      updatedAt: now,
    };

    setSongs((previous) => [song, ...previous]);
    setSelectedSongId(song.id);
    setSelectedLineId(song.lines[0]?.id ?? "");
    setForm(emptySongForm);
    setView("sync");
    setNotice("곡을 추가했어. 이제 AI 분석을 실행하거나 바로 싱크를 찍을 수 있어.");
  }

  async function analyzeSelectedSong() {
    if (!selectedSong) return;
    setIsAnalyzing(true);
    setNotice("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: selectedSong.title,
          artist: selectedSong.artist,
          lyrics: selectedSong.rawLyrics,
        }),
      });

      if (!response.ok) {
        throw new Error("analysis failed");
      }

      const data = (await response.json()) as AnalyzeResponse;
      const analyzedLines = mergeAnalysis(selectedSong.lines, data);

      updateSong(selectedSong.id, {
        lines: analyzedLines,
        updatedAt: new Date().toISOString(),
      });
      setNotice("분석이 완료됐어.");
    } catch {
      setNotice("분석에 실패했어. OPENAI_API_KEY 설정이나 네트워크 상태를 확인해줘.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateSong(songId: string, patch: Partial<Song>) {
    setSongs((previous) =>
      previous.map((song) => (song.id === songId ? { ...song, ...patch } : song)),
    );
  }

  function setLineTime(lineId: string, time: number) {
    if (!selectedSong) return;

    updateSong(selectedSong.id, {
      lines: selectedSong.lines.map((line) =>
        line.id === lineId ? { ...line, startTime: roundTime(time) } : line,
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  function updateLineText(lineId: string, field: "reading" | "translation", value: string) {
    if (!selectedSong) return;

    updateSong(selectedSong.id, {
      lines: selectedSong.lines.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line,
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  function archiveWord(word: VocabularyItem, line: LyricLine) {
    if (!selectedSong) return;

    const alreadySaved = vocabulary.some(
      (item) => item.sourceSongId === selectedSong.id && item.surface === word.surface,
    );
    if (alreadySaved) return;

    setVocabulary((previous) => [
      {
        ...word,
        id: createId("word"),
        sourceSongId: selectedSong.id,
        sourceLineId: line.id,
        sourceLineText: line.text,
        archivedAt: new Date().toISOString(),
        learned: false,
      },
      ...previous,
    ]);
  }

  function toggleLearned(wordId: string) {
    setVocabulary((previous) =>
      previous.map((word) => (word.id === wordId ? { ...word, learned: !word.learned } : word)),
    );
  }

  function deleteSong(songId: string) {
    const nextSongs = songs.filter((song) => song.id !== songId);
    setSongs(nextSongs);
    setVocabulary((previous) => previous.filter((word) => word.sourceSongId !== songId));

    if (selectedSongId === songId) {
      setSelectedSongId(nextSongs[0]?.id ?? "");
      setSelectedLineId(nextSongs[0]?.lines[0]?.id ?? "");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Study With Uta</p>
          <h1>일본어 음악 학습 플레이어</h1>
        </div>
        <div className="song-picker">
          <select
            aria-label="곡 선택"
            value={selectedSongId}
            onChange={(event) => {
              const nextSong = songs.find((song) => song.id === event.target.value);
              setSelectedSongId(event.target.value);
              setSelectedLineId(nextSong?.lines[0]?.id ?? "");
            }}
          >
            <option value="">곡 선택</option>
            {songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      <nav className="tabs" aria-label="작업 보기">
        {[
          ["setup", "등록"],
          ["sync", "싱크"],
          ["study", "공부"],
          ["words", "단어장"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={view === value ? "active" : ""}
            type="button"
            onClick={() => setView(value as View)}
          >
            {label}
          </button>
        ))}
      </nav>

      {notice ? <p className="notice">{notice}</p> : null}

      {view === "setup" ? (
        <section className="workspace two-column">
          <form className="panel" onSubmit={createSong}>
            <div className="panel-title">
              <h2>곡 등록</h2>
              <span>{songs.length}곡</span>
            </div>

            <label>
              곡 제목
              <input
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="예: 春を告げる"
              />
            </label>

            <label>
              아티스트
              <input
                value={form.artist}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, artist: event.target.value }))
                }
                placeholder="예: yama"
              />
            </label>

            <label>
              오디오 파일
              <input accept="audio/*" type="file" onChange={(event) => handleAudioFile(event.target.files?.[0] ?? null)} />
            </label>
            {form.audioName ? <p className="file-chip">{form.audioName}</p> : null}

            <label>
              전체 가사
              <textarea
                value={form.rawLyrics}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, rawLyrics: event.target.value }))
                }
                placeholder="일본어 가사를 줄 단위로 붙여넣기"
                rows={13}
              />
            </label>

            <button className="primary" type="submit">
              곡 추가
            </button>
          </form>

          <section className="panel">
            <div className="panel-title">
              <h2>라이브러리</h2>
              <span>local</span>
            </div>
            <div className="song-list">
              {songs.length === 0 ? <p className="empty">아직 등록된 곡이 없어.</p> : null}
              {songs.map((song) => (
                <article className="song-row" key={song.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSongId(song.id);
                      setSelectedLineId(song.lines[0]?.id ?? "");
                      setView("study");
                    }}
                  >
                    <strong>{song.title}</strong>
                    <span>{song.artist || "Unknown artist"}</span>
                  </button>
                  <button className="ghost danger" type="button" onClick={() => deleteSong(song.id)}>
                    삭제
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {selectedSong && view !== "setup" ? (
        <section className="player-band">
          <div>
            <h2>{selectedSong.title}</h2>
            <p>{selectedSong.artist || "Unknown artist"}</p>
          </div>
          <audio
            ref={audioRef}
            controls
            src={selectedSong.audioUrl}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          />
        </section>
      ) : null}

      {!selectedSong && view !== "setup" ? (
        <section className="workspace">
          <div className="panel">
            <h2>곡을 먼저 등록해줘.</h2>
          </div>
        </section>
      ) : null}

      {selectedSong && view === "sync" ? (
        <section className="workspace sync-grid">
          <div className="panel sync-tools">
            <div className="panel-title">
              <h2>싱크 에디터</h2>
              <span>{formatTime(currentTime)}</span>
            </div>
            <button
              className="primary"
              type="button"
              disabled={isAnalyzing}
              onClick={analyzeSelectedSong}
            >
              {isAnalyzing ? "분석 중" : "AI 분석 실행"}
            </button>
            <button
              type="button"
              disabled={!selectedLineId}
              onClick={() => setLineTime(selectedLineId, audioRef.current?.currentTime ?? currentTime)}
            >
              현재 시간 찍기
            </button>
            <p className="compact">
              선택한 줄에 재생 위치를 저장하고, 다음 줄을 고르면서 끝까지 맞추면 돼.
            </p>
          </div>

          <div className="lyrics-editor">
            {selectedSong.lines.map((line) => (
              <article
                className={[
                  "line-editor",
                  line.id === selectedLineId ? "selected" : "",
                  activeLine?.id === line.id ? "playing" : "",
                ].join(" ")}
                key={line.id}
              >
                <button type="button" onClick={() => setSelectedLineId(line.id)}>
                  <span>{line.startTime === null ? "--:--" : formatTime(line.startTime)}</span>
                  <strong>{line.text}</strong>
                </button>
                <div className="line-fields">
                  <input
                    aria-label="독음"
                    value={line.reading}
                    onChange={(event) => updateLineText(line.id, "reading", event.target.value)}
                    placeholder="독음"
                  />
                  <input
                    aria-label="번역"
                    value={line.translation}
                    onChange={(event) => updateLineText(line.id, "translation", event.target.value)}
                    placeholder="한국어 번역"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedSong && view === "study" ? (
        <section className="study-layout">
          <div className="display-controls">
            {[
              ["original", "원문"],
              ["reading", "독음"],
              ["translation", "번역"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  checked={display[key as keyof typeof display]}
                  type="checkbox"
                  onChange={(event) =>
                    setDisplay((previous) => ({
                      ...previous,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>

          <div className="study-lines">
            {selectedSong.lines.map((line) => (
              <article className={activeLine?.id === line.id ? "study-line active" : "study-line"} key={line.id}>
                {display.original ? <p className="jp">{line.text}</p> : null}
                {display.reading && line.reading ? <p className="reading">{line.reading}</p> : null}
                {display.translation && line.translation ? <p className="translation">{line.translation}</p> : null}
                {line.vocabulary.length > 0 ? (
                  <div className="word-chips">
                    {line.vocabulary.map((word) => {
                      const saved = archivedIds.has(`${selectedSong.id}:${word.surface}`);
                      return (
                        <button
                          className={saved ? "saved" : ""}
                          key={`${line.id}-${word.surface}`}
                          type="button"
                          onClick={() => archiveWord(word, line)}
                        >
                          {word.surface}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {view === "words" ? (
        <section className="workspace">
          <div className="vocab-grid">
            {vocabulary.length === 0 ? <p className="empty panel">아카이브한 단어가 아직 없어.</p> : null}
            {vocabulary.map((word) => (
              <article className={word.learned ? "word-card learned" : "word-card"} key={word.id}>
                <div>
                  <h2>{word.surface}</h2>
                  <p>{word.reading}</p>
                </div>
                <strong>{word.meaningKo}</strong>
                <p>{word.sourceLineText}</p>
                <button type="button" onClick={() => toggleLearned(word.id)}>
                  {word.learned ? "다시 보기" : "외움"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function splitLyrics(rawLyrics: string) {
  return rawLyrics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function mergeAnalysis(lines: LyricLine[], analysis: AnalyzeResponse): LyricLine[] {
  return lines.map((line, index) => {
    const analyzed = analysis.lines[index];
    if (!analyzed) return line;

    return {
      ...line,
      reading: analyzed.reading,
      translation: analyzed.translation,
      vocabulary: analyzed.vocabulary.map((word) => ({
        ...word,
        id: createId("word"),
      })),
    };
  });
}

function getActiveLine(lines: LyricLine[], currentTime: number) {
  const timedLines = lines
    .filter((line) => line.startTime !== null)
    .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));

  if (timedLines.length === 0) return null;

  let active = timedLines[0];
  for (const line of timedLines) {
    if ((line.startTime ?? 0) <= currentTime) {
      active = line;
    }
  }
  return active;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function roundTime(seconds: number) {
  return Math.round(seconds * 10) / 10;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
