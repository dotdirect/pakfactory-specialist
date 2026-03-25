'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { ShowPricingCalculatorOutput } from '@/lib/tools/show-pricing-calculator'

interface PricingCalculatorUIProps extends ShowPricingCalculatorOutput {}

type QuantityRow = {
  id: string
  quantity: number
  shippingOptionId: string
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDays(min: number, max?: number): string {
  if (max != null && max !== min) return `${min}–${max} days`
  return `${min} days`
}

export function PricingCalculatorUI({
  productName,
  unit,
  minimumOrderQuantity,
  baseUnitPrice,
  currency,
  shippingOptions,
  defaultQuantity,
  quantityStep,
  maxQuantity,
}: PricingCalculatorUIProps) {
  const defaultShippingId = shippingOptions[0]?.id ?? ''

  const [rows, setRows] = useState<QuantityRow[]>(() => [
    {
      id: crypto.randomUUID(),
      quantity: defaultQuantity,
      shippingOptionId: defaultShippingId,
    },
  ])

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        quantity: defaultQuantity,
        shippingOptionId: defaultShippingId,
      },
    ])
  }, [defaultQuantity, defaultShippingId])

  const updateRow = useCallback(
    (id: string, updates: Partial<Omit<QuantityRow, 'id'>>) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, ...updates }
            : r,
        ),
      )
    },
    [],
  )

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }, [])

  const unitLabel = unit.replace(/s$/, '')

  return (
    <Card className="border-border/80 bg-muted/30 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Pricing calculator</CardTitle>
        <CardDescription>
          Estimate cost for {productName}. Add quantities to compare; choose
          shipping to see price and delivery time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rows.map((row, index) => (
          <QuantityGroup
            key={row.id}
            row={row}
            isFirst={index === 0}
            canRemove={rows.length > 1}
            productName={productName}
            unit={unit}
            unitLabel={unitLabel}
            minimumOrderQuantity={minimumOrderQuantity}
            baseUnitPrice={baseUnitPrice}
            currency={currency}
            shippingOptions={shippingOptions}
            quantityStep={quantityStep}
            maxQuantity={maxQuantity}
            onUpdate={(updates) => updateRow(row.id, updates)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-2"
        >
          <Plus className="size-4" aria-hidden />
          Add another quantity
        </Button>
        <p className="text-sm text-muted-foreground">
          Minimum order: {minimumOrderQuantity.toLocaleString()} {unit}.
        </p>
      </CardContent>
    </Card>
  )
}

interface QuantityGroupProps {
  row: QuantityRow
  isFirst: boolean
  canRemove: boolean
  productName: string
  unit: string
  unitLabel: string
  minimumOrderQuantity: number
  baseUnitPrice: number
  currency: string
  shippingOptions: ShowPricingCalculatorOutput['shippingOptions']
  quantityStep: number
  maxQuantity: number
  onUpdate: (updates: Partial<Omit<QuantityRow, 'id'>>) => void
  onRemove: () => void
}

function QuantityGroup({
  row,
  isFirst,
  canRemove,
  unit,
  unitLabel,
  minimumOrderQuantity,
  baseUnitPrice,
  currency,
  shippingOptions,
  quantityStep,
  maxQuantity,
  onUpdate,
  onRemove,
}: QuantityGroupProps) {
  const displayQuantity = Math.max(
    minimumOrderQuantity,
    Math.min(maxQuantity, row.quantity),
  )

  const shipping = useMemo(
    () =>
      shippingOptions.find((o) => o.id === row.shippingOptionId) ??
      shippingOptions[0],
    [shippingOptions, row.shippingOptionId],
  )

  const unitPrice = useMemo(
    () => (shipping ? baseUnitPrice * shipping.priceMultiplier : baseUnitPrice),
    [baseUnitPrice, shipping],
  )
  const estimatedCost = useMemo(
    () => displayQuantity * unitPrice,
    [displayQuantity, unitPrice],
  )
  const durationText = useMemo(
    () =>
      shipping
        ? formatDays(shipping.estimatedDaysMin, shipping.estimatedDaysMax)
        : '—',
    [shipping],
  )

  return (
    <div
      className={
        isFirst
          ? 'space-y-4'
          : 'space-y-4 border-t border-border/60 pt-4'
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr,1fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Quantity ({unit})
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={minimumOrderQuantity}
                max={maxQuantity}
                step={quantityStep}
                value={displayQuantity}
                onChange={(e) => {
                  const v = e.target.valueAsNumber
                  if (!Number.isNaN(v)) {
                    const clamped = Math.max(
                      minimumOrderQuantity,
                      Math.min(maxQuantity, Math.round(v)),
                    )
                    onUpdate({ quantity: clamped })
                  }
                }}
                className="w-24"
              />
              <Slider
                value={[displayQuantity]}
                onValueChange={([v]) =>
                  onUpdate({ quantity: v ?? minimumOrderQuantity })
                }
                min={minimumOrderQuantity}
                max={maxQuantity}
                step={quantityStep}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Shipping destination
            </label>
            <select
              value={row.shippingOptionId}
              onChange={(e) => onUpdate({ shippingOptionId: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {shippingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              Remove this row
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Estimated cost (excluding your discount)
            </p>
            <p className="text-2xl font-semibold text-primary">
              {formatCurrency(estimatedCost)} {currency}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Price per {unitLabel}
            </p>
            <p className="text-2xl font-semibold text-primary">
              {formatCurrency(unitPrice)} {currency}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Estimated shipping
            </p>
            <p className="text-lg font-medium text-primary">{durationText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
