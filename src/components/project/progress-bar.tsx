import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils/cn'

interface ProgressBarProps {
  value: number
  label?: string
  className?: string
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Currently working on: <span className="font-medium text-foreground">{label ?? 'Profile'}</span></span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}
