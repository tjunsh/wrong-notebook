import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { SqlClient } from './sql-client'

export async function bootstrapOfflineDatabase(
  db: SqlClient,
  schemaSql: string,
  nowTs = Date.now(),
): Promise<void> {
  const statements = schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

  for (const statement of statements) {
    await db.execute(statement)
  }

  await db.execute(
    `INSERT OR IGNORE INTO profiles (id, display_name, unlock_mode, created_at, updated_at)
     VALUES (?, ?, 'none', ?, ?)`,
    [DEFAULT_OWNER_PROFILE_ID, 'Local User', nowTs, nowTs],
  )
}
