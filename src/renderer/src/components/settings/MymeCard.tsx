import { SettingsCard } from './SettingsCard'
import { cn } from '@renderer/lib/cn'
import { useConfigStore } from '@renderer/state/configStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MymeStatus } from '../../../../preload/api'

/**
 * Settings → Integrations → Myme card.
 *
 * One card, five effective states:
 *
 *   1. `disabled`     — demo mode is on, or no recordings path. Card is
 *                       greyed out; sync engine is inert.
 *   2. `disconnected` — endpoint URL + "Connect to Myme" button.
 *   3. `connecting`   — API-key paste-and-verify pane.
 *   4. `connected`    — last synced time + "Sync now" + a "Push N most
 *                       recent (testing)" knob for smoke runs. If
 *                       `lastError` is set, an inline error row appears
 *                       below.
 *   5. `syncing`      — progress text + Cancel button. The signal
 *                       threaded into the engine stops further upserts
 *                       once aborted; partial state is persisted.
 *
 * Failure paths never reach the main app — Myme is optional, so its
 * problems stay in this card. (Deliberate departure from how scan
 * errors surface elsewhere.)
 */
export function MymeCard(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const demoMode = useConfigStore((s) => s.demoMode)
  const status = useMymeStore((s) => s.status)
  const hydrated = useMymeStore((s) => s.hydrated)
  const hydrate = useMymeStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const disabledReason: 'demo-mode' | 'no-recordings-path' | null = demoMode
    ? 'demo-mode'
    : !path
      ? 'no-recordings-path'
      : null

  return (
    <SettingsCard
      icon={disabledReason ? CloudOff : Cloud}
      title="Myme"
      subtitle="Optional — push your recordings into a Myme tenant. Local-only by default."
    >
      {disabledReason ? (
        <DisabledBody reason={disabledReason} />
      ) : !hydrated || !status ? (
        <PendingBody />
      ) : (
        <StatusBody status={status} />
      )}
    </SettingsCard>
  )
}

function DisabledBody({
  reason
}: {
  reason: 'demo-mode' | 'no-recordings-path'
}): React.JSX.Element {
  const message =
    reason === 'demo-mode'
      ? 'Disabled while demo mode is on. Toggle demo off to enable.'
      : 'Disabled until a recordings folder is configured.'
  return <p className="text-[12.5px] text-muted-foreground">{message}</p>
}

function PendingBody(): React.JSX.Element {
  return <p className="text-[12.5px] text-muted-foreground">Loading…</p>
}

function StatusBody({ status }: { status: MymeStatus }): React.JSX.Element {
  switch (status.kind) {
    case 'disconnected':
      return <DisconnectedBody endpoint={status.endpoint} lastError={status.lastError} />
    case 'connecting':
      return <ConnectingBody />
    case 'connected':
      return (
        <ConnectedBody
          endpoint={status.endpoint}
          syncLimit={status.syncLimit}
          lastSyncedAt={status.lastSyncedAt}
          lastError={status.lastError}
        />
      )
    case 'syncing':
      return <SyncingBody phase={status.phase} processed={status.processed} total={status.total} />
  }
}

const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

