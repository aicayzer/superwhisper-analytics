import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { useConfigStore } from '@renderer/state/configStore'
import { Layers } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

type GapMinutes = 15 | 30 | 60 | 120

const GAP_OPTIONS: ReadonlyArray<{ id: `${GapMinutes}`; label: string }> = [
  { id: '15', label: '15m' },
  { id: '30', label: '30m' },
  { id: '60', label: '60m' },
  { id: '120', label: '120m' }
]

/**
 * Analysis → Sessions. Canonical home for the session-gap threshold —
 * the value that decides "this recording belongs to the same session
 * as the previous one".
 *
 * Picker is a SegmentedTabs control, not a dropdown — visually rhymes
 * with the Settings tab strip and the navbar range pill, so the chrome
 * stays consistent across the app.
 */
export function SessionGapCard(): React.JSX.Element {
  const value = useConfigStore((s) => s.sessionGapThresholdMinutes)
  const setValue = useConfigStore((s) => s.setSessionGapThresholdMinutes)

  // Map the persisted value to the nearest dropdown option so a
  // freshly migrated config with a weird value still highlights
  // something sensible.
  const selected: `${GapMinutes}` = GAP_OPTIONS.find((o) => Number(o.id) === value)?.id ?? '30'

  return (
    <SettingsCard
      icon={Layers}
      title="Sessions"
      subtitle="How recordings group into sessions in your stats."
    >
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Session gap</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Recordings within this gap count as the same session.
          </div>
        </div>
        <SegmentedTabs<`${GapMinutes}`>
          value={selected}
          onChange={(next) => void setValue(Number(next))}
          options={GAP_OPTIONS}
          ariaLabel="Session gap in minutes"
          className="self-center"
        />
      </div>
    </SettingsCard>
  )
}
