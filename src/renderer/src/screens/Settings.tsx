import { AboutCard } from '@renderer/components/settings/AboutCard'
import { AppDataCard } from '@renderer/components/settings/AppDataCard'
import { AppearanceCard } from '@renderer/components/settings/AppearanceCard'
import { ConnectionCard } from '@renderer/components/settings/ConnectionCard'
import { DeveloperCard } from '@renderer/components/settings/DeveloperCard'
import { FillerDictionaryCard } from '@renderer/components/settings/FillerDictionaryCard'
import { IndexingCard } from '@renderer/components/settings/IndexingCard'
import { PipelineCard } from '@renderer/components/settings/PipelineCard'
import { RecordingsFolderCard } from '@renderer/components/settings/RecordingsFolderCard'
import { SessionGapCard } from '@renderer/components/settings/SessionGapCard'
import { TranscriptsCard } from '@renderer/components/settings/TranscriptsCard'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { useState } from 'react'

type SettingsTab = 'general' | 'analysis' | 'sync' | 'developer' | 'about'

const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'sync', label: 'Sync' },
  { id: 'developer', label: 'Developer' },
  { id: 'about', label: 'About' }
]

/**
 * Settings screen. A thin orchestrator — each tab renders a set of
 * cards from `components/settings/`. The redesign (May 2026) split the
 * old four-tab structure into five, surfaced two new persisted fields
 * (pipeline-enabled flags + a configurable session-gap), and rebuilt
 * the Sync tab as a destination panel (Connection card + two Pipeline
 * cards + a sticky action bar) instead of the old single-card Myme
 * pane.
 *
 *   General    → Recordings folder · Appearance · Transcripts
 *   Analysis   → Indexing · Filler dictionary
 *   Sync       → Connection · Recordings pipeline · Sessions pipeline
 *   Developer  → Developer (demo data + devtools) · App data (reset)
 *   About      → About
 *
 * The tab strip uses the same lifted-pill segmented control as the
 * navbar range pill. The navbar's range pill is hidden on this route
 * via `RootLayout`.
 */
export function Settings(): React.JSX.Element {
  const [tab, setTab] = useState<SettingsTab>('general')
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-8 pt-2">
      <SegmentedTabs<SettingsTab>
        value={tab}
        onChange={setTab}
        options={SETTINGS_TABS}
        ariaLabel="Settings sections"
      />
      {tab === 'general' && (
        <>
          <RecordingsFolderCard />
          <AppearanceCard />
          <TranscriptsCard />
        </>
      )}
      {tab === 'analysis' && (
        <>
          <IndexingCard />
          <SessionGapCard />
          <FillerDictionaryCard />
        </>
      )}
      {tab === 'sync' && (
        <>
          <ConnectionCard />
          <PipelineCard kind="recording" />
          <PipelineCard kind="session" />
        </>
      )}
      {tab === 'developer' && (
        <>
          <DeveloperCard />
          <AppDataCard />
        </>
      )}
      {tab === 'about' && <AboutCard />}
    </div>
  )
}
