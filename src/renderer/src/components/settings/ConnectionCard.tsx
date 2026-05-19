import { useMymeStore } from '@renderer/state/mymeStore'
import { useDataStore } from '@renderer/state/dataStore'
import { relativeTime } from '@renderer/lib/format'
import { Cloud, ExternalLink, MoreHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProbeResult, MymeStatus } from '../../../../preload/api'
import { CHROME_BUTTON, CHROME_BUTTON_PRIMARY } from './parts/chromeButton'
import { SettingsCard } from './SettingsCard'
import { StatusPill, type StatusTone } from './parts/StatusPill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

/**
 * Sync → Connection.
 *
 * Six visual states, all in one card:
 *
 *   disconnected (fresh) → endpoint row + "Sign in" primary
 *   disconnected (error) → same, with the previous error surfaced
 *   connecting (device)  → user code + "Open verification page" primary
 *   connected (never)    → identity rows + "Ready to sync · N recordings"
 *                          hero + "Start sync" primary
 *   connected (idle)     → identity rows + "Last synced X · auto-syncing"
 *                          + "Sync now" ghost
 *   connected (failed)   → identity rows + error line + "Retry" primary
 *   syncing              → identity rows + progress line + "Cancel" ghost
 *
 * Disconnect / Test connection live in an overflow menu on the connected
 * states — they're rare actions and don't belong in primary chrome.
 *
 * The user only ever sees a single primary action per state. No bottom
 * sync bar.
 */
