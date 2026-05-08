import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { VBar } from '@renderer/components/charts/VBar'
import { formatCompact, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { formatActivityTick } from './format'

/**
 * Variant C — Compact.
 *
 * Same elements as A, but every dimension dialled down: smaller type,
 * tighter padding, shorter chart heights. Useful baseline for "how much
 * data can I fit on a screen without it feeling cramped".
 */
export function VariantC(): React.JSX.Element {
  const { overview, daily, dayOfWeek, heatmap } = mock
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)

  return (
    <div className="flex h-full flex-col gap-2 py-2">
      {/* Compact KPI row */}
      <div className="grid grid-cols-4 divide-x divide-border rounded-lg border border-border bg-card">
        <Kpi
          label="Recordings"
          value={formatCompact(overview.totalRecordings)}
          sub={`${overview.activeDays} active days`}
        />
        <Kpi
          label="Total words"
          value={formatCompact(overview.totalWords)}
          sub={`${avgPerRec} avg / rec`}
        />
        <Kpi
          label="Time spoken"
          value={formatDurationSec(overview.totalDurationSec)}
          sub={`${formatDurationSec(overview.avgDurationSec)} avg`}
        />
        <Kpi label="Words / minute" value={String(overview.avgWPM)} sub="rolling average" />
      </div>

      {/* Charts — shorter */}
      <div className="grid grid-cols-[2fr_1fr] gap-2" style={{ height: 180 }}>
        <ChartCard title="Activity" slug="activity" className="px-3 py-2">
          <ActivityArea
            data={daily as unknown as Array<Record<string, unknown>>}
            xKey="date"
            yKey="count"
            formatTick={formatActivityTick}
          />
        </ChartCard>
        <ChartCard title="By day of week" slug="by-day-of-week" className="px-3 py-2">
          <VBar
            data={dayOfWeek as unknown as Array<Record<string, unknown>>}
            xKey="dayName"
            yKey="count"
          />
        </ChartCard>
      </div>

      <ChartCard
        title="When you record"
        slug="when-you-record"
        className="min-h-0 flex-1 px-3 py-2"
      >
        <div className="flex h-full flex-col justify-center">
          <Heatmap matrix={heatmap} cellHeight={18} />
        </div>
      </ChartCard>
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
    <div className="px-3 py-2">
      <div className="text-[11.5px] font-medium text-foreground">{label}</div>
      <div className="mt-0 text-[20px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0 text-[10.5px] text-muted-foreground">{sub}</div>
    </div>
  )
}
