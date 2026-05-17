import { SettingsCard } from './SettingsCard'
import { Switch } from '@renderer/components/ui/Switch'
import { cn } from '@renderer/lib/cn'
import { useDataStore } from '@renderer/state/dataStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/**
 * Sync card — sits below Connection in the Myme tab. Carries:
 *
 *   • Mode filter (toggle row per observed Superwhisper mode).
 *   • Last-synced display with the manual Sync-now trigger.
 *   • A small Test-sync button alongside it that runs a 5-item dry
 *     pass — handy for sanity-checking the integration without
 *     touching the full corpus.
 *
 * During `syncing` state, the body shows phase + processed/total and
 * swaps the action buttons for a Cancel button.
 */
export function SyncCard({
  lastSyncedAt,
  lastError,
  syncing,
  syncProgress
}: {
  lastSyncedAt: string | null
  lastError: string | null
  syncing: boolean
  syncProgress: {
    phase: 'preparing' | 'recordings' | 'sessions'
    processed: number
    total: number
  } | null
}): React.JSX.Element {
  const syncNow = useMymeStore((s) => s.syncNow)
  const testSync = useMymeStore((s) => s.testSync)
  const cancelSync = useMymeStore((s) => s.cancelSync)
  const [busy, setBusy] = useState(false)

  // Re-render once a minute so the "5m ago" drift updates without a
  // custom hook.
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  async function doSync(): Promise<void> {
    setBusy(true)
    try {
      await syncNow()
    } finally {
      setBusy(false)
    }
  }

  async function doTest(): Promise<void> {
    setBusy(true)
    try {
      await testSync()
    } finally {
      setBusy(false)
    }
  }

  async function doCancel(): Promise<void> {
    setBusy(true)
    try {
      await cancelSync()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard
      icon={RefreshCw}
      title="Sync"
      subtitle="Push your recordings into Myme. Filter by mode, or run a quick test sync to sanity-check."
    >
      <div className="space-y-4">
        <ModeFilter disabled={busy || syncing} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-foreground">
              {syncing ? phaseLabel(syncProgress?.phase ?? 'preparing') : 'Last synced'}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {syncing
                ? syncProgress && syncProgress.total > 0
                  ? `${syncProgress.processed.toLocaleString()} of ${syncProgress.total.toLocaleString()}`
                  : 'Preparing the diff…'
                : lastSyncedAt
                  ? formatRelative(lastSyncedAt)
                  : 'Never. Your first sync will set the baseline.'}
            </div>
          </div>
          {syncing ? (
            <button
              type="button"
              onClick={() => void doCancel()}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
            >
              Cancel sync
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void doTest()}
                disabled={busy}
                title="Sync just the 5 most recent recordings — quick sanity check."
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
              >
                <FlaskConical className="h-3 w-3" strokeWidth={1.8} />
                Test sync
              </button>
              <button
                type="button"
                onClick={() => void doSync()}
                disabled={busy}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
              >
                <RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} strokeWidth={1.8} />
                Sync now
              </button>
            </div>
          )}
        </div>
        {lastError && !syncing && (
          <p className="rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
            Last sync failed: {lastError}
          </p>
        )}
      </div>
    </SettingsCard>
  )
}

function phaseLabel(phase: 'preparing' | 'recordings' | 'sessions'): string {
  switch (phase) {
    case 'preparing':
      return 'Preparing…'
    case 'recordings':
      return 'Syncing recordings'
    case 'sessions':
      return 'Syncing sessions'
  }
}

function ModeFilter({ disabled }: { disabled: boolean }): React.JSX.Element {
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

  const allSelected = modeFilter === null

  async function setEnabled(name: string, next: boolean): Promise<void> {
    if (allSelected) {
      if (!next) {
        const remaining = modes.filter((m) => m.name !== name).map((m) => m.name)
        await setModeFilter(remaining.length === 0 ? null : remaining)
      }
      return
    }
    const current = new Set(modeFilter ?? [])
    if (next) current.add(name)
    else current.delete(name)
    if (current.size === 0) {
      await setModeFilter(null)
      return
    }
    if (current.size === modes.length) {
      await setModeFilter(null)
      return
    }
    await setModeFilter(Array.from(current))
  }

  if (modes.length === 0) {
    return (
      <div>
        <div className="text-[13px] font-medium text-foreground">Mode filter</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          No recordings indexed yet — modes will appear here once your folder is scanned.
        </div>
      </div>
    )
  }

  const selected = new Set(modeFilter ?? modes.map((m) => m.name))

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[13px] font-medium text-foreground">Mode filter</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {allSelected
              ? 'Syncing recordings from every mode.'
              : `Syncing ${selected.size} of ${modes.length} modes.`}
          </div>
        </div>
        {!allSelected && (
          <button
            type="button"
            onClick={() => void setModeFilter(null)}
            disabled={disabled}
            className="text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Reset to all
          </button>
        )}
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {modes.map(({ name, count }) => (
          <li key={name} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[12.5px] text-foreground">{name}</span>
              <span className="tabular-nums text-[11.5px] text-muted-foreground">
                {count.toLocaleString()}
              </span>
            </div>
            <Switch
              checked={selected.has(name)}
              onChange={(next) => void setEnabled(name, next)}
              ariaLabel={`Sync recordings from ${name}`}
            />
          </li>
        ))}
      </ul>
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