export function ConnectionCard(): React.JSX.Element {
  const status = useMymeStore((s) => s.status)
  const probeConnection = useMymeStore((s) => s.probeConnection)
  const disconnect = useMymeStore((s) => s.disconnect)
  const connect = useMymeStore((s) => s.connect)
  const cancelConnect = useMymeStore((s) => s.cancelConnect)
  const syncNow = useMymeStore((s) => s.syncNow)
  const cancelSync = useMymeStore((s) => s.cancelSync)
  const recordingCount = useDataStore((s) => s.recordings.length)

  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [probing, setProbing] = useState(false)
  const [busyAction, setBusyAction] = useState<'connect' | 'disconnect' | 'sync' | 'cancel' | null>(
    null
  )
  const [, setNow] = useState(() => Date.now())

  // Tick once a minute so "Last synced 5m ago" drifts.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  // Probe identity once connected. Clear async on disconnect so the
  // sync-setState-in-effect heuristic stays happy.
  useEffect(() => {
    if (status?.kind !== 'connected' && status?.kind !== 'syncing') {
      const t = window.setTimeout(() => setProbe(null), 0)
      return () => window.clearTimeout(t)
    }
    let cancelled = false
    void (async () => {
      setProbing(true)
      try {
        const result = await probeConnection()
        if (!cancelled) setProbe(result)
      } finally {
        if (!cancelled) setProbing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status?.kind, probeConnection])

  async function run(action: 'connect' | 'disconnect' | 'sync' | 'cancel'): Promise<void> {
    setBusyAction(action)
    try {
      if (action === 'connect') await connect()
      else if (action === 'disconnect') await disconnect()
      else if (action === 'sync') await syncNow()
      else if (action === 'cancel') {
        if (status?.kind === 'connecting') await cancelConnect()
        else if (status?.kind === 'syncing') await cancelSync()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function runProbe(): Promise<void> {
    setProbing(true)
    try {
      const result = await probeConnection()
      setProbe(result)
    } finally {
      setProbing(false)
    }
  }

  const { tone, label, title } = computePill(status, probe, probing)

  return (
    <SettingsCard
      icon={Cloud}
      title="Myme"
      subtitle="Push your recordings and sessions into Myme."
      headerExtra={<StatusPill tone={tone} label={label} title={title} />}
    >
      {renderBody({
        status,
        probe,
        recordingCount,
        busyAction,
        onConnect: () => void run('connect'),
        onCancel: () => void run('cancel'),
        onStartSync: () => void run('sync'),
        onSyncNow: () => void run('sync'),
        onRetry: () => void run('sync'),
        onDisconnect: () => void run('disconnect'),
        onTest: () => void runProbe()
      })}
    </SettingsCard>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Body switcher
// ──────────────────────────────────────────────────────────────────────

interface BodyProps {
  status: MymeStatus | null
  probe: ProbeResult | null
  recordingCount: number
  busyAction: 'connect' | 'disconnect' | 'sync' | 'cancel' | null
  onConnect: () => void
  onCancel: () => void
  onStartSync: () => void
  onSyncNow: () => void
  onRetry: () => void
  onDisconnect: () => void
  onTest: () => void
}

function renderBody(p: BodyProps): React.JSX.Element {
  if (!p.status) {
    return <p className="text-[12.5px] text-muted-foreground">Loading…</p>
  }
  if (p.status.kind === 'disconnected') return <DisconnectedBody {...p} status={p.status} />
  if (p.status.kind === 'connecting') return <ConnectingBody {...p} status={p.status} />
  if (p.status.kind === 'syncing') return <SyncingBody {...p} status={p.status} />
  // connected
  return <ConnectedBody {...p} status={p.status} />
}

// ──────────────────────────────────────────────────────────────────────
// Disconnected
// ──────────────────────────────────────────────────────────────────────

function DisconnectedBody({
  status,
  busyAction,
  onConnect
}: BodyProps & { status: Extract<MymeStatus, { kind: 'disconnected' }> }): React.JSX.Element {
  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border text-[13px]">
        <Row label="Endpoint" value={status.endpoint || 'Not configured'} />
      </dl>
      {status.lastError && <p className="text-[12px] text-accent-orange">{status.lastError}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onConnect}
          disabled={busyAction === 'connect'}
          className={CHROME_BUTTON_PRIMARY}
        >
          {busyAction === 'connect' ? 'Starting…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Connecting (device flow)
// ──────────────────────────────────────────────────────────────────────

function ConnectingBody({
  status,
  busyAction,
  onCancel
}: BodyProps & { status: Extract<MymeStatus, { kind: 'connecting' }> }): React.JSX.Element {
  // API-key paste path — minimal until/unless we wire a real input here.
  if (status.mode === 'api-key') {
    return (
      <div className="space-y-3">
        <p className="text-[12.5px] text-muted-foreground">
          Paste your Myme API key to finish connecting.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onCancel} className={CHROME_BUTTON}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Device flow — waiting for the user code + verification URI.
  if (!status.userCode) {
    return (
      <div className="space-y-3">
        <p className="text-[12.5px] text-muted-foreground">Preparing sign-in…</p>
        <div className="flex justify-end">
          <button type="button" onClick={onCancel} className={CHROME_BUTTON}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const openUrl = status.verificationUriComplete || status.verificationUri
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-foreground/[0.02] px-4 py-4">
        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Your code</p>
        <p className="mt-1 text-[22px] font-semibold tracking-[0.18em] text-foreground">
          {status.userCode}
        </p>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Open the verification page and the code will be filled in for you.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          disabled={busyAction === 'cancel'}
          className="inline-flex h-7 items-center rounded-md px-3 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void window.api.openExternal(openUrl)}
          className={CHROME_BUTTON_PRIMARY}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
          Open verification page
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Connected — three sub-states share an identity-rows + actions shape
// ──────────────────────────────────────────────────────────────────────

function ConnectedBody({
  status,
  probe,
  recordingCount,
  busyAction,
  onStartSync,
  onSyncNow,
  onRetry,
  onDisconnect,
  onTest
}: BodyProps & { status: Extract<MymeStatus, { kind: 'connected' }> }): React.JSX.Element {
  const account = describeIdentity(probe)
  const neverSynced = status.lastSyncedAt === null && !status.lastError
  const failed = !!status.lastError

  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border text-[13px]">
        <Row label="Account" value={account} />
        <Row label="Endpoint" value={status.endpoint} />
      </dl>

      {neverSynced && (
        <div className="flex items-center justify-between rounded-lg bg-foreground/[0.025] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-foreground">Ready to sync</p>
            <p className="text-[12px] text-muted-foreground">
              {recordingCount.toLocaleString()} recording
              {recordingCount === 1 ? '' : 's'} will be pushed on the first sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartSync}
            disabled={busyAction === 'sync'}
            className={CHROME_BUTTON_PRIMARY}
          >
            {busyAction === 'sync' ? 'Starting…' : 'Start sync'}
          </button>
        </div>
      )}

      {!neverSynced && !failed && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">
            Synced {relativeTime(status.lastSyncedAt!)} · new recordings push automatically.
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={busyAction === 'sync'}
              className={CHROME_BUTTON}
            >
              {busyAction === 'sync' ? 'Syncing…' : 'Sync now'}
            </button>
            <OverflowMenu onDisconnect={onDisconnect} onTest={onTest} />
          </div>
        </div>
      )}

      {failed && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent-orange/30 bg-accent-orange-bg px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-accent-orange">Last sync failed</p>
            <p className="truncate text-[12px] text-accent-orange/90" title={status.lastError!}>
              {status.lastError}
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={busyAction === 'sync'}
            className={CHROME_BUTTON_PRIMARY}
          >
            {busyAction === 'sync' ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {neverSynced && (
        <div className="flex justify-end">
          <OverflowMenu onDisconnect={onDisconnect} onTest={onTest} />
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Syncing — live progress
// ──────────────────────────────────────────────────────────────────────

function SyncingBody({
  status,
  probe,
  busyAction,
  onCancel
}: BodyProps & { status: Extract<MymeStatus, { kind: 'syncing' }> }): React.JSX.Element {
  const account = describeIdentity(probe)
  const pct = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0
  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border text-[13px]">
        <Row label="Account" value={account} />
        <Row label="Endpoint" value={status.endpoint} />
      </dl>
      <div className="space-y-2 rounded-lg bg-foreground/[0.025] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-foreground">{describePhase(status.phase)}</p>
          <p className="text-[12px] text-muted-foreground">
            {status.processed.toLocaleString()} / {status.total.toLocaleString()}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busyAction === 'cancel'}
          className={CHROME_BUTTON}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function computePill(
  status: MymeStatus | null,
  probe: ProbeResult | null,
  probing: boolean
): { tone: StatusTone; label: string; title?: string } {
  if (!status) return { tone: 'neutral', label: 'Loading…' }
  if (status.kind === 'connecting') return { tone: 'busy', label: 'Connecting…' }
  if (status.kind === 'disconnected') {
    return status.lastError
      ? { tone: 'neutral', label: 'Not connected', title: status.lastError }
      : { tone: 'neutral', label: 'Not connected' }
  }
  if (status.kind === 'syncing') return { tone: 'busy', label: 'Syncing…' }
  // connected
  if (probing && !probe) return { tone: 'busy', label: 'Checking…' }
  if (probe && !probe.ok) return { tone: 'error', label: probe.error }
  if (status.lastError) return { tone: 'error', label: 'Sync error', title: status.lastError }
  return { tone: 'ok', label: 'Connected' }
}

function describeIdentity(probe: ProbeResult | null): string {
  if (!probe) return '—'
  if (!probe.ok) return '—'
  if (probe.displayName && probe.email) return `${probe.displayName} · ${probe.email}`
  if (probe.displayName) return probe.displayName
  if (probe.email) return probe.email
  return 'Signed in'
}

function describePhase(phase: string): string {
  switch (phase) {
    case 'preparing':
      return 'Preparing'
    case 'recordings':
      return 'Syncing recordings'
    case 'sessions':
      return 'Syncing sessions'
    default:
      return 'Syncing'
  }
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground" title={value}>
        {value}
      </dd>
    </div>
  )
}

function OverflowMenu({
  onDisconnect,
  onTest
}: {
  onDisconnect: () => void
  onTest: () => void
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem] text-[12.5px]">
        <DropdownMenuItem onSelect={onTest}>Test connection</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDisconnect}>Disconnect</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
