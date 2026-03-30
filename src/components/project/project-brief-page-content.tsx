'use client'

import { Suspense } from 'react'
import { DualPanelLayout } from '@/components/layout/dual-panel-layout'
import { BriefPanel } from '@/components/project/brief-panel'
import { BriefPanelEntrance } from '@/components/project/brief-panel-entrance'
import { ProgressBar } from '@/components/project/progress-bar'
import { ProjectBriefChatPanel } from '@/components/project/project-brief-chat-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useBriefStore } from '@/stores/brief-store'
import { STEP_CONFIGS } from '@/lib/steps/step-configs'

function RightPanel() {
  const completion = useBriefStore((state) => state.getCompletionPercentage())
  const currentStep = useBriefStore((state) => state.currentStep)
  const stepLabel = STEP_CONFIGS[currentStep].label
  return (
    <div className="flex h-full flex-col gap-4 px-10">
      <div className="shrink-0 pb-0">
        <ProgressBar value={completion} label={stepLabel} />
      </div>
      <BriefPanelEntrance className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-t-xl border border-border/50 bg-card shadow-2xl">
          <BriefPanel hideProgressBar />
        </div>
      </BriefPanelEntrance>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 p-4">
      <Skeleton className="h-full flex-1 rounded-lg" />
      <Skeleton className="h-full flex-1 rounded-lg" />
    </div>
  )
}

function PageContent() {
  return (
    <DualPanelLayout
      leftPanel={<ProjectBriefChatPanel flowId="rfq-full" />}
      rightPanel={<RightPanel />}
    />
  )
}

export function ProjectBriefPageContent() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PageContent />
    </Suspense>
  )
}
