import { DualPanelLayout } from '@/components/layout/dual-panel-layout'
import { ProjectChatPanel } from '@/components/project/project-chat-panel'
import { BriefPanel } from '@/components/project/brief-panel'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ResumeProjectPage({ params }: ProjectPageProps) {
  await params

  return (
    <DualPanelLayout
      leftPanel={<ProjectChatPanel />}
      rightPanel={<BriefPanel />}
    />
  )
}
