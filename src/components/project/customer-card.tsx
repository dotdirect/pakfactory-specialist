import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'
import type { CustomerInfo } from '@/types/brief'

// SCALE: New customer fields shown here; add display for any new CustomerInfo / identity fields added in brief.ts.

interface CustomerCardProps {
  customerInfo?: CustomerInfo
}

export function CustomerCard({ customerInfo }: CustomerCardProps) {
  if (!customerInfo) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Customer information pending</p>
        </CardContent>
      </Card>
    )
  }

  const displayName =
    [customerInfo.firstName, customerInfo.lastName].filter(Boolean).join(' ') ||
    customerInfo.name

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          {displayName && <p className="font-medium">{displayName}</p>}
          {customerInfo.email && (
            <p className="text-muted-foreground">{customerInfo.email}</p>
          )}
          {customerInfo.company && (
            <p className="text-muted-foreground">{customerInfo.company}</p>
          )}
          {customerInfo.phone && (
            <p className="text-muted-foreground">{customerInfo.phone}</p>
          )}
          {customerInfo.industry && (
            <p className="text-muted-foreground">{customerInfo.industry}</p>
          )}
          {customerInfo.annualBudget != null && (
            <p className="text-muted-foreground">
              Budget: {customerInfo.annualBudget}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
