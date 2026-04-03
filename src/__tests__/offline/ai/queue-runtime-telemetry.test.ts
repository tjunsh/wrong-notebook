import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiQueueRuntime } from '@/offline/ai/queue-runtime'
import { queueRuntimeTelemetryState } from '@/offline/ai/runtime-telemetry-state'

describe('queue runtime telemetry', () => {
  beforeEach(() => {
    queueRuntimeTelemetryState.reset()
  })

  it('records runNow summary with executed/succeeded/failed counts', async () => {
    const runtime = new AiQueueRuntime(
      {
        runOnce: vi.fn().mockResolvedValue({ executed: 3, succeeded: 2, failed: 1 }),
      } as never,
      {
        load: vi.fn().mockResolvedValue({
          providerType: 'openai_compatible',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          model: 'gpt-4o-mini',
          timeoutMs: 90_000,
        }),
      } as never,
      {
        isOnline: vi.fn().mockResolvedValue(true),
      },
      {
        resolveOwnerProfileId: vi.fn().mockResolvedValue('local_default'),
      },
    )

    await runtime.runNow()

    const snapshot = queueRuntimeTelemetryState.getSnapshot()
    expect(snapshot.lastRun?.source).toBe('runNow')
    expect(snapshot.lastRun?.status).toBe('ok')
    expect(snapshot.lastRun?.executed).toBe(3)
    expect(snapshot.lastRun?.succeeded).toBe(2)
    expect(snapshot.lastRun?.failed).toBe(1)
  })

  it('records skipped run when offline', async () => {
    const runtime = new AiQueueRuntime(
      {
        runOnce: vi.fn(),
      } as never,
      {
        load: vi.fn(),
      } as never,
      {
        isOnline: vi.fn().mockResolvedValue(false),
      },
      {
        resolveOwnerProfileId: vi.fn().mockResolvedValue('local_default'),
      },
    )

    await runtime.runNow()

    const snapshot = queueRuntimeTelemetryState.getSnapshot()
    expect(snapshot.lastRun?.source).toBe('runNow')
    expect(snapshot.lastRun?.status).toBe('skipped')
    expect(snapshot.lastRun?.reason).toBe('offline')
    expect(snapshot.lastRun?.executed).toBe(0)
  })
})
