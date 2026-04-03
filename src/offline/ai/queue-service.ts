import { createAiAdapter } from './adapter-factory'
import { AiProviderConfig, AiTask, AnalyzeInput } from './types'

export interface AiTaskRepository {
  listExecutableTasks(ownerProfileId: string, nowTs: number, limit: number): Promise<AiTask[]>
  markProcessing(ownerProfileId: string, taskId: string, nowTs: number): Promise<void>
  markSuccess(ownerProfileId: string, taskId: string, nowTs: number): Promise<void>
  markFailed(ownerProfileId: string, taskId: string, nowTs: number, lastError: string, nextRetryAt: number): Promise<void>
  updateErrorItemAnalysis(
    ownerProfileId: string,
    errorItemId: string,
    result: {
      answerText?: string
      analysisText?: string
      tags: string[]
    },
    nowTs: number,
  ): Promise<void>
  loadTaskInput(task: AiTask): Promise<AnalyzeInput>
  enqueueTask?: (input: {
    id: string
    ownerProfileId: string
    errorItemId: string
    providerType: AiProviderConfig['providerType']
    payloadJson: string
    nowTs?: number
  }) => Promise<void>
}

export class AiQueueService {
  constructor(
    private readonly repo: AiTaskRepository,
    private readonly configProvider: (ownerProfileId: string) => Promise<AiProviderConfig>,
  ) {}

  async runOnce(ownerProfileId: string, nowTs = Date.now()): Promise<{ executed: number; succeeded: number; failed: number }> {
    const tasks = await this.repo.listExecutableTasks(ownerProfileId, nowTs, 10)
    if (tasks.length === 0) {
      return { executed: 0, succeeded: 0, failed: 0 }
    }

    const config = await this.configProvider(ownerProfileId)
    const adapter = createAiAdapter(config)

    let succeeded = 0
    let failed = 0

    for (const task of tasks) {
      await this.repo.markProcessing(ownerProfileId, task.id, nowTs)

      try {
        const input = await this.repo.loadTaskInput(task)
        const result = await adapter.analyze(input)

        await this.repo.updateErrorItemAnalysis(ownerProfileId, task.errorItemId, {
          answerText: result.answerText,
          analysisText: result.analysisText,
          tags: result.tags,
        }, Date.now())

        await this.repo.markSuccess(ownerProfileId, task.id, Date.now())
        succeeded += 1
      } catch (error) {
        const attempt = task.attemptCount + 1
        const delay = this.computeBackoffMs(attempt)
        const nextRetryAt = Date.now() + delay
        const message = error instanceof Error ? error.message : 'UNKNOWN_AI_ERROR'

        await this.repo.markFailed(ownerProfileId, task.id, Date.now(), message, nextRetryAt)
        failed += 1
      }
    }

    return {
      executed: tasks.length,
      succeeded,
      failed,
    }
  }

  async enqueueAnalyzeTask(input: {
    ownerProfileId: string
    errorItemId: string
    questionText?: string
    nowTs?: number
  }): Promise<void> {
    if (!this.repo.enqueueTask) {
      throw new Error('AI_TASK_ENQUEUE_NOT_SUPPORTED')
    }

    const nowTs = input.nowTs ?? Date.now()
    let providerType: AiProviderConfig['providerType'] = 'openai_compatible'
    try {
      const config = await this.configProvider(input.ownerProfileId)
      providerType = config.providerType
    } catch {
      providerType = 'openai_compatible'
    }

    await this.repo.enqueueTask({
      id: `task_${nowTs}_${Math.random().toString(36).slice(2, 8)}`,
      ownerProfileId: input.ownerProfileId,
      errorItemId: input.errorItemId,
      providerType,
      payloadJson: JSON.stringify({ questionText: input.questionText }),
      nowTs,
    })
  }

  private computeBackoffMs(attempt: number): number {
    if (attempt <= 1) return 60_000
    if (attempt === 2) return 5 * 60_000
    if (attempt === 3) return 15 * 60_000
    if (attempt === 4) return 60 * 60_000
    return 6 * 60 * 60_000
  }
}
