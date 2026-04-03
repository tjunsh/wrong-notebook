import { initializeOfflineApp } from '../init/offline-init'
import { CapacitorSqliteClient, CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { InMemoryLocalSessionStore, LocalSessionService } from '../session/local-session'

declare global {
  interface Window {
    __OFFLINE_SQLITE_CONNECTION__?: CapacitorSQLiteConnectionLike
    __OFFLINE_SCHEMA_SQL__?: string
  }
}

export interface MobileOfflineBootstrapOptions {
  connection: CapacitorSQLiteConnectionLike
  schemaSql: string
  defaultOwnerProfileId?: string
}

export function registerMobileOfflineRuntime(options: MobileOfflineBootstrapOptions): void {
  window.__OFFLINE_SQLITE_CONNECTION__ = options.connection
  window.__OFFLINE_SCHEMA_SQL__ = options.schemaSql
}

export async function bootstrapMobileOfflineNow(
  options: MobileOfflineBootstrapOptions,
): Promise<{ ownerProfileId: string }> {
  const defaultOwnerProfileId = options.defaultOwnerProfileId ?? DEFAULT_OWNER_PROFILE_ID
  const db = new CapacitorSqliteClient(options.connection)
  const sessionStore = new InMemoryLocalSessionStore()
  const sessionService = new LocalSessionService(sessionStore, defaultOwnerProfileId)

  return initializeOfflineApp({
    db,
    schemaSql: options.schemaSql,
    sessionService,
  })
}
