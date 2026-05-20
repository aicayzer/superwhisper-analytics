import { useMymeStore } from '@renderer/state/mymeStore'
import { useDataStore } from '@renderer/state/dataStore'
import { relativeTime } from '@renderer/lib/format'
import { toastError, toastSuccess } from '@renderer/lib/toast'
import { ChevronDown, Cloud, ExternalLink, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProbeResult, MymeStatus } from '../../../../preload/api'
import { CHROME_BUTTON, CHROME_BUTTON_PRIMARY } from './parts/chromeButton'
import { SettingsCard } from './SettingsCard'
import { StatusPill, type StatusTone } from './parts/StatusPill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

/**
 * Sync → Connection.
 *
 *   disconnected (fresh / error) → Endpoint row + "Sign in" primary
 *   connecting (device)          → User code + "Open verification page"
 *   connected (never synced)     → Identity + "Ready to sync" hero +
 *                                  SplitButton(Start sync)
 *   connected (idle)             → Identity + last-synced caption +
 *                                  SplitButton(Sync now)
 *   connected (failed)           → Identity + small failure caption +
 *                                  SplitButton(Retry)
 *   syncing                      → Identity + progress + Cancel
 *
 * The action chrome is a single `SyncSplitButton` component — outlined
 * (not the dark "primary" face), face + thin pipe + chevron-down
 * trigger in one unit. Same shape across idle / first-sync / failed,
 * different labels — so the failed-state retry doesn't visually fight
 * the steady-state "Sync now".
 *
 * StatusPill in the header reflects the *connection* state only.
 * `lastError` from a failed sync surfaces inside the body as a muted
 * caption; the pill stays "Connected". Wipe-all-data lives on the
 * Developer tab where the rest of the testing affordances sit.
 */
