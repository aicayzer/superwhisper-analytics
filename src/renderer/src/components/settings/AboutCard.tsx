import { cn } from '@renderer/lib/cn'
import { ExternalLink, Info, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { UpdaterStatus } from '../../../../preload/api'
import { CHROME_BUTTON } from './parts/chromeButton'
import { SettingsCard } from './SettingsCard'

const GITHUB_URL = 'https://github.com/aicayzer/superwhisper-analytics'

/**
 * Settings → About.
 *
 * Version + license + source + updates. Reset moved out to its own
 * App data card on the Developer tab — it's an action-on-data card,
 * not an about-the-app card.
 *
 * The Updates row auto-checks on mount when status is idle, so the
 * user never sees "Not checked yet" stale text. The Check now button
 * stays as a manual override.
 */
export function AboutCard(): React.JSX.Element {
  const [status, setStatus] = useState<UpdaterStatus>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const initial = await window.api.updater.status()
      if (cancelled) return
      setStatus(initial)
      // Auto-check on first mount when idle — better than showing
      // stale "Not checked yet" text.
      if (initial.kind === 'idle') {
        const checked = await window.api.updater.check()
        if (!cancelled) setStatus(checked)
      }
    })()
    const off = window.api.updater.onStatus((next) => {
      if (!cancelled) setStatus(next)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  const checking = status.kind === 'checking' || status.kind === 'downloading'

  function check(): void {
    void window.api.updater.check().then(setStatus)
  }

  function openGithub(): void {
    void window.api.openExternal(GITHUB_URL)
  }

  return (
    <SettingsCard icon={Info} title="About" subtitle="Version, source, license and updates.">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        A local companion for your SuperWhisper recordings — nothing leaves your machine. Personal
        project, not affiliated with SuperWhisper.
      </p>
      <dl className="mt-4 divide-y divide-border text-[13px]">
        <Row k="License" v="MIT" />
        <div className="flex items-center justify-between py-2">
          <dt className="text-muted-foreground">Source</dt>
          <dd>
            <button
              type="button"
              onClick={openGithub}
              className="inline-flex items-center gap-1.5 text-accent-blue hover:underline"
            >
              View on GitHub
              <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </dd>
        </div>
        <Row k="Version" v={__APP_VERSION__} />
        <div className="flex items-center justify-between py-2 last:pb-0">
          <dt className="text-muted-foreground">Updates</dt>
          <dd className="flex items-center gap-2">
            {describeStatus(status) && (
              <span className="text-[12.5px] text-muted-foreground">{describeStatus(status)}</span>
            )}
            <button type="button" onClick={check} disabled={checking} className={CHROME_BUTTON}>
              <RefreshCw className={cn('h-3 w-3', checking && 'animate-spin')} strokeWidth={1.8} />
              {checking ? 'Checking…' : 'Check now'}
            </button>
          </dd>
        </div>
      </dl>
    </SettingsCard>
  )
}

function describeStatus(s: UpdaterStatus): string {
  switch (s.kind) {
    case 'idle':
      return ''
    case 'checking':
      return ''
    case 'up-to-date':
      return 'Up to date'
    case 'available':
      return `Update available (v${s.version})`
    case 'downloading':
      return `Downloading… ${s.percent}%`
    case 'downloaded':
      return `v${s.version} downloaded — restart to install`
    case 'error':
      return `Couldn't check (${s.message})`
  }
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums text-foreground">{v}</dd>
    </div>
  )
}
