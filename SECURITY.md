# Security Policy

## Reporting a vulnerability

Please report security issues privately to **hello@cyzr.me** rather than opening a public issue. I'll acknowledge within a few days and work with you on a fix and disclosure timeline.

When reporting, include:

- A description of the issue and its impact
- Steps to reproduce
- The app version (Settings → About), OS version, and how the app was installed (from source vs. a packaged `.dmg`)
- Any proof-of-concept code or screenshots

## Scope

This app:

- Runs locally on macOS only.
- Reads from your SuperWhisper recordings folder and writes a config file under `~/Library/Application Support/me.cyzr.superwhisper-analytics/`.
- Makes no outbound network calls except the "View on GitHub" link in Settings (a `shell.openExternal` call).

Reports about issues outside this scope (e.g. SuperWhisper itself, third-party dependencies' upstream advisories) are still appreciated, but please understand they may be redirected to the relevant project.

## Supported versions

This is a personal project. Only the latest released version is supported. If a fix is needed, it will land on `main` and ship in the next release.
