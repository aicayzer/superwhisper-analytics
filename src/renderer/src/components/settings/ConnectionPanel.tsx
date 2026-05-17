import { useMymeStore } from '@renderer/state/mymeStore'
import { Check, CircleAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProbeResult } from '../../../../preload/api'

/**
 * Connection panel — top section of the connected card. Shows the
 * endpoint, who's signed in (resolved on demand via `profile.get`),
 * and offers a Test connection button + a Disconnect action.
 *
 * The probe runs on mount and on click. Result lives in local state;
 * no store churn because the value isn't useful elsewhere in the
 * renderer.
 */
export function ConnectionPanel({
  endpoint,
  busy
}: {
  endpoint: string
  busy: boolean
}): React.JSX.Element {
  const probeConnection = useMymeStore((s) => s.probeConnection)
  const disconnect = useMymeStore((s) => s.disconnect)
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [probing, setProbing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

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
    <div className="space-y-2">
      <div className="text-[12px] font-medium text-foreground">Connection</div>
      <div className="rounded-md border border-border divide-y divide-border text-[12.5px]">
        <Row label="Endpoint" value={endpoint} mono />
        <Row label="Account" value={describeIdentity(probe, probing)} />
        <StatusRow probe={probe} probing={probing} />
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => void doDisconnect()}
          disabled={busy || disconnecting}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
        >
          Disconnect
        </button>
        <button
          type="button"
          onClick={() => void runProbe()}
          disabled={busy || probing}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating"
        >
          {probing ? 'Testing…' : 'Test connection'}
        </button>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3 px-3 py-2">
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

function StatusRow({
  probe,
  probing
}: {
  probe: ProbeResult | null
  probing: boolean
}): React.JSX.Element {
  if (probing && !probe) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-muted-foreground">Checking…</dd>
      </div>
    )
  }
  if (!probe) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-muted-foreground">—</dd>
      </div>
    )
  }
  if (probe.ok) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="inline-flex items-center gap-1.5 text-accent-green">
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          Reachable
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
        </dd>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <dt className="text-muted-foreground">Status</dt>
      <dd className="inline-flex items-center gap-1.5 text-accent-orange" title={probe.error}>
        <CircleAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="truncate">{probe.error}</span>
      </dd>
    </div>
  )
}

function describeIdentity(probe: ProbeResult | null, probing: boolean): string {
  if (probing && !probe) return 'Resolving…'
  if (!probe) return '—'
  if (!probe.ok) return '—'
  if (probe.displayName && probe.email) return `${probe.displayName} (${probe.email})`
  if (probe.displayName) return probe.displayName
  if (probe.email) return probe.email
  return 'Signed in'
}
