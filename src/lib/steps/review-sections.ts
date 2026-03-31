import type { TechnicalBrief } from '@/types/brief'
import type { FlowId, StepId } from './types'
import { FLOW_CONFIGS } from './flow-configs'

// ─── Review Field ────────────────────────────────────────────────────────────

export type ReviewField = {
  label: string
  value: string
}

// ─── Review Section ──────────────────────────────────────────────────────────

export type ReviewSectionDef = {
  id: string
  label: string
  /** Steps that contribute data to this section. */
  relevantSteps: StepId[]
  /** Does this section have any data to show? */
  hasData: (brief: TechnicalBrief) => boolean
  /** Extract display-ready label/value pairs. */
  extractFields: (brief: TechnicalBrief) => ReviewField[]
}

export type ReviewSectionResult = {
  id: string
  label: string
  fields: ReviewField[]
}

// ─── Section Definitions ─────────────────────────────────────────────────────

const REVIEW_SECTIONS: ReviewSectionDef[] = [
  {
    id: 'contact',
    label: 'Contact Information',
    relevantSteps: ['profile'],
    hasData: (b) => !!(b.customer?.firstName || b.customer?.lastName || b.customer?.email),
    extractFields: (b) => {
      const fields: ReviewField[] = []
      const c = b.customer
      if (!c) return fields
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
      if (name) fields.push({ label: 'Name', value: name })
      if (c.email) fields.push({ label: 'Email', value: c.email })
      if (c.phone) fields.push({ label: 'Phone', value: c.phone })
      if (c.company) fields.push({ label: 'Company', value: c.company })
      if (c.industry) fields.push({ label: 'Industry', value: c.industry })
      if (c.annualBudget) fields.push({ label: 'Annual Budget', value: `$${c.annualBudget.toLocaleString()}` })
      return fields
    },
  },
  // ─── Multi-project section (replaces individual project/products/billing when projects exist) ─
  {
    id: 'all-projects',
    label: 'Projects',
    relevantSteps: ['project-details', 'recommend', 'product-select', 'billing', 'add-project'],
    hasData: (b) => b.projects.length > 0,
    extractFields: (b) => {
      const fields: ReviewField[] = []
      for (const [index, entry] of b.projects.entries()) {
        const projectNum = index + 1
        const prefix = b.projects.length > 1 ? `Project ${projectNum}: ` : ''

        if (entry.project?.productItem) {
          fields.push({ label: `${prefix}Product`, value: entry.project.productItem })
        }
        if (entry.project?.summary) {
          fields.push({ label: `${prefix}Summary`, value: entry.project.summary })
        }
        if (entry.lineItems.length > 0) {
          const productList = entry.lineItems
            .map((item) => {
              const qty = item.quantities?.length
                ? `Qty: ${item.quantities.join(', ')}`
                : item.quantity > 1 ? `Qty: ${item.quantity}` : null
              return [item.productName, item.category, qty].filter(Boolean).join(' \u00b7 ')
            })
            .join('; ')
          fields.push({ label: `${prefix}Selected Products`, value: productList })
        }
        if (entry.billing?.city || entry.billing?.country) {
          const addr = [entry.billing?.street, entry.billing?.city, entry.billing?.stateProvince, entry.billing?.postalCode, entry.billing?.country].filter(Boolean).join(', ')
          fields.push({ label: `${prefix}Shipping`, value: addr })
        }
      }
      return fields
    },
  },
  // ─── Single-project sections (used when no projects have been archived yet) ─
  {
    id: 'project',
    label: 'Project Details',
    relevantSteps: ['project-details'],
    hasData: (b) => !!(b.project?.productItem || b.project?.summary),
    extractFields: (b) => {
      const fields: ReviewField[] = []
      const p = b.project
      if (!p) return fields
      if (p.productItem) fields.push({ label: 'Product', value: p.productItem })
      if (p.productLine) fields.push({ label: 'Product Line', value: p.productLine })
      if (p.packagingStyle) fields.push({ label: 'Packaging Style', value: p.packagingStyle })
      if (p.deliveryCountry) fields.push({ label: 'Delivery Country', value: p.deliveryCountry })
      if (p.summary) fields.push({ label: 'Summary', value: p.summary })
      if (p.details) fields.push({ label: 'Details', value: p.details })
      if (p.quantity?.length) fields.push({ label: 'Quantities', value: p.quantity.join(', ') })
      if (p.dimensions) fields.push({ label: 'Dimensions', value: p.dimensions })
      if (p.customizations) {
        const cx = p.customizations
        if (cx.materials) fields.push({ label: 'Materials', value: cx.materials })
        if (cx.finishes) fields.push({ label: 'Finishes', value: cx.finishes })
        if (cx.customization) fields.push({ label: 'Customization', value: cx.customization })
        if (cx.addOns) fields.push({ label: 'Add-Ons', value: cx.addOns })
      }
      return fields
    },
  },
  {
    id: 'products',
    label: 'Selected Products',
    relevantSteps: ['recommend', 'product-select'],
    hasData: (b) => b.lineItems.length > 0,
    extractFields: (b) => {
      // For products we return a minimal field list — the UI handles rich rendering via brief.lineItems directly
      return b.lineItems.map((item) => ({
        label: item.productName,
        value: [
          item.category,
          item.quantity > 1 ? `Qty: ${item.quantity}` : null,
          item.quantities?.length ? `Quantities: ${item.quantities.join(', ')}` : null,
        ].filter(Boolean).join(' · '),
      }))
    },
  },
  {
    id: 'billing',
    label: 'Billing & Shipping',
    relevantSteps: ['billing'],
    hasData: (b) => !!(b.billing?.city || b.billing?.country),
    extractFields: (b) => {
      const fields: ReviewField[] = []
      const billing = b.billing
      if (!billing) return fields
      const addressParts = [billing.street, billing.city, billing.stateProvince, billing.postalCode, billing.country].filter(Boolean)
      if (addressParts.length) fields.push({ label: 'Address', value: addressParts.join(', ') })
      return fields
    },
  },
]

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns review sections relevant to the given flow, filtered to only those with data.
 * This is what makes the review step flow-agnostic.
 */
/** IDs of single-project sections suppressed when archived projects exist. */
const SINGLE_PROJECT_SECTION_IDS = new Set(['project', 'products', 'billing'])

export function getReviewSectionsForFlow(flowId: FlowId, brief: TechnicalBrief): ReviewSectionResult[] {
  const flowSteps = new Set(FLOW_CONFIGS[flowId].steps)
  const hasMultiProject = brief.projects.length > 0

  return REVIEW_SECTIONS
    .filter((section) => section.relevantSteps.some((step) => flowSteps.has(step)))
    // When archived projects exist, use the all-projects section instead of individual ones
    .filter((section) => !(hasMultiProject && SINGLE_PROJECT_SECTION_IDS.has(section.id)))
    .filter((section) => section.hasData(brief))
    .map((section) => ({
      id: section.id,
      label: section.label,
      fields: section.extractFields(brief),
    }))
}
