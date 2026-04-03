export type AiProviderType = 'openai_compatible' | 'gemini_compatible'

export interface AiProviderConfig {
  providerType: AiProviderType
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
  extraHeaders?: Record<string, string>
}

export interface AnalyzeInput {
  taskId: string
  errorItemId: string
  questionText?: string
  imageBase64?: string
  imageMimeType?: string
}

export interface AnalyzeResult {
  answerText?: string
  analysisText?: string
  tags: string[]
  raw?: unknown
}

export interface AiProviderAdapter {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>
}

export interface AiTask {
  id: string
  ownerProfileId: string
  errorItemId: string
  providerType: AiProviderType
  status: 'pending' | 'processing' | 'success' | 'failed'
  attemptCount: number
  maxAttempts: number
  nextRetryAt?: number
  lastError?: string
  payloadJson: string
  createdAt: number
  updatedAt: number
}
