# Pronto — Setup & Run Guide

Pronto is a simple, fast, one-to-one chat app. Username-only login (no email/phone),
live presence, read receipts, and a built-in "late-reply" timer between two people.

Stack: **React + Vite (PWA)** frontend, **Node/Express + Socket.IO** backend, **MongoDB** database.

---

## 1. Get a free MongoDB database (5 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new **free (M0) cluster** — 512MB, no credit card required.
3. Under **Database Access**, create a database user (username + password). Save these.
4. Under **Network Access**, click **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`)
   — simplest for getting started; you can restrict it later.
5. Click **Connect** on your cluster → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add a database name to it (e.g. `pronto`) right after `.net/`:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pronto?retryWrites=true&w=majority
   ```

### Where to put it

Open [`server/.env`](server/.env) (copy it from `server/.env.example` if it doesn't exist yet) and set:

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pronto?retryWrites=true&w=majority
JWT_SECRET=<any long random string — this signs login tokens>
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

That's the only credential the whole app needs. No Firebase/Supabase keys required.

---

## 2. Run the backend

```bash
cd server
npm install
npm run dev
```

You should see `MongoDB connected` and `Pronto server listening on port 4000`.

## 3. Run the frontend

```bash
cd client
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173) in your browser. Register two different
usernames (e.g. in a normal window + an incognito window) to test a real conversation between
two people.

The client reads the backend URL from [`client/.env`](client/.env) (`VITE_API_URL`). It defaults
to `http://localhost:4000`.

---

## 4. Install it on your phone (PWA)

Pronto is a Progressive Web App — no app store needed, and no native build step. To try it on
your phone right now:

1. Make sure your phone is on the **same WiFi** as your computer.
2. Find your computer's LAN IP (Windows: run `ipconfig` in PowerShell, look for `IPv4 Address`,
   e.g. `192.168.1.23`).
3. In `client/.env`, set:
   ```
   VITE_API_URL=http://192.168.1.23:4000
   ```
4. In `server/.env`, set:
   ```
   CLIENT_ORIGIN=http://192.168.1.23:5173
   ```
5. Restart both `npm run dev` processes so the new env vars take effect.
6. On your phone's browser, go to `http://192.168.1.23:5173`.
7. **Android (Chrome):** tap the ⋮ menu → "Add to Home screen" / "Install app".
   **iPhone (Safari):** tap the Share icon → "Add to Home Screen".
8. Pronto now opens full-screen from your home screen icon, like a real app.

### For permanent, install-from-anywhere access + a real Android APK

Local WiFi hosting only works while your computer is on and both of you are on the same network.
For a real deployment reachable from anywhere — and an installable Android **APK** you can put on
two phones — follow **[DEPLOY.md](DEPLOY.md)**.

It walks you through: MongoDB Atlas → deploy backend **and** frontend to Render's free tier from
GitHub (one `render.yaml` does both) → generate a signed APK with PWABuilder (no Android SDK
needed) → install on the phones. Totally free, no credit card.

---

## How the "late-reply" timer works

- A **session** for the day starts once **both** people have sent a greeting ("hi", "hello",
  "hey", etc.) to each other.
- While a session is active, every time someone replies, the time since the other person's last
  message is added to *their* "late" total for that day.
- The session ends once **both** people send a farewell ("bye", "goodbye", "cya", etc.) — a new
  "hi"/"hi" later that day starts counting again.
- Tap the ⏱ badge in a chat's header to see the full day-by-day history for that conversation.

## Project structure

```
F:/App
├── server/     Express + Socket.IO + MongoDB API
└── client/     React + Vite + Tailwind PWA
```
