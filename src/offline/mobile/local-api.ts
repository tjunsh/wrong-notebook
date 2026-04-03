import { ApiError } from '@/lib/api-client'
import { ParsedQuestion } from '@/lib/ai/types'
import { CapacitorSqliteClient } from '../db/capacitor-sqlite-client'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { BrowserKvStore, BrowserSecretStore } from '../ai/storage'
import { AiConfigStore } from '../ai/config-store'
import { createAiAdapter } from '../ai/adapter-factory'
import { AppConfig, ErrorItem, Notebook, PaginatedResponse, UserProfile } from '@/types/api'
import { SqliteAiTaskRepository } from '../ai/sqlite-task-repository'
import { AiQueueService } from '../ai/queue-service'

declare global {
  interface Window {
    __OFFLINE_SQLITE_CONNECTION__?: {
      execute?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>
      run?: (statement: string, values?: Array<string | number | null>) => Promise<{ changes?: number | { changes?: number; lastId?: number | string } }>
      query?: (statement: string, values?: Array<string | number | null>) => Promise<{ values?: Array<Record<string, unknown>> }>
    }
  }
}

interface LocalApiContext {
  db: CapacitorSqliteClient
  ownerProfileId: string
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const LOCAL_CONFIG_KEY = 'mobile_local_app_config'

function nowIso(ts: number): string {
  return new Date(ts).toISOString()
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseJsonBody<T>(body?: string): T {
  if (!body) {
    return {} as T
  }
  return JSON.parse(body) as T
}

async function getContext(): Promise<LocalApiContext> {
  const connection = window.__OFFLINE_SQLITE_CONNECTION__
  if (!connection) {
    throw new ApiError(503, 'OFFLINE_DB_UNAVAILABLE', { message: 'OFFLINE_DB_UNAVAILABLE' })
  }

  return {
    db: new CapacitorSqliteClient(connection),
    ownerProfileId: DEFAULT_OWNER_PROFILE_ID,
  }
}

function getDefaultConfig(): AppConfig {
  return {
    aiProvider: 'openai',
    allowRegistration: false,
    openai: {
      instances: [],
      activeInstanceId: undefined,
    },
    gemini: {
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
    },
    prompts: {
      analyze: '',
      similar: '',
    },
    timeouts: {
      analyze: 180000,
    },
  }
}

async function loadLocalConfig(): Promise<AppConfig> {
  const kv = new BrowserKvStore()
  const raw = await kv.get(LOCAL_CONFIG_KEY)
  if (!raw) {
    return getDefaultConfig()
  }
  return {
    ...getDefaultConfig(),
    ...(JSON.parse(raw) as AppConfig),
  }
}

async function saveLocalConfig(config: AppConfig): Promise<void> {
  const kv = new BrowserKvStore()
  await kv.set(LOCAL_CONFIG_KEY, JSON.stringify(config))

  const aiStore = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())
  const timeoutMs = config.timeouts?.analyze ?? 180000

  if (config.aiProvider === 'gemini' && config.gemini?.apiKey && config.gemini?.baseUrl && config.gemini?.model) {
    await aiStore.save(DEFAULT_OWNER_PROFILE_ID, {
      providerType: 'gemini_compatible',
      baseUrl: config.gemini.baseUrl,
      apiKey: config.gemini.apiKey,
      model: config.gemini.model,
      timeoutMs,
    })
    return
  }

  const activeId = config.openai?.activeInstanceId
  const activeInstance = config.openai?.instances?.find((item) => item.id === activeId)
  if (config.aiProvider === 'openai' && activeInstance?.apiKey && activeInstance.baseUrl && activeInstance.model) {
    await aiStore.save(DEFAULT_OWNER_PROFILE_ID, {
      providerType: 'openai_compatible',
      baseUrl: activeInstance.baseUrl,
      apiKey: activeInstance.apiKey,
      model: activeInstance.model,
      timeoutMs,
    })
  }
}

async function resolveAiAdapter() {
  const store = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())
  const config = await store.load(DEFAULT_OWNER_PROFILE_ID)
  if (!config) {
    throw new ApiError(400, 'AI_CONFIG_MISSING', { message: 'AI_CONFIG_MISSING' })
  }
  return createAiAdapter(config)
}