export function ConnectionCard(): React.JSX.Element {
  const status = useMymeStore((s) => s.status)
  const probeConnection = useMymeStore((s) => s.probeConnection)
  const disconnect = useMymeStore((s) => s.disconnect)
  const connect = useMymeStore((s) => s.connect)
  const cancelConnect = useMymeStore((s) => s.cancelConnect)
  const syncNow = useMymeStore((s) => s.syncNow)
  const testSync = useMymeStore((s) => s.testSync)
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

  // Background probe runs on every transition into connected/syncing.
  // Result is used to display the account row — explicit Test connection
  // is a separate flow that surfaces via toast.
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

  async function run(
    action: 'connect' | 'disconnect' | 'sync' | 'test-sync' | 'cancel'
  ): Promise<void> {
    // `test-sync` shares the sync busy lane engine-side.
    setBusyAction(action === 'test-sync' ? 'sync' : action)
    try {
      if (action === 'connect') await connect()
      else if (action === 'disconnect') await disconnect()
      else if (action === 'sync') await syncNow()
      else if (action === 'test-sync') await testSync()
      else if (action === 'cancel') {
        if (status?.kind === 'connecting') await cancelConnect()
        else if (status?.kind === 'syncing') await cancelSync()
      }
    } finally {
      setBusyAction(null)
    }
  }

  async function onTestConnection(): Promise<void> {
    setProbing(true)
    try {
      const result = await probeConnection()
      setProbe(result)
      if (result.ok) {
        toastSuccess({ message: 'Connection OK.' })
      } else {
        toastError({ message: `Connection failed: ${result.error}` })
      }
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
      headerExtra={<StatusPill tone={tone} label={label} title={title} hideIcon />}
    >
      {renderBody({
        status,
        probe,
        recordingCount,
        busyAction,
        onConnect: () => void run('connect'),
        onCancel: () => void run('cancel'),
        onStartSync: () => void run('sync'),
        onTestSync: () => void run('test-sync'),
        onSyncNow: () => void run('sync'),
        onRetry: () => void run('sync'),
        onDisconnect: () => void run('disconnect'),
        onTestConnection: () => void onTestConnection()
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
  onTestSync: () => void
  onSyncNow: () => void
  onRetry: () => void
  onDisconnect: () => void
  onTestConnection: () => void
}

function renderBody(p: BodyProps): React.JSX.Element {
  if (!p.status) return <p className="text-[12.5px] text-muted-foreground">Loading…</p>
  if (p.status.kind === 'disconnected') return <DisconnectedBody {...p} status={p.status} />
  if (p.status.kind === 'connecting') return <ConnectingBody {...p} status={p.status} />
  if (p.status.kind === 'syncing') return <SyncingBody {...p} status={p.status} />
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
    <div className="space-y-4">
      <IdentityBlock probe={null} endpoint={status.endpoint || 'Not configured'} />
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
// Connected — three sub-states share an identity-block + caption +
// SplitButton shape. Caption text varies; button label varies; chrome
// is constant.
// ──────────────────────────────────────────────────────────────────────

function ConnectedBody({
  status,
  probe,
  recordingCount,
  busyAction,
  onStartSync,
  onTestSync,
  onSyncNow,
  onRetry,
  onDisconnect,
  onTestConnection
}: BodyProps & { status: Extract<MymeStatus, { kind: 'connected' }> }): React.JSX.Element {
  const neverSynced = status.lastSyncedAt === null && !status.lastError
  const failed = !!status.lastError

  // Single-source the menu — same items regardless of sub-state, so
  // the dropdown doesn't grow / shrink between renders.
  const menuItems = (
    <>
      <DropdownMenuItem onSelect={onTestSync} disabled={busyAction === 'sync'}>
        Test sync (5 recordings)
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onTestConnection}>Test connection</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={onDisconnect}>
        Disconnect
      </DropdownMenuItem>
    </>
  )

  const cancelled = failed && status.lastSyncCancelled

  // Primary label + busy label for each sub-state. Cancelled gets
  // "Resume" — the engine persists partial progress, so the next sync
  // picks up where it left off rather than starting over.
  let primaryLabel = 'Sync now'
  let busyLabel = 'Syncing…'
  let onPrimary = onSyncNow
  if (neverSynced) {
    primaryLabel = 'Start sync'
    busyLabel = 'Starting…'
    onPrimary = onStartSync
  } else if (cancelled) {
    primaryLabel = 'Resume'
    busyLabel = 'Resuming…'
    onPrimary = onRetry
  } else if (failed) {
    primaryLabel = 'Retry'
    busyLabel = 'Retrying…'
    onPrimary = onRetry
  }

  return (
    <div className="space-y-4">
      <IdentityBlock probe={probe} endpoint={status.endpoint} />

      {neverSynced ? (
        // First-sync hero — slight wash, count of what's about to push,
        // SplitButton with "Start sync" label.
        <div className="rounded-lg bg-foreground/[0.025] px-4 py-3">
          <p className="text-[13px] font-medium text-foreground">Ready to sync</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {recordingCount.toLocaleString()} recording
            {recordingCount === 1 ? '' : 's'} will be pushed to Myme on the first sync.
          </p>
          <div className="mt-3 flex justify-end">
            <SyncSplitButton
              label={primaryLabel}
              busyLabel={busyLabel}
              busy={busyAction === 'sync'}
              onClick={onPrimary}
              menuItems={menuItems}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[12.5px] text-muted-foreground">
            {buildCaption({
              recordingCount,
              syncedRecordings: status.syncedRecordings,
              lastSyncedAt: status.lastSyncedAt,
              lastError: status.lastError,
              cancelled
            })}
          </p>
          <SyncSplitButton
            label={primaryLabel}
            busyLabel={busyLabel}
            busy={busyAction === 'sync'}
            onClick={onPrimary}
            menuItems={menuItems}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Build the one-line muted caption beneath the identity rows.
 *
 * Three shapes, all anchored on the same "X of Y" synced count so the
 * user can see at a glance how far the engine has got:
 *
 *   idle      — "X of Y recordings synced · Z ago"
 *   cancelled — "Sync cancelled · X of Y recordings synced"
 *   failed    — "Sync failed: <reason> · X of Y recordings synced"
 *
 * "X of Y" uses local total (`recordingCount`) as Y. Mode-filter
 * exclusions can drive X < Y even after a successful run; the user
 * reads that as "not everything is pushing" and can check the Modes
 * section if they care.
 */
function buildCaption({
  recordingCount,
  syncedRecordings,
  lastSyncedAt,
  lastError,
  cancelled
}: {
  recordingCount: number
  syncedRecordings: number
  lastSyncedAt: string | null
  lastError: string | null
  cancelled: boolean
}): string {
  const synced = `${syncedRecordings.toLocaleString()} of ${recordingCount.toLocaleString()} recording${recordingCount === 1 ? '' : 's'} synced`
  if (cancelled) return `Sync cancelled · ${synced}`
  if (lastError) return `Sync failed: ${lastError} · ${synced}`
  const when = lastSyncedAt ? `${relativeTime(lastSyncedAt)}` : 'just now'
  return `${synced} · ${when}`
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
  const pct = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 0
  return (
    <div className="space-y-4">
      <IdentityBlock probe={probe} endpoint={status.endpoint} />
      <div className="space-y-2 rounded-lg bg-foreground/[0.025] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-foreground">{describePhase(status.phase)}</p>
          <p className="text-[12px] tabular-nums text-muted-foreground">
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
// SyncSplitButton — one shape, three labels
// ──────────────────────────────────────────────────────────────────────

/**
 * Outlined split-button used across the connected sub-states. The
 * face triggers the primary action; the chevron cell opens the menu.
 * Sized to match `CHROME_BUTTON` so the chrome sits flush with the
 * rest of the app.
 *
 * `min-w-[5.25rem]` on the face keeps the divider from jiggling
 * between "Sync now" and "Syncing…".
 */
function SyncSplitButton({
  label,
  busyLabel,
  busy,
  onClick,
  menuItems
}: {
  label: string
  busyLabel: string
  busy: boolean
  onClick: () => void
  menuItems: React.ReactNode
}): React.JSX.Element {
  // Visual rhythm matches `CHROME_BUTTON` — same border, radius, bg
  // and hover treatment as the Check-now button on About. No shadow,
  // no font-medium, no white-on-dark face. The chevron cell shares the
  // outer chrome and is separated by a single-px border-coloured pipe.
  return (
    <div className="inline-flex h-7 items-stretch overflow-hidden rounded-md border border-border bg-floating">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex min-w-[5.25rem] items-center justify-center gap-1.5 px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
      >
        <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
        {busy ? busyLabel : label}
      </button>
      <div className="w-px self-stretch bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More sync actions"
            className="inline-flex items-center justify-center px-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[11rem] [&_[data-slot=dropdown-menu-item]]:text-[12px]"
        >
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
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
  // Connected — the pill reflects the *connection* only. Sync errors
  // don't flip it; that detail lives in the body caption.
  if (probing && !probe) return { tone: 'busy', label: 'Checking…' }
  if (probe && !probe.ok) return { tone: 'error', label: probe.error }
  return { tone: 'ok', label: 'Connected' }
}

function IdentityBlock({
  probe,
  endpoint
}: {
  probe: ProbeResult | null
  endpoint: string
}): React.JSX.Element {
  return (
    <dl className="divide-y divide-border text-[13px]">
      <Row label="Account" value={describeAccount(probe)} />
      <Row label="Endpoint" value={endpoint} />
    </dl>
  )
}

function describeAccount(probe: ProbeResult | null): string {
  if (!probe?.ok) return '—'
  const { displayName, email } = probe
  if (displayName && email) return `${displayName} (${email})`
  if (displayName) return displayName
  if (email) return email
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
