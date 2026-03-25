import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type { TechnicalBrief, LineItem, Customer, Intent, ProductSpecs, ProjectContext, Timeline, BriefStatus } from '@/types/brief'
import type { BriefEvent } from '@/types/brief-events'

interface BriefState {
  brief: TechnicalBrief | null
  lastUpdatedField: string | null

  initializeBrief: (conversationId?: string) => void
  updateCustomerInfo: (info: Partial<Customer>) => void
  updateIntent: (intent: Intent) => void
  addLineItem: (item: Omit<LineItem, 'id' | 'addedAt'>) => void
  removeLineItem: (lineItemId: string) => void
  updateLineItemSpecs: (lineItemId: string, specs: ProductSpecs) => void
  updateTimeline: (timeline: Timeline) => void
  updateProjectContext: (context: Partial<ProjectContext>) => void
  setStatus: (status: BriefStatus) => void
  setNotes: (notes: string) => void
  handleBriefEvent: (event: BriefEvent) => void
  resetBrief: () => void
  getCompletionPercentage: () => number
}

export const useBriefStore = create<BriefState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        brief: null,
        lastUpdatedField: null,

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

        // SCALE: New event types need a case in handleBriefEvent. Completion % and "what's missing" should align with brief-collection config (phases/required fields).
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
                category: event.data.category,
                quantity: event.data.quantity,
                imageUrl: event.data.imageUrl,
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

        // SCALE: Weights and buckets should align with brief-collection config when phased strategy is implemented.
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
      }))
    ),
    { name: 'brief-store' }
  )
)