async function listNotebooks(ctx: LocalApiContext): Promise<Notebook[]> {
  const rows = await ctx.db.query<{
    id: string
    name: string
    owner_profile_id: string
    created_at: number
    updated_at: number
    error_count: number
  }>(
    `SELECT n.id, n.name, n.owner_profile_id, n.created_at, n.updated_at,
            (SELECT COUNT(*) FROM error_items e WHERE e.notebook_id = n.id AND e.owner_profile_id = n.owner_profile_id) AS error_count
       FROM notebooks n
      WHERE n.owner_profile_id = ?
      ORDER BY n.updated_at DESC`,
    [ctx.ownerProfileId],
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    userId: row.owner_profile_id,
    createdAt: nowIso(row.created_at),
    updatedAt: nowIso(row.updated_at),
    _count: { errorItems: Number(row.error_count ?? 0) },
  }))
}

async function getNotebook(ctx: LocalApiContext, notebookId: string): Promise<Notebook> {
  const rows = await ctx.db.query<{
    id: string
    name: string
    owner_profile_id: string
    created_at: number
    updated_at: number
    error_count: number
  }>(
    `SELECT n.id, n.name, n.owner_profile_id, n.created_at, n.updated_at,
            (SELECT COUNT(*) FROM error_items e WHERE e.notebook_id = n.id AND e.owner_profile_id = n.owner_profile_id) AS error_count
       FROM notebooks n
      WHERE n.id = ? AND n.owner_profile_id = ?
      LIMIT 1`,
    [notebookId, ctx.ownerProfileId],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError(404, 'NOTEBOOK_NOT_FOUND', { message: 'NOTEBOOK_NOT_FOUND' })
  }

  return {
    id: row.id,
    name: row.name,
    userId: row.owner_profile_id,
    createdAt: nowIso(row.created_at),
    updatedAt: nowIso(row.updated_at),
    _count: { errorItems: Number(row.error_count ?? 0) },
  }
}

