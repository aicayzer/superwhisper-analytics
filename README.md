# SuperWhisper Analytics

A local Mac desktop app for browsing your SuperWhisper recording history.

Reads recordings from disk, never sends them anywhere. No telemetry. No accounts.

> **Not affiliated with SuperWhisper.** Built out of a love for the app and curiosity about the data behind every recording.

## Install

Build the `.app` from source — there's no signed release yet, so you'll be installing from this repo.

```bash
pnpm install
pnpm build:mac
```

The build drops a `.dmg` into `dist/`. Open it, drag `SuperWhisper Analytics.app` into `/Applications`, and launch from there. The app then runs on its own — you don't need `pnpm dev` once it's installed.

On first launch it asks for your SuperWhisper recordings folder. The default lives at:

```
~/Library/Application Support/com.superduper.superwhisper/recordings
```

If yours is elsewhere (a custom SuperWhisper install, an external drive, etc.) point the picker at it.

## What it shows

- **Overview** — totals, KPIs, when-you-record heatmap, daily activity over a configurable range.
- **Usage** — by-hour-of-day clock, mode share, words-per-minute by mode.
- **Language** — top words, filler words, speaking pace, sentence-length distribution, vocabulary growth.
- **Transcripts** — paginated list of every recording with click-through to a detail view (audio playback, segment-clickable transcript, hover-to-highlight word frequency).

All views are scoped to the date range pill in the navbar.

## Where it stores data

```
~/Library/Application Support/superwhisper-analytics/config.json
```

Single file, single field — the path you picked. That's it. The recordings themselves stay in your SuperWhisper folder; this app reads them on launch and re-reads when you click **Reindex** in Settings.

No network calls except the **View on GitHub** link in Settings.

## Macos's "Files and folders" prompt

The first time the app reads `~/Library/Application Support/com.superduper.superwhisper/recordings`, macOS will show a Files-and-Folders permission dialog. Allow it. If you point the app at `~/Documents` or `~/Downloads` you'll get a similar prompt for that location.

## Develop

```bash
pnpm dev          # electron-vite dev shell with hot reload
pnpm typecheck    # tsc, both node + web projects
pnpm lint         # eslint
pnpm format:check # prettier --check
pnpm test         # vitest
pnpm build        # production build (Vite)
pnpm build:mac    # full packaged .app + .dmg via electron-builder
```

## Architecture

Briefly:

- **Electron** with three processes — `main/` (Node, owns the disk + IPC + custom protocol), `preload/` (typed bridge), `renderer/` (React + Vite).
- **Shared types** in `src/shared/types.ts` — `Recording`, `Aggregates`, `HydratePayload`. Both processes pull from here so the IPC contract stays in lockstep.
- **Scanner** reads each `meta.json`, derives metrics, sorts newest-first. ~200ms for 11k recordings, so synchronous.
- **Aggregates** are pure functions over the parsed `Recording[]`.
- **`sw://` custom protocol** streams `output.wav` files to the renderer's `<audio>` element — the renderer never touches `file://` directly.
- **Web Audio API** decodes waveform peaks on the renderer side, lazily, when each transcript opens.

## License

MIT.
