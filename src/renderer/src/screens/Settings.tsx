import { AppearancePicker } from '@renderer/components/settings/AppearancePicker'
import { MymeCard } from '@renderer/components/settings/MymeCard'
import { SettingsCard } from '@renderer/components/settings/SettingsCard'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { Switch } from '@renderer/components/ui/Switch'
import { cn } from '@renderer/lib/cn'
import { formatCompact, formatDurationSec } from '@renderer/lib/format'
import { DEFAULT_FILLER_PHRASES, normalisePhrases } from '@shared/text-metrics'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useUiPrefsStore } from '@renderer/state/uiPrefsStore'
import {
  AlignLeft,
  BookOpen,
  Code2,
  ExternalLink,
  Folder,
  Info,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { UpdaterStatus } from '../../../preload/api'

type SettingsTab = 'general' | 'data' | 'myme' | 'about'

const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'data', label: 'Data' },
  { id: 'myme', label: 'Myme' },
  { id: 'about', label: 'About' }
]

const GITHUB_URL = 'https://github.com/aicayzer/superwhisper-analytics'
const DISCLAIMER =
  'Personal project, not affiliated with SuperWhisper. Shared in case it’s useful to anyone else.'

/**
 * Settings page, organised into three tabs:
 *
 *   • General — Recordings folder, Appearance, Transcript view-mode,
 *               Demo data toggle. The everyday user preferences.
 *   • Data    — Indexing toggles + Filler-phrase dictionary. Editorial
 *               control over what gets counted and how.
 *   • About   — Version, License, Source, Updates.
 *
 * The tab strip lives at the top using the same lifted-pill segmented
 * visual as the navbar RangePill — keeps the chrome consistent. The
 * navbar's range pill hides on this route (set in RootLayout) so the
 * date-window control doesn't compete with the tab strip.
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
          <RecordingsCard />
          <AppearanceCard />
          <TranscriptsCard />
          <DemoModeCard />
        </>
      )}
      {tab === 'data' && (
        <>
          <IndexingCard />
          <DictionaryCard />
        </>
      )}
      {tab === 'myme' && <MymeCard />}
      {tab === 'about' && (
        <>
          <AboutCard />
          <ResetAppCard />
          <DeveloperCard />
        </>
      )}
    </div>
  )
}

// ---------- Recordings folder ------------------------------------------

function RecordingsCard(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const isValid = useConfigStore((s) => s.isValid)
  const isInsideHome = useConfigStore((s) => s.isInsideHome)
  const setPath = useConfigStore((s) => s.setPath)
  const demoMode = useConfigStore((s) => s.demoMode)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)
  const count = useDataStore((s) => s.count)
  const indexedAt = useDataStore((s) => s.indexedAt)
  const loading = useDataStore((s) => s.loading)
  const reindexing = useDataStore((s) => s.reindexing)
  const error = useDataStore((s) => s.error)
  const scanErrors = useDataStore((s) => s.scanErrors)
  const reindex = useDataStore((s) => s.reindex)
  const totalDurationSec = useDataStore((s) => s.aggregates.overview.totalDurationSec)
  // Tick once a minute so the "5m ago" string drifts naturally without
  // a custom hook per stat.
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  async function choose(): Promise<void> {
    const chosen = await window.api.dialog.pickFolder()
    if (!chosen) return
    // Order matters: persist the path first, THEN flip demo off. The
    // reverse order briefly leaves the renderer in (!demoMode && !path)
    // which fires the welcome-modal trigger and causes a flash before
    // setPath resolves. Path-first means the in-between state is
    // (demoMode && path-set) which the trigger ignores.
    await setPath(chosen)
    if (demoMode) await setDemoMode(false)
  }

  const busy = loading || reindexing
  const status: { label: string; tone: 'ok' | 'busy' | 'error' } = !isValid
    ? { label: 'Path not found', tone: 'error' }
    : loading
      ? { label: 'Scanning…', tone: 'busy' }
      : reindexing
        ? { label: 'Reindexing…', tone: 'busy' }
        : count > 0
          ? { label: 'All recordings indexed', tone: 'ok' }
          : { label: 'Not yet indexed', tone: 'busy' }

  // Top-right of the card header now mirrors the sidebar footer pattern:
  // a small status line + a refresh icon button. Folder picking lives
  // inline at the right edge of the path bar. The previous "Choose folder
  // / Reindex now" button row is gone — both actions are now reachable
  // from the header / path bar.
  const headerExtra = (
    <div className="flex items-center gap-1.5">
      <StatusLine
        label={status.label}
        tone={status.tone}
        indexedAt={indexedAt}
        busy={busy}
        reindexing={reindexing}
      />
      <button
        type="button"
        onClick={() => void reindex()}
        disabled={!isValid || busy}
        title={isValid ? 'Reindex recordings' : 'Pick a valid folder first'}
        aria-label="Reindex recordings"
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors',
          'hover:bg-foreground/5 hover:text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
        )}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', reindexing && 'animate-spin')} strokeWidth={1.8} />
      </button>
    </div>
  )

  return (
    <SettingsCard
      icon={Folder}
      title="Recordings folder"
      subtitle="Where SuperWhisper saves your transcripts."
      headerExtra={headerExtra}
    >
      <div className="space-y-4">
        {/* Path + inline "Choose…" affordance. The path stretches; the
            button sits on the right inside the same surface so the row
            reads as one editable field. */}
        <div
          className="flex items-center gap-2 rounded-md bg-foreground/[0.04] py-1.5 pl-3 pr-1.5"
          title={path ?? 'No folder selected'}
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] leading-relaxed text-muted-foreground">
            {path ?? 'No folder selected'}
          </span>
          <button
            type="button"
            onClick={choose}
            className="inline-flex h-6 shrink-0 items-center rounded-[5px] border border-border bg-floating px-2 text-[11.5px] text-foreground transition-colors hover:bg-foreground/5"
          >
            Choose…
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Stat label="recordings" value={formatCompact(count)} />
          <Stat label="audio" value={formatDurationSec(totalDurationSec)} />
          <Stat label="last indexed" value={indexedAt ? relativeTime(indexedAt) : '—'} />
        </div>
        {error && (
          <p className="text-[12px] text-red-500" role="alert">
            {error}
          </p>
        )}
        {!error && scanErrors > 0 && (
          <p className="text-[12px] text-amber-500" role="status">
            {scanErrors} recording{scanErrors === 1 ? '' : 's'} failed to parse
          </p>
        )}
        {!error && path && !isInsideHome && (
          <p className="text-[12px] text-amber-500" role="status">
            Path outside home directory
          </p>
        )}
      </div>
    </SettingsCard>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-[20px] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-muted-foreground">{label}</div>
    </div>
  )
}

