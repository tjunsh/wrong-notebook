import { AppConfig } from '@/types/api'
import { AiConfigStore } from './config-store'
import { BrowserKvStore, BrowserSecretStore } from './storage'
import { DEFAULT_OWNER_PROFILE_ID } from '../session/constants'

export async function syncOfflineAiConfigFromAppConfig(
  appConfig: AppConfig,
  ownerProfileId = DEFAULT_OWNER_PROFILE_ID,
): Promise<void> {
  const store = new AiConfigStore(new BrowserKvStore(), new BrowserSecretStore())

  if (appConfig.aiProvider === 'openai') {
    const activeId = appConfig.openai?.activeInstanceId
    const instance = appConfig.openai?.instances?.find((candidate) => candidate.id === activeId)
      ?? appConfig.openai?.instances?.[0]

    if (instance?.apiKey && instance.baseUrl && instance.model) {
      await store.save(ownerProfileId, {
        providerType: 'openai_compatible',
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl,
        model: instance.model,
        timeoutMs: appConfig.timeouts?.analyze ?? 90_000,
      })
      return
    }
  }

  if (appConfig.aiProvider === 'gemini') {
    if (appConfig.gemini?.apiKey && appConfig.gemini.baseUrl && appConfig.gemini.model) {
      await store.save(ownerProfileId, {
        providerType: 'gemini_compatible',
        apiKey: appConfig.gemini.apiKey,
        baseUrl: appConfig.gemini.baseUrl,
        model: appConfig.gemini.model,
        timeoutMs: appConfig.timeouts?.analyze ?? 90_000,
      })
      return
    }
  }

  await store.clear(ownerProfileId)
}
