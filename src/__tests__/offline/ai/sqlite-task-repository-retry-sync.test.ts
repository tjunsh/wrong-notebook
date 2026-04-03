import { describe, expect, it, vi } from 'vitest'
import { SqliteAiTaskRepository } from '@/offline/ai/sqlite-task-repository'

describe('sqlite task repository retry sync', () => {
  it('retryAllFailedTasks also syncs error_items ai_status to pending', async () => {
    const execute = vi.fn().mockResolvedValue({})
    const query = vi.fn().mockResolvedValue([])
    const repo = new SqliteAiTaskRepository({ execute, query })

    await repo.retryAllFailedTasks('local_default', 123)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute.mock.calls[1][0]).toContain('UPDATE error_items')
    expect(execute.mock.calls[1][0]).toContain("ai_status = 'pending'")
  })

  it('retryTask syncs linked error item ai_status to pending', async () => {
    const execute = vi.fn().mockResolvedValue({})
    const query = vi.fn().mockResolvedValue([])
    const repo = new SqliteAiTaskRepository({ execute, query })

    await repo.retryTask('local_default', 'task_1', 456)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute.mock.calls[1][0]).toContain('UPDATE error_items')
    expect(execute.mock.calls[1][0]).toContain('SELECT error_item_id')
  })
})
