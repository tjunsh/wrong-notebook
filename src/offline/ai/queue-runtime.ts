import { AiConfigStore } from './config-store'
import { AiQueueService } from './queue-service'
import { QueueRunSource, queueRuntimeTelemetryState } from './runtime-telemetry-state'

export interface NetworkStateProvider {
  isOnline(): Promise<boolean>
}

export interface OwnerContextProvider {
  resolveOwnerProfileId(): Promise<string>
}

export class AiQueueRuntime {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly queueService: AiQueueService,
    private readonly configStore: AiConfigStore,
    private readonly network: NetworkStateProvider,
    private readonly ownerContext: OwnerContextProvider,
  ) {}

  start(intervalMs = 30_000): void {
    if (this.timer) {
      return
    }

    this.timer = setInterval(() => {
      void this.tick('tick')
    }, intervalMs)
  }

  stop(): void {
    if (!this.timer) {
      return
    }
    clearInterval(this.timer)
    this.timer = null
  }

  async runNow(): Promise<void> {
    await this.tick('runNow')
  }

  private async tick(source: QueueRunSource): Promise<void> {
    try {
      const online = await this.network.isOnline()
      if (!online) {
        queueRuntimeTelemetryState.recordSkipped(source, 'offline')
        return
      }

      const ownerProfileId = await this.ownerContext.resolveOwnerProfileId()
      const config = await this.configStore.load(ownerProfileId)
      if (!config) {
        queueRuntimeTelemetryState.recordSkipped(source, 'config_missing')
        return
      }

      const summary = await this.queueService.runOnce(ownerProfileId, Date.now())
      queueRuntimeTelemetryState.recordOk(source, summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OFFLINE_AI_RUNTIME_TICK_FAILED'
      queueRuntimeTelemetryState.recordError(source, message)
      throw error
    }
  }
}
