import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import type { Timeline } from '@/types/brief'

interface TimelineCardProps {
  timeline?: Timeline
}

const urgencyColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export function TimelineCard({ timeline }: TimelineCardProps) {
  if (!timeline) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Timeline pending</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge className={urgencyColors[timeline.urgency]}>
          {timeline.urgency.charAt(0).toUpperCase() + timeline.urgency.slice(1)} Priority
        </Badge>
        {timeline.deadline && (
          <p className="text-xs text-muted-foreground mt-2">
            Deadline: {new Date(timeline.deadline).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
