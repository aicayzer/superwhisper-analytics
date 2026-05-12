import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { BarList } from '@renderer/components/charts/BarList'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { LineTrend } from '@renderer/components/charts/LineTrend'
import { PaceTrend } from '@renderer/components/charts/PaceTrend'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatNumber, formatTrendTick } from '@renderer/lib/format'
import { useFilteredAggregates } from '@renderer/state/useFilteredAggregates'
import { useMemo } from 'react'

const WPM_TARGET = 140
/** Top-N count for both the Top Words and Filler Words cards. Picked to
 *  match the visual rhythm of the rest of the dashboard. */
const TOP_LIST_LIMIT = 10
/** Maximum scatter points fed to PaceTrend — sampled deterministically. */
const MAX_WPM_DOTS = 1000

export function Language(): React.JSX.Element {
  const {
    language,
    wordFrequency,
    fillerSummary,
    wpmTrend,
    wpmDots,
    fillerTrend,
    sentenceDist,
    vocabGrowth,
    sparklines
  } = useFilteredAggregates()

  // Derived chart inputs — memoised so the BarList memo wrappers can
  // short-circuit on unchanged references.
  // Two-column BarList variants want more entries so each column has rows
  // to render. The Language preview cards use columns=2, so widen the slice.
  const topWords = useMemo(
    () =>
      wordFrequency.slice(0, TOP_LIST_LIMIT * 2).map((w) => ({ label: w.word, count: w.count })),
    [wordFrequency]
  )
  const topFillers = useMemo(
    () =>
      fillerSummary.slice(0, TOP_LIST_LIMIT * 2).map((f) => ({ label: f.phrase, count: f.count })),
    [fillerSummary]
  )
  // Sample wpmDots so PaceTrend renders ≤1000 scatter points. On 11k
  // recordings the raw array is too many marks for a chart this size —
  // visually noisier without being more informative, and slower to draw.
  const sampledDots = useMemo(() => {
    if (wpmDots.length <= MAX_WPM_DOTS) return wpmDots
    const stride = Math.ceil(wpmDots.length / MAX_WPM_DOTS)
    return wpmDots.filter((_, i) => i % stride === 0)
  }, [wpmDots])

  return (
    // CSS grid (not flex-col) for the outer layout so the three chart
    // rows ALWAYS share the same height. With a flex-col, flex-1 children
    // can be pushed taller than 1/3 when their intrinsic content drives a
    // larger min-content — which is what caused Filler Words to visually
    // bleed into the row below when the dataset only had a few entries.
    <div className="grid h-full grid-rows-[auto_1fr_1fr_1fr] gap-3">
      <KpiRow
        items={[
          {
            label: 'Words per minute',
            value: String(language.avgWPM),
            spark: sparklines.wpm.values
          },
          {
            label: 'Filler rate',
            value: `${language.fillerRatePct}%`
          },
          {
            label: 'Unique words',
            value: formatNumber(language.vocabularyCount)
          },
          {
            label: 'Sentence length',
            value: `${language.avgSentenceLength}`
          }
        ]}
      />

      <div className="grid min-h-0 grid-cols-2 gap-3">
        <ChartCard title="Top words" slug="top-words" className="min-w-[220px]">
          <BarList data={topWords} columns={2} />
        </ChartCard>
        <ChartCard title="Top fillers" slug="filler-words" className="min-w-[220px]">
          <BarList data={topFillers} columns={2} />
        </ChartCard>
      </div>

      <div className="grid min-h-0 grid-cols-2 gap-3">
        <ChartCard title="Words per minute" slug="speaking-pace">
          <PaceTrend
            trend={wpmTrend}
            dots={sampledDots}
            xKey="period"
            yKey="value"
            reference={{ value: WPM_TARGET, label: `${WPM_TARGET}` }}
            formatTick={formatTrendTick}
          />
        </ChartCard>
        <ChartCard title="Filler rate" slug="filler-rate">
          <LineTrend
            data={fillerTrend}
            xKey="period"
            yKey="value"
            formatTick={formatTrendTick}
            formatYTick={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      <div className="grid min-h-0 grid-cols-2 gap-3">
        <ChartCard title="Sentence length" slug="sentence-length">
          <DistBar data={sentenceDist} xKey="label" yKey="count" />
        </ChartCard>
        <ChartCard title="Vocabulary growth" slug="vocabulary-growth">
          <ActivityArea
            data={vocabGrowth}
            xKey="period"
            yKey="value"
            formatTick={formatTrendTick}
            tickCount={5}
          />
        </ChartCard>
      </div>
    </div>
  )
}
