import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type { TechnicalBrief, LineItem, Customer, Intent, ProductSpecs, ProjectContext, Timeline, BriefStatus, Billing, ProjectEntry } from '@/types/brief'
import type { BriefEvent } from '@/types/brief-events'
import type { StepId, FlowId, RecommendedProduct } from '@/lib/steps/types'
import { FLOW_CONFIGS, getNextStepInFlow, getNextStepInLoop } from '@/lib/steps/flow-configs'

export type RagDebugData = {
  query: string
  industry?: string
  filterTier: 'alias' | 'none'
  aliasesUsed?: string[]
  products: Array<{ name: string; score: number; category: string }>
}

export type SessionRecoveryStatus = 'pending' | 'accepted' | 'declined' | null

export interface PersistedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

const STORAGE_KEY = 'brief-session'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_PERSISTED_MESSAGES = 200

// ─── Manual localStorage helpers ──────────────────────────────────────────────

type PersistedSnapshot = {
  version: number
  brief: TechnicalBrief
  currentStep: StepId
  currentFlow: FlowId
  conversationLog: PersistedMessage[]
  processedToolCallIds: string[]
  lastRecommendations?: RecommendedProduct[] | null
  lastRagDebug?: RagDebugData | null
  lastRecommendationNextStep?: string | null
  inProjectLoop?: boolean
  currentProjectIndex?: number
}

