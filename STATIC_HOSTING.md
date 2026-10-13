# Static Hosting Guide

This guide covers the **static build** of the Policy Deployment System: a plain
folder of HTML/CSS/JS that runs on any static host with no backend.

## Build

```bash
npm install
npm run build:static
```

Output goes to `dist-static/`:

```
dist-static/
  index.html
  assets/*.js, *.css
  samho-logo.svg
  seed-policy-data.json
```

`npm run build` still produces the original Express + Vite app in `dist/`.
The two builds are independent, so switching between them costs nothing.

## Test locally before uploading

Any static file server works. From the project root:

```bash
npx serve -s dist-static -l 5055
# then open http://localhost:5055
```

## Deploy

Upload the **contents** of `dist-static/` (not the folder itself).

### Netlify
Drop the folder on the Netlify drop page, or connect the repo with:

- Build command: `npm run build:static`
- Publish directory: `dist-static`

### Cloudflare Pages
Connect the repo, then set:

- Build command: `npm run build:static`
- Build output directory: `dist-static`

### Vercel
Framework preset "Other", build command `npm run build:static`,
output directory `dist-static`.

### GitHub Pages
Build with `npm run build:static`, publish `dist-static` from your `main`
branch. Asset paths are relative (`base: './'`), so a project subpath like
`/<repo>/` works without extra config.

### nginx / Apache / any shared host
Copy the contents into the web root. No rewrite rules are needed: the app is a
single page and does not use client-side routing.

## What works, and what does not

**Works fully:** X-Matrix, Bowling Chart, Dashboard, KPI editing, Excel import
and export, backup and restore, CSV export, all three languages.

**Changed behaviour:** data now lives in each visitor's own browser
(`localStorage`) instead of a shared server. Two people opening the site do not
see each other's edits. This is inherent to a static site with no backend.

**AI features:** Gemini cannot be called without a secret, and a static build has
nowhere to keep one. Instead the app shows an "AI" button in the bottom-right
corner where you paste your own Gemini API key. It is stored in `localStorage`
and sent directly to Google. Get a free key at
<https://aistudio.google.com/apikey>.

Until a key is entered, AI features return a clear message rather than failing
silently.

## Files added for the static build

| File | Purpose |
| --- | --- |
| `vite.static.config.ts` | Static build config (`base: './'`, renames entry to `index.html`) |
| `index_static.html` | Entry HTML pointing at `main_static.tsx` |
| `src/main_static.tsx` | Static entry; installs the API shim before mounting |
| `src/lib/staticApiShim.ts` | Intercepts `fetch('/api/...')` and serves it from `localStorage` |
| `server/policyStore_static.ts` | Browser store: same logic as `policyStore.ts`, `localStorage` instead of `fs` |
| `src/components/GeminiKeyManager_static.tsx` | In-app Gemini API key UI |
| `public/seed-policy-data.json` | Initial dataset shipped with the site |
| `src/global.d.ts` | Type declaration for the seed |

No existing file was modified except `package.json` (added `build:static`),
`.gitignore`, and `vite.static.config.ts`. The original Express app is
untouched and still runs with `npm run dev`.

## How the shim works

The app reaches its backend through 21 `fetch('/api/...')` calls in
`syncService.ts` plus 2 more in `AiAdvisor.tsx` and `KpiModal.tsx`.
`staticApiShim.ts` wraps `window.fetch`, matches `/api/` URLs, and answers them
from a `localStorage`-backed store with the same method signatures as the real
backend. That is why no component needed editing.

## Updating the shipped dataset

To re-publish newer data as the default for new visitors:

```bash
# edit with the app running locally, then
Copy-Item data_store\policy_data.json public\seed-policy-data.json
npm run build:static
```

Existing visitors keep their own `localStorage` copy, so the seed only affects
first-time visitors. To force everyone back to the shipped baseline, add
`localStorage.removeItem('samho_policy_state_v1')` in the browser console and
reload.

## Verification scripts

`scripts_static_verify.mjs` and `scripts_static_ui.mjs` drive a headless browser
against a running static server and check mounting, data seeding, write
persistence across reloads, backup and restore, AI error handling, and the key
manager UI. They need `puppeteer` and a server on port 5055.