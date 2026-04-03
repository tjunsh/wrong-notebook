import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapacitorSQLiteConnectionLike } from '@/offline/db/capacitor-sqlite-client'

const initializeOfflineAppMock = vi.fn().mockResolvedValue(undefined)
const syncOfflineAiConfigFromServerMock = vi.fn().mockResolvedValue({ source: 'fallback_missing_local' as const })
const runtimeStartMock = vi.fn()
const setSettingsWarningMock = vi.fn()

vi.mock('@/offline/init/offline-init', () => ({
  initializeOfflineApp: initializeOfflineAppMock,
}))

vi.mock('@/offline/ai/runtime-factory', () => ({
  ensureOfflineAiRuntime: vi.fn().mockReturnValue({
    start: runtimeStartMock,
  }),
  syncOfflineAiConfigFromServer: syncOfflineAiConfigFromServerMock,
}))

vi.mock('@/offline/runtime/offline-runtime-state', () => ({
  offlineRuntimeState: {
    setInitializing: vi.fn(),
    setReady: vi.fn(),
    setFailed: vi.fn(),
    setSettingsWarning: setSettingsWarningMock,
    getSnapshot: vi.fn().mockReturnValue({ status: 'idle', retryToken: 0 }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}))

describe('OfflineBootstrap settings fallback behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const connection: CapacitorSQLiteConnectionLike = {
      execute: vi.fn().mockResolvedValue({}),
      query: vi.fn().mockResolvedValue({ values: [] }),
    }
    window.__OFFLINE_SQLITE_CONNECTION__ = connection
    window.__OFFLINE_SCHEMA_SQL__ = 'CREATE TABLE IF NOT EXISTS t(id INTEGER PRIMARY KEY)'
  })

  it('does not fail bootstrap when /api/settings fetch fails', async () => {
    const { bootstrapOfflineRuntimeOnce } = await import('@/offline/runtime/offline-bootstrap.client')

    await expect(bootstrapOfflineRuntimeOnce()).resolves.toBeUndefined()
    expect(initializeOfflineAppMock).toHaveBeenCalledTimes(1)
    expect(syncOfflineAiConfigFromServerMock).toHaveBeenCalledTimes(1)
    expect(runtimeStartMock).toHaveBeenCalledTimes(1)
    expect(setSettingsWarningMock).toHaveBeenCalledWith('OFFLINE_SETTINGS_SYNC_NO_LOCAL_CONFIG')
  })
})
