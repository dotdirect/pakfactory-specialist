import type { ConversationEngine, EngineConfig, InitialContext } from './types'
import {
  HelpChatResponseSchema,
  type ConversationState,
  type Message,
  type SerializedMessage,
} from '@/types/conversation'

function deserializeMessage(message: SerializedMessage): Message {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
  }
}

export class VercelAIEngine implements ConversationEngine {
  private config: EngineConfig = {}
  private state: ConversationState = {
    conversationId: null,
    status: 'idle',
    messages: [],
    isTyping: false,
  }
  private listeners: Set<(state: ConversationState) => void> = new Set()
  private abortController: AbortController | null = null

  async initialize(config: EngineConfig): Promise<void> {
    this.config = {
      apiEndpoint: '/api/chat',
      model: 'gpt-4o-mini',
      systemPrompt: `You are Anthony, a helpful packaging specialist at PakSpecialist.
You help customers with questions about custom packaging, materials, printing methods,
production timelines, and pricing. Be friendly, knowledgeable, and concise.

If a customer wants to get a quote or needs product recommendations, suggest they
use our quote builder by saying something like: "I'd be happy to help you build a
custom quote! Let me set that up for you."

Topics you can help with:
- Product types (rigid boxes, folding cartons, mailers, etc.)
- Materials (paperboard, corrugated, kraft, etc.)
- Printing methods (offset, digital, flexo)
- Finishes (matte, gloss, soft-touch, foil stamping)
- MOQs and pricing factors
- Production timelines
- Design guidelines`,
      ...config,
    }
  }

  async connect(context?: InitialContext): Promise<string> {
    const conversationId = crypto.randomUUID()

    this.updateState({
      conversationId,
      status: 'active',
      messages: [],
      isTyping: false,
    })

    const greeting: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: context?.customerInfo?.name
        ? `Hi ${context.customerInfo.name}! I'm Anthony, your packaging specialist. How can I help you today?`
        : `Hi there! I'm Anthony, your packaging specialist. How can I help you today?`,
      createdAt: new Date(),
    }

    this.updateState({
      messages: [greeting],
    })

    return conversationId
  }

  async disconnect(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.updateState({
      status: 'idle',
      conversationId: null,
    })
  }

  async sendMessage(content: string): Promise<void> {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    }

    this.updateState({
      messages: [...this.state.messages, userMessage],
      isTyping: true,
    })

    try {
      this.abortController = new AbortController()

      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.state.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) throw new Error('Failed to get response')
      const payload = HelpChatResponseSchema.parse(await response.json())
      const assistantMessage = deserializeMessage(payload.message)

      this.updateState({
        messages: [...this.state.messages, assistantMessage],
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Chat error:', error)
        this.updateState({ status: 'error' })
      }
    } finally {
      this.updateState({ isTyping: false })
      this.abortController = null
    }
  }

  async sendChoice(choice: { id: string; label: string; value: string }): Promise<void> {
    await this.sendMessage(choice.value)
  }

  getState(): ConversationState {
    return { ...this.state }
  }

  subscribe(listener: (state: ConversationState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private updateState(partial: Partial<ConversationState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((listener) => listener(this.state))
  }
}
