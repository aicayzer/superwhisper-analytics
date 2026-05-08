# SuperWhisper Analytics

A local dashboard for visualising your [SuperWhisper](https://superwhisper.com) recording history. Reads directly from the SuperWhisper data directory on your Mac — no upload, no cloud, no account.

Built with Next.js, ShadCN, and ReCharts.

## What it shows

- **Overview** — total recordings, words dictated, time spent, average WPM, word volume trend, topic breakdown
- **Recordings** — searchable, paginated list of every recording with full transcript, segment-level timestamps, and audio playback
- **Patterns** — when you record: hour of day, day of week, weekly volume trend
- **Language** — top words, filler word frequency, speaking rate (WPM) over time
- **Modes** — breakdown by SuperWhisper mode: count, words, time, average WPM

## Getting started

```bash
git clone https://github.com/aicayzer/superwhisper-analytics
cd superwhisper-analytics
npm install
cp .env.local.example .env.local
# Edit .env.local — set SUPERWHISPER_PATH to your SuperWhisper directory
# Typically: /Users/<you>/Services/superwhisper
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load the app scans your recordings directory and builds an in-memory index — this takes 10–30 seconds for large libraries, then everything is instant. You can also set the path under Settings without touching the env file.

## Profiles

The sidebar has a **Default / ON** profile switcher:

- **Default** — your live SuperWhisper data
- **ON** — a pre-processed CSV export. Drop the CSVs in `data/legacy/` and switch profiles. See Settings for expected file names.

## Requirements

- Node.js 18+
- SuperWhisper installed on the same Mac
- The SuperWhisper data directory (typically `~/Services/superwhisper`)

## Stack

Next.js 15 · TypeScript · Tailwind CSS · ShadCN · ReCharts
