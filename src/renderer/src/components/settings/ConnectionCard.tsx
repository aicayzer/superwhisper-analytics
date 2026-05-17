import { SettingsCard } from './SettingsCard'
import { useMymeStore } from '@renderer/state/mymeStore'
import { Check, CircleAlert, Cloud, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProbeResult } from '../../../../preload/api'

/**
 * Connection card — the connected-state "who am I signed in as" view.
 * Sits at the top of the Myme tab when the integration is up.
 *
 * Body:
 *   • Endpoint + signed-in account (resolved via `profile.get`)
 *   • Status pill (Connected / probe error)
 *   • Disconnect + Test connection actions
 */
export function ConnectionCard({
  endpoint,
  syncing
}: {
  endpoint: string
  syncing: boolean
  syncProgress: {
    phase: 'preparing' | 'recordings' | 'sessions'
    processed: number
    total: number
  } | null
}): React.JSX.Element {
  const probeConnection = useMymeStore((s) => s.probeConnection)
  const disconnect = useMymeStore((s) => s.disconnect)
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [probing, setProbing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Initial probe on mount.
  useEffect(() => {
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
  }, [probeConnection])

  async function runProbe(): Promise<void> {
    setProbing(true)
    try {
      const result = await probeConnection()
      setProbe(result)
    } finally {
      setProbing(false)
    }
  }

  async function doDisconnect(): Promise<void> {
    setDisconnecting(true)
    try {
      await disconnect()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <SettingsCard
      icon={Cloud}
      title="Connection"
      subtitle="Where the app pushes to and which account is signed in."
      headerExtra={<StatusPill probe={probe} probing={probing} syncing={syncing} />}
    >
      <div className="space-y-3">
        <dl className="divide-y divide-border text-[13px]">
          <Row label="Endpoint" value={endpoint} mono />
          <Row label="Account" value={describeIdentity(probe, probing)} />
        </dl>
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => void doDisconnect()}
            disabled={disconnecting || syncing}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-transparent px-3 text-[12px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disconnect
          </button>
          <button
            type="button"
            onClick={() => void runProbe()}
            disabled={probing || syncing}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
          >
            {probing ? 'Testing…' : 'Test connection'}
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}

function Row({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={'truncate text-foreground ' + (mono ? 'font-mono text-[12px]' : '')}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

function StatusPill({
  probe,
  probing,
  syncing
}: {
  probe: ProbeResult | null
  probing: boolean
  syncing: boolean
}): React.JSX.Element {
  if (syncing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-floating px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={1.8} />
        Syncing
      </span>
    )
  }
  if (probing && !probe) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-floating px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
        Checking…
      </span>
    )
  }
  if (!probe) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-floating px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
        Unknown
      </span>
    )
  }
  if (probe.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-green/40 bg-accent-green/10 px-2.5 py-0.5 text-[11.5px] text-accent-green">
        <Check className="h-3 w-3" strokeWidth={2} />
        Connected
      </span>
    )
  }
  return (
    <span
      className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border border-accent-orange/40 bg-accent-orange/10 px-2.5 py-0.5 text-[11.5px] text-accent-orange"
      title={probe.error}
    >
      <CircleAlert className="h-3 w-3" strokeWidth={1.8} />
      <span className="truncate">{probe.error}</span>
    </span>
  )
}

function describeIdentity(probe: ProbeResult | null, probing: boolean): string {
  if (probing && !probe) return 'Resolving…'
  if (!probe) return '—'
  if (!probe.ok) return '—'
  if (probe.displayName && probe.email) return `${probe.displayName} · ${probe.email}`
  if (probe.displayName) return probe.displayName
  if (probe.email) return probe.email
  return 'Signed in'
}
