# WatchParrty

WatchParrty V1 is a minimal watch party app for YouTube + Netflix. YouTube sync runs in the web app. Netflix sync runs via a Chrome extension content script on netflix.com.

## 1) Supabase setup

1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in the SQL editor.
3. Enable Email auth in Supabase Auth settings.
4. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (for local: `http://localhost:3000`)

## 2) Run web app locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3) Load extension unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode.
3. Click **Load unpacked**.
4. Select the `/extension` folder.

## 4) Connect extension to user account

1. Log into WatchParrty web app.
2. Open `/connect-extension`.
3. Click **Connect Extension** to push your access token to the extension.
4. Join a Netflix room in the web app.
5. Click **Open in Netflix** on the room page, then keep netflix.com open in a tab.

## 5) Notes

- YouTube rooms: sync uses Supabase Realtime broadcast (`PLAY`, `PAUSE`, `SEEK`, `SET_SOURCE`, `PING`).
- Drift correction is applied when viewer drift is greater than 0.75s.
- Host seeks are debounced to 250ms.
- Netflix sync uses extension logic on netflix.com with the same event schema.