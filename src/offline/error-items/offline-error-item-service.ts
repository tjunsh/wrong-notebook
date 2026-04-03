export interface OfflineErrorItemWriteRepository {
  createItem(input: {
    notebookId: string
    ownerProfileId: string
    questionText?: string
    answerText?: string
    analysisText?: string
  }): Promise<{ id: string }>
  updateItem(input: {
    id: string
    ownerProfileId: string
    questionText?: string
    answerText?: string
    analysisText?: string
  }): Promise<void>
}

export interface OfflineAiQueueGateway {
  enqueueAnalyzeTask(input: {
    ownerProfileId: string
    errorItemId: string
    questionText?: string
  }): Promise<void>
}

export class OfflineErrorItemService {
  constructor(
    private readonly repo: OfflineErrorItemWriteRepository,
    private readonly queue: OfflineAiQueueGateway,
  ) {}

  async createAndQueueAnalyze(input: {
    notebookId: string
    ownerProfileId: string
    questionText?: string
    answerText?: string
    analysisText?: string
  }): Promise<{ id: string }> {
    const item = await this.repo.createItem(input)
    await this.queue.enqueueAnalyzeTask({
      ownerProfileId: input.ownerProfileId,
      errorItemId: item.id,
      questionText: input.questionText,
    })
    return item
  }

  async updateAndQueueAnalyze(input: {
    id: string
    ownerProfileId: string
    questionText?: string
    answerText?: string
    analysisText?: string
  }): Promise<void> {
    await this.repo.updateItem(input)
    await this.queue.enqueueAnalyzeTask({
      ownerProfileId: input.ownerProfileId,
      errorItemId: input.id,
      questionText: input.questionText,
    })
  }
}
