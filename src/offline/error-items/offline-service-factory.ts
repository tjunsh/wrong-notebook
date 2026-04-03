import { CapacitorSqliteClient, CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import { SqliteAiTaskRepository } from '../ai/sqlite-task-repository'
import { AiQueueService } from '../ai/queue-service'
import { SqliteErrorItemRepository } from './sqlite-error-item-repository'
import { OfflineErrorItemService } from './offline-error-item-service'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'

declare global {
  interface Window {
    __OFFLINE_SQLITE_CONNECTION__?: CapacitorSQLiteConnectionLike
  }
}

export function createOfflineErrorItemService(connection: CapacitorSQLiteConnectionLike): {
  service: OfflineErrorItemService
  ownerProfileId: string
  taskRepository: SqliteAiTaskRepository
} {
  const db = new CapacitorSqliteClient(connection)
  const taskRepository = new SqliteAiTaskRepository(db)
  const queueService = new AiQueueService(taskRepository, async () => {
    throw new Error('AI_CONFIG_UNAVAILABLE')
  })
  const errorItemRepository = new SqliteErrorItemRepository(db)

  return {
    service: new OfflineErrorItemService(errorItemRepository, queueService),
    ownerProfileId: DEFAULT_OWNER_PROFILE_ID,
    taskRepository,
  }
}

export function createOfflineErrorItemServiceFromWindow(): {
  service: OfflineErrorItemService
  ownerProfileId: string
  taskRepository: SqliteAiTaskRepository
} | null {
  const connection = window.__OFFLINE_SQLITE_CONNECTION__
  if (!connection) {
    return null
  }

  return createOfflineErrorItemService(connection)
}
