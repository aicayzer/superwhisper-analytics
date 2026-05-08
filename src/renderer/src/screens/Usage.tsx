import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'

export function Usage(): React.JSX.Element {
  const { overview, usage, daily, hourly, heatmap, durationDist } = mock

  return (
    <div className="space-y-3 py-3">
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
        <Kpi
          label="Active days"
          value={String(overview.activeDays)}
          sub={`of ${daily.length} in window`}
        />
        <Kpi
          label="Current streak"
          value={`${usage.currentStreak}d`}
          sub={`longest ${usage.longestStreak}d`}
        />
        <Kpi
          label="Avg per active day"
          value={String(Math.round(usage.avgPerActiveDay))}
          sub="recordings"
        />
        <Kpi
          label="Time per day"
          value={formatDurationSec(usage.timePerActiveDaySec)}
          sub="active days"
        />
      </div>

      <ChartCard title="Volume over time" slug="volume-over-time" className="h-[280px]">
        <ActivityArea
          data={daily as unknown as Array<Record<string, unknown>>}
          xKey="date"
          yKey="count"
          formatTick={(v) => {
            const d = new Date(String(v))
            return isNaN(d.getTime())
              ? ''
              : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          }}
        />
      </ChartCard>

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3" style={{ height: 240 }}>
        <ChartCard title="When you record" slug="when-you-record">
          <Heatmap matrix={heatmap} cellHeight={20} />
        </ChartCard>
        <ChartCard title="By hour of day" slug="by-hour-of-day">
          <HourRadial data={hourly} />
        </ChartCard>
        <ChartCard title="Duration mix" slug="duration-mix">
          <DistBar
            data={durationDist as unknown as Array<Record<string, unknown>>}
            xKey="label"
            yKey="count"
          />
        </ChartCard>
      </div>
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
    <div className="px-5 py-3">
      <div className="text-[12px] font-medium text-foreground">{label}</div>
      <div className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>
    </div>
  )
}
