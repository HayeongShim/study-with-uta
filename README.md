# study-with-uta

Personal Japanese music learning player.

## Local Development

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill the values you want to use.

```bash
cp .env.example .env.local
```

OpenAI is needed for real lyric analysis.

Supabase is optional. Without Supabase variables, the app keeps using local browser storage. With Supabase variables, songs, lyric analysis, timestamps, vocabulary, and audio files are synced through server API routes.

Set `APP_ACCESS_PASSWORD` to require a password before anyone can use the app. Set `APP_ACCESS_SECRET` to any long random value so the access cookie token is not derived from the password alone.

Required Supabase variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_AUDIO_BUCKET`

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it in client code.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `supabase/schema.sql`.
4. Add the Supabase environment variables to `.env.local` and to the deployment host.

The default audio bucket is `song-audio`.
