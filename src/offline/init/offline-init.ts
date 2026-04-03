import { bootstrapOfflineDatabase } from '../db/bootstrap'
import { SqlClient } from '../db/sql-client'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { LocalSessionService } from '../session/local-session'

export interface OfflineInitOptions {
  db: SqlClient
  schemaSql: string
  sessionService: LocalSessionService
  nowTs?: number
}

export async function initializeOfflineApp(options: OfflineInitOptions): Promise<{ ownerProfileId: string }> {
  const nowTs = options.nowTs ?? Date.now()

  await bootstrapOfflineDatabase(options.db, options.schemaSql, nowTs)

  const currentOwner = await options.sessionService.resolveOwnerProfileId()
  if (!currentOwner) {
    await options.sessionService.switchOwner(DEFAULT_OWNER_PROFILE_ID)
    return { ownerProfileId: DEFAULT_OWNER_PROFILE_ID }
  }

  return { ownerProfileId: currentOwner }
}
