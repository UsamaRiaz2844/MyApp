# Deploy Pronto for free + install it as an Android app

This guide takes Pronto from your laptop to a real deployment two people can use
from anywhere, then turns it into an installable Android **APK** — all on free
tiers, no credit card, no Android SDK on your machine.

**Your stack:**

| Piece      | Service              | Cost | You already have it? |
|------------|----------------------|------|----------------------|
| Database   | MongoDB Atlas (M0)   | Free | ✅ yes               |
| Backend    | Render (web service) | Free | create with GitHub   |
| Frontend   | Render (static site) | Free | same account         |
| Android APK| PWABuilder.com       | Free | nothing to install   |
| Code host  | GitHub               | Free | ✅ yes               |

Total new signups: **just Render** — and you can log in to Render *with your
GitHub account*, so it's basically one click.

---

## Step 0 — Push this project to GitHub (2 min)

Render deploys from a GitHub repo.

```bash
cd D:/App
git init
git add .
git commit -m "Pronto chat app"
```

Create a new **empty** repo on GitHub (no README), then:

```bash
git remote add origin https://github.com/<your-username>/pronto.git
git branch -M main
git push -u origin main
```

> `.env` files are gitignored, so your secrets are **not** pushed. Good.

---

## Step 1 — Get your MongoDB connection string (you have Atlas)

1. In Atlas, open your free **M0 cluster** (create one if you haven't:
   *Build a Database → M0 → no card*).
2. **Database Access** → make sure you have a DB user + password (save them).
3. **Network Access** → **Add IP Address** → **Allow Access From Anywhere**
   (`0.0.0.0/0`). Render's servers need this.
4. **Connect → Drivers** → copy the string. Insert your password and a DB name
   (`pronto`) right after `.net/`:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/pronto?retryWrites=true&w=majority
   ```

Keep this handy for the next step.

---

## Step 2 — Deploy both services on Render (Blueprint, ~5 min)

This repo ships a `render.yaml` that deploys **both** the backend and frontend
and wires them together automatically.

1. Go to <https://dashboard.render.com> → **Sign in with GitHub**.
2. **New +** → **Blueprint**.
3. Pick your `pronto` repo. Render reads `render.yaml` and shows two services:
   `pronto-server` (backend) and `pronto-client` (frontend).
4. It will prompt for **MONGODB_URI** — paste the string from Step 1.
   (`JWT_SECRET` is auto-generated; `CLIENT_ORIGIN` defaults to `*`.)
5. Click **Apply** / **Create**. Wait for both to go **Live** (first build a few min).

You'll get two URLs, e.g.:

- Backend:  `https://pronto-server.onrender.com`
- Frontend: `https://pronto-client.onrender.com`   ← **this is your app**

**Verify the backend:** open `https://pronto-server.onrender.com/api/health` —
you should see `{"ok":true}`.

**Verify the app:** open the frontend URL in your phone/desktop browser,
register a username, and it should work end to end.

> **Prefer clicking over the blueprint?** You can instead create the two
> services manually: a **Web Service** with root dir `server`, build
> `npm install`, start `npm start`; and a **Static Site** with root dir
> `client`, build `npm install && npm run build`, publish dir `dist`, and an
> env var `VITE_API_URL` = your backend URL. The blueprint just does this for you.

---

## Step 3 — (Optional) keep the backend awake

Render's free backend sleeps after ~15 min idle and cold-starts (~50s) on the
next open. For a snappier experience, ping it every ~10 min for free:

1. Create a free monitor at <https://uptimerobot.com> (or cron-job.org).
2. Monitor type **HTTP(s)**, URL = `https://pronto-server.onrender.com/api/health`,
   interval 5–10 min.

That keeps it warm within Render's free monthly hours. (Skip this if you don't
mind a one-time ~50s wake when you first open the app.)

---

## Step 4 — Turn the PWA into an Android APK (PWABuilder, ~5 min)

Your frontend is already a full PWA, so this needs **no Android tools**.

1. Go to <https://www.pwabuilder.com>.
2. Paste your **frontend URL** (`https://pronto-client.onrender.com`) → **Start**.
   It scores the PWA (manifest + service worker should pass green).
3. Click **Package For Stores** → **Android**.
4. Use **Generate Package**. Options:
   - **Signing key:** choose **"Create new"** — PWABuilder generates and returns
     a signing key inside the zip. **Keep that zip safe** — you need the same
     key to ship updates.
   - Leave the package id as suggested (e.g. `com.pronto.twa`).
5. Download the zip. Inside you'll find:
   - `app-release-signed.apk`  ← **install this on the phone**
   - `assetlinks.json` (+ instructions)
   - your signing key files

### Make it open full-screen (no browser address bar)

The APK is a Trusted Web Activity — to hide the URL bar, the frontend must serve
a Digital Asset Links file that matches your APK's signing key.

1. From the PWABuilder zip, open `assetlinks.json`.
2. Put it in the app at `client/public/.well-known/assetlinks.json`
   (create the `.well-known` folder). Commit + push:

   ```bash
   git add client/public/.well-known/assetlinks.json
   git commit -m "Add Digital Asset Links for Android TWA"
   git push
   ```

   Render auto-redeploys the frontend. Verify it's live at:
   `https://pronto-client.onrender.com/.well-known/assetlinks.json`

> Send me the `assetlinks.json` contents and I'll place it for you correctly.

---

## Step 5 — Install on the Android phone(s)

1. Transfer `app-release-signed.apk` to the phone (USB, Google Drive, email, etc.).
2. Tap it. Android will warn about installing from an unknown source →
   **Settings → allow this source → Install**.
3. Open **Pronto** from the app drawer. It runs full-screen like a native app.
4. Install the **same APK** on the second phone. Register a **different**
   username on each. You're now chatting between two far-apart users. 🎉

---

## Updating the app later

- **Backend or frontend code change:** `git push` → Render auto-redeploys.
- **Frontend content change:** the installed APK loads the live site, so most UI
  changes appear **without reinstalling** the APK (just reopen the app).
- **Rebuild the APK** only if you change the app name/icon/package id — reuse the
  **same signing key** from Step 4 or the update won't install over the old one.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App loads but login fails | Check `https://.../api/health` = `{"ok":true}`. If the backend is asleep, wait ~50s and retry. |
| CORS / network error | Backend `CLIENT_ORIGIN` should be `*` (default) or exactly your frontend URL. |
| Messages don't arrive live | Both users must have the app open (delivery is via live socket). Confirm the backend is awake. |
| PWABuilder scores low | Make sure you pasted the **frontend** URL (not the backend), over `https://`. |
| APK still shows a URL bar | `assetlinks.json` (Step 4) isn't live yet, or the signing key doesn't match. Re-check the file URL. |
| First open is slow | That's the free backend cold-starting. Step 3 (UptimeRobot) keeps it warm. |

---

## Security note (personal use)

`CLIENT_ORIGIN=*` allows any web origin to call the API. Auth is by bearer token,
so this is fine for a private two-person app. To lock it down later, set
`CLIENT_ORIGIN` on `pronto-server` (Render → the service → Environment) to your
exact frontend URL and redeploy.
