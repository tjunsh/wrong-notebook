import { GeminiCompatibleAdapter } from './adapters/gemini-compatible-adapter'
import { OpenAiCompatibleAdapter } from './adapters/openai-compatible-adapter'
import { AiProviderAdapter, AiProviderConfig } from './types'

export function createAiAdapter(config: AiProviderConfig): AiProviderAdapter {
  if (config.providerType === 'openai_compatible') {
    return new OpenAiCompatibleAdapter(config)
  }

  return new GeminiCompatibleAdapter(config)
}
