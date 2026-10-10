# FasciApp v0.3 – setup

Static app: `index.html`, `config.js`, `data.js`, `app.js`, `styles.css`, `logo.svg`. Any static host works (GitHub Pages, Netlify, Vercel).

## Demo mode (default)
With `config.js` empty, everything is saved in the browser only (a banner says "Demo mode: saved on this device"). Other people cannot see the profiles.

## Turn on shared data (Supabase, free tier)
1. Create a free project at https://supabase.com (region: EU, e.g. Frankfurt).
2. SQL Editor → New query → paste `supabase_setup.sql` → Run.
3. Project Settings → API: copy the **Project URL** and the **anon public** key into `config.js`.
4. Authentication → URL Configuration: set **Site URL** to the address where the app is hosted.
5. Authentication → Providers → Email: keep enabled. "Confirm email" on = new practitioners must click the email link before signing in (recommended); off = instant sign-in for testing.
6. Deploy / push the files. The demo banner disappears when Supabase is active.

Notes
- The anon key is meant to be public; the RLS policies limit access: everyone can read listings with `consent = true`, each user can only create/edit/delete their own row.
- Photos are stored as small data URLs (~20–40 KB) in the `photo` column. Later we can move them to Supabase Storage.
- GDPR: add a privacy notice and a "delete my listing" button before a public launch.
- Location search uses OpenStreetMap Nominatim (max ~1 request/second); map tiles: Esri World Light Gray Canvas (free, no key, attribution required).
