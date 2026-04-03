import { SqlClient } from '../db/sql-client'

export interface CreateOfflineErrorItemInput {
  notebookId: string
  ownerProfileId: string
  questionText?: string
  answerText?: string
  analysisText?: string
}

export interface UpdateOfflineErrorItemInput {
  id: string
  ownerProfileId: string
  questionText?: string
  answerText?: string
  analysisText?: string
}

export class SqliteErrorItemRepository {
  constructor(private readonly db: SqlClient) {}

  async createItem(input: CreateOfflineErrorItemInput): Promise<{ id: string }> {
    const nowTs = Date.now()
    const id = `ei_${nowTs}_${Math.random().toString(36).slice(2, 8)}`

    await this.db.execute(
      `INSERT INTO error_items (id, owner_profile_id, notebook_id, question_text, answer_text, analysis_text, mastery_level, ai_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
      [
        id,
        input.ownerProfileId,
        input.notebookId,
        input.questionText ?? null,
        input.answerText ?? null,
        input.analysisText ?? null,
        nowTs,
        nowTs,
      ],
    )

    return { id }
  }

  async updateItem(input: UpdateOfflineErrorItemInput): Promise<void> {
    const nowTs = Date.now()
    await this.db.execute(
      `UPDATE error_items
         SET question_text = COALESCE(?, question_text),
             answer_text = COALESCE(?, answer_text),
             analysis_text = COALESCE(?, analysis_text),
             ai_status = 'pending',
             updated_at = ?
       WHERE id = ? AND owner_profile_id = ?`,
      [
        input.questionText ?? null,
        input.answerText ?? null,
        input.analysisText ?? null,
        nowTs,
        input.id,
        input.ownerProfileId,
      ],
    )
  }
}
