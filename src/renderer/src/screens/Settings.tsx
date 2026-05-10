import { Segmented } from '@renderer/components/Segmented'
import { cn } from '@renderer/lib/cn'
import { useConfigStore } from '@renderer/state/configStore'
import { useThemeStore, type ThemePref } from '@renderer/state/themeStore'
import { ExternalLink, RefreshCw } from 'lucide-react'

const GITHUB_URL = 'https://github.com/aicayzer/superwhisper-analytics'

const APPEARANCE_OPTIONS: ReadonlyArray<{ value: ThemePref; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' }
]

/**
 * Settings page. Three sections, no boxed cards — sectioned by spacing
 * and headings only. Order:
 *   1. Recordings folder — path display, status, change/reset, reindex
 *      (reindex wires up in wave 4 PR B once the scanner exists).
 *   2. Appearance — three-way Light / System / Dark toggle.
 *   3. About — name, version, GitHub link, licence.
 */
export function Settings(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-2">
      <RecordingsSection />
      <AppearanceSection />
      <AboutSection />
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}

function RecordingsSection(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const isValid = useConfigStore((s) => s.isValid)
  const defaultPath = useConfigStore((s) => s.defaultPath)
  const setPath = useConfigStore((s) => s.setPath)

  async function choose(): Promise<void> {
    const chosen = await window.api.dialog.pickFolder()
    if (chosen) await setPath(chosen)
  }

  async function reset(): Promise<void> {
    if (defaultPath) await setPath(defaultPath)
  }

  const canReset = defaultPath !== null && defaultPath !== path

  return (
    <section>
      <SectionHeading>Recordings folder</SectionHeading>
      <div className="space-y-3">
        <p
          className="break-all rounded-md bg-foreground/[0.04] px-3 py-2 font-mono text-[12px] leading-relaxed text-muted-foreground"
          title={path ?? 'No folder selected'}
        >
          {path ?? 'No folder selected'}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', isValid ? 'bg-emerald-500' : 'bg-red-500')}
            aria-hidden
          />
          <span className="text-[12.5px] text-muted-foreground">
            {isValid ? 'Path valid' : 'Path not found'}
          </span>
          <div className="flex-1" />
          <button type="button" onClick={reset} disabled={!canReset} className={CHROME_BUTTON}>
            Reset to default
          </button>
          <button type="button" onClick={choose} className={CHROME_BUTTON}>
            Choose folder…
          </button>
          <button
            type="button"
            disabled
            title="Available once the data layer ships"
            className={CHROME_BUTTON}
          >
            <RefreshCw className="h-3 w-3" strokeWidth={1.8} />
            Reindex
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * Shared chrome-button styling for the Settings action row. h-7 to match
 * IconButton/RangePill, ghost-bordered floating surface, hover lift.
 */
const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

function AppearanceSection(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)

  return (
    <section>
      <SectionHeading>Appearance</SectionHeading>
      <Segmented value={pref} onChange={setPref} options={APPEARANCE_OPTIONS} ariaLabel="Theme" />
    </section>
  )
}

function AboutSection(): React.JSX.Element {
  function openGithub(): void {
    void window.api.openExternal(GITHUB_URL)
  }

  return (
    <section>
      <SectionHeading>About</SectionHeading>
      <div className="space-y-1.5 text-[13px]">
        <div className="text-foreground">
          SuperWhisper Analytics <span className="text-muted-foreground">v{__APP_VERSION__}</span>
        </div>
        <button
          type="button"
          onClick={openGithub}
          className="inline-flex items-center gap-1.5 text-accent-blue hover:underline"
        >
          View on GitHub
          <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
        </button>
        <p className="text-[12.5px] text-muted-foreground">MIT licensed.</p>
      </div>
    </section>
  )
}
