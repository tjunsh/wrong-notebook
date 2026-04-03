import { AiProviderAdapter, AiProviderConfig, AnalyzeInput, AnalyzeResult } from '../types'

export class GeminiCompatibleAdapter implements AiProviderAdapter {
  constructor(private readonly config: AiProviderConfig) {}

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const prompt = this.buildPrompt(input)
    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }

    const url = this.joinUrl(
      this.config.baseUrl,
      `/models/${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`,
    )

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`GEMINI_COMPATIBLE_REQUEST_FAILED ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('GEMINI_COMPATIBLE_EMPTY_RESPONSE')
    }

    const parsed = JSON.parse(text) as {
      answerText?: string
      analysisText?: string
      tags?: string[]
    }

    return {
      answerText: parsed.answerText,
      analysisText: parsed.analysisText,
      tags: parsed.tags ?? [],
      raw: data,
    }
  }

  private buildPrompt(input: AnalyzeInput): string {
    return JSON.stringify({
      questionText: input.questionText ?? '',
      image: input.imageBase64
        ? {
            mimeType: input.imageMimeType,
            base64: input.imageBase64,
          }
        : undefined,
      instructions: 'Return strict JSON: {"answerText":"","analysisText":"","tags":[""]}',
    })
  }

  private joinUrl(baseUrl: string, path: string): string {
    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${trimmedBase}${path}`
  }
}
