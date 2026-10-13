# Vietnam Samho — Policy Deployment System

Hoshin Kanri (policy deployment) tracker for Vietnam Samho Co. Ltd. Trilingual
(EN / VI / KO) X-Matrix, Bowling Charts, KPI 8D action plans, and Gemini-powered
analysis.

This repository contains **two independent builds** of the same UI:

| Build | Command | Output | Backend |
| --- | --- | --- | --- |
| **Static** (deployed) | `npm run build:static` | `dist-static/` | None — `localStorage` |
| **Full-stack** (local/self-hosted) | `npm run build` | `dist/` | Express API + JSON file store |

The static build is what Vercel serves. See [STATIC_HOSTING.md](./STATIC_HOSTING.md)
for what changes when you drop the backend.

## Requirements

- Node.js 20 or newer
- A Gemini API key (only needed for the AI features) — <https://aistudio.google.com/apikey>

## Getting started

```bash
npm install
cp .env.example .env        # add GEMINI_API_KEY for the AI features
npm run dev                 # http://localhost:3000, Express + Vite in dev mode
```

## Build commands

```bash
npm run dev          # dev server with the Express API and HMR
npm run build        # full-stack build  -> dist/ (run with: npm start)
npm run build:static # static build      -> dist-static/
npm run preview      # serve dist-static locally on http://localhost:5055
npm run lint         # tsc --noEmit
npm run clean        # remove build output
```

## Deploying to Vercel

`vercel.json` already pins the build command and output directory, so it works
with zero dashboard configuration:

```bash
npm install -g vercel
vercel          # preview
vercel --prod   # production
```

Or connect the repo at <https://vercel.com/new> — the framework preset is
irrelevant because `vercel.json` supplies `buildCommand` and `outputDirectory`.
Either way it builds with `npm run build:static` and publishes `dist-static`.

## Performance notes

The app is code-split so a first visit does not download the whole product:

- **`xlsx` (~430 KB)** — SheetJS, needed only for Excel import/export. Loaded on
  demand, and pre-warmed when the import modal opens.
- **`recharts` (~400 KB)** — loaded only when a chart is actually rendered.
- **Tabs and dialogs** — Bowling Chart, Dashboard, AI Advisor, Settings, KPI
  drawer and Add-KPI modal are separate chunks fetched on first use.
- **`AmplonXMatrix`** — the heaviest single component, split out of the entry
  chunk alongside the classic X-Matrix layout.

The entry chunk is roughly 413 KB (111 KB gzipped) instead of the ~1.4 MB a
single-chunk build produces. Vercel's CDN applies gzip/brotli automatically, so
there are no pre-compressed artefacts in the repo.

The shipped seed dataset (`public/seed-policy-data.json`) is minified during
`build:static` by `scripts/minify-seed.mjs`, which cuts it from ~106 KB to ~57 KB.

## Project layout

```
index.html              full-stack entry
index_static.html       static entry
server.ts               Express API (full-stack build only)
server/                 policy store + Gemini translation service
src/
  App.tsx               shell, view routing, state
  components/           views, modals, dialogs
  components/lazyCharts.tsx  React.lazy wrappers around recharts
  components/charts.ts        narrow recharts re-export barrel (keeps tree-shaking)
  lib/                  sync service, KPI utils, static API shim
  data/samhoData.ts     baseline policy dataset
public/seed-policy-data.json   dataset shipped to new static visitors
scripts/minify-seed.mjs        minifies the seed before a static build
```

## Data model

Policy data is organised in three levels — L1 (company), L2 (factory), L3
(department) — each holding KPIs with monthly target/actual values, plus
objectives, priorities and resources. In the static build all of it lives in the
visitor's own `localStorage`, seeded from `public/seed-policy-data.json` on first
visit.

## AI features

The full-stack build calls Gemini server-side using `GEMINI_API_KEY`. The static
build has nowhere to keep a secret, so the app shows a key manager in the
bottom-right corner; the key is stored in `localStorage` and sent straight to
Google from the browser.

## Updating the shipped dataset

Edit with the app running, then publish the result as the new default:

```bash
Copy-Item data_store\policy_data.json public\seed-policy-data.json
npm run build:static        # minifies the seed as part of the build
```

Existing visitors keep their own `localStorage` copy, so the seed only affects
first-time visitors.