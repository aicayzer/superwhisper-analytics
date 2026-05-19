import { useConfigStore } from '@renderer/state/configStore'
import { Database } from 'lucide-react'
import { useState } from 'react'
import { CHROME_BUTTON_WARN } from './parts/chromeButton'
import { SettingsCard } from './SettingsCard'

/**
 * Settings → Developer → App data.
 *
 * Sits below the Developer card on the Developer tab. Single row,
 * single action: reset the app. Confirmation is a native
 * `window.confirm` rather than a bespoke modal — same affordance as
 * the rest of macOS, no design surface needed.
 *
 * Sibling to DeveloperCard's row shape: label + sublabel on the left,
 * an action button on the right (where DeveloperCard puts a switch).
 */
export function AppDataCard(): React.JSX.Element {
  const resetApp = useConfigStore((s) => s.resetApp)
  const [resetting, setResetting] = useState(false)

  async function doReset(): Promise<void> {
    const ok = window.confirm(
      'Reset all settings? Your recordings folder, sync credentials, filler dictionary and UI preferences will be cleared. Recordings on disk are not affected.'
    )
    if (!ok) return
    setResetting(true)
    try {
      await resetApp()
    } finally {
      setResetting(false)
    }
  }

  return (
    <SettingsCard
      icon={Database}
      title="Data"
      subtitle="Stored preferences, credentials and dictionaries."
    >
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Reset app configuration</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Clears your folder and preferences. Recordings on disk are not affected.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void doReset()}
          disabled={resetting}
          className={CHROME_BUTTON_WARN}
        >
          {resetting ? 'Resetting…' : 'Reset'}
        </button>
      </div>
    </SettingsCard>
  )
}
