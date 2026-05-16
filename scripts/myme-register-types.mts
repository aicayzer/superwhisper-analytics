/**
 * One-shot script: register the Superwhisper integration's custom types
 * against a Myme tenant.
 *
 * Reads admin credentials from `~/.myme/admin.json` (the
 * machine-local admin token used for direct-API operations), registers
 * `superwhisper.recording` and `superwhisper.session`, then verifies
 * each by reading back via `types.get`.
 *
 * Idempotent — already-registered types resolve as an upsert in Myme,
 * not a 409. Re-run safely.
 *
 * Not part of the runtime integration; not bundled into the app. The
 * production shape (integration code registering its own types on first
 * connect-after-OAuth) is out of scope for the worktree experiment.
 *
 * Run with:
 *   pnpm dlx tsx scripts/myme-register-types.ts
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { MymeClient, MymeError } from '@mymehq/sdk'
import { ALL_SCHEMAS } from '../src/main/myme/schemas'

interface AdminCreds {
  url: string
  key: string
  label?: string
}

function loadAdminCreds(): AdminCreds {
  const path = join(homedir(), '.myme', 'admin.json')
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<AdminCreds>
  if (typeof parsed.url !== 'string' || typeof parsed.key !== 'string') {
    throw new Error(`~/.myme/admin.json missing url or key fields`)
  }
  return { url: parsed.url, key: parsed.key, label: parsed.label }
}

async function main(): Promise<void> {
  const creds = loadAdminCreds()
  console.log(`[register] using ${creds.label ?? 'admin'} @ ${creds.url}`)

  const client = new MymeClient({ url: creds.url, apiKey: creds.key })

  for (const schema of ALL_SCHEMAS) {
    try {
      const registered = await client.types.register(schema)
      console.log(`[register] ${registered.id}: registered (version ${registered.version})`)
    } catch (err) {
      if (err instanceof MymeError) {
        console.error(`[register] ${schema.id}: ${err.message}`)
        throw err
      }
      throw err
    }

    // Read back to verify.
    const fetched = await client.types.get(schema.id)
    const fieldKeys = Object.keys(fetched.fields).sort().join(', ')
    console.log(`[register] ${fetched.id}: verified — fields = ${fieldKeys}`)
  }

  console.log('[register] done')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
