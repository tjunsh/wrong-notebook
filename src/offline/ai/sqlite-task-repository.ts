import { SqlClient } from '../db/sql-client'
import { AiTaskRepository } from './queue-service'
import { AiProviderType, AiTask, AnalyzeInput } from './types'

type AiTaskRow = {
  id: string
  owner_profile_id: string
  error_item_id: string
  provider_type: string
  status: string
  attempt_count: number
  max_attempts: number
  next_retry_at: number | null
  last_error: string | null
  payload_json: string
  created_at: number
  updated_at: number
}

type ErrorItemRow = {
  id: string
  owner_profile_id: string
  question_text: string | null
}

export interface EnqueueAiTaskInput {
  id: string
  ownerProfileId: string
  errorItemId: string
  providerType: AiProviderType
  payloadJson: string
  nowTs?: number
}

export class SqliteAiTaskRepository implements AiTaskRepository {
  constructor(private readonly db: SqlClient) {}

  async enqueueTask(input: EnqueueAiTaskInput): Promise<void> {
    const nowTs = input.nowTs ?? Date.now()
    await this.db.execute(
      `INSERT INTO ai_tasks (id, owner_profile_id, error_item_id, provider_type, status, attempt_count, max_attempts, next_retry_at, last_error, payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, 5, ?, NULL, ?, ?, ?)`,
      [input.id, input.ownerProfileId, input.errorItemId, input.providerType, nowTs, input.payloadJson, nowTs, nowTs],
    )

    await this.db.execute(
      `UPDATE error_items
         SET ai_status = 'pending', updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [nowTs, input.errorItemId, input.ownerProfileId],
    )
  }

  async listExecutableTasks(ownerProfileId: string, nowTs: number, limit: number): Promise<AiTask[]> {
    const rows = await this.db.query<AiTaskRow>(
      `SELECT id, owner_profile_id, error_item_id, provider_type, status, attempt_count, max_attempts, next_retry_at, last_error, payload_json, created_at, updated_at
         FROM ai_tasks
        WHERE owner_profile_id = ?
          AND status IN ('pending', 'failed')
          AND attempt_count < max_attempts
          AND (next_retry_at IS NULL OR next_retry_at <= ?)
        ORDER BY created_at ASC
        LIMIT ?`,
      [ownerProfileId, nowTs, limit],
    )

    return rows.map((row) => this.mapTask(row))
  }

  async markProcessing(ownerProfileId: string, taskId: string, nowTs: number): Promise<void> {
    await this.db.execute(
      `UPDATE ai_tasks
         SET status = 'processing', updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [nowTs, taskId, ownerProfileId],
    )
  }

  async markSuccess(ownerProfileId: string, taskId: string, nowTs: number): Promise<void> {
    await this.db.execute(
      `UPDATE ai_tasks
         SET status = 'success', updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [nowTs, taskId, ownerProfileId],
    )
  }

  async markFailed(ownerProfileId: string, taskId: string, nowTs: number, lastError: string, nextRetryAt: number): Promise<void> {
    await this.db.execute(
      `UPDATE ai_tasks
         SET status = 'failed',
             attempt_count = attempt_count + 1,
             last_error = ?,
             next_retry_at = ?,
             updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [lastError, nextRetryAt, nowTs, taskId, ownerProfileId],
    )
  }

