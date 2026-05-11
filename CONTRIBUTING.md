# Contributing

SuperWhisper Analytics is a local Mac desktop app that visualises a
SuperWhisper user's recording history. It is a personal project — PRs
are welcome but considered on merit, and major features will usually be
sketched out before code lands.

## Run locally

```bash
pnpm install
pnpm dev          # opens the Electron window with HMR
```

You'll need a SuperWhisper recordings folder on disk (or fixtures) for
anything past the first-run modal to render data.

## Quality gates

All four pass on `main`. CI runs the same set on every PR.

```bash
pnpm typecheck    # tsc on node + web
pnpm lint         # eslint
pnpm format:check # prettier --check
pnpm test         # vitest
```

## Commits

Conventional Commits. Lowercase, present tense, under 70 characters in
the subject. Body is optional; bullet points if you use one.

- `feat:` new user-visible behaviour
- `fix:` bug fix
- `chore:` infra, tooling, dependency bumps
- `docs:` documentation only
- `refactor:` no behaviour change, code shape only

## Issues + PRs

Open issues at
<https://github.com/aicayzer/superwhisper-analytics/issues>. For
non-trivial PRs, open the issue first so we can agree on scope before you
write the code.
