import { BriefProvider } from '@/providers/brief-provider'

export const dynamic = 'force-dynamic'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BriefProvider>{children}</BriefProvider>
  )
}