async function createNotebook(ctx: LocalApiContext, body?: string): Promise<Notebook> {
  const payload = parseJsonBody<{ name?: string }>(body)
  const name = payload.name?.trim()
  if (!name) {
    throw new ApiError(400, 'INVALID_NOTEBOOK_NAME', { message: 'INVALID_NOTEBOOK_NAME' })
  }

  const nowTs = Date.now()
  const id = `nb_${nowTs}_${Math.random().toString(36).slice(2, 8)}`
  await ctx.db.execute(
    `INSERT INTO notebooks (id, owner_profile_id, name, subject, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, ctx.ownerProfileId, name, name, nowTs, nowTs],
  )

  return {
    id,
    name,
    userId: ctx.ownerProfileId,
    createdAt: nowIso(nowTs),
    updatedAt: nowIso(nowTs),
    _count: { errorItems: 0 },
  }
}

async function deleteNotebook(ctx: LocalApiContext, notebookId: string): Promise<Record<string, never>> {
  await ctx.db.execute(`DELETE FROM notebooks WHERE id = ? AND owner_profile_id = ?`, [notebookId, ctx.ownerProfileId])
  return {}
}

async function createErrorItem(ctx: LocalApiContext, body?: string): Promise<{ id: string }> {
  const payload = parseJsonBody<{
    subjectId?: string
    questionText?: string
    answerText?: string
    analysis?: string
    knowledgePoints?: string[]
    originalImageUrl?: string
    gradeSemester?: string
    paperLevel?: string
  }>(body)

  if (!payload.subjectId) {
    throw new ApiError(400, 'SUBJECT_ID_REQUIRED', { message: 'SUBJECT_ID_REQUIRED' })
  }

  const nowTs = Date.now()
  const id = `ei_${nowTs}_${Math.random().toString(36).slice(2, 8)}`

  await ctx.db.execute(
    `INSERT INTO error_items (id, owner_profile_id, notebook_id, question_text, answer_text, analysis_text, mastery_level, ai_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
    [
      id,
      ctx.ownerProfileId,
      payload.subjectId,
      payload.questionText ?? null,
      payload.answerText ?? null,
      payload.analysis ?? null,
      nowTs,
      nowTs,
    ],
  )

  if (payload.originalImageUrl) {
    await ctx.db.execute(
      `INSERT INTO error_images (id, owner_profile_id, error_item_id, local_path, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [`img_${id}`, ctx.ownerProfileId, id, payload.originalImageUrl, nowTs],
    )
  }

  const tags = payload.knowledgePoints ?? []
  for (const tagName of tags) {
    const trimmed = tagName.trim()
    if (!trimmed) continue
    const tagId = `tag_${trimmed}`
    await ctx.db.execute(
      `INSERT OR IGNORE INTO tags (id, owner_profile_id, name, created_at)
       VALUES (?, ?, ?, ?)`,
      [tagId, ctx.ownerProfileId, trimmed, nowTs],
    )
    await ctx.db.execute(
      `INSERT OR IGNORE INTO error_item_tags (error_item_id, tag_id)
       VALUES (?, ?)`,
      [id, tagId],
    )
  }

  const taskRepo = new SqliteAiTaskRepository(ctx.db)
  const queueService = new AiQueueService(taskRepo, async () => {
    const store = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())
    const config = await store.load(ctx.ownerProfileId)
    if (!config) {
      throw new Error('AI_CONFIG_UNAVAILABLE')
    }
    return config
  })
  await queueService.enqueueAnalyzeTask({
    ownerProfileId: ctx.ownerProfileId,
    errorItemId: id,
    questionText: payload.questionText,
  })

  return { id }
}

async function listErrorItems(ctx: LocalApiContext, url: URL): Promise<PaginatedResponse<ErrorItem>> {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? '20'))
  const offset = (page - 1) * pageSize
  const subjectId = url.searchParams.get('subjectId')
  const query = url.searchParams.get('query')

  const conditions: string[] = ['e.owner_profile_id = ?']
  const params: Array<string | number | null> = [ctx.ownerProfileId]

  if (subjectId) {
    conditions.push('e.notebook_id = ?')
    params.push(subjectId)
  }
  if (query) {
    conditions.push('(e.question_text LIKE ? OR e.answer_text LIKE ? OR e.analysis_text LIKE ?)')
    params.push(`%${query}%`, `%${query}%`, `%${query}%`)
  }

  const whereClause = conditions.join(' AND ')

  const totalRows = await ctx.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM error_items e WHERE ${whereClause}`, params)
  const total = Number(totalRows[0]?.total ?? 0)

  const rows = await ctx.db.query<{
    id: string
    question_text: string | null
    answer_text: string | null
    analysis_text: string | null
    mastery_level: number
    ai_status: string
    created_at: number
    updated_at: number
    notebook_id: string
    notebook_name: string | null
    image_path: string | null
  }>(
    `SELECT e.id, e.question_text, e.answer_text, e.analysis_text, e.mastery_level, e.ai_status,
            e.created_at, e.updated_at, e.notebook_id,
            n.name AS notebook_name,
            (SELECT local_path FROM error_images i WHERE i.error_item_id = e.id LIMIT 1) AS image_path
       FROM error_items e
       LEFT JOIN notebooks n ON n.id = e.notebook_id
      WHERE ${whereClause}
      ORDER BY e.updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  )

  const items: ErrorItem[] = []
  for (const row of rows) {
    const tagRows = await ctx.db.query<{ name: string }>(
      `SELECT t.name FROM tags t
        JOIN error_item_tags et ON et.tag_id = t.id
       WHERE et.error_item_id = ?`,
      [row.id],
    )
    items.push({
      id: row.id,
      userId: ctx.ownerProfileId,
      subjectId: row.notebook_id,
      subject: row.notebook_name ? { id: row.notebook_id, name: row.notebook_name, userId: ctx.ownerProfileId, createdAt: nowIso(row.created_at), updatedAt: nowIso(row.updated_at) } : null,
      originalImageUrl: row.image_path ?? '',
      questionText: row.question_text,
      answerText: row.answer_text,
      analysis: row.analysis_text,
      knowledgePoints: JSON.stringify(tagRows.map((tag) => tag.name)),
      masteryLevel: Number(row.mastery_level ?? 0),
      aiStatus: row.ai_status,
      createdAt: nowIso(row.created_at),
      updatedAt: nowIso(row.updated_at),
    })
  }

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

async function getErrorItemDetail(ctx: LocalApiContext, errorItemId: string): Promise<Record<string, unknown>> {
  const rows = await ctx.db.query<{
    id: string
    question_text: string | null
    answer_text: string | null
    analysis_text: string | null
    mastery_level: number
    ai_status: string
    notebook_id: string
    notebook_name: string | null
    created_at: number
    updated_at: number
    image_path: string | null
  }>(
    `SELECT e.id, e.question_text, e.answer_text, e.analysis_text, e.mastery_level, e.ai_status,
            e.notebook_id, n.name AS notebook_name, e.created_at, e.updated_at,
            (SELECT local_path FROM error_images i WHERE i.error_item_id = e.id LIMIT 1) AS image_path
       FROM error_items e
       LEFT JOIN notebooks n ON n.id = e.notebook_id
      WHERE e.id = ? AND e.owner_profile_id = ?
      LIMIT 1`,
    [errorItemId, ctx.ownerProfileId],
  )
  const row = rows[0]
  if (!row) {
    throw new ApiError(404, 'ERROR_ITEM_NOT_FOUND', { message: 'ERROR_ITEM_NOT_FOUND' })
  }
  const tagRows = await ctx.db.query<{ id: string; name: string }>(
    `SELECT t.id, t.name FROM tags t JOIN error_item_tags et ON et.tag_id = t.id WHERE et.error_item_id = ?`,
    [row.id],
  )
  return {
    id: row.id,
    questionText: row.question_text ?? '',
    answerText: row.answer_text ?? '',
    analysis: row.analysis_text ?? '',
    knowledgePoints: JSON.stringify(tagRows.map((tag) => tag.name)),
    tags: tagRows,
    masteryLevel: Number(row.mastery_level ?? 0),
    aiStatus: row.ai_status,
    originalImageUrl: row.image_path ?? '',
    userNotes: null,
    subjectId: row.notebook_id,
    subject: row.notebook_name ? { id: row.notebook_id, name: row.notebook_name } : null,
    createdAt: nowIso(row.created_at),
    updatedAt: nowIso(row.updated_at),
  }
}

async function updateErrorItem(ctx: LocalApiContext, errorItemId: string, body?: string): Promise<Record<string, never>> {
  const payload = parseJsonBody<{
    questionText?: string
    answerText?: string
    analysis?: string
    knowledgePoints?: string[]
    gradeSemester?: string
    paperLevel?: string
  }>(body)
  const nowTs = Date.now()
  await ctx.db.execute(
    `UPDATE error_items
        SET question_text = COALESCE(?, question_text),
            answer_text = COALESCE(?, answer_text),
            analysis_text = COALESCE(?, analysis_text),
            ai_status = 'pending',
            updated_at = ?
      WHERE id = ? AND owner_profile_id = ?`,
    [payload.questionText ?? null, payload.answerText ?? null, payload.analysis ?? null, nowTs, errorItemId, ctx.ownerProfileId],
  )

  if (Array.isArray(payload.knowledgePoints)) {
    await ctx.db.execute(`DELETE FROM error_item_tags WHERE error_item_id = ?`, [errorItemId])
    for (const tagName of payload.knowledgePoints) {
      const trimmed = tagName.trim()
      if (!trimmed) continue
      const tagId = `tag_${trimmed}`
      await ctx.db.execute(
        `INSERT OR IGNORE INTO tags (id, owner_profile_id, name, created_at) VALUES (?, ?, ?, ?)`,
        [tagId, ctx.ownerProfileId, trimmed, nowTs],
      )
      await ctx.db.execute(`INSERT OR IGNORE INTO error_item_tags (error_item_id, tag_id) VALUES (?, ?)`, [errorItemId, tagId])
    }
  }

  return {}
}

async function updateErrorItemNotes(ctx: LocalApiContext, errorItemId: string, body?: string): Promise<Record<string, never>> {
  const payload = parseJsonBody<{ userNotes?: string }>(body)
  const notes = payload.userNotes ?? null
  await ctx.db.execute(
    `UPDATE error_items
        SET analysis_text = COALESCE(analysis_text, '') || CASE WHEN ? IS NULL OR ? = '' THEN '' ELSE '\n\nNotes:\n' || ? END,
            updated_at = ?
      WHERE id = ? AND owner_profile_id = ?`,
    [notes, notes, notes, Date.now(), errorItemId, ctx.ownerProfileId],
  )
  return {}
}

async function patchMastery(ctx: LocalApiContext, errorItemId: string, body?: string): Promise<Record<string, never>> {
  const payload = parseJsonBody<{ masteryLevel?: number }>(body)
  const mastery = Number(payload.masteryLevel ?? 0)
  await ctx.db.execute(
    `UPDATE error_items SET mastery_level = ?, updated_at = ? WHERE id = ? AND owner_profile_id = ?`,
    [mastery, Date.now(), errorItemId, ctx.ownerProfileId],
  )
  return {}
}

async function deleteErrorItem(ctx: LocalApiContext, errorItemId: string): Promise<Record<string, never>> {
  await ctx.db.execute(`DELETE FROM error_items WHERE id = ? AND owner_profile_id = ?`, [errorItemId, ctx.ownerProfileId])
  return {}
}

async function batchDeleteErrorItems(ctx: LocalApiContext, body?: string): Promise<Record<string, never>> {
  const payload = parseJsonBody<{ ids?: string[] }>(body)
  const ids = payload.ids ?? []
  for (const id of ids) {
    await ctx.db.execute(`DELETE FROM error_items WHERE id = ? AND owner_profile_id = ?`, [id, ctx.ownerProfileId])
  }
  return {}
}

async function clearErrorItems(ctx: LocalApiContext): Promise<Record<string, never>> {
  await ctx.db.execute(`DELETE FROM error_items WHERE owner_profile_id = ?`, [ctx.ownerProfileId])
  return {}
}

async function getUserProfile(ctx: LocalApiContext): Promise<UserProfile> {
  const rows = await ctx.db.query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM profiles WHERE id = ? LIMIT 1`,
    [ctx.ownerProfileId],
  )
  const row = rows[0]
  return {
    id: row?.id ?? ctx.ownerProfileId,
    email: 'local@offline',
    name: row?.display_name ?? 'Local User',
    educationStage: 'middle',
    enrollmentYear: null,
    role: 'user',
    isActive: true,
  }
}

async function updateUserProfile(ctx: LocalApiContext, body?: string): Promise<UserProfile> {
  const payload = parseJsonBody<{ name?: string }>(body)
  if (payload.name) {
    await ctx.db.execute(
      `UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?`,
      [payload.name, Date.now(), ctx.ownerProfileId],
    )
  }
  return getUserProfile(ctx)
}

async function analyzeWithCloud(body?: string): Promise<ParsedQuestion> {
  const payload = parseJsonBody<{ imageBase64?: string; language?: 'zh' | 'en'; subjectId?: string }>(body)
  if (!payload.imageBase64) {
    throw new ApiError(400, 'MISSING_IMAGE', { message: 'MISSING_IMAGE' })
  }

  const adapter = await resolveAiAdapter()
  const result = await adapter.analyze({
    taskId: `direct_${Date.now()}`,
    errorItemId: 'direct',
    questionText: 'Analyze image question',
    imageBase64: payload.imageBase64,
    imageMimeType: 'image/jpeg',
  })

  return {
    questionText: '',
    answerText: result.answerText ?? '',
    analysis: result.analysisText ?? '',
    subject: '其他',
    knowledgePoints: result.tags,
    requiresImage: true,
  }
}

async function reanswerWithCloud(body?: string): Promise<{ answerText: string; analysis: string; knowledgePoints: string[] }> {
  const payload = parseJsonBody<{ questionText?: string; imageBase64?: string }>(body)
  if (!payload.questionText?.trim()) {
    throw new ApiError(400, 'MISSING_QUESTION', { message: 'MISSING_QUESTION' })
  }

  const adapter = await resolveAiAdapter()
  const result = await adapter.analyze({
    taskId: `reanswer_${Date.now()}`,
    errorItemId: 'direct',
    questionText: payload.questionText,
    imageBase64: payload.imageBase64,
    imageMimeType: payload.imageBase64 ? 'image/jpeg' : undefined,
  })

  return {
    answerText: result.answerText ?? '',
    analysis: result.analysisText ?? '',
    knowledgePoints: result.tags,
  }
}

async function getTagStats(ctx: LocalApiContext): Promise<{ stats: Array<{ tag: string; count: number }> }> {
  const rows = await ctx.db.query<{ name: string; count: number }>(
    `SELECT t.name, COUNT(et.error_item_id) AS count
       FROM tags t
       LEFT JOIN error_item_tags et ON et.tag_id = t.id
      WHERE t.owner_profile_id = ?
      GROUP BY t.id, t.name
      ORDER BY count DESC, t.name ASC`,
    [ctx.ownerProfileId],
  )
  return {
    stats: rows.map((row) => ({ tag: row.name, count: Number(row.count ?? 0) })),
  }
}

async function getAnalytics(ctx: LocalApiContext): Promise<Record<string, unknown>> {
  const totalRows = await ctx.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM error_items WHERE owner_profile_id = ?`, [ctx.ownerProfileId])
  const masteredRows = await ctx.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM error_items WHERE owner_profile_id = ? AND mastery_level > 0`, [ctx.ownerProfileId])
  const totalErrors = Number(totalRows[0]?.total ?? 0)
  const masteredCount = Number(masteredRows[0]?.total ?? 0)

  return {
    totalErrors,
    masteredCount,
    masteryRate: totalErrors > 0 ? Math.round((masteredCount / totalErrors) * 100) : 0,
    subjectStats: [],
    activityData: [],
  }
}

async function getPracticeStats(): Promise<Record<string, unknown>> {
  return {
    subjectStats: [],
    activityStats: [],
    difficultyStats: [],
    overallStats: { total: 0, correct: 0, rate: '0%' },
  }
}

async function clearPracticeStats(): Promise<Record<string, never>> {
  return {}
}

async function generatePracticeQuestion(body?: string): Promise<ParsedQuestion> {
  const payload = parseJsonBody<{ errorItemId?: string; difficulty?: 'easy' | 'medium' | 'hard' | 'harder' }>(body)
  if (!payload.errorItemId) {
    throw new ApiError(400, 'MISSING_ERROR_ITEM_ID', { message: 'MISSING_ERROR_ITEM_ID' })
  }

  const ctx = await getContext()
  const item = await getErrorItemDetail(ctx, payload.errorItemId)
  const adapter = await resolveAiAdapter()
  const result = await adapter.analyze({
    taskId: `practice_${Date.now()}`,
    errorItemId: payload.errorItemId,
    questionText: toStringValue(item.questionText),
  })

  return {
    questionText: toStringValue(item.questionText) || result.analysisText || 'Practice question',
    answerText: result.answerText ?? toStringValue(item.answerText),
    analysis: result.analysisText ?? toStringValue(item.analysis),
    subject: '其他',
    knowledgePoints: result.tags,
    requiresImage: false,
  }
}

async function recordPracticeResult(ctx: LocalApiContext, body?: string): Promise<Record<string, never>> {
  const payload = parseJsonBody<{ isCorrect?: boolean }>(body)
  await ctx.db.execute(
    `INSERT INTO review_records (id, owner_profile_id, error_item_id, result, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ctx.ownerProfileId,
      'practice_local',
      payload.isCorrect ? 'correct' : 'wrong',
      0,
      Date.now(),
    ],
  )
  return {}
}

export async function dispatchLocalApi(url: string, method: HttpMethod, body?: string): Promise<unknown> {
  const fullUrl = new URL(url, 'http://offline.local')
  const path = fullUrl.pathname
  const ctx = await getContext()

  if (path === '/api/settings' && method === 'GET') {
    return loadLocalConfig()
  }
  if (path === '/api/settings' && method === 'POST') {
    const payload = parseJsonBody<AppConfig>(body)
    await saveLocalConfig(payload)
    return payload
  }

  if (path === '/api/user' && method === 'GET') {
    return getUserProfile(ctx)
  }
  if (path === '/api/user' && method === 'PATCH') {
    return updateUserProfile(ctx, body)
  }

  if (path === '/api/analyze' && method === 'POST') {
    return analyzeWithCloud(body)
  }
  if (path === '/api/reanswer' && method === 'POST') {
    return reanswerWithCloud(body)
  }

  if (path === '/api/notebooks' && method === 'GET') {
    return listNotebooks(ctx)
  }
  if (path === '/api/notebooks' && method === 'POST') {
    return createNotebook(ctx, body)
  }
  if (path.startsWith('/api/notebooks/') && method === 'GET') {
    const notebookId = path.split('/').pop() ?? ''
    return getNotebook(ctx, notebookId)
  }
  if (path.startsWith('/api/notebooks/') && method === 'DELETE') {
    const notebookId = path.split('/').pop() ?? ''
    return deleteNotebook(ctx, notebookId)
  }

  if (path === '/api/error-items' && method === 'POST') {
    return createErrorItem(ctx, body)
  }
  if (path === '/api/error-items/list' && method === 'GET') {
    return listErrorItems(ctx, fullUrl)
  }
  if (path === '/api/error-items/clear' && method === 'DELETE') {
    return clearErrorItems(ctx)
  }
  if (path === '/api/error-items/batch-delete' && method === 'POST') {
    return batchDeleteErrorItems(ctx, body)
  }

  if (path.endsWith('/mastery') && method === 'PATCH') {
    const segments = path.split('/')
    return patchMastery(ctx, segments[3] ?? '', body)
  }
  if (path.endsWith('/notes') && method === 'PATCH') {
    const segments = path.split('/')
    return updateErrorItemNotes(ctx, segments[3] ?? '', body)
  }
  if (path.endsWith('/delete') && method === 'DELETE') {
    const segments = path.split('/')
    return deleteErrorItem(ctx, segments[3] ?? '')
  }
  if (path.startsWith('/api/error-items/') && method === 'GET') {
    const errorItemId = path.split('/')[3] ?? ''
    return getErrorItemDetail(ctx, errorItemId)
  }
  if (path.startsWith('/api/error-items/') && method === 'PUT') {
    const errorItemId = path.split('/')[3] ?? ''
    return updateErrorItem(ctx, errorItemId, body)
  }

  if (path === '/api/tags/stats' && method === 'GET') {
    return getTagStats(ctx)
  }

  if (path === '/api/analytics' && method === 'GET') {
    return getAnalytics(ctx)
  }
  if (path === '/api/stats/practice' && method === 'GET') {
    return getPracticeStats()
  }
  if (path === '/api/stats/practice/clear' && method === 'DELETE') {
    return clearPracticeStats()
  }
  if (path === '/api/practice/generate' && method === 'POST') {
    return generatePracticeQuestion(body)
  }
  if (path === '/api/practice/record' && method === 'POST') {
    return recordPracticeResult(ctx, body)
  }

  throw new ApiError(501, 'LOCAL_API_NOT_IMPLEMENTED', { message: `${method} ${path} not implemented` })
}
