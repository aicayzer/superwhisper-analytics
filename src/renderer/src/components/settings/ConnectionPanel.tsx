import { useMymeStore } from '@renderer/state/mymeStore'
import { Check, CircleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProbeResult } from '../../../../preload/api'

/**
 * Connection panel — compact footer of the connected card. Endpoint
 * + signed-in account + reachability sit inline; Test connection and
 * Disconnect are the only buttons.
 *
 * The probe runs once on mount and again on click. Result lives in
 * local state — no store churn because the value isn't useful
 * elsewhere in the renderer.
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
    <section className="space-y-2.5">
      <div className="space-y-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Connection
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Where the app pushes to, and which account is signed in.
        </p>
      </div>
      <div className="rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate font-mono text-[12px] text-foreground" title={endpoint}>
              {endpoint}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {describeIdentity(probe, probing)}
            </div>
          </div>
          <StatusPill probe={probe} probing={probing} />
        </div>
        <div className="flex justify-end gap-1.5 border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => void doDisconnect()}
            disabled={busy || disconnecting}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2.5 text-[12px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
    </section>
  )
}

function StatusPill({
  probe,
  probing
}: {
  probe: ProbeResult | null
  probing: boolean
}): React.JSX.Element {
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
      className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-accent-orange/40 bg-accent-orange/10 px-2.5 py-0.5 text-[11.5px] text-accent-orange"
      title={probe.error}
    >
      <CircleAlert className="h-3 w-3" strokeWidth={1.8} />
      <span className="truncate">{probe.error}</span>
    </span>
  )
}

function describeIdentity(probe: ProbeResult | null, probing: boolean): string {
  if (probing && !probe) return 'Resolving account…'
  if (!probe) return 'Account: —'
  if (!probe.ok) return 'Account: —'
  if (probe.displayName && probe.email) return `${probe.displayName} · ${probe.email}`
  if (probe.displayName) return probe.displayName
  if (probe.email) return probe.email
  return 'Signed in'
}
