@~/aic-vault/CLAUDE.md

# superwhisper-analytics

Local Mac desktop app for visualising SuperWhisper recording history. Open-source. Single user, single profile. Project intent and decisions live in [SuperWhisper Analytics M3PK7](file:///Users/aicayzer/aic-vault/Projects/superwhisper-analytics-M3PK7/SuperWhisper%20Analytics%20M3PK7.md).

## Stack

- Electron + Vite + React 19 + TypeScript strict
- Tailwind v4 + ShadCN/UI
- Recharts (charts), Zustand (state), React Router v7 (HashRouter)
- pnpm

## Running locally

```bash
pnpm install
pnpm dev          # opens the Electron window with HMR
```

## Quality gates

```bash
pnpm typecheck    # tsc --noEmit on node + web
pnpm lint
pnpm format:check
pnpm test         # vitest
```

## Where things live

- `src/main/` — Electron main process. IPC handlers + custom protocol live here when wave 2 lands.
- `src/preload/` — context bridge to renderer.
- `src/renderer/src/` — React app.
  - `App.tsx` + `routes.tsx` — router root.
  - `screens/` — page components (one per route).
  - `components/layout/` — Window, Sidebar, Topbar, Titlebar, etc.
  - `components/charts/` — chart primitives (Recharts wrappers + hand-rolled SVG).
  - `components/ui/` — ShadCN primitives.
  - `lib/mock.ts` — wave-1 mock data. Replaced in wave 2 by IPC-fed real data.
  - `lib/types.ts` — shared TS interfaces.
  - `state/` — Zustand stores (layout, palette, theme).
  - `styles/` — `globals.css`, `tokens.css`.

## Conventions

- macOS only for now. No Windows/Linux build paths.
- Apple system fonts. Greyscale palette with light + dark modes.
- Theme is toggled via the `.dark` class on `<html>` (ShadCN convention).
- Routing uses HashRouter so production builds work over `file://`.
- Wave 1 = UI only with mock data. Wave 2 wires the real data layer. Don't preemptively add IPC code.
