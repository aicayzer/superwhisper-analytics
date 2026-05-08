import { ActivityArea } from '@renderer/components/charts/ActivityArea'
import { DistBar } from '@renderer/components/charts/DistBar'
import { HBar } from '@renderer/components/charts/HBar'
import { LineTrend } from '@renderer/components/charts/LineTrend'
import { Card } from '@renderer/components/ui/card'
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
    vocabGrowth
  } = mock

  const topWords = wordFrequency.slice(0, 12).map((w) => ({ label: w.word, count: w.count }))
  const topFillers = fillerSummary.slice(0, 8).map((f) => ({ label: f.phrase, count: f.count }))

  return (
    <div className="space-y-3 py-3">
      <div className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card">
        <Kpi label="Words / minute" value={String(language.avgWPM)} sub="rolling average" />
        <Kpi label="Filler rate" value={`${language.fillerRatePct}%`} sub="of total words" />
        <Kpi label="Vocabulary" value={formatNumber(language.vocabularyCount)} sub="unique words" />
        <Kpi label="Avg sentence" value={`${language.avgSentenceLength}`} sub="words / sentence" />
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ height: 260 }}>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Top words
          </h3>
          <div className="min-h-0 flex-1">
            <HBar
              data={topWords as unknown as Array<Record<string, unknown>>}
              xKey="count"
              yKey="label"
            />
          </div>
        </Card>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Filler words
          </h3>
          <div className="min-h-0 flex-1">
            <HBar
              data={topFillers as unknown as Array<Record<string, unknown>>}
              xKey="count"
              yKey="label"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ height: 220 }}>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Speaking pace
          </h3>
          <div className="min-h-0 flex-1">
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
          </div>
        </Card>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Filler rate over time
          </h3>
          <div className="min-h-0 flex-1">
            <LineTrend
              data={fillerTrend as unknown as Array<Record<string, unknown>>}
              xKey="period"
              yKey="value"
              formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ height: 220 }}>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Sentence length
          </h3>
          <div className="min-h-0 flex-1">
            <DistBar
              data={sentenceDist as unknown as Array<Record<string, unknown>>}
              xKey="label"
              yKey="count"
            />
          </div>
        </Card>
        <Card className="flex flex-col px-4 py-3">
          <h3 className="mb-0.5 text-[13px] font-semibold tracking-tight text-foreground">
            Vocabulary growth
          </h3>
          <div className="min-h-0 flex-1">
            <ActivityArea
              data={vocabGrowth as unknown as Array<Record<string, unknown>>}
              xKey="period"
              yKey="value"
              formatTick={(v) => String(v).replace(/^\d{4}-/, '')}
              tickCount={5}
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
