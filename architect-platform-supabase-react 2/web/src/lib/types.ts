export type AllowedModel = 'GPT-5' | 'Gemini-2.5-Pro' | 'Claude-4.5-Sonnet'

export interface DispatchRequest {
  model: AllowedModel
  input: string
  system?: string
  temperature?: number
  max_tokens?: number
}

export interface DispatchResponse {
  success: boolean
  model: AllowedModel
  provider: 'openai' | 'google' | 'anthropic'
  output_text: string
  raw: unknown
}
