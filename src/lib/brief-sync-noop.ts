import type { TechnicalBrief } from '@/types/brief'
import type { BriefEvent } from '@/types/brief-events'

function areNumberArraysEqual(a?: number[], b?: number[]) {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((value, idx) => value === b[idx])
}

export function eventHasNetChange(event: BriefEvent, brief: TechnicalBrief | null): boolean {
  switch (event.action) {
    case 'brief.identity.confirmed': {
      const current = brief?.customer
      return Object.entries(event.data).some(([key, value]) => {
        if (value === undefined) return false
        return current?.[key as keyof typeof current] !== value
      })
    }
    case 'brief.project.context_confirmed': {
      const current = brief?.project
      if (!current) return true
      if (event.data.productItem != null && event.data.productItem !== current.productItem)
        return true
      if (event.data.productLine != null && event.data.productLine !== current.productLine)
        return true
      if (
        event.data.packagingStyle != null &&
        event.data.packagingStyle !== current.packagingStyle
      )
        return true
      if (event.data.dimensions != null && event.data.dimensions !== current.dimensions)
        return true
      if (
        event.data.deliveryCountry != null &&
        event.data.deliveryCountry !== current.deliveryCountry
      )
        return true
      if (event.data.summary != null && event.data.summary !== current.summary)
        return true
      if (event.data.details != null && event.data.details !== current.details)
        return true
      if (event.data.projectPDF != null && event.data.projectPDF !== current.projectPDF)
        return true
      if (!areNumberArraysEqual(event.data.quantity, current.quantity)) return true
      if (
        event.data.customizations?.materials != null &&
        event.data.customizations.materials !== current.customizations?.materials
      )
        return true
      if (
        event.data.customizations?.finishes != null &&
        event.data.customizations.finishes !== current.customizations?.finishes
      )
        return true
      if (
        event.data.customizations?.addOns != null &&
        event.data.customizations.addOns !== current.customizations?.addOns
      )
        return true
      return false
    }
    case 'brief.intent.confirmed':
      return (
        event.data.type !== brief?.intent?.type ||
        event.data.entryChannel !== brief?.intent?.entryChannel
      )
    case 'brief.timeline.confirmed':
      return event.data.urgency !== brief?.timeline?.urgency
    default:
      return true
  }
}

