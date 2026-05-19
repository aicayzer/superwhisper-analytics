import { Switch } from '@renderer/components/ui/Switch'
import { useConfigStore } from '@renderer/state/configStore'
import { Settings as SettingsIcon } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

/** Settings → Analysis → Indexing. Two toggles that govern how the
 *  local cache stays fresh against the SuperWhisper recordings folder.
 *  The session-gap control used to live here too — it's been moved
 *  inside the Sessions PipelineCard since that's literally where the
 *  value is consumed at sync time. */
export function IndexingCard(): React.JSX.Element {
  const watchFolder = useConfigStore((s) => s.watchFolder)
  const setWatchFolder = useConfigStore((s) => s.setWatchFolder)
  const transcriptsOnly = useConfigStore((s) => s.transcriptsOnly)
  const setTranscriptsOnly = useConfigStore((s) => s.setTranscriptsOnly)
  return (
    <SettingsCard
      icon={SettingsIcon}
      title="Indexing"
      subtitle="Background work that keeps stats fresh."
    >
      <div className="divide-y divide-border">
        <ToggleRow
          label="Watch folder for new recordings"
          description="Auto-index any file dropped into the recordings folder."
          checked={watchFolder}
          onChange={(next) => void setWatchFolder(next)}
        />
        <ToggleRow
          label="Index transcripts only"
          description="Skip audio playback and waveform — transcripts only."
          checked={transcriptsOnly}
          onChange={(next) => void setTranscriptsOnly(next)}
        />
      </div>
    </SettingsCard>
  )
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}
