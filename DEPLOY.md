# Deploy Pronto for free (no credit card) + install it as an Android app

Pronto now runs on **Supabase** (Postgres + Realtime + Auth) with the frontend on
**GitHub Pages**. There is **no server to keep alive**, and **no credit card** anywhere.

| Piece | Service | Cost | Card? |
|---|---|---|---|
| Database + realtime + auth | **Supabase** free tier | Free forever | ❌ none |
| Frontend (PWA) | **GitHub Pages** | Free | ❌ none |
| Android APK | **PWABuilder.com** | Free | ❌ none |

> The old `server/` folder (Express + Socket.IO + Mongo) is **no longer used** — Supabase
> replaces it. You can ignore it, and you no longer need MongoDB Atlas.

Your repo: **`github.com/UsamaRiaz2844/MyApp`** · Your app will live at
**`https://usamariaz2844.github.io/MyApp/`**

---

## Step 1 — Create a Supabase project (~3 min, no card)

1. Go to <https://supabase.com> → **Start your project** → sign in (GitHub works).
2. **New project**. Pick a name (e.g. `pronto`), set a database password (save it), choose a region near you, **Create**. Wait ~2 min for it to provision.

## Step 2 — Create the database (run one SQL script)

1. In your project, open the **SQL Editor** (left sidebar) → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy **all** of it, paste, and click **Run**. It should finish with "Success".
   - This creates the tables, security rules, the late-reply trigger, and turns on realtime.

## Step 3 — Turn OFF email confirmation (important)

Pronto uses username-only login, so there are no real emails to confirm.

1. Left sidebar → **Authentication** → **Sign In / Providers** (or **Providers → Email**).
2. Find **"Confirm email"** and turn it **OFF**. Save.
   - (Leave "Allow new users to sign up" **ON**.)

## Step 4 — Copy your API keys

1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy two values:
   - **Project URL** → looks like `https://abcdxyz.supabase.co`
   - **anon public** key → a long `eyJ...` string (safe to expose; RLS protects data)

Keep these for the next step.

---

## Step 5 — Give GitHub the keys + turn on Pages (~2 min)

In your repo **`UsamaRiaz2844/MyApp`** on github.com:

1. **Settings → Secrets and variables → Actions → New repository secret.** Add two:
   - Name `VITE_SUPABASE_URL`, value = your Project URL
   - Name `VITE_SUPABASE_ANON_KEY`, value = your anon public key
2. **Settings → Pages → Build and deployment → Source: "GitHub Actions".**

That's all the account/settings work — the rest is automatic.

---

## Step 6 — Deploy (automatic)

The moment the secrets exist and Pages is set to "GitHub Actions", the included
workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds and
publishes the app. It runs on every push; you can also trigger it manually:

- Repo → **Actions** tab → **Deploy Pronto to GitHub Pages** → **Run workflow**.

When it goes green, open **`https://usamariaz2844.github.io/MyApp/`**, register a
username, and it works. Open it in a second browser/incognito, register a different
username, search that username, and chat — messages, typing, seen ticks, presence,
and the ⏱ late-reply timer should all be live.

---

## Step 7 — Turn the PWA into an Android APK (PWABuilder, ~5 min)

1. Go to <https://www.pwabuilder.com>.
2. Paste **`https://usamariaz2844.github.io/MyApp/`** → **Start**. Manifest + service worker should score green.
3. **Package For Stores → Android → Generate Package.**
   - **Signing key:** choose **"Create new"**. Keep the downloaded zip safe — you need the same key to ship updates.
4. Download the zip. Inside:
   - `app-release-signed.apk` ← install this on the phone
   - `assetlinks.json` ← for full-screen (next step)

### Optional: hide the browser address bar (Digital Asset Links)

1. From the zip, put `assetlinks.json` at `client/public/.well-known/assetlinks.json` in this repo.
2. Commit + push — the workflow redeploys it. It becomes live at
   `https://usamariaz2844.github.io/MyApp/.well-known/assetlinks.json`.

> Send me the `assetlinks.json` contents and I'll place it for you.

---

## Step 8 — Install on the phones

1. Copy `app-release-signed.apk` to the phone (USB / Drive / email).
2. Tap it → allow "install from unknown source" → **Install**.
3. Open **Pronto**, register a username. Install the **same APK** on the second phone with a **different** username. Chat between the two, anywhere in the world. 🎉

---

## Updating later

- Change code → `git push` → the Action rebuilds and redeploys automatically.
- Because the APK loads the live site, most UI changes appear **without reinstalling** the APK — just reopen it.
- Rebuild the APK (same signing key) only if you change the app name/icon/package id.

---

## Free-tier notes

- Supabase pauses a project after **7 days of no activity**; opening the app (any request) wakes it. Using it a couple of times a week keeps it always on.
- Free tier: 500 MB database, 200 concurrent realtime connections, unlimited months. Way more than a two-person chat needs.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "sign-in is blocked" on register | Step 3 — turn OFF "Confirm email" in Supabase. |
| Login/search does nothing | Confirm the two GitHub secrets match your Supabase URL + anon key, then re-run the Action. |
| Action fails | Open the Actions log; usually a missing secret or Pages not set to "GitHub Actions". |
| Messages don't appear live | Make sure `schema.sql` ran fully (it enables realtime). Both users must be signed in. |
| APK shows a URL bar | `assetlinks.json` (Step 7) isn't published yet, or the signing key differs. |
