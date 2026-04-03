import { describe, expect, it, vi } from 'vitest'
import { SqliteAiTaskRepository } from '@/offline/ai/sqlite-task-repository'

describe('queue controls', () => {
  it('exposes retry-all failed tasks operation', async () => {
    const execute = vi.fn().mockResolvedValue({})
    const query = vi.fn().mockResolvedValue([])
    const repo = new SqliteAiTaskRepository({ execute, query })

    await repo.retryAllFailedTasks('local_default', 123)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute.mock.calls[0][0]).toContain('UPDATE ai_tasks')
    expect(execute.mock.calls[1][0]).toContain('UPDATE error_items')
    expect(typeof repo.retryTask).toBe('function')
    expect(typeof repo.retryAllFailedTasks).toBe('function')
    expect(typeof repo.listTasksByStatus).toBe('function')
  })
})
