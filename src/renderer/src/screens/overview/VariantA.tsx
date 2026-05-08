import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { VBar } from '@renderer/components/charts/VBar'
import { Card } from '@renderer/components/ui/card'
import { formatCompact, formatDateOnly, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ModeBadge } from './common'
import { formatActivityTick } from './format'

/**
 * Variant A — Cards.
 *
 * Charts and recent transcripts sit in bordered cards (no shadow, lift
 * comes from the brighter `--card` colour). KPIs are flat — typography
 * in a row, no chrome — to keep the eye on numbers, not boxes.
 */
export function VariantA(): React.JSX.Element {
  const { overview, recordings, daily, dayOfWeek } = mock
  const recent = recordings.slice(0, 12)
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)

  return (
    <div className="flex h-full flex-col gap-3 py-3">
      {/* Flat KPI row */}
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
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

      {/* Charts */}
      <div className="grid grid-cols-[2fr_1fr] gap-3" style={{ height: 220 }}>
        <ChartCard title="Activity" slug="activity">
          <ActivityArea
            data={daily as unknown as Array<Record<string, unknown>>}
            xKey="date"
            yKey="count"
            formatTick={formatActivityTick}
          />
        </ChartCard>
        <ChartCard title="By day of week" slug="by-day-of-week">
          <VBar
            data={dayOfWeek as unknown as Array<Record<string, unknown>>}
            xKey="dayName"
            yKey="count"
          />
        </ChartCard>
      </div>

      {/* Recent — fills remaining viewport */}
      <Card className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
            Recent transcripts
          </h3>
          <Link
            to="/transcripts"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
          >
            View all
            <ChevronRight className="h-3 w-3" strokeWidth={1.8} />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-[11.5px] font-medium text-foreground">
                <th className="border-b border-border pb-1.5 pr-3 font-medium">When</th>
                <th className="border-b border-border pb-1.5 pr-3 font-medium">Mode</th>
                <th className="border-b border-border pb-1.5 pl-3 text-right font-medium">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 last:border-b-0 hover:bg-foreground/[0.02]"
                >
                  <td className="py-1.5 pr-3 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
                    <Link
                      to={`/transcripts/${r.id}`}
                      className="rounded hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
                    >
                      {formatDateOnly(r.datetime)}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 align-middle">
                    <ModeBadge mode={r.modeName} />
                  </td>
                  <td className="py-1.5 pl-3 align-middle text-right tabular-nums text-muted-foreground">
                    {formatDurationSec(r.duration / 1000)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