  async retryTask(ownerProfileId: string, taskId: string, nowTs: number): Promise<void> {
    await this.db.execute(
      `UPDATE ai_tasks
         SET status = 'pending',
             next_retry_at = ?,
             updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [nowTs, nowTs, taskId, ownerProfileId],
    )

    await this.db.execute(
      `UPDATE error_items
         SET ai_status = 'pending',
             updated_at = ?
       WHERE owner_profile_id = ?
         AND id = (
           SELECT error_item_id
             FROM ai_tasks
            WHERE id = ?
              AND owner_profile_id = ?
            LIMIT 1
         )`,
      [nowTs, ownerProfileId, taskId, ownerProfileId],
    )
  }

  async retryAllFailedTasks(ownerProfileId: string, nowTs: number): Promise<void> {
    await this.db.execute(
      `UPDATE ai_tasks
         SET status = 'pending',
             next_retry_at = ?,
             updated_at = ?
       WHERE owner_profile_id = ?
         AND status = 'failed'`,
      [nowTs, nowTs, ownerProfileId],
    )

    await this.db.execute(
      `UPDATE error_items
         SET ai_status = 'pending',
             updated_at = ?
       WHERE owner_profile_id = ?
         AND id IN (
           SELECT error_item_id
             FROM ai_tasks
            WHERE owner_profile_id = ?
              AND status = 'pending'
         )`,
      [nowTs, ownerProfileId, ownerProfileId],
    )
  }

  async listTasksByStatus(
    ownerProfileId: string,
    status: 'pending' | 'processing' | 'success' | 'failed',
    limit: number,
  ): Promise<AiTask[]> {
    const rows = await this.db.query<AiTaskRow>(
      `SELECT id, owner_profile_id, error_item_id, provider_type, status, attempt_count, max_attempts, next_retry_at, last_error, payload_json, created_at, updated_at
         FROM ai_tasks
        WHERE owner_profile_id = ?
          AND status = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [ownerProfileId, status, limit],
    )

    return rows.map((row) => this.mapTask(row))
  }

  async updateErrorItemAnalysis(
    ownerProfileId: string,
    errorItemId: string,
    result: { answerText?: string; analysisText?: string; tags: string[] },
    nowTs: number,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE error_items
         SET answer_text = COALESCE(?, answer_text),
             analysis_text = COALESCE(?, analysis_text),
             ai_status = 'success',
             updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [result.answerText ?? null, result.analysisText ?? null, nowTs, errorItemId, ownerProfileId],
    )

    if (result.tags.length === 0) {
      return
    }

    await this.db.execute(
      `DELETE FROM error_item_tags
       WHERE error_item_id = ?
         AND tag_id IN (
           SELECT id FROM tags WHERE owner_profile_id = ?
         )`,
      [errorItemId, ownerProfileId],
    )

    for (const tagName of result.tags) {
      const normalizedTag = tagName.trim()
      if (!normalizedTag) {
        continue
      }

      const tagId = `tag_${ownerProfileId}_${this.toStableId(normalizedTag)}`
      await this.db.execute(
        `INSERT OR IGNORE INTO tags (id, owner_profile_id, name, created_at)
         VALUES (?, ?, ?, ?)`,
        [tagId, ownerProfileId, normalizedTag, nowTs],
      )

      await this.db.execute(
        `INSERT OR IGNORE INTO error_item_tags (error_item_id, tag_id)
         VALUES (?, ?)`,
        [errorItemId, tagId],
      )
    }
  }

  async loadTaskInput(task: AiTask): Promise<AnalyzeInput> {
    const payload = this.safeParsePayload(task.payloadJson)
    const rows = await this.db.query<ErrorItemRow>(
      `SELECT id, owner_profile_id, question_text
         FROM error_items
        WHERE id = ? AND owner_profile_id = ?
        LIMIT 1`,
      [task.errorItemId, task.ownerProfileId],
    )

    const errorItem = rows[0]
    if (!errorItem) {
      throw new Error(`ERROR_ITEM_NOT_FOUND:${task.errorItemId}`)
    }

    return {
      taskId: task.id,
      errorItemId: task.errorItemId,
      questionText: payload.questionText ?? errorItem.question_text ?? undefined,
      imageBase64: payload.imageBase64,
      imageMimeType: payload.imageMimeType,
    }
  }

  private mapTask(row: AiTaskRow): AiTask {
    return {
      id: row.id,
      ownerProfileId: row.owner_profile_id,
      errorItemId: row.error_item_id,
      providerType: row.provider_type as AiProviderType,
      status: row.status as AiTask['status'],
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      nextRetryAt: row.next_retry_at ?? undefined,
      lastError: row.last_error ?? undefined,
      payloadJson: row.payload_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private safeParsePayload(payloadJson: string): Partial<AnalyzeInput> {
    try {
      return JSON.parse(payloadJson) as Partial<AnalyzeInput>
    } catch {
      return {}
    }
  }

  private toStableId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48)
  }
}
