import { Switch } from '@renderer/components/ui/Switch'
import { toastError, toastSuccess } from '@renderer/lib/toast'
import { useConfigStore } from '@renderer/state/configStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { Code2 } from 'lucide-react'
import { useState } from 'react'
import { CHROME_BUTTON_WARN } from './parts/chromeButton'
import { SettingsCard } from './SettingsCard'

/**
 * Settings → Developer.
 *
 * Both developer-y affordances live in one card:
 *
 *   - Demo data  — swap real recordings for a synthetic dataset
 *   - DevTools   — open the Chromium DevTools panel
 *
 * Rows share the same shape (label + sublabel on the left, switch on
 * the right) and divide-by-border the way every other multi-row
 * settings card does.
 */
export function DeveloperCard(): React.JSX.Element {
  const demoMode = useConfigStore((s) => s.demoMode)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)
  const devTools = useConfigStore((s) => s.devTools)
  const setDevTools = useConfigStore((s) => s.setDevTools)
  const status = useMymeStore((s) => s.status)
  const purgeAllData = useMymeStore((s) => s.purgeAllData)
  const [purging, setPurging] = useState(false)

  async function onPurge(): Promise<void> {
    const ok = window.confirm(
      'Wipe all SuperWhisper recordings and sessions from the connected Myme tenant? Your local files are not affected.'
    )
    if (!ok) return
    setPurging(true)
    try {
      const res = await purgeAllData()
      if (res.ok) {
        toastSuccess({
          message: `Purged ${res.recordings.toLocaleString()} recordings and ${res.sessions.toLocaleString()} sessions.`
        })
      } else {
        toastError({ message: 'Purge failed', copyText: res.error })
      }
    } finally {
      setPurging(false)
    }
  }

  const canPurge = status?.kind === 'connected' && !purging

  return (
    <SettingsCard icon={Code2} title="Developer" subtitle="Tools for debugging and screenshots.">
      <div className="divide-y divide-border">
        <Row
          label="Use demo data"
          sublabel="Swap your recordings for a synthetic dataset — handy for screenshots."
          checked={demoMode}
          onChange={(next) => void setDemoMode(next)}
        />
        <Row
          label="Enable DevTools"
          sublabel="Open the Chromium DevTools panel. Equivalent to ⌘⌥I — persists across restarts."
          checked={devTools}
          onChange={(next) => void setDevTools(next)}
        />
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-foreground">Purge Myme data</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Wipes all SuperWhisper recordings and sessions from the connected Myme tenant and
              clears local sync state. Your local files are not affected.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onPurge()}
            disabled={!canPurge}
            className={CHROME_BUTTON_WARN}
          >
            {purging ? 'Purging…' : 'Purge…'}
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}

function Row({
  label,
  sublabel,
  checked,
  onChange
}: {
  label: string
  sublabel: string
  checked: boolean
  onChange: (next: boolean) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">{sublabel}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}
