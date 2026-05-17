import { ConnectionCard } from './ConnectionCard'
import { SettingsCard } from './SettingsCard'
import { SyncCard } from './SyncCard'
import { TypeMappingCard } from './TypeMappingCard'
import { useConfigStore } from '@renderer/state/configStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { Check, Cloud, CloudOff, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MymeStatus } from '../../../../preload/api'

/**
 * Settings → Myme tab. Renders one or more SettingsCards depending on
 * the integration's lifecycle state:
 *
 *   • disabled                  → single "Myme" card explaining why.
 *   • disconnected / connecting → single "Connection" card carrying the
 *     endpoint + connect flow (device-flow code / API-key paste).
 *   • connected / syncing       → three sibling cards in order:
 *                                  Connection · Sync · Type mapping.
 *
 * The tab strip lives in `Settings.tsx`; this module knows nothing
 * about it. Each connected-state card lives in its own file
 * (`ConnectionCard.tsx`, `SyncCard.tsx`, `TypeMappingCard.tsx`).
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

  if (disabledReason) {
    return <DisabledCard reason={disabledReason} />
  }
  if (!hydrated || !status) {
    return (
      <SettingsCard
        icon={Cloud}
        title="Myme"
        subtitle="Push your recordings into a Myme tenant. Off by default — local-only until you connect."
      >
        <p className="text-[12.5px] text-muted-foreground">Loading…</p>
      </SettingsCard>
    )
  }

  if (status.kind === 'connected' || status.kind === 'syncing') {
    return (
      <>
        <ConnectionCard
          endpoint={status.endpoint}
          syncing={status.kind === 'syncing'}
          syncProgress={
            status.kind === 'syncing'
              ? { phase: status.phase, processed: status.processed, total: status.total }
              : null
          }
        />
        <SyncCard
          lastSyncedAt={status.kind === 'connected' ? status.lastSyncedAt : null}
          lastError={status.kind === 'connected' ? status.lastError : null}
          syncing={status.kind === 'syncing'}
          syncProgress={
            status.kind === 'syncing'
              ? { phase: status.phase, processed: status.processed, total: status.total }
              : null
          }
        />
        <TypeMappingCard disabled={status.kind === 'syncing'} />
      </>
    )
  }

  // disconnected / connecting — single card carrying the connect flow.
  return <ConnectFlowCard status={status} />
}

function DisabledCard({
  reason
}: {
  reason: 'demo-mode' | 'no-recordings-path'
}): React.JSX.Element {
  const message =
    reason === 'demo-mode'
      ? 'Turn demo mode off to push real recordings into Myme.'
      : 'Pick a recordings folder under General before connecting to Myme.'
  return (
    <SettingsCard
      icon={CloudOff}
      title="Myme"
      subtitle="Push your recordings into a Myme tenant. Off by default — local-only until you connect."
    >
      <p className="text-[12.5px] text-muted-foreground">{message}</p>
    </SettingsCard>
  )
}

const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

function ConnectFlowCard({ status }: { status: MymeStatus }): React.JSX.Element {
  return (
    <SettingsCard
      icon={Cloud}
      title="Connect to Myme"
      subtitle="Sign in to push your recordings into a Myme tenant. Off by default — local-only until you connect."
    >
      <ConnectFlowBody status={status} />
    </SettingsCard>
  )
}

function ConnectFlowBody({ status }: { status: MymeStatus }): React.JSX.Element {
  switch (status.kind) {
    case 'disconnected':
      return <DisconnectedBody endpoint={status.endpoint} lastError={status.lastError} />
    case 'connecting':
      if (status.mode === 'device') {
        return (
          <DeviceConnectingBody
            userCode={status.userCode}
            verificationUri={status.verificationUri}
            verificationUriComplete={status.verificationUriComplete}
          />
        )
      }
      return <ApiKeyConnectingBody />
    case 'connected':
    case 'syncing':
      // Unreachable — handled by the orchestrator. Render nothing
      // rather than throwing.
      return <p className="text-[12.5px] text-muted-foreground">—</p>
  }
}

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
          Connect
        </button>
      </div>
    </div>
  )
}

function DeviceConnectingBody({
  userCode,
  verificationUri,
  verificationUriComplete
}: {
  userCode: string
  verificationUri: string
  verificationUriComplete: string | null
}): React.JSX.Element {
  const switchToApiKey = useMymeStore((s) => s.useApiKey)
  const cancelConnect = useMymeStore((s) => s.cancelConnect)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const ready = userCode.length > 0 && verificationUri.length > 0
  const openHref = verificationUriComplete ?? verificationUri

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(userCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard refused — silent
    }
  }

  function openVerify(): void {
    void window.api.openExternal(openHref)
  }

  async function cancel(): Promise<void> {
    setBusy(true)
    try {
      await cancelConnect()
    } finally {
      setBusy(false)
    }
  }

  async function fallback(): Promise<void> {
    setBusy(true)
    try {
      await switchToApiKey()
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="space-y-3">
        <p className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={1.8} />
          Preparing device-flow request…
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className={CHROME_BUTTON}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-foreground">
        Approve this device in your browser. The Myme verification page will ask for the code below.
      </p>
      <div className="rounded-md border border-border bg-card px-3 py-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Your code</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="font-mono text-[20px] font-medium tracking-[0.18em] text-foreground tabular-nums">
            {userCode}
          </div>
          <button
            type="button"
            onClick={() => void copyCode()}
            disabled={busy}
            className={CHROME_BUTTON}
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" strokeWidth={1.8} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" strokeWidth={1.8} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void fallback()}
          disabled={busy}
          className="text-[12px] text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
        >
          Use API key instead
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className={CHROME_BUTTON}
          >
            Cancel
          </button>
          <button type="button" onClick={openVerify} disabled={busy} className={CHROME_BUTTON}>
            <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
            Verify in browser
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiKeyConnectingBody(): React.JSX.Element {
  const submitApiKey = useMymeStore((s) => s.submitApiKey)
  const cancelConnect = useMymeStore((s) => s.cancelConnect)
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
    void cancelConnect()
  }
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-foreground">
        Paste a Myme API key. Stored locally in Keychain — never leaves your Mac.
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
