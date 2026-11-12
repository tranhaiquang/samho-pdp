# AGENTS.md — Vietnam Samho Policy Deployment System

Hoshin Kanri / X-Matrix tracker (React 19 + Vite 6 + Tailwind 4, trilingual EN/VI/KO).
Two independent builds of the same UI — pick the right one before changing anything:

| Build | Command | Output | Backend |
| --- | --- | --- | --- |
| Dev / self-hosted | `npm run dev` → `tsx server.ts` | `dist/` via `npm run build` | Express API + JSON store (`data_store/policy_data.json`), port **3000** |
| Deployed (Vercel) | `npm run build:static` → `dist-static/` | static files | none — `localStorage` + `src/lib/staticApiShim.ts`, base `'./'` |

- `vercel.json` pins `installCommand: npm install`, `buildCommand: npm run build:static`, `outputDirectory: dist-static`, `cleanUrls: true`. Nothing server-side runs there.
- `npm run preview` serves `dist-static/` on **5055**.
- Static build minifies `public/seed-policy-data.json` via `scripts/minify-seed.mjs` (~106 KB → ~57 KB). Edit the seed file, not the minified output.
- STATIC_HOSTING.md lists what degrades without the backend (AI features, server sync); Bowling Chart, Dashboard and Excel import all work fully in static mode.
- **Static deploy gotcha:** `server/policyStore_static.ts` prefers browser `localStorage` over `public/seed-policy-data.json`. After changing baseline data/IDs/colors, update **all three**: `data_store/policy_data.json`, `public/seed-policy-data.json`, and `src/data/samhoData.ts`; otherwise Vercel serves new code with stale/missing IDs. Existing browsers with an unedited legacy baseline are migrated by `OLD_BASELINE_HASHES` in `policyStore_static.ts`; browsers with user edits are preserved. If baseline changes again, refresh those hashes or add a new one-time migration.
- **Static IDs are unstable after Excel imports:** imported L1 records use IDs such as `p-l1m-*` and `kpi-import-*`. Any hardcoded matrix color/dot map (e.g. `src/components/matrixCellColors.ts`) keyed to those IDs must be regenerated when the import is re-run.
- **Deployment check:** after push, verify `https://samho-pdp.vercel.app/seed-policy-data.json` contains the expected `version`/first IDs and that the HTML asset hash changed. If data still appears old in one browser, its localStorage may be preserved; use the migration path above or clear site data.

## Verify before committing

- `npm run lint` (= `tsc --noEmit`) is the only static check that exists. **No tests, no CI, no pre-commit hooks.** Type checking is the gate — do not skip it.
- For static/Vercel deploys, also run `npm run build:static` before pushing when seed/baseline files change; it validates the static bundle and refreshes `dist-static/`.
- There is nothing else to run; verification means opening the app (dev server on `:3000`) and looking at it.

## Data flow

- Entry `src/App.tsx` holds `viewMode` (default `'xmatrix'`); tabs code-split by `lazy`/`Suspense`.
- `src/components/XMatrix.tsx` is the wrapper; it lazily loads `src/components/AmplonXMatrix.tsx` (default view, heaviest chunk, all X-Matrix interactions live there — rows/columns/grid correlations/compass).
- Initial data: `src/data/samhoData.ts` → `INITIAL_LEVEL_{1,2,3}_DATA`, same object shape as `public/seed-policy-data.json` and `data_store/policy_data.json` (server store is versioned + atomic; schema `LevelPolicyData` in `src/types.ts`).
- `data_store/policy_data.json` is the current L1/L2/L3 runtime snapshot; when it is intentionally committed to drive static/Vercel sync, keep `public/seed-policy-data.json` and `src/data/samhoData.ts` in sync from the same source rather than editing them independently.
- `data_store/*.json` is **runtime state, not source** — never hand-edit to "fix" content; use the UI or import scripts.
- Imports from the original Excel workbook: `scripts/import-lieu-pdp.cjs` (Bowler sheets → KPIs, merge by code, requires dev server on `:3000`) and `scripts/import-l1-matrix.cjs`. These are one-off manual runs; review the printed summary.

## Conventions & gotchas specific to this repo

- **Context:** X-Matrix arms: north = Top Improvement Priorities (`priorities`), west = Annual Objectives, east = KPIs + PIC resources, south = 3-Year/linked items. Code family `L{level} N.M.x` maps to colour themes from the workbook — `getRowThemeColor` in `AmplonXMatrix.tsx` keeps them paired; KPI titles shown ordered small→big (east arm), priorities/west/south big→small.
- **Colours:** family pastels = `DBEEF4` (1.1 Lean/Prod), `EDE9FE` (1.2 Delivery, purple — user overrode the workbook's gray), `FFF4CC` (1.3 CSR/RL), `EBF1DE` (1.4 Dev), `C6E0B4` (1.5 Quality). Text/badges use darker sibling hex (`getFamilyTextColor`), dots/mid-tones use `getFamilyDotColor`. L2/L3 items are all `DBEEF4`.
- **Manual X-Matrix colors:** `src/components/matrixCellColors.ts` holds hardcoded `MANUAL_CELL_COLORS` / `MANUAL_CELL_TEXT_COLORS` from the user-picked static palette. Correlation dots use the manual cell color when present; uncolored cells fall back to the family/department dot colors. Keep JSON-derived maps in this file rather than scattering them through `AmplonXMatrix.tsx`.
- **Trilingual UI:** keep `isVi` / `isKo` paths when editing any user-facing label; `getLocalizedPureText` picks EN/VI/KO names.
- **Encoding:** source files are UTF-8 (Vite does not transcode). The repo had widespread CP437/CP1252 mojibake in `AmplonXMatrix.tsx` (now fixed) — never re-save source through Windows PowerShell redirection (`Out-File`, `>`) or non-UTF-8 editors; use the editor/`tsc` only.
- **Dev server HMR can silently die** (e.g. after a transient bad file state): if the UI stops reflecting source changes, hard-refresh the tab (Ctrl+F5); if still stale, `npm run dev` restart is the fix — not a code problem.
- Keep `<title>`, `<meta>` description in both `index.html` and `index_static.html` in sync (both exist and currently contain the same content).
- `npm run dev` requires `GEMINI_API_KEY` in `.env` (see `.env.example`) only for AI features; the rest of the app boots without it.
- `DISABLE_HMR=true` is the AI Studio kill-switch for HMR (see `vite.config.ts`); don't remove that logic.

## Working preferences (user-imposed)

- When editing an existing file, save **one** backup copy (e.g. `name-backup.ext`) before overwriting; don't create versioned copies (`_v1`, `_v2`, …). Do **not** commit `*-backup.*`, `data_store/backup-*.json`, or `*.backup.json` artifacts unless the user explicitly asks.
- Prefer `edit`/`write` tools over shell file writes.
- Edits by `FIXME`/`TODO` are not a workflow here — there is no issue tracker glue; keep changes self-contained and type-check.
