import {
  initializeCapacitorOfflineBridge,
  initializeCapacitorOfflineImmediately,
} from './capacitor-runtime-bridge'

type Primitive = string | number | null

type SqliteConnectionLike = {
  run?: (statement: string, values?: Primitive[]) => Promise<{
    changes?: number | { changes?: number; lastId?: number | string }
  }>
  execute?: (statement: string, values?: Primitive[]) => Promise<{
    changes?: number | { changes?: number; lastId?: number | string }
  }>
  query?: (statement: string, values?: Primitive[]) => Promise<{ values?: Array<Record<string, unknown>> }>
}

async function createSqliteConnection(): Promise<SqliteConnectionLike> {
  throw new Error('REPLACE_WITH_CAPACITOR_SQLITE_CONNECTION_FACTORY')
}

async function loadOfflineSchemaSql(): Promise<string> {
  throw new Error('REPLACE_WITH_SCHEMA_SQL_LOADER')
}

export async function setupOfflineRuntimeBridge(): Promise<void> {
  await initializeCapacitorOfflineBridge({
    getConnection: createSqliteConnection,
    loadSchemaSql: loadOfflineSchemaSql,
    defaultOwnerProfileId: 'local_default',
  })
}

export async function setupOfflineRuntimeAndBootstrapNow(): Promise<{ ownerProfileId: string }> {
  return initializeCapacitorOfflineImmediately({
    getConnection: createSqliteConnection,
    loadSchemaSql: loadOfflineSchemaSql,
    defaultOwnerProfileId: 'local_default',
  })
}
