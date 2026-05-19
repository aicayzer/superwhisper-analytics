import { Switch } from '@renderer/components/ui/Switch'
import { useUiPrefsStore } from '@renderer/state/uiPrefsStore'
import { AlignLeft } from 'lucide-react'
import { SettingsCard } from './SettingsCard'

/** Settings → General → Transcripts. Just a "show timestamps" switch
 *  today — the dropdown that used to live here was replaced with a
 *  toggle so it matches the rhythm of the rest of Settings. */
export function TranscriptsCard(): React.JSX.Element {
  const mode = useUiPrefsStore((s) => s.transcriptViewMode)
  const setMode = useUiPrefsStore((s) => s.setTranscriptViewMode)
  const showTimestamps = mode === 'block'
  return (
    <SettingsCard
      icon={AlignLeft}
      title="Transcripts"
      subtitle="How transcripts are laid out in the recording detail view."
    >
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Show timestamps</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Each segment carries a clickable [m:ss] prefix. Toggle off for a continuous inline
            transcript.
          </div>
        </div>
        <Switch
          checked={showTimestamps}
          onChange={(next) => setMode(next ? 'block' : 'inline')}
          ariaLabel="Show timestamps"
        />
      </div>
    </SettingsCard>
  )
}
