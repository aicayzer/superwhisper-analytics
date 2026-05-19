import { Switch } from '@renderer/components/ui/Switch'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useMymeStore } from '@renderer/state/mymeStore'
import { cn } from '@renderer/lib/cn'
import { Layers, Mic } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MappingBinding, SourceKind } from '../../../../preload/api'
import { MappingRoot } from './MappingRoot'
import { SettingsCard } from './SettingsCard'
import { Group } from './parts/Group'
import { Stepper } from './parts/Stepper'

interface PipelineCardProps {
  kind: SourceKind
}

/**
 * Sync → Recordings / Sessions pipeline card. The header switch
 * suspends the whole pipeline (no upserts, no soft-deletes — see
 * `engine.ts`). The body is dim + non-interactive when off.
 *
 * Body composition:
 *   • Sessions only: Session-gap stepper row (Recordings has no
 *     gap concept).
 *   • Mapping editor (`MappingRoot`).
 *   • Recordings only: Modes section (per-mode toggles for which
 *     SuperWhisper modes get synced).
 */
export function PipelineCard({ kind }: PipelineCardProps): React.JSX.Element {
  const labels =
    kind === 'recording'
      ? {
          title: 'Recordings',
          subtitle: "Push each transcript to Myme as it's saved.",
          icon: Mic
        }
      : {
          title: 'Sessions',
          subtitle: 'Push the session windows your recordings group into.',
          icon: Layers
        }

  const enabled = useConfigStore(
    kind === 'recording' ? (s) => s.recordingPipelineEnabled : (s) => s.sessionPipelineEnabled
  )
  const setEnabled = useConfigStore(
    kind === 'recording' ? (s) => s.setRecordingPipelineEnabled : (s) => s.setSessionPipelineEnabled
  )

  const mapping = useMymeStore((s) => s.mapping)
  const setMapping = useMymeStore((s) => s.setMapping)
  const binding = mapping?.[kind] ?? null

  function updateBinding(next: MappingBinding): void {
    if (!mapping) return
    void setMapping({ ...mapping, [kind]: next })
  }

  return (
    <SettingsCard
      icon={labels.icon}
      title={labels.title}
      subtitle={labels.subtitle}
      headerExtra={
        <Switch
          checked={enabled}
          onChange={(next) => void setEnabled(next)}
          ariaLabel={`Sync ${labels.title.toLowerCase()}`}
        />
      }
    >
      <div
        className={cn(
          'transition-opacity',
          enabled ? 'opacity-100' : 'pointer-events-none opacity-40'
        )}
        aria-hidden={!enabled}
      >
        {kind === 'session' && <SessionGapRow />}
        {binding ? (
          <MappingRoot kind={kind} binding={binding} onChange={updateBinding} />
        ) : (
          <p className="text-[12.5px] text-muted-foreground">Loading mapping…</p>
        )}
        {kind === 'recording' && <ModesSection />}
      </div>
    </SettingsCard>
  )
}

function SessionGapRow(): React.JSX.Element {
  const value = useConfigStore((s) => s.sessionGapThresholdMinutes)
  const setValue = useConfigStore((s) => s.setSessionGapThresholdMinutes)
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">Session gap</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          Recordings within this gap count as the same session.
        </div>
      </div>
      <Stepper
        value={value}
        onChange={(next) => void setValue(next)}
        min={1}
        max={120}
        unit="min"
        width={68}
      />
    </div>
  )
}

function ModesSection(): React.JSX.Element {
  const modeFilter = useMymeStore((s) => s.modeFilter)
  const setModeFilter = useMymeStore((s) => s.setModeFilter)
  const recordings = useDataStore((s) => s.recordings)

  // Compute mode counts from the local cache; show the top-8 by count
  // by default, with a "show more" toggle for the long tail.
  const modes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of recordings) {
      counts.set(r.modeName, (counts.get(r.modeName) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [recordings])

  const [expanded, setExpanded] = useState(false)
  const TOP = 8
  const visible = expanded ? modes : modes.slice(0, TOP)
  const overflow = Math.max(0, modes.length - TOP)

  const allModes = modes.map((m) => m.name)
  const isEnabled = (name: string): boolean => modeFilter === null || modeFilter.includes(name)
  const enabledCount =
    modeFilter === null ? modes.length : modes.filter((m) => isEnabled(m.name)).length
  const allOn = enabledCount === modes.length

  function toggleMode(name: string, on: boolean): void {
    const current = modeFilter ?? allModes
    const nextSet = on ? Array.from(new Set([...current, name])) : current.filter((n) => n !== name)
    const next = nextSet.length === allModes.length ? null : nextSet
    void setModeFilter(next)
  }

  function toggleAll(): void {
    if (allOn) void setModeFilter([])
    else void setModeFilter(null)
  }

  if (modes.length === 0) return <></>

  return (
    <div className="mt-4">
      <Group
        label="Modes"
        hint={
          <span className="flex items-baseline gap-3">
            <span>
              {enabledCount} of {modes.length} on
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-accent-blue transition-colors hover:underline"
            >
              {allOn ? 'Disable all' : 'Enable all'}
            </button>
          </span>
        }
      >
        <div
          className={cn(
            'transition-[max-height]',
            expanded ? 'max-h-[340px] overflow-y-auto' : 'max-h-none'
          )}
        >
          {visible.map((m, i) => (
            <ModeRow
              key={m.name}
              name={m.name}
              count={m.count}
              enabled={isEnabled(m.name)}
              onToggle={(on) => toggleMode(m.name, on)}
              first={i === 0}
            />
          ))}
        </div>
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="block w-full border-t border-border bg-foreground/[0.02] py-2 text-[12px] text-accent-blue transition-colors hover:bg-foreground/[0.04]"
          >
            {expanded
              ? 'Show top 8 only'
              : `Show ${overflow} more mode${overflow === 1 ? '' : 's'}`}
          </button>
        )}
      </Group>
    </div>
  )
}

function ModeRow({
  name,
  count,
  enabled,
  onToggle,
  first
}: {
  name: string
  count: number
  enabled: boolean
  onToggle: (on: boolean) => void
  first: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2',
        !first && 'border-t border-border'
      )}
    >
      <span className="inline-flex items-baseline gap-1.5 truncate text-[13px] text-foreground">
        <span className="truncate">{name}</span>
        <span className="text-[11.5px] tabular-nums text-muted-foreground">
          ({count.toLocaleString()})
        </span>
      </span>
      <Switch checked={enabled} onChange={onToggle} ariaLabel={name} />
    </div>
  )
}
