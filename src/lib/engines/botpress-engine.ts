import type { ConversationEngine, EngineConfig, InitialContext } from './types'
import type { ConversationState, Message } from '@/types/conversation'
import type { BriefEvent } from '@/types/brief-events'
import { BriefEventSchema } from '@/types/brief-events'

/**
 * Botpress engine stub that manages conversation state for the project panel.
 *
 * The actual @botpress/webchat package is a React component library (Webchat,
 * WebchatProvider, useWebchat). Full integration will mount the Botpress
 * WebchatProvider in the component tree. This engine provides the state
 * management layer and brief-event handling that wraps around it.
 *
 * Phase 2 will wire this to the real Botpress WebchatProvider hooks.
 */
export class BotpressEngine implements ConversationEngine {
  private config: EngineConfig = {}
  private state: ConversationState = {
    conversationId: null,
    status: 'idle',
    messages: [],
    isTyping: false,
  }
  private listeners: Set<(state: ConversationState) => void> = new Set()
  private briefEventHandlers: Set<(event: BriefEvent) => void> = new Set()

  async initialize(config: EngineConfig): Promise<void> {
    this.config = config
  }

  async connect(context?: InitialContext): Promise<string> {
    this.updateState({ status: 'connecting' })

    const conversationId = crypto.randomUUID()

    this.updateState({
      conversationId,
      status: 'active',
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: context?.customer?.name
          ? `Hi ${context.customer.name}! I'm Anthony, your packaging specialist. Let's build your quote together.`
          : `Hi there! I'm Anthony, your packaging specialist. Let's build your quote together.`,
        createdAt: new Date(),
      }],
    })

    return conversationId
  }

  async disconnect(): Promise<void> {
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

    // Placeholder: In Phase 2 this will forward to the Botpress WebchatProvider
    setTimeout(() => {
      this.updateState({
        messages: [...this.state.messages, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Botpress integration pending — connect your bot in Phase 2.',
          createdAt: new Date(),
        }],
        isTyping: false,
      })
    }, 800)
  }

  async sendChoice(choice: { id: string; label: string; value: string }): Promise<void> {
    await this.sendMessage(choice.label)
  }

  getState(): ConversationState {
    return { ...this.state }
  }

  subscribe(listener: (state: ConversationState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onBriefEvent(handler: (event: BriefEvent) => void): () => void {
    this.briefEventHandlers.add(handler)
    return () => this.briefEventHandlers.delete(handler)
  }

  /** Called by the Botpress WebchatProvider event bridge in Phase 2 */
  handleIncomingEvent(rawEvent: unknown): void {
    const parsed = BriefEventSchema.safeParse(rawEvent)
    if (parsed.success) {
      this.briefEventHandlers.forEach((handler) => handler(parsed.data))
    }
  }

  private updateState(partial: Partial<ConversationState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach((listener) => listener(this.state))
  }
}
