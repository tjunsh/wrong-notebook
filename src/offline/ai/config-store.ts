import { AiProviderConfig, AiProviderType } from './types'

type StoredConfig = Omit<AiProviderConfig, 'apiKey'>

export interface KeyValueStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

export interface SecretStore {
  getSecret(key: string): Promise<string | null>
  setSecret(key: string, value: string): Promise<void>
  removeSecret(key: string): Promise<void>
}

export class AiConfigStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly secretStore: SecretStore,
  ) {}

  async load(ownerProfileId: string): Promise<AiProviderConfig | null> {
    const rawConfig = await this.kv.get(this.getConfigKey(ownerProfileId))
    if (!rawConfig) {
      return null
    }

    const parsed = JSON.parse(rawConfig) as StoredConfig
    const apiKey = await this.secretStore.getSecret(this.getSecretKey(ownerProfileId))
    if (!apiKey) {
      return null
    }

    return {
      ...parsed,
      apiKey,
    }
  }

  async save(ownerProfileId: string, config: AiProviderConfig): Promise<void> {
    this.validate(config)
    const { apiKey, ...rest } = config
    await this.kv.set(this.getConfigKey(ownerProfileId), JSON.stringify(rest))
    await this.secretStore.setSecret(this.getSecretKey(ownerProfileId), apiKey)
  }

  async clear(ownerProfileId: string): Promise<void> {
    await this.kv.remove(this.getConfigKey(ownerProfileId))
    await this.secretStore.removeSecret(this.getSecretKey(ownerProfileId))
  }

  private validate(config: AiProviderConfig): void {
    if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
      throw new Error('INVALID_AI_BASE_URL')
    }
    if (!config.apiKey) {
      throw new Error('INVALID_AI_API_KEY')
    }
    if (!config.model) {
      throw new Error('INVALID_AI_MODEL')
    }
    if (!this.isProvider(config.providerType)) {
      throw new Error('INVALID_AI_PROVIDER_TYPE')
    }
    if (config.timeoutMs <= 0 || Number.isNaN(config.timeoutMs)) {
      throw new Error('INVALID_AI_TIMEOUT')
    }
  }

  private isProvider(value: string): value is AiProviderType {
    return value === 'openai_compatible' || value === 'gemini_compatible'
  }

  private getConfigKey(ownerProfileId: string): string {
    return `offline_ai_config:${ownerProfileId}`
  }

  private getSecretKey(ownerProfileId: string): string {
    return `offline_ai_api_key:${ownerProfileId}`
  }
}
