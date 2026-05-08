import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { VBar } from '@renderer/components/charts/VBar'
import { formatCompact, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { formatActivityTick } from './format'

/**
 * Variant B — Flat / typography-led.
 *
 * No cards. KPIs are a typography row separated by vertical dividers.
 * Charts have a hairline border but no fill — they sit on the page surface.
 * Recent transcripts is a borderless table with row dividers only.
 *
 * The whole thing leans on whitespace and type weight to organise the eye.
 */
export function VariantB(): React.JSX.Element {
  const { overview, daily, dayOfWeek, heatmap } = mock
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)

  return (
    <div className="flex h-full flex-col gap-5 py-4">
      {/* Typography KPI row */}
      <div className="grid grid-cols-4 divide-x divide-border">
        <Kpi
          label="Recordings"
          value={formatCompact(overview.totalRecordings)}
          sub={`${overview.activeDays} active days`}
        />
        <Kpi
          label="Total words"
          value={formatCompact(overview.totalWords)}
          sub={`${avgPerRec} avg / recording`}
        />
        <Kpi
          label="Time spoken"
          value={formatDurationSec(overview.totalDurationSec)}
          sub={`${formatDurationSec(overview.avgDurationSec)} avg`}
        />
        <Kpi label="Words / minute" value={String(overview.avgWPM)} sub="rolling average" />
      </div>

      {/* Charts — hairline only, no card fill */}
      <div className="grid grid-cols-[2fr_1fr] gap-5" style={{ height: 220 }}>
        <Section title="Activity">
          <ActivityArea
            data={daily as unknown as Array<Record<string, unknown>>}
            xKey="date"
            yKey="count"
            formatTick={formatActivityTick}
          />
        </Section>
        <Section title="By day of week">
          <VBar
            data={dayOfWeek as unknown as Array<Record<string, unknown>>}
            xKey="dayName"
            yKey="count"
          />
        </Section>
      </div>

      {/* When you record — borderless heatmap fills the rest of the viewport */}
      <Section title="When you record" className="min-h-0 flex-1">
        <div className="flex h-full flex-col justify-center">
          <Heatmap matrix={heatmap} cellHeight={26} />
        </div>
      </Section>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub
}: {
  label: string
  value: string
  sub: string
}): React.JSX.Element {
  return (
    <div className="px-5 first:pl-0">
      <div className="text-[12px] font-medium text-foreground">{label}</div>
      <div className="mt-1 text-[28px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function Section({
  title,
  children,
  className
}: {
  title: string
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-transparent p-3 ${className ?? ''}`}
    >
      <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
