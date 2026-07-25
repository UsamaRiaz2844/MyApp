# CLAUDE.md — project guide for Pronto

Read this first. It's the context any Claude Code session (desktop, web, or phone) needs
to work on this project correctly.

## What this is
**Pronto** — a private, one-to-one real-time chat PWA for two people. Signature feature: a
"late-reply timer" that tracks how long each person takes to reply once a chat opens with
"hi/hi" and closes with "bye/bye".

## Stack & architecture (important)
- **Frontend:** React + Vite + TypeScript + Tailwind PWA. Lives in `client/`.
- **Backend:** **Supabase** (Postgres + Realtime + Auth). There is **no custom server**.
- **Hosting:** GitHub **Pages** serves the built frontend at `https://usamariaz2844.github.io/MyApp/`.
- The `server/` folder is **LEGACY/UNUSED** (old Express+Mongo+Socket.IO). Do not touch it or
  bring it back; Supabase replaced it.

### How the data layer works (key pattern)
The UI was written for a REST + Socket.IO backend, and that contract was preserved on top of
Supabase so the pages barely changed:
- `client/src/api/client.ts` — the `api.*` methods, implemented with Supabase queries.
- `client/src/context/SocketContext.tsx` — a **socket-shim** (class `SupabaseSocket`) exposing
  `.emit/.on/.off`. It maps app events to Supabase: **postgres_changes** for messages / seen /
  reactions / deletes / late-stats, **Presence** for online + "we're both here", **Broadcast**
  (per-conversation channel `conv:<id>`) for typing preview / nudge / effects.
  Events it fires: `message:new`, `message:seen`, `typing`, `presence:update`,
  `late-stats:update`, `copresence`, `nudge`, `effect`, `reaction:update`, `message:deleted`,
  `conversation:updated`, `conversation:deleted`.
- `client/src/lib/supabase.ts` — client + username→email mapping (`<username>@pronto.app`;
  **"Confirm email" must be OFF** in Supabase Auth).
- Row shape → UI shape mapping lives in `client/src/lib/mappers.ts`.

### Routing / hosting specifics
- **HashRouter** (not BrowserRouter) — avoids GitHub Pages deep-link 404s.
- Vite `base` is **`/MyApp/`** in `client/vite.config.ts` (matches the Pages project path).

## Deploy flow (automatic)
- Push to `main` → GitHub Action `.github/workflows/deploy.yml` builds `client/` and publishes
  to Pages. A failing build does NOT update the live site (safe).
- Build needs repo secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (already set).
- The installed Android APK is a thin TWA shell that loads the live site, so **frontend changes
  appear on the phone without rebuilding the APK**. Only rebuild the APK for name/icon/package/URL
  changes. Asset links for full-screen are served from a **separate repo** `usamariaz2844.github.io`
  (`.well-known/assetlinks.json` + `.nojekyll`).

## Database changes — IMPORTANT
- Schema is SQL you run manually in the **Supabase SQL Editor**:
  - `supabase/schema.sql` — base tables, RLS, triggers, realtime.
  - `supabase/features.sql` — reactions, per-chat theme, whisper, delete policies.
- **If you add a feature that needs new columns/tables/policies, write a new migration file in
  `supabase/` and remember it must be run in Supabase for the feature to work.** Make the
  frontend **degrade gracefully** if the migration hasn't run (e.g. only send an optional column
  when set; guard reads with `.catch`).
- All tables use **Row Level Security**. Realtime tables also need `replica identity full` and to
  be added to the `supabase_realtime` publication (see existing SQL for the pattern).

## Conventions
- Keep the UI's existing `api.*` / socket-event contract when changing the backend.
- Never commit secrets. Only `VITE_SUPABASE_URL` + the **anon/publishable** key are public-safe
  (RLS protects data). Never put the `service_role`/secret key in the client or repo. `.env` is
  gitignored.
- Match the existing Tailwind style; colors are tuned to be comfortable for long sessions.

## Current features
Late-reply timer · live typing preview · "we're both here" glow · nudge · screen effects
(hearts/confetti) · whisper messages · reactions · per-chat themes · delete message · delete chat
· app screen-lock (PIN, `client/src/context/LockContext.tsx`) · **image messages** · **voice notes**.

### Media messages (image + voice)
- Migration: `supabase/media.sql` — adds `attachment_url` / `attachment_type` / `attachment_duration_ms`
  columns on `messages` and a **public `chat-media` Storage bucket** with member-only write RLS
  (path is `<conversationId>/<uuid>.<ext>`). **Must be run in Supabase for media to work.**
- Frontend: `api.uploadMedia()` uploads the blob; the socket shim's `sendMessage` only writes the
  `attachment_*` columns when set (so text/whisper still work if the migration hasn't run).
  Images use a file picker; voice notes use `MediaRecorder` (`client/src/components/VoiceNote.tsx`
  is the player). Both send optimistically with a local blob URL, then swap in the public URL.

## Deferred / next up
- **View-once photos** — the media plumbing (bucket + attachment columns) now exists; this just
  needs a "view once" flag + read-then-destroy handling on top of image messages.

## Local dev
`cd client && npm install && npm run dev` with `client/.env` pointing at a Supabase project.
Build check: `npm run build` (runs `tsc -b` + `vite build`).
