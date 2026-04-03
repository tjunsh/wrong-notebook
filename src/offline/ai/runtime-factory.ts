import { AiConfigStore } from './config-store'
import { AiQueueRuntime } from './queue-runtime'
import { AiQueueService } from './queue-service'
import { BrowserKvStore, BrowserSecretStore } from './storage'
import { syncOfflineAiConfigFromAppConfig } from './config-sync'
import { SqliteAiTaskRepository } from './sqlite-task-repository'
import { CapacitorSqliteClient, CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { apiClient } from '@/lib/api-client'
import { AppConfig } from '@/types/api'

declare global {
  interface Window {
    __OFFLINE_AI_QUEUE_RUNTIME__?: AiQueueRuntime
  }
}

export function ensureOfflineAiRuntime(connection: CapacitorSQLiteConnectionLike): AiQueueRuntime {
  if (window.__OFFLINE_AI_QUEUE_RUNTIME__) {
    return window.__OFFLINE_AI_QUEUE_RUNTIME__
  }

  const db = new CapacitorSqliteClient(connection)
  const repo = new SqliteAiTaskRepository(db)
  const configStore = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())

  const queueService = new AiQueueService(
    repo,
    async (ownerProfileId) => {
      const config = await configStore.load(ownerProfileId)
      if (!config) {
        throw new Error('OFFLINE_AI_CONFIG_MISSING')
      }
      return config
    },
  )

  const runtime = new AiQueueRuntime(
    queueService,
    configStore,
    {
      isOnline: async () => {
        if (typeof navigator === 'undefined') {
          return false
        }
        return navigator.onLine
      },
    },
    {
      resolveOwnerProfileId: async () => DEFAULT_OWNER_PROFILE_ID,
    },
  )

  window.__OFFLINE_AI_QUEUE_RUNTIME__ = runtime
  return runtime
}

export type OfflineAiConfigSyncSource = 'server' | 'fallback_local' | 'fallback_missing_local'

export interface OfflineAiConfigSyncResult {
  source: OfflineAiConfigSyncSource
}

export async function syncOfflineAiConfigFromServer(ownerProfileId = DEFAULT_OWNER_PROFILE_ID): Promise<OfflineAiConfigSyncResult> {
  try {
    const config = await apiClient.get<AppConfig>('/api/settings')
    await syncOfflineAiConfigFromAppConfig(config, ownerProfileId)
    return { source: 'server' }
  } catch {
    const store = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())
    const localConfig = await store.load(ownerProfileId)
    if (localConfig) {
      return { source: 'fallback_local' }
    }
    return { source: 'fallback_missing_local' }
  }
}
