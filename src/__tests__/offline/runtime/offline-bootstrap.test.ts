import { describe, expect, it, vi } from 'vitest'
import { createOfflineRuntimeState } from '@/offline/runtime/offline-runtime-state'
import { setupWithCapacitorSQLiteBridge } from '@/offline/runtime/capacitor-sqlite-wiring-example'

describe('offline runtime state', () => {
  it('transitions to failed and supports retry signal', () => {
    const state = createOfflineRuntimeState()
    state.setInitializing()
    state.setFailed('SQLITE_OPEN_FAILED')

    expect(state.getSnapshot().status).toBe('failed')
    expect(state.getSnapshot().error).toBe('SQLITE_OPEN_FAILED')

    state.requestRetry()
    expect(state.getSnapshot().retryToken).toBe(1)
  })
})

describe('capacitor sqlite startup wiring', () => {
  it('opens sqlite connection and injects runtime globals', async () => {
    const open = vi.fn().mockResolvedValue(undefined)
    const sqlite = {
      isConnection: vi.fn().mockResolvedValue({ result: false }),
      createConnection: vi.fn().mockResolvedValue({ open }),
      retrieveConnection: vi.fn(),
    }

    await setupWithCapacitorSQLiteBridge({
      sqlite,
      databaseName: 'wrongbook',
      schemaSql: 'CREATE TABLE t(a)',
    })

    expect(open).toHaveBeenCalledTimes(1)
  })
})
