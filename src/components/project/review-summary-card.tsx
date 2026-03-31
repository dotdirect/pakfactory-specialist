'use client'

import { User, FolderOpen, Package, MapPin, ChevronDown, ChevronUp, PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SubmitButton } from '@/components/project/submit-button'
import { useBriefStore } from '@/stores/brief-store'
import { getReviewSectionsForFlow, type ReviewSectionResult } from '@/lib/steps/review-sections'
import { cn } from '@/lib/utils/cn'
import type { LineItem } from '@/types/brief'

// ─── Icon map ────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
  contact: User,
  project: FolderOpen,
  products: Package,
  billing: MapPin,
}

// ─── Section component ───────────────────────────────────────────────────────

function ReviewSection({ section }: { section: ReviewSectionResult }) {
  const [expanded, setExpanded] = useState(true)
  const Icon = SECTION_ICONS[section.id] ?? FolderOpen

  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{section.label}</span>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </button>
        <Button variant="ghost" size="sm" disabled className="h-7 gap-1 px-2 text-xs text-muted-foreground">
          <PencilLine className="size-3" />
          Edit
        </Button>
      </div>
      {expanded && (
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 pl-6 pb-2 text-sm">
          {section.fields.map((field, i) => (
            <div key={i} className="contents">
              <span className="text-muted-foreground whitespace-nowrap">{field.label}</span>
              <span className="text-foreground break-words">{field.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Product line items (rich rendering) ─────────────────────────────────────

function ProductLineItems({ items }: { items: LineItem[] }) {
  return (
    <div className="space-y-2 pl-6 pb-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-background/50 p-2.5">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="size-10 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <Package className={cn('size-10 rounded bg-muted p-2 text-muted-foreground shrink-0', item.imageUrl && 'hidden')} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.productName}</p>
            <p className="text-xs text-muted-foreground">
              {[
                item.category,
                item.quantity > 1 ? `Qty: ${item.quantity}` : null,
                item.quantities?.length ? `Quantities: ${item.quantities.join(', ')}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Products section with rich rendering ────────────────────────────────────

function ProductsReviewSection({ section }: { section: ReviewSectionResult }) {
  const [expanded, setExpanded] = useState(true)
  const lineItems = useBriefStore((s) => s.brief?.lineItems ?? [])
  const Icon = SECTION_ICONS.products

  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">{section.label}</span>
          <span className="text-xs font-normal text-muted-foreground mr-1">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</span>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </button>
        <Button variant="ghost" size="sm" disabled className="h-7 gap-1 px-2 text-xs text-muted-foreground">
          <PencilLine className="size-3" />
          Edit
        </Button>
      </div>
      {expanded && lineItems.length > 0 && <ProductLineItems items={lineItems} />}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ReviewSummaryCardProps {
  onSubmit: () => void
}

export function ReviewSummaryCard({ onSubmit }: ReviewSummaryCardProps) {
  const brief = useBriefStore((s) => s.brief)
  const currentFlow = useBriefStore((s) => s.currentFlow)

  if (!brief) return null

  const sections = getReviewSectionsForFlow(currentFlow, brief)

  if (sections.length === 0) return null

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="px-4 py-3 bg-muted/30">
        <h3 className="text-sm font-semibold">Review Your Brief</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Please confirm everything looks correct before submitting.</p>
      </div>
      <Separator />
      <div className="px-4 py-2 space-y-0.5">
        {sections.map((section, i) => (
          <div key={section.id}>
            {section.id === 'products' ? (
              <ProductsReviewSection section={section} />
            ) : (
              <ReviewSection section={section} />
            )}
            {i < sections.length - 1 && <Separator className="my-1" />}
          </div>
        ))}
      </div>
      <Separator />
      <div className="px-4 py-3">
        <SubmitButton onClick={onSubmit} />
      </div>
    </Card>
  )
}
