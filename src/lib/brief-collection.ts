/**
 * Brief collection config: phases and fields for the 5-phase RFQ flow.
 * SCALE: Single source of truth for phases and fields. To scale: add phases or fields here,
 * then update getCurrentPhase, getMissingFieldsInPhase, and getCompletionPercentage; schema/tool/prompt follow.
 * See plan "Brief builder customer info fix" → Phased brief collection strategy.
 */

import type { TechnicalBrief } from '@/types/brief'

export const BRIEF_PHASES = [
  '1. Identity',
  '2. Context',
  '3. Recommend',
  '4. Visual',
  '5. Complete',
] as const

export type BriefPhaseLabel = (typeof BRIEF_PHASES)[number]

/** Phase 1: Identity (gate) — 0–30% */
function isPhase1Complete(brief: TechnicalBrief): boolean {
  const c = brief.customer
  if (!c) return false
  const hasName = Boolean(c.firstName && c.lastName) || Boolean(c.name)
  return hasName && Boolean(c.email)
}

/** Phase 2: Context — 30–50% */
function isPhase2Complete(brief: TechnicalBrief): boolean {
  const c = brief.customer
  const p = brief.project
  return Boolean(c?.industry) && Boolean(p?.productItem)
}

/** Phase 3: Recommend (conditional) — 50–65% */
function isPhase3Complete(brief: TechnicalBrief): boolean {
  const p = brief.project
  return Boolean(p?.productLine) && Boolean(p?.packagingStyle)
}

/** Phase 4: Visual (optional) — 65–75% */
function isPhase4Complete(brief: TechnicalBrief): boolean {
  return Boolean(brief.project?.projectPDF)
}

/** Phase 5: Complete — 75–100% */
function isPhase5Complete(brief: TechnicalBrief): boolean {
  const p = brief.project
  return (
    Boolean(p?.dimensions) &&
    Boolean(p?.quantity?.length) &&
    Boolean(p?.deliveryCountry) &&
    Boolean(p?.customizations?.materials || p?.customizations?.finishes) &&
    Boolean(p?.details)
  )
}

export function getCurrentPhase(brief: TechnicalBrief | null): BriefPhaseLabel {
  if (!brief) return '1. Identity'
  if (!isPhase1Complete(brief)) return '1. Identity'
  if (!isPhase2Complete(brief)) return '2. Context'
  if (!isPhase3Complete(brief)) return '3. Recommend'
  if (!isPhase4Complete(brief)) return '4. Visual'
  if (!isPhase5Complete(brief)) return '5. Complete'
  return '5. Complete'
}

const PHASE_1_FIELDS = [
  'customer.firstName',
  'customer.lastName',
  'customer.email',
  'customer.phone',
  'customer.company',
] as const

const PHASE_2_FIELDS = ['customer.industry', 'project.productItem', 'customer.annualBudget'] as const

const PHASE_3_FIELDS = ['project.productLine', 'project.packagingStyle'] as const

const PHASE_4_FIELDS = ['project.projectPDF'] as const

const PHASE_5_FIELDS = [
  'project.dimensions',
  'project.quantity',
  'project.deliveryCountry',
  'project.customizations',
  'project.details',
] as const

function getMissingForPhase1(brief: TechnicalBrief): string[] {
  const c = brief.customer
  const missing: string[] = []
  if (!c?.firstName && !c?.name) missing.push('customer.firstName')
  if (!c?.lastName && !c?.name) missing.push('customer.lastName')
  if (!c?.email) missing.push('customer.email')
  return missing.filter((v, i, a) => a.indexOf(v) === i)
}

function getMissingForPhase2(brief: TechnicalBrief): string[] {
  const missing: string[] = []
  if (!brief.customer?.industry) missing.push('customer.industry')
  if (!brief.project?.productItem) missing.push('project.productItem')
  if (brief.customer?.annualBudget == null) missing.push('customer.annualBudget')
  return missing
}

function getMissingForPhase3(brief: TechnicalBrief): string[] {
  const missing: string[] = []
  if (!brief.project?.productLine) missing.push('project.productLine')
  if (!brief.project?.packagingStyle) missing.push('project.packagingStyle')
  return missing
}

function getMissingForPhase4(brief: TechnicalBrief): string[] {
  if (!brief.project?.projectPDF) return ['project.projectPDF']
  return []
}

function getMissingForPhase5(brief: TechnicalBrief): string[] {
  const missing: string[] = []
  if (!brief.project?.dimensions) missing.push('project.dimensions')
  if (!brief.project?.quantity?.length) missing.push('project.quantity')
  if (!brief.project?.deliveryCountry) missing.push('project.deliveryCountry')
  if (!brief.project?.customizations?.materials && !brief.project?.customizations?.finishes)
    missing.push('project.customizations')
  if (!brief.project?.details) missing.push('project.details')
  return missing
}

export function getMissingFieldsInPhase(
  brief: TechnicalBrief | null,
  phase: BriefPhaseLabel,
): string[] {
  if (!brief) return [...PHASE_1_FIELDS]
  switch (phase) {
    case '1. Identity':
      return getMissingForPhase1(brief)
    case '2. Context':
      return getMissingForPhase2(brief)
    case '3. Recommend':
      return getMissingForPhase3(brief)
    case '4. Visual':
      return getMissingForPhase4(brief)
    case '5. Complete':
      return getMissingForPhase5(brief)
    default:
      return getMissingForPhase1(brief)
  }
}

/** Phase-weighted completion: 0–30 (P1), 30–50 (P2), 50–65 (P3), 65–75 (P4), 75–100 (P5). */
export function getCompletionPercentage(brief: TechnicalBrief | null): number {
  if (!brief) return 0
  if (!isPhase1Complete(brief)) {
    const c = brief.customer
    const nameDone = (c?.firstName && c?.lastName) ? 2 : (c?.name ? 1 : 0)
    const rest = [c?.email, c?.phone, c?.company].filter(Boolean).length
    const done = nameDone + rest
    return Math.round((done / 5) * 30)
  }
  if (!isPhase2Complete(brief)) {
    const done = [brief.customer?.industry, brief.project?.productItem].filter(Boolean).length
    return 30 + Math.round((done / 2) * 20)
  }
  if (!isPhase3Complete(brief)) {
    const done = [brief.project?.productLine, brief.project?.packagingStyle].filter(Boolean).length
    return 50 + Math.round((done / 2) * 15)
  }
  if (!isPhase4Complete(brief)) {
    return brief.project?.projectPDF ? 75 : 65
  }
  if (!isPhase5Complete(brief)) {
    const p = brief.project
    const done = [
      p?.dimensions,
      p?.quantity?.length,
      p?.deliveryCountry,
      p?.customizations?.materials || p?.customizations?.finishes,
      p?.details,
    ].filter(Boolean).length
    return 75 + Math.round((done / 5) * 25)
  }
  return 100
}
