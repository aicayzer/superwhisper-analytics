/**
 * Re-exports from `@shared/types` for back-compat.
 *
 * Renderer code that historically imported from `'@renderer/lib/types'`
 * keeps working unchanged. New code should import directly from
 * `'@shared/types'` for clarity about the cross-process contract.
 */
export type {
  Aggregates,
  DailySummary,
  DayOfWeekPattern,
  DurationBucket,
  Heatmap,
  HourlyPattern,
  HydratePayload,
  LanguageStats,
  ModeByDay,
  ModeStat,
  OverviewStats,
  Recording,
  Segment,
  SentenceBucket,
  SparkSeries,
  StreakCell,
  TrendPoint,
  UsageStats,
  WordFrequency,
  WpmByMode
} from '@shared/types'
