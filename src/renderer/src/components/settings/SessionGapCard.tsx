import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useConfigStore } from '@renderer/state/configStore'
import { Layers } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

const GAP_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 120, label: '120 minutes' }
]

/**
 * Analysis → Sessions. The canonical home for the session-gap value —
 * the threshold that decides "this recording belongs to the same
 * session as the previous one".
 *
 * Lives on Analysis because it's a definition of what counts as a
 * session, not a Sync setting. The Myme Sessions pipeline reads from
 * the same config field; the Sessions PipelineCard surfaces a
 * read-only mirror of this value with a link back here.
 *
 * Backend unification (renderer Usage view + sync engine reading the
 * same value) is the follow-up. The dropdown UI lands now.
 */
export function SessionGapCard(): React.JSX.Element {
  const value = useConfigStore((s) => s.sessionGapThresholdMinutes)
  const setValue = useConfigStore((s) => s.setSessionGapThresholdMinutes)

  // Map the persisted value to the nearest dropdown option so a
  // freshly migrated config with a weird value still highlights
  // something sensible.
  const selected = GAP_OPTIONS.find((o) => o.value === value)?.value ?? 30

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
        <Select value={String(selected)} onValueChange={(v) => void setValue(Number(v))}>
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GAP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  )
}
