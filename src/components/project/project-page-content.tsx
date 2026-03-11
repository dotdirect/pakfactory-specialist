'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DualPanelLayout } from '@/components/layout/dual-panel-layout'
import { ProjectChatPanel } from '@/components/project/project-chat-panel'
import { BriefPanel } from '@/components/project/brief-panel'
import { Skeleton } from '@/components/ui/skeleton'

function ProjectContent() {
  const searchParams = useSearchParams()
  const fromHelp = searchParams.get('from') === 'help'
  const [briefVisible, setBriefVisible] = useState(!fromHelp)

  useEffect(() => {
    if (fromHelp) {
      const timer = setTimeout(() => setBriefVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [fromHelp])

  if (fromHelp) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="flex-1 h-full overflow-hidden">
          <ProjectChatPanel />
        </div>
        <div
          className={`h-full overflow-hidden bg-muted/30 transition-all duration-500 ease-out ${
            briefVisible
              ? 'w-1/2 opacity-100 translate-y-0'
              : 'w-0 opacity-0 translate-y-8'
          }`}
        >
          <div className="h-full min-w-[400px]">
            <BriefPanel />
          </div>
        </div>
      </div>
    )
  }

  return (
    <DualPanelLayout
      leftPanel={<ProjectChatPanel />}
      rightPanel={<BriefPanel />}
    />
  )
}

function ProjectFallback() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4 p-4">
      <Skeleton className="flex-1 h-full rounded-lg" />
      <Skeleton className="flex-1 h-full rounded-lg" />
    </div>
  )
}

export function ProjectPageContent() {
  return (
    <Suspense fallback={<ProjectFallback />}>
      <ProjectContent />
    </Suspense>
  )
}
