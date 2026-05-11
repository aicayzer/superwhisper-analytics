# superwhisper-analytics

Local Mac desktop app that visualises a [SuperWhisper](https://superwhisper.com)
user's recording history. Reads `meta.json` and `output.wav` from disk; no
network calls, no telemetry. Single-user, single-profile.

See [README.md](../README.md) for install and screenshots, and
[CONTRIBUTING.md](../CONTRIBUTING.md) for the contributor workflow.

## Stack

- Electron + Vite + React 19 + TypeScript strict
- Tailwind v4 + ShadCN/UI
- Recharts (charts), Zustand (state), React Router v7 (HashRouter)
- pnpm

## Quality gates

```bash
pnpm typecheck    # tsc --noEmit on node + web
pnpm lint
pnpm format:check
pnpm test         # vitest
```

## Where things live

- `src/main/` — Electron main process. Scanner, IPC handlers, custom
  `sw://` protocol, fs.watch, config persistence.
- `src/preload/` — typed context bridge exposed to the renderer as
  `window.api`.
- `src/renderer/src/` — React app.
  - `App.tsx` + `routes.tsx` — router root.
  - `screens/` — page components (one per route).
  - `components/layout/` — Window, Sidebar, Topbar, Titlebar.
  - `components/charts/` — chart primitives (Recharts wrappers + a few
    hand-rolled SVG components).
  - `components/ui/` — ShadCN primitives.
  - `state/` — Zustand stores (data, config, range, ui prefs, layout).
- `src/shared/` — types and pure helpers consumed by both main and
  renderer via the `@shared/*` path alias.

## Conventions

- macOS only. No Windows/Linux build paths.
- Apple system fonts; greyscale palette with light + dark modes.
- Theme toggles via the `.dark` class on `<html>` (ShadCN convention).
- Routing uses HashRouter so production builds work over `file://`.
- IPC contract lives in `src/preload/api.ts` — every renderer call goes
  through `window.api.*`. Add a channel there + a matching handler in
  `src/main/ipc.ts`.
