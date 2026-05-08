import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { HBar } from '@renderer/components/charts/HBar'
import { VBar } from '@renderer/components/charts/VBar'
import { Card } from '@renderer/components/ui/card'
import { formatCompact, formatDateOnly, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const RECENT_LIMIT = 8

export function Overview(): React.JSX.Element {
  const { overview, recordings, daily, dayOfWeek, wordFrequency, modeStats } = mock

  const recent = recordings.slice(0, RECENT_LIMIT)
  const topWords = wordFrequency.slice(0, 8).map((w) => ({ label: w.word, count: w.count }))
  const showModes = modeStats.length > 1

  return (
    <div className="space-y-3 py-3">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi
          label="Recordings"
          value={formatCompact(overview.totalRecordings)}
          sub={`${overview.activeDays} active days`}
        />
        <Kpi
          label="Total words"
          value={formatCompact(overview.totalWords)}
          sub={`${Math.round(overview.totalWords / overview.totalRecordings)} avg / rec`}
        />
        <Kpi
          label="Time spoken"
          value={formatDurationSec(overview.totalDurationSec)}
          sub={`${formatDurationSec(overview.avgDurationSec)} avg`}
        />
        <Kpi label="Words / minute" value={String(overview.avgWPM)} sub="rolling average" />
      </div>

      {/* Activity + day-of-week */}
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Card className="p-4">
          <SectionHead title="Activity" sub="Recordings per day" />
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
            height={200}
          />
        </Card>
        <Card className="p-4">
          <SectionHead title="By day of week" sub="Total recordings" />
          <VBar
            data={dayOfWeek as unknown as Array<Record<string, unknown>>}
            xKey="dayName"
            yKey="count"
            height={200}
          />
        </Card>
      </div>

      {/* Recent + Top words */}
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionHead title="Recent transcripts" sub="Most recent in this window" />
            <Link
              to="/transcripts"
              className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              View all <ChevronRight className="h-3 w-3" strokeWidth={1.8} />
            </Link>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-1.5 pr-3 font-medium">When</th>
                <th className="pb-1.5 pr-3 font-medium">Mode</th>
                <th className="pb-1.5 pr-3 font-medium">Snippet</th>
                <th className="pb-1.5 pl-3 text-right font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-foreground/[0.02]">
                  <td className="py-1.5 pr-3 align-middle text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDateOnly(r.datetime)}
                  </td>
                  <td className="py-1.5 pr-3 align-middle">
                    <ModeBadge mode={r.modeName} />
                  </td>
                  <td className="max-w-0 truncate py-1.5 pr-3 align-middle text-foreground">
                    <Link to={`/transcripts/${r.id}`} className="hover:underline">
                      {r.excerpt}
                    </Link>
                  </td>
                  <td className="py-1.5 pl-3 align-middle text-right tabular-nums text-muted-foreground">
                    {formatDurationSec(r.duration / 1000)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-4">
          <SectionHead
            title="Top words"
            sub={`In the last ${overview.totalRecordings.toLocaleString()} recordings`}
          />
          <HBar
            data={topWords as unknown as Array<Record<string, unknown>>}
            xKey="count"
            yKey="label"
            height={208}
          />
        </Card>
      </div>

      {showModes && (
        <Card className="p-4">
          <SectionHead title="Modes" sub="Share of recordings" />
          <div className="grid grid-cols-4 gap-x-6 gap-y-1.5">
            {modeStats.slice(0, 8).map((m) => (
              <div key={m.modeName} className="flex items-center gap-2.5 text-[12px]">
                <span className="w-20 truncate text-foreground">{m.modeName}</span>
                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground"
                    style={{ width: `${Math.max(2, m.pct * 100)}%` }}
                  />
                </div>
                <span className="w-14 text-right tabular-nums text-muted-foreground">
                  {Math.round(m.pct * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
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
    <Card className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>
    </Card>
  )
}

function SectionHead({ title, sub }: { title: string; sub?: string }): React.JSX.Element {
  return (
    <div className="mb-2">
      <div className="text-[13px] font-semibold tracking-tight text-foreground">{title}</div>
      {sub && <div className="text-[11.5px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ModeBadge({ mode }: { mode: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
      {mode}
    </span>
  )
}
