import type { MymeClient, TypeSchema } from '@mymehq/sdk'
import { MymeError } from '@mymehq/sdk'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { defaultMapping, type MymeMapping } from './mapping'
import { ensureTypesRegistered } from './registration'
import { SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION } from './schemas'

interface MockTypes {
  list: Mock<() => Promise<TypeSchema[]>>
  register: Mock<(schema: TypeSchema) => Promise<TypeSchema>>
}

function makeClient(opts: { serverTypes: TypeSchema[]; registerFails?: unknown }): {
  client: MymeClient
  types: MockTypes
} {
  const types: MockTypes = {
    list: vi.fn(async () => opts.serverTypes),
    register: vi.fn(async (schema: TypeSchema) => {
      if (opts.registerFails) throw opts.registerFails
      return schema
    })
  }
  // Cast through `unknown` — we only need .types for ensureTypesRegistered.
  const client = { types } as unknown as MymeClient
  return { client, types }
}

describe('ensureTypesRegistered', () => {
  it('registers types that are absent from the server', async () => {
    const { client, types } = makeClient({ serverTypes: [] })
    await ensureTypesRegistered(client, defaultMapping())
    expect(types.register).toHaveBeenCalledTimes(2)
    const registeredIds = types.register.mock.calls.map((c: [TypeSchema]) => c[0].id)
    expect(registeredIds).toContain(SUPERWHISPER_RECORDING.id)
    expect(registeredIds).toContain(SUPERWHISPER_SESSION.id)
  })

  it('skips types that are present and at the same version', async () => {
    const { client, types } = makeClient({
      serverTypes: [SUPERWHISPER_RECORDING, SUPERWHISPER_SESSION]
    })
    await ensureTypesRegistered(client, defaultMapping())
    expect(types.register).not.toHaveBeenCalled()
  })

  it('re-registers when the local version is higher than the server version (T-204)', async () => {
    // Server is on v1 (pre-rename); local bundle is v2. Without this
    // branch the rename would never propagate, items would silently
    // drop `input_device`, and we lose data integrity.
    const serverV1: TypeSchema = {
      ...SUPERWHISPER_RECORDING,
      version: 1,
      fields: {
        ...SUPERWHISPER_RECORDING.fields,
        // Approximate the stale v1 shape: this test only cares that
        // version=1 < local version=2, not the field-level diff.
        input_device: undefined as unknown as TypeSchema['fields'][string]
      }
    }
    const { client, types } = makeClient({
      serverTypes: [serverV1, SUPERWHISPER_SESSION]
    })
    await ensureTypesRegistered(client, defaultMapping())
    expect(types.register).toHaveBeenCalledTimes(1)
    const registered = types.register.mock.calls[0]?.[0]
    expect(registered?.id).toBe(SUPERWHISPER_RECORDING.id)
    expect(registered?.version).toBe(2)
  })

  it('does not downgrade when the server is on a higher version than the local schema', async () => {
    const serverV3: TypeSchema = { ...SUPERWHISPER_RECORDING, version: 3 }
    const { client, types } = makeClient({
      serverTypes: [serverV3, SUPERWHISPER_SESSION]
    })
    await ensureTypesRegistered(client, defaultMapping())
    expect(types.register).not.toHaveBeenCalled()
  })

  it('skips existing-mode bindings entirely (no register, no lookup)', async () => {
    const { client, types } = makeClient({ serverTypes: [] })
    const mapping: MymeMapping = {
      recording: { mode: 'existing', typeId: 'core.note', fieldMap: {} },
      session: { mode: 'existing', typeId: 'core.note', fieldMap: {} }
    }
    await ensureTypesRegistered(client, mapping)
    // No candidates → no list call, no register call.
    expect(types.list).not.toHaveBeenCalled()
    expect(types.register).not.toHaveBeenCalled()
  })

  it('swallows non-auth register errors without throwing', async () => {
    const failure = new Error('temporary boom')
    const { client, types } = makeClient({ serverTypes: [], registerFails: failure })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await expect(ensureTypesRegistered(client, defaultMapping())).resolves.toBeUndefined()
    expect(types.register).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('propagates auth errors (the caller flips the card)', async () => {
    const unauthorized = new MymeError('UNAUTHORIZED', 'Unauthorized', 401)
    const { client } = makeClient({ serverTypes: [], registerFails: unauthorized })
    await expect(ensureTypesRegistered(client, defaultMapping())).rejects.toBe(unauthorized)
  })
})
