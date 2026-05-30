# Study With Uta Plan

## Goal

Build a personal Japanese music learning web app.

The app lets me register a song, paste full Japanese lyrics, run a one-time AI analysis, sync lyric lines to playback time on desktop, and then study mainly from a phone with highlighted lyrics and an archived vocabulary list.

## Product Principles

- Personal-first: no user accounts or login flow.
- Private by default: the hosted URL should be treated as personal and not shared publicly.
- Analysis once, study many times: AI output is generated during song setup, then reused.
- Desktop for authoring: upload, AI analysis, and timing sync are optimized for PC.
- Phone for learning: the study player and vocabulary archive are optimized for mobile.
- Human-controlled sync: timing is edited manually while listening instead of relying on fragile automatic lyric alignment.

## MVP Scope

1. Song registration
   - Add song title and artist.
   - Upload/select an audio file.
   - Paste full Japanese lyrics.
   - Split lyrics into editable lines.

2. AI analysis
   - Send lyrics to OpenAI.
   - Generate structured analysis per line:
     - Original Japanese line.
     - Reading/kana, while preserving English as English.
     - Korean pronunciation guide, while preserving English as English.
     - Korean translation.
     - Vocabulary candidates.
   - Store the analysis result with the song.

3. Sync editor
   - Play the song on desktop.
   - Assign the current playback time to the selected lyric line.
   - Edit timestamps manually.
   - Use timestamps to determine the active lyric line.

4. Mobile study player
   - Show current highlighted lyric line.
   - Toggle original, reading, Korean pronunciation, and Korean translation.
   - Tap vocabulary words to archive them.
   - Keep playback controls usable on mobile.

5. Vocabulary archive
   - Save words from analyzed lyrics.
   - Show word, reading, meaning, source song, and source lyric line.
   - Mark words as learned later.

## Initial Technical Direction

- App framework: Next.js with App Router.
- Language: TypeScript.
- Styling: plain CSS modules/global CSS at first.
- AI: OpenAI API through a server route.
- Storage v1: browser local storage for fast MVP validation.
- Storage v2: Supabase Postgres + Storage for PC-to-phone persistence.
- Hosting: Vercel.

## Important Deployment Note

Local storage is enough for the first local prototype, but it does not synchronize between PC and phone. Supabase persistence is used so both devices can see the same songs, analysis, sync data, and archived words after environment variables and schema are configured.

Because there is no login, the deployed app should be considered single-user and private-by-URL. If the URL may be exposed, add a simple deployment access key or Vercel-level protection.

## Data Model Draft

### Song

- id
- title
- artist
- audioUrl
- audioPath
- rawLyrics
- createdAt
- updatedAt
- lines

### Lyric Line

- id
- index
- text
- reading
- pronunciationKo
- translation
- startTime
- vocabulary

### Vocabulary Item

- id
- surface
- reading
- meaningKo
- partOfSpeech
- sourceSongId
- sourceLineId
- sourceLineText
- archivedAt
- learned

## Build Phases

### Phase 1: Local Prototype

- Create Next.js app shell.
- Add song setup screen.
- Add mockable AI analysis route.
- Add sync editor.
- Add mobile-first study player.
- Add local vocabulary archive.

### Phase 2: Real AI + Better Editing

- Connect OpenAI structured JSON output.
- Add better error handling and retry states.
- Allow line and vocabulary edits after analysis.
- Export/import project data as JSON for backup.

### Phase 3: Hosted Persistence

- Add Supabase schema.
- Store audio files in Supabase Storage.
- Store songs, lines, and vocabulary in Postgres.
- Migrate local storage prototype data to Supabase.

### Phase 4: Study Features

- Add review queue.
- Add learned/hidden states.
- Add search and filters for vocabulary.
- Add romaji/kana display preferences if useful.
