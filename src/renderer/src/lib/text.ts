/**
 * Re-exports from `@shared/text-metrics` for back-compat with renderer
 * imports that predated the shared/ directory. New code should pull
 * from `'@shared/text-metrics'` directly.
 */
export {
  buildFillers,
  DEFAULT_FILLER_PHRASES,
  STOP_WORDS,
  tokenise,
  type FillerSummary
} from '@shared/text-metrics'
