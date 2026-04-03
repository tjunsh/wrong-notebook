import { setupWithCapacitorSQLiteBridge } from './capacitor-sqlite-wiring-example'
import schemaSql from '@/offline/db/schema.sql?raw'
import type { CapacitorSQLiteLike } from './capacitor-sqlite-wiring-example'

export async function initializeCapacitorEntry(sqlite: CapacitorSQLiteLike): Promise<void> {
  await setupWithCapacitorSQLiteBridge({
    sqlite,
    databaseName: 'wrongbook',
    schemaSql,
    dbVersion: 1,
    encrypted: false,
  })
}