/** Status line shown in the Recordings card header. "Indexed Xm ago" /
 *  "Scanning…" string only — no status dot. The healthy state is the
 *  default and doesn't need a coloured indicator; the unhealthy states
 *  (error / not-found) surface via the inline status text and the
 *  warning rows in the body below. */
function StatusLine({
  label,
  tone,
  indexedAt,
  busy,
  reindexing
}: {
  label: string
  tone: 'ok' | 'busy' | 'error'
  indexedAt: string | null
  busy: boolean
  reindexing: boolean
}): React.JSX.Element {
  const text = (() => {
    if (reindexing) return 'Reindexing…'
    if (busy) return label
    if (tone === 'ok' && indexedAt) return `Indexed ${relativeTime(indexedAt)}`
    return label
  })()
  return <span className="text-[12px] text-muted-foreground">{text}</span>
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffD = Math.floor(diffHr / 24)
  return `${diffD}d ago`
}

const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

// ---------- Appearance ---------------------------------------------------

function AppearanceCard(): React.JSX.Element {
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

// ---------- Indexing -----------------------------------------------------

function IndexingCard(): React.JSX.Element {
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
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}

// ---------- Demo mode ----------------------------------------------------

function DemoModeCard(): React.JSX.Element {
  const demoMode = useConfigStore((s) => s.demoMode)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)
  return (
    <SettingsCard
      icon={Sparkles}
      title="Demo data"
      subtitle="Swap your recordings for a synthetic dataset — handy for screenshots."
    >
      <ToggleRow
        label="Use demo data"
        description="200 days of synthetic recordings across four modes. Toggle off to return to your real data."
        checked={demoMode}
        onChange={(next) => void setDemoMode(next)}
      />
    </SettingsCard>
  )
}

// ---------- Transcripts --------------------------------------------------

