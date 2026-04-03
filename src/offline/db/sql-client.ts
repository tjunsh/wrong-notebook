export interface SqlExecResult {
  changes?: number
  lastInsertRowId?: number | string
}

export interface SqlClient {
  execute(sql: string, params?: Array<string | number | null>): Promise<SqlExecResult>
  query<T extends Record<string, unknown>>(sql: string, params?: Array<string | number | null>): Promise<T[]>
}
