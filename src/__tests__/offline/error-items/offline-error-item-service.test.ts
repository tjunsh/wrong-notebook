import { describe, expect, it, vi } from 'vitest'
import { OfflineErrorItemService } from '@/offline/error-items/offline-error-item-service'

describe('offline error item service', () => {
  it('saves item first then enqueues analyze task', async () => {
    const repo = {
      createItem: vi.fn().mockResolvedValue({ id: 'ei_1' }),
      updateItem: vi.fn().mockResolvedValue(undefined),
    }
    const queue = { enqueueAnalyzeTask: vi.fn().mockResolvedValue(undefined) }
    const svc = new OfflineErrorItemService(repo, queue)

    await svc.createAndQueueAnalyze({
      notebookId: 'n1',
      ownerProfileId: 'local_default',
      questionText: 'q',
    })

    expect(repo.createItem).toHaveBeenCalledTimes(1)
    expect(queue.enqueueAnalyzeTask).toHaveBeenCalledTimes(1)

    const createOrder = repo.createItem.mock.invocationCallOrder[0]
    const queueOrder = queue.enqueueAnalyzeTask.mock.invocationCallOrder[0]
    expect(createOrder).toBeLessThan(queueOrder)
  })
})
