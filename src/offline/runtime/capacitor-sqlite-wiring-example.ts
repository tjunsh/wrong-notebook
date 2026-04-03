import { CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import {
  initializeCapacitorOfflineBridge,
  initializeCapacitorOfflineImmediately,
} from './capacitor-runtime-bridge'

type Primitive = string | number | null

interface SQLiteConnection {
  open: () => Promise<void>
  close?: () => Promise<void>
  execute?: (statement: string, values?: Primitive[]) => Promise<{
    changes?: number | { changes?: number; lastId?: number | string }
  }>
  run?: (statement: string, values?: Primitive[]) => Promise<{
    changes?: number | { changes?: number; lastId?: number | string }
  }>
  query?: (statement: string, values?: Primitive[]) => Promise<{ values?: Array<Record<string, unknown>> }>
}

export interface CapacitorSQLiteLike {
  isConnection: (options: { database: string; readonly: boolean }) => Promise<{ result: boolean }>
  retrieveConnection: (options: { database: string; readonly: boolean }) => Promise<SQLiteConnection>
  createConnection: (options: {
    database: string
    version: number
    encrypted: boolean
    mode: 'no-encryption' | 'secret' | 'encryption'
    readonly: boolean
  }) => Promise<SQLiteConnection>
}

export interface CapacitorSQLiteStartupOptions {
  sqlite: CapacitorSQLiteLike
  databaseName: string
  schemaSql: string
  dbVersion?: number
  encrypted?: boolean
}

async function openConnection(
  sqlite: CapacitorSQLiteLike,
  databaseName: string,
  dbVersion: number,
  encrypted: boolean,
): Promise<CapacitorSQLiteConnectionLike> {
  const existed = await sqlite.isConnection({
    database: databaseName,
    readonly: false,
  })

  const connection = existed.result
    ? await sqlite.retrieveConnection({ database: databaseName, readonly: false })
    : await sqlite.createConnection({
        database: databaseName,
        version: dbVersion,
        encrypted,
        mode: encrypted ? 'secret' : 'no-encryption',
        readonly: false,
      })

  await connection.open()
  return connection
}

export async function setupWithCapacitorSQLiteBridge(
  options: CapacitorSQLiteStartupOptions,
): Promise<void> {
  const dbVersion = options.dbVersion ?? 1
  const encrypted = options.encrypted ?? false

  await initializeCapacitorOfflineBridge({
    getConnection: () => openConnection(options.sqlite, options.databaseName, dbVersion, encrypted),
    loadSchemaSql: async () => options.schemaSql,
  })
}

export async function setupWithCapacitorSQLiteImmediate(
  options: CapacitorSQLiteStartupOptions,
): Promise<{ ownerProfileId: string }> {
  const dbVersion = options.dbVersion ?? 1
  const encrypted = options.encrypted ?? false

  return initializeCapacitorOfflineImmediately({
    getConnection: () => openConnection(options.sqlite, options.databaseName, dbVersion, encrypted),
    loadSchemaSql: async () => options.schemaSql,
  })
}
