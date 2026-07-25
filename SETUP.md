# Pronto — Setup & Run Guide

Pronto is a simple, fast, one-to-one chat app. Username-only login (no email/phone),
live presence, read receipts, and a built-in "late-reply" timer between two people.

**Stack:** React + Vite (PWA) frontend · **Supabase** (Postgres + Realtime + Auth) backend.
There is no separate server to run — Supabase is the backend.

> The `server/` folder (old Express + Socket.IO + MongoDB API) is **legacy and unused**.
> It's kept for reference only. You do not need Node/Mongo to run or deploy Pronto anymore.

---

## Run it locally (against a Supabase project)

1. Create a free Supabase project and run `supabase/schema.sql` in its SQL Editor
   (see **[DEPLOY.md](DEPLOY.md)** steps 1–4 — it's quick and needs no credit card).
2. Copy `client/.env.example` to `client/.env` and fill in your Supabase URL + anon key:
   ```
   VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
4. Open the printed URL (usually http://localhost:5173). Register two different usernames
   (e.g. a normal window + an incognito window) to test a real conversation.

---

## Deploy it for free + get an Android APK

See **[DEPLOY.md](DEPLOY.md)** — deploy the frontend to GitHub Pages (free, no card) and
generate an installable Android APK with PWABuilder (no Android SDK needed).

---

## How the "late-reply" timer works

- A **session** for the day starts once **both** people have sent a greeting ("hi", "hello",
  "hey", etc.) to each other.
- While a session is active, every time someone replies, the time since the other person's last
  message is added to *their* "late" total for that day.
- The session ends once **both** people send a farewell ("bye", "goodbye", "cya", etc.) — a new
  "hi"/"hi" later that day starts counting again.
- Tap the ⏱ badge in a chat's header to see the full day-by-day history for that conversation.

(This logic now lives in a Postgres trigger — see `supabase/schema.sql`.)

## Project structure

```
D:/App
├── client/     React + Vite + Tailwind PWA  (the app)
├── supabase/   schema.sql — run once in your Supabase project
└── server/     LEGACY, unused (old Express/Mongo/Socket.IO backend)
```
