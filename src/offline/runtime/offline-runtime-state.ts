export type OfflineInitStatus = 'idle' | 'initializing' | 'ready' | 'failed'

export interface OfflineRuntimeSnapshot {
  status: OfflineInitStatus
  error?: string
  retryToken: number
  settingsWarning?: string
}

type Listener = (snapshot: OfflineRuntimeSnapshot) => void

export interface OfflineRuntimeState {
  getSnapshot: () => OfflineRuntimeSnapshot
  setInitializing: () => void
  setReady: () => void
  setFailed: (error: string) => void
  setSettingsWarning: (warning?: string) => void
  requestRetry: () => void
  subscribe: (listener: Listener) => () => void
}

export function createOfflineRuntimeState(): OfflineRuntimeState {
  let snapshot: OfflineRuntimeSnapshot = { status: 'idle', retryToken: 0 }
  const listeners = new Set<Listener>()

  const notify = () => {
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  return {
    getSnapshot: () => snapshot,
    setInitializing: () => {
      snapshot = { ...snapshot, status: 'initializing', error: undefined, settingsWarning: undefined }
      notify()
    },
    setReady: () => {
      snapshot = { ...snapshot, status: 'ready', error: undefined }
      notify()
    },
    setFailed: (error: string) => {
      snapshot = { ...snapshot, status: 'failed', error }
      notify()
    },
    setSettingsWarning: (warning?: string) => {
      snapshot = { ...snapshot, settingsWarning: warning }
      notify()
    },
    requestRetry: () => {
      snapshot = { ...snapshot, retryToken: snapshot.retryToken + 1 }
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

export const offlineRuntimeState = createOfflineRuntimeState()