function TranscriptsCard(): React.JSX.Element {
  const mode = useUiPrefsStore((s) => s.transcriptViewMode)
  const setMode = useUiPrefsStore((s) => s.setTranscriptViewMode)
  // 'block' = timestamps shown, 'inline' = timestamps hidden. Surface this
  // as a Switch to match the Indexing / Demo data toggles — the dropdown
  // it replaces felt out of place against the rest of Settings.
  const showTimestamps = mode === 'block'
  return (
    <SettingsCard
      icon={AlignLeft}
      title="Transcripts"
      subtitle="How transcripts are laid out in the recording detail view."
    >
      <ToggleRow
        label="Show timestamps"
        description="Render each segment with a clickable [m:ss] prefix; toggle off for a continuous inline transcript."
        checked={showTimestamps}
        onChange={(next) => setMode(next ? 'block' : 'inline')}
      />
    </SettingsCard>
  )
}

// ---------- Dictionary ---------------------------------------------------

function DictionaryCard(): React.JSX.Element {
  const fillerWords = useConfigStore((s) => s.fillerWords)
  const setFillerWords = useConfigStore((s) => s.setFillerWords)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  // Normalise the default list once so the "Reset to default" disabled
  // check matches what main will actually persist.
  const normalisedDefault = useMemo(() => DEFAULT_FILLER_PHRASES.map((w) => w.toLowerCase()), [])
  const isDefault =
    fillerWords.length === normalisedDefault.length &&
    fillerWords.every((w, i) => w === normalisedDefault[i])

  async function commit(next: string[]): Promise<void> {
    setBusy(true)
    try {
      await setFillerWords(next)
    } finally {
      setBusy(false)
    }
  }

  async function add(): Promise<void> {
    // Run the candidate through the same canon as the persisted list,
    // then dedupe against the existing entries — `normalisePhrases` returns
    // an empty list if the draft is blank, a single-entry list otherwise.
    // Merging then re-normalising gives us trim/lower/dedup semantics for
    // free, including whitespace- and case-only duplicates.
    const merged = normalisePhrases([...fillerWords, draft])
    setDraft('')
    if (merged.length === fillerWords.length) return
    await commit(merged)
  }

  async function remove(phrase: string): Promise<void> {
    await commit(fillerWords.filter((w) => w !== phrase))
  }

  async function resetToDefault(): Promise<void> {
    await commit([...DEFAULT_FILLER_PHRASES])
  }

  return (
    <SettingsCard
      icon={BookOpen}
      title="Filler words"
      subtitle="Phrases counted as fillers in the Language analytics."
      headerExtra={
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {fillerWords.length} phrase{fillerWords.length === 1 ? '' : 's'}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex max-h-56 flex-wrap content-start gap-1.5 overflow-y-auto rounded-md border border-border bg-foreground/[0.02] p-2">
          {fillerWords.length === 0 ? (
            <span className="px-2 py-1 text-[12px] text-muted-foreground">
              No filler phrases configured.
            </span>
          ) : (
            fillerWords.map((phrase) => (
              <span
                key={phrase}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-foreground"
              >
                {phrase}
                <button
                  type="button"
                  onClick={() => void remove(phrase)}
                  disabled={busy}
                  aria-label={`Remove "${phrase}"`}
                  title={`Remove "${phrase}"`}
                  className="rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </span>
            ))
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a phrase (e.g. honestly)"
            disabled={busy}
            className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className={CHROME_BUTTON}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => void resetToDefault()}
            disabled={busy || isDefault}
            title={isDefault ? 'Already at defaults' : 'Reset to the built-in phrase list'}
            className={CHROME_BUTTON}
          >
            Reset
          </button>
        </form>
      </div>
    </SettingsCard>
  )
}

// ---------- About --------------------------------------------------------

function AboutCard(): React.JSX.Element {
  function openGithub(): void {
    void window.api.openExternal(GITHUB_URL)
  }

  // Updater state. Initialised from main on mount, then re-rendered via
  // the push subscription on every status change.
  const [status, setStatus] = useState<UpdaterStatus>({ kind: 'idle' })
  useEffect(() => {
    void window.api.updater.status().then(setStatus)
    const off = window.api.updater.onStatus(setStatus)
    return off
  }, [])

  const checking = status.kind === 'checking' || status.kind === 'downloading'

  function check(): void {
    void window.api.updater.check().then(setStatus)
  }

  // Layout:
  //   1. Tagline + disclaimer combined into one paragraph at the top —
  //      saves a trailing legal-style footer and keeps the card tidy.
  //   2. Version / License / Source / Updates in a single label-value
  //      table. The Updates row carries the current updater state +
  //      a manual "Check now" trigger.
  // Reset lives in its own card below — see ResetAppCard.
  return (
    <SettingsCard icon={Info} title="About" subtitle="Version, source, license and updates.">
      <p className="text-[12.5px] leading-relaxed text-foreground">
        SuperWhisper Analytics is a local companion. Nothing leaves your machine.{' '}
        <span className="text-muted-foreground">{DISCLAIMER}</span>
      </p>
      <dl className="mt-4 divide-y divide-border text-[13px]">
        <Row k="Version" v={`v${__APP_VERSION__}`} />
        <Row k="License" v="MIT" />
        <div className="flex items-center justify-between py-2">
          <dt className="text-muted-foreground">Source</dt>
          <dd>
            <button
              type="button"
              onClick={openGithub}
              className="inline-flex items-center gap-1.5 text-accent-blue hover:underline"
            >
              View on GitHub
              <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </dd>
        </div>
        <div className="flex items-center justify-between py-2">
          <dt className="text-muted-foreground">Updates</dt>
          <dd className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">{describeStatus(status)}</span>
            <button type="button" onClick={check} disabled={checking} className={CHROME_BUTTON}>
              <RefreshCw className={cn('h-3 w-3', checking && 'animate-spin')} strokeWidth={1.8} />
              Check now
            </button>
          </dd>
        </div>
      </dl>
    </SettingsCard>
  )
}

// ---------- Reset app ---------------------------------------------------

/**
 * Standalone card for the "Reset app" affordance. Lived inside AboutCard
 * previously but the row was crowding the version table and breaking
 * the visual rhythm of the rest of Settings — separating it gives the
 * action room to breathe and signals that it's a heavier operation than
 * the other About metadata.
 */
function ResetAppCard(): React.JSX.Element {
  const resetApp = useConfigStore((s) => s.resetApp)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function doReset(): Promise<void> {
    setResetting(true)
    try {
      await resetApp()
    } finally {
      setResetting(false)
      setConfirmReset(false)
    }
  }

  return (
    <SettingsCard
      icon={RotateCcw}
      title="Reset app"
      subtitle="Clears your folder and preferences. Recordings on disk are not affected."
    >
      <div className="flex justify-end">
        {confirmReset ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              disabled={resetting}
              className={CHROME_BUTTON}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void doReset()}
              disabled={resetting}
              className={cn(
                // Accent-orange warning palette — same as the demo-mode
                // pill. Reset is reversible (recordings on disk are
                // untouched) so destructive-red would overstate things.
                'inline-flex h-7 items-center rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 text-[12px] font-medium text-accent-orange transition-colors hover:bg-accent-orange/15 disabled:opacity-50'
              )}
            >
              {resetting ? 'Resetting…' : 'Confirm reset'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className={CHROME_BUTTON}>
            Reset…
          </button>
        )}
      </div>
    </SettingsCard>
  )
}

// ---------- Developer ----------------------------------------------------

function DeveloperCard(): React.JSX.Element {
  const devTools = useConfigStore((s) => s.devTools)
  const setDevTools = useConfigStore((s) => s.setDevTools)
  return (
    <SettingsCard icon={Code2} title="Developer" subtitle="Tools for debugging and development.">
      <ToggleRow
        label="Enable DevTools"
        description="Open the Chromium DevTools panel. Equivalent to Cmd+Option+I — persists across restarts."
        checked={devTools}
        onChange={(next) => void setDevTools(next)}
      />
    </SettingsCard>
  )
}

/** Plain-language summary of the updater state, shown next to the
 *  "Check now" button. */
function describeStatus(s: UpdaterStatus): string {
  switch (s.kind) {
    case 'idle':
      return 'Not checked yet'
    case 'checking':
      return 'Checking…'
    case 'up-to-date':
      return 'Up to date'
    case 'available':
      return `Update available (v${s.version})`
    case 'downloading':
      return `Downloading… ${s.percent}%`
    case 'downloaded':
      return `Update downloaded (v${s.version}) — restart to install`
    case 'error':
      return `Couldn't check (${s.message})`
  }
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums text-foreground">{v}</dd>
    </div>
  )
}
