import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { StackedAreaPercent } from '@renderer/components/charts/StackedAreaPercent'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatCompact, formatDurationSec } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import { formatActivityTick } from './format'

/**
 * Variant A — Cards.
 *
 * Charts and recent transcripts sit in bordered cards (no shadow, lift
 * comes from the brighter `--card` colour). KPIs are flat — typography
 * in a row, no chrome — to keep the eye on numbers, not boxes.
 */
export function VariantA(): React.JSX.Element {
  const { overview, daily, heatmap, modeByWeekFlat, stackModeKeys, sparklines } = mock
  const avgPerRec = Math.round(overview.totalWords / overview.totalRecordings)

  return (
    <div className="flex h-full flex-col gap-3 py-3">
      <KpiRow
        items={[
          {
            label: 'Recordings',
            value: formatCompact(overview.totalRecordings),
            sub: `${overview.activeDays} active days`,
            spark: sparklines.recordings.values
          },
          {
            label: 'Total words',
            value: formatCompact(overview.totalWords),
            sub: `${avgPerRec} avg / recording`,
            spark: sparklines.words.values
          },
          {
            label: 'Time spoken',
            value: formatDurationSec(overview.totalDurationSec),
            sub: `${formatDurationSec(overview.avgDurationSec)} avg`,
            spark: sparklines.duration.values
          },
          {
            label: 'Words / minute',
            value: String(overview.avgWPM),
            sub: 'rolling average',
            spark: sparklines.wpm.values
          }
        ]}
      />

      {/* Charts */}
      <div className="grid grid-cols-[3fr_2fr] gap-3" style={{ height: 240 }}>
        <ChartCard title="Activity" slug="activity">
          <ActivityArea
            data={daily as unknown as Array<Record<string, unknown>>}
            xKey="date"
            yKey="count"
            formatTick={formatActivityTick}
          />
        </ChartCard>
        <ChartCard title="Mode mix" slug="mode-mix">
          <StackedAreaPercent
            data={modeByWeekFlat}
            xKey="date"
            keys={stackModeKeys}
            formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
          />
        </ChartCard>
      </div>

      {/* When you record — week-grain heatmap fills the rest of the viewport */}
      <ChartCard title="When you record" slug="when-you-record" className="min-h-0 flex-1">
        <div className="flex h-full flex-col justify-center">
          <Heatmap matrix={heatmap} cellHeight={26} />
        </div>
      </ChartCard>
    </div>
  )
}
