import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { ChartCard } from '@renderer/components/charts/ChartCard'
import { DistBar } from '@renderer/components/charts/DistBar'
import { HBar } from '@renderer/components/charts/HBar'
import { LineTrend } from '@renderer/components/charts/LineTrend'
import { KpiRow } from '@renderer/components/KpiRow'
import { formatNumber } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'

const WPM_TARGET = 140

export function Language(): React.JSX.Element {
  const {
    language,
    wordFrequency,
    fillerSummary,
    wpmTrend,
    fillerTrend,
    sentenceDist,
    vocabGrowth,
    sparklines
  } = mock

  const topWords = wordFrequency.slice(0, 12).map((w) => ({ label: w.word, count: w.count }))
  const topFillers = fillerSummary.slice(0, 8).map((f) => ({ label: f.phrase, count: f.count }))

  return (
    <div className="space-y-3 py-3">
      <KpiRow
        items={[
          {
            label: 'Words / minute',
            value: String(language.avgWPM),
            sub: 'rolling average',
            spark: sparklines.wpm.values
          },
          {
            label: 'Filler rate',
            value: `${language.fillerRatePct}%`,
            sub: 'of total words'
          },
          {
            label: 'Vocabulary',
            value: formatNumber(language.vocabularyCount),
            sub: 'unique words'
          },
          {
            label: 'Avg sentence',
            value: `${language.avgSentenceLength}`,
            sub: 'words / sentence'
          }
        ]}
      />

      <div className="grid grid-cols-2 gap-3" style={{ height: 260 }}>
        <ChartCard title="Top words" slug="top-words">
          <HBar
            data={topWords as unknown as Array<Record<string, unknown>>}
            xKey="count"
            yKey="label"
          />
        </ChartCard>
        <ChartCard title="Filler words" slug="filler-words">
          <HBar
            data={topFillers as unknown as Array<Record<string, unknown>>}
            xKey="count"
            yKey="label"
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ height: 220 }}>
        <ChartCard title="Speaking pace" slug="speaking-pace">
          <LineTrend
            data={wpmTrend as unknown as Array<Record<string, unknown>>}
            xKey="period"
            yKey="value"
            reference={{ value: WPM_TARGET, label: `${WPM_TARGET}` }}
            formatTick={(v) => {
              const [y, m] = String(v).split('-')
              if (!y || !m) return String(v)
              const d = new Date(Number(y), Number(m) - 1, 1)
              return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
            }}
          />
        </ChartCard>
        <ChartCard title="Filler rate over time" slug="filler-rate">
          <LineTrend
            data={fillerTrend as unknown as Array<Record<string, unknown>>}
            xKey="period"
            yKey="value"
            formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ height: 220 }}>
        <ChartCard title="Sentence length" slug="sentence-length">
          <DistBar
            data={sentenceDist as unknown as Array<Record<string, unknown>>}
            xKey="label"
            yKey="count"
          />
        </ChartCard>
        <ChartCard title="Vocabulary growth" slug="vocabulary-growth">
          <ActivityArea
            data={vocabGrowth as unknown as Array<Record<string, unknown>>}
            xKey="period"
            yKey="value"
            formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
            tickCount={5}
          />
        </ChartCard>
      </div>
    </div>
  )
}
