import { AppearancePicker } from '@renderer/components/settings/AppearancePicker'
import { SettingsCard } from '@renderer/components/settings/SettingsCard'
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
  ExternalLink,
  Folder,
  Info,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const GITHUB_URL = 'https://github.com/aicayzer/superwhisper-analytics'
const DISCLAIMER =
  'Personal project, not affiliated with SuperWhisper. Shared in case it’s useful to anyone else.'

/**
 * Card-based Settings page. Each section is a `<SettingsCard>` with an
 * icon header + body content. Sections, in order:
 *
 *   1. Recordings folder — path, indexed stats, Choose/Reindex.
 *   2. Appearance — preview cards (Light / System / Dark).
 *   3. Indexing — Watch folder + Index transcripts only toggles.
 *   4. Transcripts — segment / inline view-mode preference.
 *   5. Dictionary — searchable, scrollable filler-phrase list.
 *   6. About — version (live from package.json), GitHub link, MIT,
 *              and an "unaffiliated" disclaimer.
 */
export function Settings(): React.JSX.Element {
  // No top header: the navbar already shows "Settings" in the title row,
  // and the local-companion tagline now lives inside the About card so
  // we don't burn vertical space on a duplicate.
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-8 pt-2">
      <RecordingsCard />
      <AppearanceCard />
      <IndexingCard />
      <DemoModeCard />
      <TranscriptsCard />
      <DictionaryCard />
      <AboutCard />
    </div>
  )
}

// ---------- Recordings folder ------------------------------------------

function RecordingsCard(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const isValid = useConfigStore((s) => s.isValid)
  const isInsideHome = useConfigStore((s) => s.isInsideHome)
  const setPath = useConfigStore((s) => s.setPath)
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
    if (chosen) await setPath(chosen)
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

/** Status line shown in the Recordings card header. Mirrors the sidebar
 *  footer: a status dot, an "Indexed Xm ago" / "Scanning…" string, and
 *  a refresh button rendered alongside (handled by the caller).
 *
 *  When valid + idle, the text is `Indexed Xm ago` so the user gets the
 *  same affordance the sidebar provides without scanning to a separate
 *  Stat below. Other states (scanning, reindexing, error, not-found)
 *  surface their own dedicated copy. */
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
  const dot =
    tone === 'ok'
      ? 'bg-emerald-500'
      : tone === 'error'
        ? 'bg-red-500'
        : 'bg-amber-500 animate-pulse'
  const text = (() => {
    if (reindexing) return 'Reindexing…'
    if (busy) return label
    if (tone === 'ok' && indexedAt) return `Indexed ${relativeTime(indexedAt)}`
    return label
  })()
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden />
      {text}
    </span>
  )
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
  const autoHideSidebar = useConfigStore((s) => s.autoHideSidebar)
  const setAutoHideSidebar = useConfigStore((s) => s.setAutoHideSidebar)
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
        <ToggleRow
          label="Auto-hide sidebar on narrow windows"
          description="Collapse the sidebar when the window is under 900px wide. Reopen with Cmd-B or the navbar icon."
          checked={autoHideSidebar}
          onChange={(next) => void setAutoHideSidebar(next)}
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

  return (
    <SettingsCard icon={Info} title="About" subtitle="Version, source and license.">
      {/* Local-companion tagline lives here now that the top Settings
          header has been removed — it's the right home for it, alongside
          version + license + the unaffiliated disclaimer. */}
      <p className="text-[12.5px] text-muted-foreground">
        SuperWhisper Analytics is a local companion. Nothing leaves your machine.
      </p>
      <dl className="mt-4 divide-y divide-border text-[13px]">
        <Row k="Version" v={`v${__APP_VERSION__}`} />
        <Row k="License" v="MIT" />
      </dl>
      <p className="mt-4 text-[12.5px] text-muted-foreground">{DISCLAIMER}</p>
      <button
        type="button"
        onClick={openGithub}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-accent-blue hover:underline"
      >
        View on GitHub
        <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
      </button>
    </SettingsCard>
  )
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums text-foreground">{v}</dd>
    </div>
  )
}
