import { describe, expect, it } from 'vitest'
import { syncOfflineAiConfigFromAppConfig } from '@/offline/ai/config-sync'
import { AppConfig } from '@/types/api'

describe('offline ai config sync', () => {
  it('persists openai active instance into offline config store', async () => {
    const appConfig: AppConfig = {
      aiProvider: 'openai',
      openai: {
        activeInstanceId: 'inst1',
        instances: [
          {
            id: 'inst1',
            name: 'Primary',
            apiKey: 'sk-xxx',
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
          },
        ],
      },
      timeouts: {
        analyze: 120000,
      },
    }

    await syncOfflineAiConfigFromAppConfig(appConfig, 'local_default')

    const rawConfig = localStorage.getItem('offline_ai_config:local_default')
    const rawSecret = localStorage.getItem('offline_ai_api_key:local_default')

    expect(rawConfig).toBeTruthy()
    expect(rawSecret).toBe('sk-xxx')

    const parsed = JSON.parse(rawConfig as string) as { providerType: string; model: string; timeoutMs: number }
    expect(parsed.providerType).toBe('openai_compatible')
    expect(parsed.model).toBe('gpt-4o-mini')
    expect(parsed.timeoutMs).toBe(120000)
  })
})
