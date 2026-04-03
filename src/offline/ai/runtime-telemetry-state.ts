export type QueueRunSource = 'tick' | 'runNow'
export type QueueRunStatus = 'ok' | 'skipped' | 'error'
export type QueueRunSkipReason = 'offline' | 'config_missing'

export interface QueueRuntimeLastRun {
  source: QueueRunSource
  status: QueueRunStatus
  at: number
  executed: number
  succeeded: number
  failed: number
  reason?: QueueRunSkipReason
  error?: string
}

export interface QueueRuntimeTelemetrySnapshot {
  lastRun?: QueueRuntimeLastRun
}

type Listener = (snapshot: QueueRuntimeTelemetrySnapshot) => void

function createQueueRuntimeTelemetryState() {
  let snapshot: QueueRuntimeTelemetrySnapshot = {}
  const listeners = new Set<Listener>()

  const notify = () => {
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  return {
    getSnapshot: (): QueueRuntimeTelemetrySnapshot => snapshot,
    recordOk: (source: QueueRunSource, summary: { executed: number; succeeded: number; failed: number }) => {
      snapshot = {
        ...snapshot,
        lastRun: {
          source,
          status: 'ok',
          at: Date.now(),
          executed: summary.executed,
          succeeded: summary.succeeded,
          failed: summary.failed,
        },
      }
      notify()
    },
    recordSkipped: (source: QueueRunSource, reason: QueueRunSkipReason) => {
      snapshot = {
        ...snapshot,
        lastRun: {
          source,
          status: 'skipped',
          at: Date.now(),
          executed: 0,
          succeeded: 0,
          failed: 0,
          reason,
        },
      }
      notify()
    },
    recordError: (source: QueueRunSource, error: string) => {
      snapshot = {
        ...snapshot,
        lastRun: {
          source,
          status: 'error',
          at: Date.now(),
          executed: 0,
          succeeded: 0,
          failed: 0,
          error,
        },
      }
      notify()
    },
    reset: () => {
      snapshot = {}
      notify()
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const queueRuntimeTelemetryState = createQueueRuntimeTelemetryState()
