@~/aic-vault/CLAUDE.md

# superwhisper-analytics

Local Next.js dashboard for SuperWhisper analytics. Reads raw recording data from a configurable local path and presents it via a ShadCN dashboard UI.

## Stack

- Next.js 15 (App Router)
- TypeScript
- ShadCN (neutral theme, dashboard-01 base)
- ReCharts
- papaparse (CSV parsing for ON legacy profile)

## Running locally

```bash
cp .env.local.example .env.local
# Set SUPERWHISPER_PATH in .env.local
npm run dev
```

## Data

- **Default profile**: live SuperWhisper recordings from `SUPERWHISPER_PATH/recordings/` — each folder is a Unix timestamp, containing `meta.json` and `output.wav`
- **ON profile**: pre-processed CSVs in `data/legacy/` (gitignored) — drop OakNorth export here

## Key paths

- `lib/types.ts` — shared TypeScript interfaces
- `lib/scanner.ts` — scans recording folders, parses meta.json
- `lib/analytics.ts` — derives filler words, topics, WPM
- `lib/cache.ts` — in-memory cache (survives request lifecycle in dev)
- `lib/legacy.ts` — CSV parsers for ON profile
- `app/api/` — all API routes
- `app/(dashboard)/` — all pages
