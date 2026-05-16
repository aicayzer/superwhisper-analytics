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
 *   3. `connecting`   — show the device-flow code and verification URI.
 *   4. `connected`    — last synced time + "Sync now". If `lastError`
 *                       is set, an inline error row appears below.
 *   5. `syncing`      — progress text only. No cancel — initial sync of
 *                       ~11k recordings takes ~20–30s; let it run.
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
      return <DisconnectedBody endpoint={status.endpoint} />
    case 'connecting':
      return (
        <ConnectingBody
          userCode={status.userCode}
          verificationUri={status.verificationUri}
          verificationUriComplete={status.verificationUriComplete}
        />
      )
    case 'connected':
      return (
        <ConnectedBody
          endpoint={status.endpoint}
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

function DisconnectedBody({ endpoint }: { endpoint: string }): React.JSX.Element {
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

function ConnectingBody({
  userCode,
  verificationUri,
  verificationUriComplete
}: {
  userCode: string
  verificationUri: string
  verificationUriComplete: string
}): React.JSX.Element {
  const disconnect = useMymeStore((s) => s.disconnect)
  function openLink(): void {
    void window.api.openExternal(verificationUriComplete)
  }
  function cancel(): void {
    void disconnect()
  }
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-foreground">
        Approve this app in Myme to finish connecting. Open the link below and confirm the code
        matches.
      </p>
      <div className="rounded-md border border-border bg-foreground/[0.03] px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">User code</div>
        <div className="mt-0.5 font-mono text-[15px] tracking-wider text-foreground">
          {userCode}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">{verificationUri}</div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={cancel} className={CHROME_BUTTON}>
          Cancel
        </button>
        <button type="button" onClick={openLink} className={CHROME_BUTTON}>
          Open verification page
        </button>
      </div>
    </div>
  )
}

function ConnectedBody({
  endpoint,
  lastSyncedAt,
  lastError
}: {
  endpoint: string
  lastSyncedAt: string | null
  lastError: string | null
}): React.JSX.Element {
  const syncNow = useMymeStore((s) => s.syncNow)
  const disconnect = useMymeStore((s) => s.disconnect)
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

function SyncingBody({
  phase,
  processed,
  total
}: {
  phase: 'preparing' | 'recordings' | 'sessions'
  processed: number
  total: number
}): React.JSX.Element {
  const label =
    phase === 'preparing'
      ? 'Preparing…'
      : phase === 'recordings'
        ? 'Syncing recordings'
        : 'Syncing sessions'
  return (
    <div className="space-y-2">
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