function DisconnectedBody({
  endpoint,
  lastError
}: {
  endpoint: string
  lastError: string | null
}): React.JSX.Element {
  const setEndpoint = useMymeStore((s) => s.setEndpoint)
  const connect = useMymeStore((s) => s.connect)
  const [draft, setDraft] = useState(endpoint)
  const [busy, setBusy] = useState(false)

  const trimmed = draft.trim()
  const looksValid = /^https?:\/\/[^\s]+$/i.test(trimmed)
  const changed = trimmed !== endpoint && looksValid

  async function commitEndpoint(): Promise<void> {
    if (!changed) return
    setBusy(true)
    try {
      await setEndpoint(trimmed)
    } finally {
      setBusy(false)
    }
  }

  async function doConnect(): Promise<void> {
    setBusy(true)
    try {
      // Make sure the endpoint is persisted before kicking off the flow
      // so the connect path uses the user's intended URL even if they
      // didn't blur out of the input first.
      if (changed) await setEndpoint(trimmed)
      await connect()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-[12px] text-muted-foreground">
        Endpoint
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEndpoint()}
          disabled={busy}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="mt-1 block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        />
        {!looksValid && trimmed.length > 0 && (
          <span className="mt-1 block text-[11.5px] text-accent-orange">
            Endpoint should start with http:// or https://
          </span>
        )}
      </label>
      {lastError && (
        <p className="rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
          {lastError}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void doConnect()}
          disabled={busy || !looksValid}
          className={CHROME_BUTTON}
        >
          Connect to Myme
        </button>
      </div>
    </div>
  )
}

function ConnectingBody(): React.JSX.Element {
  const submitApiKey = useMymeStore((s) => s.submitApiKey)
  const disconnect = useMymeStore((s) => s.disconnect)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)

  const trimmed = key.trim()
  const canSubmit = trimmed.length > 0 && !busy

  async function submit(): Promise<void> {
    if (!canSubmit) return
    setBusy(true)
    try {
      await submitApiKey(trimmed)
    } finally {
      setBusy(false)
    }
  }
  function cancel(): void {
    void disconnect()
  }
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-foreground">
        Paste your Myme API key to connect. Generate one in your Myme client — it stays on this Mac,
        encrypted via Keychain.
      </p>
      <label className="block text-[12px] text-muted-foreground">
        API key
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={busy}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="myme_k1_…"
          className="mt-1 block w-full rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none disabled:opacity-50"
        />
      </label>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={cancel} disabled={busy} className={CHROME_BUTTON}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className={CHROME_BUTTON}
        >
          {busy ? 'Verifying…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

function ConnectedBody({
  endpoint,
  syncLimit,
  lastSyncedAt,
  lastError
}: {
  endpoint: string
  syncLimit: number
  lastSyncedAt: string | null
  lastError: string | null
}): React.JSX.Element {
  const syncNow = useMymeStore((s) => s.syncNow)
  const disconnect = useMymeStore((s) => s.disconnect)
  const setSyncLimit = useMymeStore((s) => s.setSyncLimit)
  const [busy, setBusy] = useState(false)
  // Re-render once a minute so "5m ago" drifts without a custom hook.
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
  async function doDisconnect(): Promise<void> {
    setBusy(true)
    try {
      await disconnect()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <dl className="divide-y divide-border text-[13px]">
        <Row k="Endpoint" v={endpoint} />
        <Row k="Last synced" v={lastSyncedAt ? formatRelative(lastSyncedAt) : 'Never'} />
      </dl>
      {lastError && (
        <p className="rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 py-2 text-[12px] text-accent-orange">
          Last sync failed: {lastError}
        </p>
      )}
      <SyncLimitRow value={syncLimit} onCommit={setSyncLimit} disabled={busy} />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => void doDisconnect()}
          disabled={busy}
          className={CHROME_BUTTON}
        >
          Disconnect
        </button>
        <button
          type="button"
          onClick={() => void doSync()}
          disabled={busy}
          className={CHROME_BUTTON}
        >
          <RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} strokeWidth={1.8} />
          Sync now
        </button>
      </div>
    </div>
  )
}

/**
 * The "push N most-recent" testing knob. Placed inside the connected
 * card so it's clearly bound to the active integration; 0 means full
 * sync. Number-only input, persisted on blur (so typing-in-progress
 * doesn't churn the IPC). Hidden when the card is in any other state.
 */
function SyncLimitRow({
  value,
  onCommit,
  disabled
}: {
  value: number
  onCommit: (n: number) => Promise<void>
  disabled: boolean
}): React.JSX.Element {
  // Key the row by the committed value so the input resets to the new
  // canonical value whenever it changes externally (e.g. disconnect →
  // reconnect resets back to whatever was persisted). Avoids the
  // setState-in-effect anti-pattern.
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
    <div className="rounded-md border border-dashed border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-foreground">
            Push N most recent (testing)
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            0 syncs the full set. Sessions + disk-delete pass are skipped while a limit is in
            effect.
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

function SyncingBody({
  phase,
  processed,
  total
}: {
  phase: 'preparing' | 'recordings' | 'sessions'
  processed: number
  total: number
}): React.JSX.Element {
  const cancelSync = useMymeStore((s) => s.cancelSync)
  const [cancelling, setCancelling] = useState(false)
  const label =
    phase === 'preparing'
      ? 'Preparing…'
      : phase === 'recordings'
        ? 'Syncing recordings'
        : 'Syncing sessions'

  async function doCancel(): Promise<void> {
    setCancelling(true)
    try {
      await cancelSync()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12.5px] text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={1.8} />
          {label}
        </span>
        {total > 0 && (
          <span className="tabular-nums text-muted-foreground">
            {processed.toLocaleString()} / {total.toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void doCancel()}
          disabled={cancelling}
          className={CHROME_BUTTON}
        >
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-foreground" title={v}>
        {v}
      </dd>
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
