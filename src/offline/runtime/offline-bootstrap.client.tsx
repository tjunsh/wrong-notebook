"use client"

import { useEffect, useState } from 'react'
import { initializeOfflineApp } from '../init/offline-init'
import { CapacitorSqliteClient, CapacitorSQLiteConnectionLike } from '../db/capacitor-sqlite-client'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'
import { InMemoryLocalSessionStore, LocalSessionService } from '../session/local-session'
import { offlineRuntimeState } from './offline-runtime-state'
import { ensureOfflineAiRuntime, syncOfflineAiConfigFromServer } from '../ai/runtime-factory'

declare global {
  interface Window {
    __OFFLINE_SQLITE_CONNECTION__?: CapacitorSQLiteConnectionLike
    __OFFLINE_SCHEMA_SQL__?: string
  }
}

export function OfflineBootstrap(): null {
  const [retryToken, setRetryToken] = useState(() => offlineRuntimeState.getSnapshot().retryToken)

  useEffect(() => {
    return offlineRuntimeState.subscribe((snapshot) => {
      setRetryToken(snapshot.retryToken)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await bootstrapOfflineRuntimeOnce({
        isCancelled: () => cancelled,
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [retryToken])

  return null
}

export async function bootstrapOfflineRuntimeOnce(options?: { isCancelled?: () => boolean }): Promise<void> {
  const isCancelled = options?.isCancelled
  const connection = window.__OFFLINE_SQLITE_CONNECTION__
  const schemaSql = window.__OFFLINE_SCHEMA_SQL__
  if (!connection || !schemaSql) {
    return
  }

  offlineRuntimeState.setInitializing()

  const db = new CapacitorSqliteClient(connection)
  const sessionStore = new InMemoryLocalSessionStore()
  const sessionService = new LocalSessionService(sessionStore, DEFAULT_OWNER_PROFILE_ID)

  try {
    await initializeOfflineApp({
      db,
      schemaSql,
      sessionService,
    })

    const syncResult = await syncOfflineAiConfigFromServer()
    if (!isCancelled?.()) {
      if (syncResult.source === 'fallback_missing_local') {
        offlineRuntimeState.setSettingsWarning('OFFLINE_SETTINGS_SYNC_NO_LOCAL_CONFIG')
      } else if (syncResult.source === 'fallback_local') {
        offlineRuntimeState.setSettingsWarning('OFFLINE_SETTINGS_SYNC_USING_LOCAL_CONFIG')
      } else {
        offlineRuntimeState.setSettingsWarning(undefined)
      }
    }

    const runtime = ensureOfflineAiRuntime(connection)
    runtime.start(30_000)
    if (!isCancelled?.()) {
      offlineRuntimeState.setReady()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OFFLINE_BOOTSTRAP_FAILED'
    if (!isCancelled?.()) {
      offlineRuntimeState.setFailed(message)
    }
  }
}
