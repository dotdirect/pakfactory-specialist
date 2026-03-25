import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'
import type { Customer } from '@/types/brief'

// SCALE: New customer fields shown here; add display for any new Customer fields added in brief.ts.

interface CustomerCardProps {
  customer?: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  if (!customer) {
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
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.name

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
          {customer.email && (
            <p className="text-muted-foreground">{customer.email}</p>
          )}
          {customer.company && (
            <p className="text-muted-foreground">{customer.company}</p>
          )}
          {customer.phone && (
            <p className="text-muted-foreground">{customer.phone}</p>
          )}
          {customer.industry && (
            <p className="text-muted-foreground">{customer.industry}</p>
          )}
          {customer.annualBudget != null && (
            <p className="text-muted-foreground">
              Budget: {customer.annualBudget}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
