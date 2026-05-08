import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { DistBar } from '@renderer/components/charts/DistBar'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { HourRadial } from '@renderer/components/charts/HourRadial'
import { Card } from '@renderer/components/ui/card'
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

      <Card className="flex flex-col px-4 py-3" style={{ height: 280 }}>
        <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
          Volume over time
        </h3>
        <div className="min-h-0 flex-1">
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
        </div>
      </Card>

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3" style={{ height: 240 }}>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            When you record
          </h3>
          <div className="min-h-0 flex-1">
            <Heatmap matrix={heatmap} cellHeight={20} />
          </div>
        </Card>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            By hour of day
          </h3>
          <div className="min-h-0 flex-1">
            <HourRadial data={hourly} />
          </div>
        </Card>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Duration mix
          </h3>
          <div className="min-h-0 flex-1">
            <DistBar
              data={durationDist as unknown as Array<Record<string, unknown>>}
              xKey="label"
              yKey="count"
            />
          </div>
        </Card>
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
