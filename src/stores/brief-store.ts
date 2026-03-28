import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type { TechnicalBrief, LineItem, Customer, Intent, ProductSpecs, ProjectContext, Timeline, BriefStatus, Billing } from '@/types/brief'
import type { BriefEvent } from '@/types/brief-events'
import type { StepId, FlowId } from '@/lib/steps/types'
import { FLOW_CONFIGS, getNextStepInFlow } from '@/lib/steps/flow-configs'

export type RagDebugData = {
  query: string
  industry?: string
  filterUsed: boolean
  products: Array<{ name: string; score: number; category: string }>
}

interface BriefState {
  brief: TechnicalBrief | null
  lastUpdatedField: string | null

  // ─── Debug ─────────────────────────────────────────────────────────────────
  ragDebug: RagDebugData | null
  setRagDebug: (data: RagDebugData) => void

  // ─── Structured step flow state ───────────────────────────────────────────
  currentFlow: FlowId
  currentStep: StepId

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

  // ─── Flow navigation ──────────────────────────────────────────────────────
  /** Initialize the flow and reset to its first step. Call on page mount. */
  initFlow: (flowId: FlowId) => void
  /** Advance to the next step. Pass a branch override (e.g. 'product-select' | 'submit') for branching steps. */
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
        currentFlow: 'rfq-full',
        currentStep: 'profile',

        initializeBrief: (conversationId) => {
          set((state) => {
            state.brief = {
              id: uuidv4(),
              conversationId,
              status: 'draft',
              lineItems: [],
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
            case 'brief.submitted':
              actions.setStatus('submitted')
              break
          }
        },

        resetBrief: () => {
          set((state) => {
            state.brief = null
            state.lastUpdatedField = null
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
          const { currentFlow, currentStep } = get()
          const next = override ?? getNextStepInFlow(currentFlow, currentStep)

          if (next === 'submit') {
            get().setStatus('submitted')
          } else {
            set((state) => {
              state.currentStep = next
            })
          }
        },
      }))
    ),
    { name: 'brief-store' }
  )
)
