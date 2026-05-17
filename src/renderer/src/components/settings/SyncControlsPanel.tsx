import { cn } from '@renderer/lib/cn'
import { useDataStore } from '@renderer/state/dataStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * Sync controls — bottom section of the connected card. Carries the
 * sync-cap (reframed copy), the mode filter (chips derived from
 * observed recording modes), the manual sync trigger, last-sync drift
 * display, and a recent-error row.
 */
export function SyncControlsPanel({
  syncLimit,
  lastSyncedAt,
  lastError,
  busy,
  onSync,
  onSyncLimit
}: {
  syncLimit: number
  lastSyncedAt: string | null
  lastError: string | null
  busy: boolean
  onSync: () => Promise<void>
  onSyncLimit: (n: number) => Promise<void>
}): React.JSX.Element {
  // Re-render once a minute so the "5m ago" drift updates without a
  // custom hook. The same trick the previous ConnectedBody used.
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div className="space-y-2">
      <div className="text-[12px] font-medium text-foreground">Sync</div>
      <ModeFilterRow disabled={busy} />
      <SyncLimitRow value={syncLimit} onCommit={onSyncLimit} disabled={busy} />
      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-[12.5px]">
        <dt className="text-muted-foreground">Last synced</dt>
        <dd className="text-foreground">{lastSyncedAt ? formatRelative(lastSyncedAt) : 'Never'}</dd>
      </div>
      {lastError && (
        <p className="rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
          Last sync failed: {lastError}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSync()}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
        >
          <RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} strokeWidth={1.8} />
          Sync now
        </button>
      </div>
    </div>
  )
}

function ModeFilterRow({ disabled }: { disabled: boolean }): React.JSX.Element {
  const recordings = useDataStore((s) => s.recordings)
  const modeFilter = useMymeStore((s) => s.modeFilter)
  const setModeFilter = useMymeStore((s) => s.setModeFilter)

  const modes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of recordings) {
      const name = r.modeName || '(unknown)'
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }))
  }, [recordings])

  const selected = new Set(modeFilter ?? [])

  async function toggleMode(name: string): Promise<void> {
    if (modeFilter === null) {
      // Currently "all" — clicking a chip narrows to that single mode.
      await setModeFilter([name])
      return
    }
    const next = new Set(modeFilter)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    await setModeFilter(next.size === 0 ? null : Array.from(next))
  }

  async function selectAll(): Promise<void> {
    await setModeFilter(null)
  }

  if (modes.length === 0) {
    return (
      <div className="rounded-md border border-border px-3 py-2.5">
        <div className="text-[12px] font-medium text-foreground">Mode filter</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">No recordings indexed yet.</div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-medium text-foreground">Mode filter</div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {modeFilter === null
              ? 'Syncing recordings from every mode.'
              : `Syncing only from ${modeFilter.length} of ${modes.length} modes.`}
          </div>
        </div>
        {modeFilter !== null && (
          <button
            type="button"
            onClick={() => void selectAll()}
            disabled={disabled}
            className="text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Select all
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {modes.map(({ name, count }) => {
          const active = modeFilter === null || selected.has(name)
          return (
            <button
              key={name}
              type="button"
              onClick={() => void toggleMode(name)}
              disabled={disabled}
              className={cn(
                'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-foreground/40 bg-foreground/10 text-foreground'
                  : 'border-border bg-floating text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              )}
            >
              <span>{name}</span>
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SyncLimitRow({
  value,
  onCommit,
  disabled
}: {
  value: number
  onCommit: (n: number) => Promise<void>
  disabled: boolean
}): React.JSX.Element {
  return <SyncLimitRowInner key={value} value={value} onCommit={onCommit} disabled={disabled} />
}

function SyncLimitRowInner({
  value,
  onCommit,
  disabled
}: {
  value: number
  onCommit: (n: number) => Promise<void>
  disabled: boolean
}): React.JSX.Element {
  const [draft, setDraft] = useState(String(value))

  async function commit(): Promise<void> {
    const n = Number.parseInt(draft, 10)
    const next = Number.isFinite(n) && n > 0 ? n : 0
    if (next === value) return
    await onCommit(next)
  }

  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-foreground">
            Sync most recent N recordings
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            0 = no cap. While capped, session derivation and disk-delete propagation are skipped —
            turn the cap off to test the full sync surface.
          </div>
        </div>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          disabled={disabled}
          className="w-20 rounded-md border border-border bg-card px-2 py-1 text-right text-[12.5px] tabular-nums text-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffD = Math.floor(diffHr / 24)
  return `${diffD}d ago`
}
