import { SqlClient, SqlExecResult } from './sql-client'

type Primitive = string | number | null

type CapacitorQueryResult = {
  values?: Array<Record<string, unknown>>
}

type CapacitorExecuteResult = {
  changes?: number | { changes?: number; lastId?: number | string }
}

export interface CapacitorSQLiteConnectionLike {
  execute?: (statement: string, values?: Primitive[]) => Promise<CapacitorExecuteResult>
  run?: (statement: string, values?: Primitive[]) => Promise<CapacitorExecuteResult>
  query?: (statement: string, values?: Primitive[]) => Promise<CapacitorQueryResult>
}

export class CapacitorSqliteClient implements SqlClient {
  constructor(private readonly connection: CapacitorSQLiteConnectionLike) {}

  async execute(sql: string, params: Primitive[] = []): Promise<SqlExecResult> {
    if (this.connection.run) {
      const result = await this.connection.run(sql, params)
      return this.normalizeExecuteResult(result)
    }

    if (this.connection.execute) {
      const result = await this.connection.execute(sql, params)
      return this.normalizeExecuteResult(result)
    }

    throw new Error('CAPACITOR_SQLITE_EXECUTE_METHOD_MISSING')
  }

  async query<T extends Record<string, unknown>>(sql: string, params: Primitive[] = []): Promise<T[]> {
    if (!this.connection.query) {
      throw new Error('CAPACITOR_SQLITE_QUERY_METHOD_MISSING')
    }

    const result = await this.connection.query(sql, params)
    const rows = result.values ?? []
    return rows as T[]
  }

  private normalizeExecuteResult(result: CapacitorExecuteResult): SqlExecResult {
    if (typeof result.changes === 'number') {
      return { changes: result.changes }
    }

    if (typeof result.changes === 'object' && result.changes) {
      return {
        changes: result.changes.changes,
        lastInsertRowId: result.changes.lastId,
      }
    }

    return {}
  }
}
