import { CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import {
  MobileOfflineBootstrapOptions,
  bootstrapMobileOfflineNow,
  registerMobileOfflineRuntime,
} from './mobile-bootstrap'

export interface CapacitorRuntimeBridgeOptions {
  getConnection: () => Promise<CapacitorSQLiteConnectionLike>
  loadSchemaSql: () => Promise<string>
  defaultOwnerProfileId?: string
}

export async function initializeCapacitorOfflineBridge(options: CapacitorRuntimeBridgeOptions): Promise<void> {
  const [connection, schemaSql] = await Promise.all([
    options.getConnection(),
    options.loadSchemaSql(),
  ])

  registerMobileOfflineRuntime({
    connection,
    schemaSql,
    defaultOwnerProfileId: options.defaultOwnerProfileId,
  })
}

export async function initializeCapacitorOfflineImmediately(
  options: CapacitorRuntimeBridgeOptions,
): Promise<{ ownerProfileId: string }> {
  const [connection, schemaSql] = await Promise.all([
    options.getConnection(),
    options.loadSchemaSql(),
  ])

  const bootstrapOptions: MobileOfflineBootstrapOptions = {
    connection,
    schemaSql,
    defaultOwnerProfileId: options.defaultOwnerProfileId,
  }

  return bootstrapMobileOfflineNow(bootstrapOptions)
}
