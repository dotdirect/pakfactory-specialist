import type { ConversationState, Choice } from '@/types/conversation'
import type { BriefEvent } from '@/types/brief-events'

export interface EngineConfig {
  apiEndpoint?: string
  model?: string
  systemPrompt?: string
  clientId?: string
  botId?: string
}

export interface InitialContext {
  briefId?: string
  userId?: string
  customerInfo?: {
    name?: string
    email?: string
  }
}

export interface ConversationEngine {
  initialize(config: EngineConfig): Promise<void>
  connect(context?: InitialContext): Promise<string>
  disconnect(): Promise<void>
  sendMessage(content: string): Promise<void>
  sendChoice(choice: Choice): Promise<void>
  getState(): ConversationState
  subscribe(listener: (state: ConversationState) => void): () => void
  onBriefEvent?(handler: (event: BriefEvent) => void): () => void
}
