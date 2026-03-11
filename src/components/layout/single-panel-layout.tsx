import { cn } from '@/lib/utils/cn'

interface SinglePanelLayoutProps {
  children: React.ReactNode
  className?: string
}

export function SinglePanelLayout({ children, className }: SinglePanelLayoutProps) {
  return (
    <div className={cn('flex flex-col h-[calc(100vh-3.5rem)]', className)}>
      <div className="flex-1 container mx-auto max-w-4xl py-6 px-4">
        {children}
      </div>
    </div>
  )
}
