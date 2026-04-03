import { AiProviderAdapter, AiProviderConfig, AnalyzeInput, AnalyzeResult } from '../types'

export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  constructor(private readonly config: AiProviderConfig) {}

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const body = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an education assistant. Return concise JSON with answerText, analysisText, tags.'
        },
        {
          role: 'user',
          content: this.buildUserContent(input),
        },
      ],
      response_format: {
        type: 'json_object',
      },
    }

    const res = await fetch(this.joinUrl(this.config.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OPENAI_COMPATIBLE_REQUEST_FAILED ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OPENAI_COMPATIBLE_EMPTY_RESPONSE')
    }

    const parsed = JSON.parse(content) as {
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

  private buildUserContent(input: AnalyzeInput): string {
    const question = input.questionText ?? ''
    if (!input.imageBase64 || !input.imageMimeType) {
      return JSON.stringify({
        questionText: question,
        instructions: 'Analyze this question and return answerText, analysisText, tags[] as JSON.'
      })
    }

    return JSON.stringify({
      questionText: question,
      image: {
        mimeType: input.imageMimeType,
        base64: input.imageBase64,
      },
      instructions: 'Analyze this question and image and return answerText, analysisText, tags[] as JSON.'
    })
  }

  private joinUrl(baseUrl: string, path: string): string {
    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${trimmedBase}${path}`
  }
}
