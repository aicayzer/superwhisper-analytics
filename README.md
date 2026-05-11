# SuperWhisper Analytics

A local Mac desktop app for browsing your SuperWhisper recording history. Reads your recordings from disk, never sends them anywhere. No telemetry. No accounts.

> _**Unofficial.** Not endorsed by, affiliated with, or sponsored by SuperWhisper. Built out of personal enthusiasm for the app._

## Why this exists

I dictate constantly with [SuperWhisper](https://superwhisper.com). I've tried Wispr Flow, Handy, and a handful of other dictation tools — SuperWhisper consistently wins for me. It's fast, it's local-first, and the modes system is genuinely useful. I wanted to look at the data behind my own usage, and to ship something back to the community in return.

If you just want simple local transcription without the broader feature set, [Aiko](https://sindresorhus.com/aiko) by [Sindre Sorhus](https://sindresorhus.com) is excellent too.

## Install

There's no signed release yet, so install from source.

```bash
pnpm install
pnpm build:mac
```

The build drops a `.dmg` into `dist/`. Open it and drag `SuperWhisper Analytics.app` into `/Applications`.

### Gatekeeper

macOS will flag this as unverified on first launch — that's normal for an unsigned app. Either right-click `SuperWhisper Analytics.app` in Finder and select **Open**, or run:

```bash
xattr -d com.apple.quarantine "/Applications/SuperWhisper Analytics.app"
```

### First launch

The app asks for your SuperWhisper recordings folder. It tries to auto-detect the default location:

```
~/Library/Application Support/com.superduper.superwhisper/recordings
```

If yours lives elsewhere (custom install, external drive, etc.) point the picker at it. If neither default is found, the folder-picker modal will let you choose manually.

### macOS Files & Folders permission

The first time the app reads a path under `~/Library/Application Support`, macOS will show a Files-and-Folders permission dialog. Allow it. If you point the app at `~/Documents` or `~/Downloads`, you'll get a similar prompt for that location.

## Screenshots

![Overview](docs/screenshots/overview.png)

![Transcripts](docs/screenshots/transcripts.png)

![Settings](docs/screenshots/settings.png)

## What it shows

- **Overview** — totals, KPIs, when-you-record heatmap, daily activity over a configurable range.
- **Usage** — by-hour-of-day clock, mode share, words-per-minute by mode.
- **Language** — top words, filler words, speaking pace, sentence-length distribution, vocabulary growth.
- **Transcripts** — paginated list of every recording with click-through to a detail view (audio playback, segment-clickable transcript, hover-to-highlight word frequency).

All views are scoped to the date range pill in the navbar.

## Where it stores data

```
~/Library/Application Support/me.cyzr.superwhisper-analytics/config.json
```

Single file holding your picked path, filler-phrase dictionary, and a couple of toggles. The recordings themselves stay in your SuperWhisper folder; this app reads them on launch and re-reads when you click **Reindex** in Settings.

No network calls except the **View on GitHub** link in Settings.

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.

## Architecture

Briefly:

- **Electron** with three processes — `main/` (Node; owns the disk + IPC + custom protocol), `preload/` (typed bridge), `renderer/` (React + Vite).
- **Shared types** in `src/shared/types.ts` — `Recording`, `Aggregates`, `HydratePayload`. Both processes pull from here so the IPC contract stays in lockstep.
- **Scanner** reads each `meta.json`, derives metrics, sorts newest-first. ~200ms for 11k recordings, so synchronous.
- **Aggregates** are pure functions over the parsed `Recording[]`.
- **`sw://` custom protocol** streams `output.wav` files to the renderer's `<audio>` element — the renderer never touches `file://` directly.
- **Web Audio API** decodes waveform peaks on the renderer side, lazily, when each transcript opens.

## Future Additions

- [ ] **Custom Variables** — bring more numbers under user control via Settings and a shared constants module.
- [ ] **Tests**
  - [ ] Unit tests for shared aggregates (pure functions, fixture-driven)
  - [ ] Unit tests for the scanner (fixture `meta.json` files, derived metric verification)
  - [ ] Integration tests for IPC + dataStore hydration
  - [ ] Playwright smoke test (app boots, all screens render without console errors)
- [ ] **Explore tab** — word / phrase usage exploration with full-text transcript search.
- [ ] **Period comparison view** — compare two date ranges side-by-side.
- [ ] **Non-SuperWhisper data adapter** — a skill or CLI that points at arbitrary transcript data and converts it into a SuperWhisper-compatible folder structure for this app to read.

## Acknowledgements

Thanks to the team behind [SuperWhisper](https://superwhisper.com) for building the app this one is built around. The data model, the modes system, and the clean on-disk format are what made this side project possible.

## Intellectual property and contact

This project doesn't intend to infringe upon SuperWhisper's intellectual property. If anyone at SuperWhisper has concerns, please email **hello@cyzr.me** — I'm happy to do whatever you ask.

## License

[MIT](LICENSE).