function saveSnapshot(state: BriefState): void {
  if (!state.brief) return
  try {
    const snapshot: PersistedSnapshot = {
      version: 1,
      brief: state.brief,
      currentStep: state.currentStep,
      currentFlow: state.currentFlow,
      conversationLog: state.conversationLog.slice(-MAX_PERSISTED_MESSAGES),
      processedToolCallIds: state.processedToolCallIds,
      lastRecommendations: state.lastRecommendations,
      lastRagDebug: state.lastRagDebug,
      lastRecommendationNextStep: state.lastRecommendationNextStep,
      inProjectLoop: state.inProjectLoop,
      currentProjectIndex: state.currentProjectIndex,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch (err) {
    console.error('[brief-store] Failed to save session:', err)
  }
}

function loadSnapshot(): PersistedSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const snapshot = JSON.parse(raw) as PersistedSnapshot
    if (!snapshot?.brief?.id || !snapshot?.brief?.updatedAt) return null

    // Clear submitted briefs
    if (snapshot.brief.status === 'submitted') {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Clear stale sessions
    const updatedAt = new Date(snapshot.brief.updatedAt).getTime()
    if (Date.now() - updatedAt > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return snapshot
  } catch {
    console.error('[brief-store] Corrupted session data, clearing.')
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function clearSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface BriefState {
  brief: TechnicalBrief | null
  lastUpdatedField: string | null

  // ─── Debug ─────────────────────────────────────────────────────────────────
  ragDebug: RagDebugData | null
  setRagDebug: (data: RagDebugData) => void

  // ─── Structured step flow state ───────────────────────────────────────────
  currentFlow: FlowId
  currentStep: StepId

  // ─── Multi-project loop ──────────────────────────────────────────────────
  inProjectLoop: boolean
  currentProjectIndex: number
  editingProjectIndex: number | null

  // ─── Conversation persistence ─────────────────────────────────────────────
  conversationLog: PersistedMessage[]
  processedToolCallIds: string[]
  appendToConversationLog: (messages: PersistedMessage[]) => void

  // ─── Session recovery ─────────────────────────────────────────────────────
  sessionRecovery: SessionRecoveryStatus
  setSessionRecovery: (status: SessionRecoveryStatus) => void
  acceptRecovery: () => void
  declineRecovery: () => void
  clearSession: () => void

  // ─── Cached recommendations (survives refresh) ────────────────────────
  lastRecommendations: RecommendedProduct[] | null
  lastRagDebug: RagDebugData | null
  lastRecommendationNextStep: string | null
  setLastRecommendations: (products: RecommendedProduct[], ragDebug: RagDebugData | null, nextStep: string | undefined) => void
  clearLastRecommendations: () => void

  // ─── Manual persistence ─────────────────────────────────────────────────
  /** Save current state to localStorage. Called on step completion and when recommendations arrive. */
  persistSession: () => void
  /** Load saved session from localStorage. Called once on mount. Returns true if a session was restored. */
  hydrateSession: () => boolean

  initializeBrief: (conversationId?: string) => void
  updateCustomerInfo: (info: Partial<Customer>) => void
  updateIntent: (intent: Intent) => void
  addLineItem: (item: Omit<LineItem, 'id' | 'addedAt'>) => void
  removeLineItem: (lineItemId: string) => void
  updateLineItemSpecs: (lineItemId: string, specs: ProductSpecs) => void
  updateTimeline: (timeline: Timeline) => void
  updateProjectContext: (context: Partial<ProjectContext>) => void
  updateBilling: (billing: Partial<Billing>) => void
  setStatus: (status: BriefStatus) => void
  setNotes: (notes: string) => void
  handleBriefEvent: (event: BriefEvent) => void
  resetBrief: () => void
  getCompletionPercentage: () => number

  // ─── Multi-project actions ─────────────────────────────────────────────────
  archiveCurrentProject: (projectEntryId: string) => void
  clearWorkingProject: () => void
  setEditingProjectIndex: (index: number | null) => void
  updateArchivedProject: (index: number, updates: Partial<ProjectEntry>) => void

  // ─── Flow navigation ──────────────────────────────────────────────────────
  initFlow: (flowId: FlowId) => void
  advanceStep: (override?: StepId | 'submit') => void
}

export const useBriefStore = create<BriefState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        brief: null,
        lastUpdatedField: null,
        ragDebug: null,
        setRagDebug: (data) => set({ ragDebug: data }),
        currentFlow: 'rfq-full' as FlowId,
        currentStep: 'profile' as StepId,

        // ─── Multi-project loop ────────────────────────────────────────────
        inProjectLoop: false,
        currentProjectIndex: 0,
        editingProjectIndex: null,

        // ─── Conversation persistence ──────────────────────────────────────
        conversationLog: [],
        processedToolCallIds: [],

        appendToConversationLog: (messages) => {
          set((state) => {
            const existingIds = new Set(state.conversationLog.map((m) => m.id))
            const newMessages = messages.filter((m) => !existingIds.has(m.id))
            if (newMessages.length > 0) {
              state.conversationLog.push(...newMessages)
              if (state.conversationLog.length > MAX_PERSISTED_MESSAGES) {
                state.conversationLog = state.conversationLog.slice(-MAX_PERSISTED_MESSAGES)
              }
            }
          })
        },

        // ─── Cached recommendations ─────────────────────────────────────────
        lastRecommendations: null,
        lastRagDebug: null,
        lastRecommendationNextStep: null,

        setLastRecommendations: (products, ragDebug, nextStep) => {
          set((state) => {
            state.lastRecommendations = products
            state.lastRagDebug = ragDebug
            state.lastRecommendationNextStep = nextStep ?? null
          })
          // Persist immediately — user might refresh while viewing cards
          get().persistSession()
        },

        clearLastRecommendations: () => {
          set((state) => {
            state.lastRecommendations = null
            state.lastRagDebug = null
            state.lastRecommendationNextStep = null
          })
        },

        // ─── Session recovery ──────────────────────────────────────────────
        sessionRecovery: null,
        setSessionRecovery: (status) => set({ sessionRecovery: status }),

        acceptRecovery: () => {
          set({ sessionRecovery: 'accepted' })
        },

        declineRecovery: () => {
          set((state) => {
            state.brief = null
            state.lastUpdatedField = null
            state.conversationLog = []
            state.processedToolCallIds = []
            state.lastRecommendations = null
            state.lastRagDebug = null
            state.lastRecommendationNextStep = null
            state.currentFlow = 'rfq-full' as FlowId
            state.currentStep = 'profile' as StepId
            state.sessionRecovery = 'declined'
            state.inProjectLoop = false
            state.currentProjectIndex = 0
            state.editingProjectIndex = null
          })
          clearSnapshot()
        },

        clearSession: () => {
          set((state) => {
            state.brief = null
            state.lastUpdatedField = null
            state.conversationLog = []
            state.processedToolCallIds = []
            state.lastRecommendations = null
            state.lastRagDebug = null
            state.lastRecommendationNextStep = null
            state.currentFlow = 'rfq-full' as FlowId
            state.currentStep = 'profile' as StepId
            state.sessionRecovery = null
            state.inProjectLoop = false
            state.currentProjectIndex = 0
            state.editingProjectIndex = null
          })
          clearSnapshot()
        },

        // ─── Manual persistence ──────────────────────────────────────────────
        persistSession: () => {
          saveSnapshot(get())
        },

        hydrateSession: () => {
          const snapshot = loadSnapshot()
          if (!snapshot) return false

          set((state) => {
            state.brief = snapshot.brief
            state.currentStep = snapshot.currentStep
            state.currentFlow = snapshot.currentFlow
            state.conversationLog = snapshot.conversationLog
            state.processedToolCallIds = snapshot.processedToolCallIds
            state.lastRecommendations = snapshot.lastRecommendations ?? null
            state.lastRagDebug = snapshot.lastRagDebug ?? null
            state.lastRecommendationNextStep = snapshot.lastRecommendationNextStep ?? null
            state.inProjectLoop = snapshot.inProjectLoop ?? false
            state.currentProjectIndex = snapshot.currentProjectIndex ?? 0
            // Mark recovery as pending so the user is asked to continue or restart
            if (snapshot.brief.status === 'in_progress') {
              state.sessionRecovery = 'pending'
            }
          })
          return true
        },

        initializeBrief: (conversationId) => {
          set((state) => {
            state.brief = {
              id: uuidv4(),
              conversationId,
              status: 'draft',
              lineItems: [],
              projects: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          })
        },

        updateCustomerInfo: (info) => {
          set((state) => {
            if (state.brief) {
              const patch = Object.fromEntries(
                Object.entries(info).filter(([, v]) => v !== undefined),
              ) as Partial<Customer>
              state.brief.customer = {
                ...state.brief.customer,
                ...patch,
              }
              state.brief.updatedAt = new Date().toISOString()
              state.brief.status = 'in_progress'
              state.lastUpdatedField = 'customer'
            }
          })
        },

        updateIntent: (intent) => {
          set((state) => {
            if (state.brief) {
              state.brief.intent = intent
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'intent'
            }
          })
        },

        addLineItem: (item) => {
          set((state) => {
            if (state.brief) {
              state.brief.lineItems.push({
                ...item,
                id: uuidv4(),
                addedAt: new Date().toISOString(),
              })
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'lineItems'
            }
          })
        },

        removeLineItem: (lineItemId) => {
          set((state) => {
            if (state.brief) {
              state.brief.lineItems = state.brief.lineItems.filter(
                (item) => item.id !== lineItemId
              )
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'lineItems'
            }
          })
        },

        updateLineItemSpecs: (lineItemId, specs) => {
          set((state) => {
            if (state.brief) {
              const item = state.brief.lineItems.find((i) => i.id === lineItemId)
              if (item) {
                item.specs = specs
                state.brief.updatedAt = new Date().toISOString()
                state.lastUpdatedField = `lineItem.${lineItemId}.specs`
              }
            }
          })
        },

        updateTimeline: (timeline) => {
          set((state) => {
            if (state.brief) {
              state.brief.timeline = timeline
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'timeline'
            }
          })
        },

        updateProjectContext: (context) => {
          set((state) => {
            if (state.brief) {
              state.brief.project = {
                ...state.brief.project,
                ...context,
              }
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'project'
            }
          })
        },

        updateBilling: (billing) => {
          set((state) => {
            if (state.brief) {
              state.brief.billing = {
                ...state.brief.billing,
                ...billing,
              }
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'billing'
            }
          })
        },

        setStatus: (status) => {
          set((state) => {
            if (state.brief) {
              state.brief.status = status
              state.brief.updatedAt = new Date().toISOString()
              if (status === 'submitted') {
                state.brief.submittedAt = new Date().toISOString()
              }
            }
          })
        },

        setNotes: (notes) => {
          set((state) => {
            if (state.brief) {
              state.brief.notes = notes
              state.brief.updatedAt = new Date().toISOString()
              state.lastUpdatedField = 'notes'
            }
          })
        },

        // SCALE: New event types need a case here. Keep in sync with brief-events.ts.
        handleBriefEvent: (event) => {
          const actions = get()
          switch (event.action) {
            case 'brief.identity.confirmed':
              actions.updateCustomerInfo(event.data)
              break
            case 'brief.intent.confirmed':
              actions.updateIntent(event.data)
              break
            case 'brief.product.added':
              actions.addLineItem({
                productId: event.data.productId,
                productName: event.data.productName,
                handle: event.data.handle,
                category: event.data.category,
                quantity: event.data.quantity,
                quantities: event.data.quantities,
                imageUrl: event.data.imageUrl,
                specs: event.data.specs,
              })
              break
            case 'brief.product.removed':
              actions.removeLineItem(event.data.lineItemId)
              break
            case 'brief.specs.confirmed':
              actions.updateLineItemSpecs(event.data.lineItemId, event.data.specs)
              break
            case 'brief.timeline.confirmed':
              actions.updateTimeline(event.data)
              break
            case 'brief.project.context_confirmed':
              actions.updateProjectContext(event.data)
              break
            case 'brief.billing.confirmed':
              actions.updateBilling(event.data)
              break
            case 'brief.project.archived':
              actions.archiveCurrentProject(event.data.projectEntryId)
              break
            case 'brief.submitted':
              actions.setStatus('submitted')
              break
          }
        },

        // ─── Multi-project actions ──────────────────────────────────────────

        archiveCurrentProject: (projectEntryId) => {
          set((state) => {
            if (!state.brief) return
            const entry: ProjectEntry = {
              id: projectEntryId,
              project: state.brief.project ? { ...state.brief.project } : undefined,
              lineItems: [...state.brief.lineItems],
              billing: state.brief.billing ? { ...state.brief.billing } : undefined,
              createdAt: new Date().toISOString(),
            }
            state.brief.projects.push(entry)
            state.brief.updatedAt = new Date().toISOString()
            state.lastUpdatedField = 'projects'
          })
        },

        clearWorkingProject: () => {
          set((state) => {
            if (!state.brief) return
            state.brief.project = undefined
            state.brief.lineItems = []
            // Billing intentionally kept — users often ship to the same address
            state.brief.updatedAt = new Date().toISOString()
          })
        },

        setEditingProjectIndex: (index) => {
          set({ editingProjectIndex: index })
        },

        updateArchivedProject: (index, updates) => {
          set((state) => {
            if (!state.brief || index < 0 || index >= state.brief.projects.length) return
            const entry = state.brief.projects[index]!
            if (updates.project !== undefined) entry.project = updates.project
            if (updates.lineItems !== undefined) entry.lineItems = updates.lineItems
            if (updates.billing !== undefined) entry.billing = updates.billing
            state.brief.updatedAt = new Date().toISOString()
            state.lastUpdatedField = 'projects'
          })
        },

        resetBrief: () => {
          set((state) => {
            state.brief = null
            state.lastUpdatedField = null
            state.conversationLog = []
            state.processedToolCallIds = []
            state.lastRecommendations = null
            state.lastRagDebug = null
            state.lastRecommendationNextStep = null
            state.inProjectLoop = false
            state.currentProjectIndex = 0
            state.editingProjectIndex = null
          })
        },

        // SCALE: Weights should align with brief-collection config.
        getCompletionPercentage: () => {
          const brief = get().brief
          if (!brief) return 0

          let completed = 0
          const total = 5

          if (brief.customer) completed++
          if (brief.intent) completed++
          if (brief.lineItems.length > 0) completed++
          if (brief.lineItems.some((item) => item.specs)) completed++
          if (brief.timeline) completed++

          return Math.round((completed / total) * 100)
        },

        // ─── Flow navigation ────────────────────────────────────────────────

        initFlow: (flowId) => {
          set((state) => {
            const flow = FLOW_CONFIGS[flowId]
            state.currentFlow = flowId
            state.currentStep = flow.steps[0]!
          })
        },

        advanceStep: (override) => {
          const { currentFlow, currentStep, inProjectLoop } = get()

          // Clear cached recommendations when leaving the recommend step
          if (currentStep === 'recommend') {
            get().clearLastRecommendations()
          }

          let next: StepId | 'submit'

          if (override) {
            next = override
          } else if (inProjectLoop) {
            // When looping through additional projects, use the fixed loop sequence
            next = getNextStepInLoop(currentStep) ?? getNextStepInFlow(currentFlow, currentStep)
          } else {
            next = getNextStepInFlow(currentFlow, currentStep)
          }

          // Entering the project loop: add-project → project-details
          if (next === 'project-details' && currentStep === 'add-project') {
            get().clearWorkingProject()
            set((state) => {
              state.inProjectLoop = true
              state.currentProjectIndex = state.brief?.projects.length ?? 0
              state.currentStep = 'project-details' as StepId
            })
            get().persistSession()
            return
          }

          // Exiting the project loop: add-project → review
          if (next === 'review' && currentStep === 'add-project') {
            set((state) => {
              state.inProjectLoop = false
              state.currentStep = 'review' as StepId
            })
            get().persistSession()
            return
          }

          if (next === 'submit') {
            get().setStatus('submitted')
          } else {
            set((state) => {
              state.currentStep = next as StepId
            })
          }

          // Persist to localStorage only on step completion
          get().persistSession()
        },
      }))
    ),
    { name: 'brief-store' }
  )
)
