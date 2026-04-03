import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncOfflineAiConfigFromServer } from '@/offline/ai/runtime-factory'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('syncOfflineAiConfigFromServer fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('keeps existing offline config when /api/settings fails', async () => {
    const ownerProfileId = 'local_default'
    localStorage.setItem(
      `offline_ai_config:${ownerProfileId}`,
      JSON.stringify({
        providerType: 'openai_compatible',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        timeoutMs: 90_000,
      }),
    )
    localStorage.setItem(`offline_ai_api_key:${ownerProfileId}`, 'sk-existing')

    vi.mocked(apiClient.get).mockRejectedValue(new Error('SETTINGS_UNAVAILABLE'))

    await expect(syncOfflineAiConfigFromServer(ownerProfileId)).resolves.toEqual({
      source: 'fallback_local',
    })

    expect(localStorage.getItem(`offline_ai_api_key:${ownerProfileId}`)).toBe('sk-existing')
    const config = localStorage.getItem(`offline_ai_config:${ownerProfileId}`)
    expect(config).toContain('openai_compatible')
  })

  it('reports missing local config on cold start when /api/settings fails', async () => {
    const ownerProfileId = 'local_default'
    vi.mocked(apiClient.get).mockRejectedValue(new Error('SETTINGS_UNAVAILABLE'))

    await expect(syncOfflineAiConfigFromServer(ownerProfileId)).resolves.toEqual({
      source: 'fallback_missing_local',
    })
  })
})
