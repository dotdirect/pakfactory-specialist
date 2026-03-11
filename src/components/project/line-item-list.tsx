'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'
import { LineItemCard } from './line-item-card'
import { useBriefStore } from '@/stores/brief-store'
import type { LineItem } from '@/types/brief'

interface LineItemListProps {
  lineItems: LineItem[]
}

export function LineItemList({ lineItems }: LineItemListProps) {
  const removeLineItem = useBriefStore((state) => state.removeLineItem)

  if (lineItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No products added yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Products ({lineItems.length})
      </h3>
      {lineItems.map((item) => (
        <LineItemCard
          key={item.id}
          item={item}
          onRemove={() => removeLineItem(item.id)}
        />
      ))}
    </div>
  )
}
