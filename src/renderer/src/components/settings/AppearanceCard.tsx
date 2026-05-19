import { Sun } from 'lucide-react'
import { AppearancePicker } from './AppearancePicker'
import { SettingsCard } from './SettingsCard'

/** Wrapper around the existing `AppearancePicker`. Promoted out of
 *  `screens/Settings.tsx` so the new orchestrator stays thin. */
export function AppearanceCard(): React.JSX.Element {
  return (
    <SettingsCard
      icon={Sun}
      title="Appearance"
      subtitle="Match your system theme, or pick a fixed mode."
    >
      <AppearancePicker />
    </SettingsCard>
  )
}
