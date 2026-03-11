import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target } from 'lucide-react'
import type { Intent } from '@/types/brief'

interface IntentCardProps {
  intent?: Intent
}

const intentLabels: Record<string, string> = {
  rfq: 'Request for Quote',
  recommend: 'Get Recommendations',
  add_to_quote: 'Add to Quote',
  inquiry: 'General Inquiry',
}

export function IntentCard({ intent }: IntentCardProps) {
  if (!intent) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Intent pending</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          Intent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">{intentLabels[intent.type]}</Badge>
      </CardContent>
    </Card>
  )
}
