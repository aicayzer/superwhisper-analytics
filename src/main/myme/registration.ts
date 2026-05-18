import { MymeError, type MymeClient, type TypeSchema } from '@mymehq/sdk'
import type { MappingBinding, MymeMapping } from './mapping'
import { SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION } from './schemas'

/**
 * Ensure the type ids referenced by the active mapping exist on the
 * server side AND that the server is at-least the local schema version.
 * Runs on connect and before each sync. Idempotent —
 * `client.types.list()` once per call, then `register()` only for ids
 * that are absent or where the local schema is a higher version than
 * what the server has.
 *
 * Three binding modes get different treatment:
 *
 *   - `bundled`  — register from the canonical schemas in `schemas.ts`.
 *     A version bump in the bundle (e.g. T-204's v1 → v2 rename) is
 *     pushed to the server on the next sync so the server's validation
 *     stays in lockstep with what the projection produces.
 *   - `authored` — register from `binding.authoredSchema`. Same
 *     versioning rule: if the user bumps the version in config, the
 *     bumped schema is pushed.
 *   - `existing` — taken on trust. If it's missing the user picked
 *     wrongly and the next upsert will surface the failure with a
 *     clearer error than this function could synthesise.
 *
 * The server's `version_bump_mismatch` check is the source of truth on
 * what's an acceptable bump — we let the server decide and log the
 * rejection rather than implementing the rules client-side.
 *
 * Auth failures bubble up — the engine's caller knows how to flip the
 * card to `disconnected`. Other failures are swallowed with a console
 * warning so a transient registration error doesn't block the sync
 * loop entirely; the subsequent `items.upsert` will fail clearly if
 * the type really is missing.
 */
export async function ensureTypesRegistered(
  client: MymeClient,
  mapping: MymeMapping
): Promise<void> {
  // Collect target ids that *could* need registration. Existing-mode
  // bindings are skipped — we don't know the schema to re-register
  // them with and the user picked them precisely because they exist.
  const candidates: Array<{ binding: MappingBinding; fallback: TypeSchema }> = []
  if (mapping.recording.mode !== 'existing') {
    candidates.push({
      binding: mapping.recording,
      fallback: SUPERWHISPER_RECORDING
    })
  }
  if (mapping.session.mode !== 'existing') {
    candidates.push({
      binding: mapping.session,
      fallback: SUPERWHISPER_SESSION
    })
  }
  if (candidates.length === 0) return

  let existing: TypeSchema[]
  try {
    existing = await client.types.list()
  } catch (err) {
    // Bubble auth failures (the wrapping engine call will flip status);
    // log + continue for anything else so the sync attempt proceeds and
    // surfaces a clearer error on the upsert path.
    if (err instanceof MymeError && /unauthor/i.test(err.message)) throw err
    console.warn('[myme] types.list failed during registration probe:', err)
    return
  }
  const presentById = new Map(existing.map((t) => [t.id, t]))

  for (const { binding, fallback } of candidates) {
    const schema = resolveSchema(binding, fallback)
    if (!schema) {
      console.warn(
        `[myme] cannot register ${binding.typeId}: no schema available (mode=${binding.mode})`
      )
      continue
    }
    const serverType = presentById.get(binding.typeId)
    const serverVersion = serverType?.version ?? 0
    const localVersion = schema.version ?? 1
    // Register when the type is missing or when our local schema is at
    // a higher version. The server adjudicates whether the bump itself
    // is legal (`version_bump_mismatch`) — if it rejects, we surface
    // that as a warning and the next `items.upsert` will fail with a
    // clearer message.
    if (serverType && localVersion <= serverVersion) continue
    try {
      await client.types.register(schema)
    } catch (err) {
      if (err instanceof MymeError && /unauthor/i.test(err.message)) throw err
      console.warn(`[myme] register failed for ${binding.typeId}:`, err)
    }
  }
}

function resolveSchema(binding: MappingBinding, fallback: TypeSchema): TypeSchema | null {
  if (binding.mode === 'bundled') return fallback
  if (binding.mode === 'authored') return binding.authoredSchema ?? null
  return null
}
