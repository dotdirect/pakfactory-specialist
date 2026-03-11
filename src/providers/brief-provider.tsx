'use client'

import { useEffect } from 'react'
import { useBriefStore } from '@/stores/brief-store'
import { useAutoSave } from '@/hooks/use-auto-save'

export function BriefProvider({ children }: { children: React.ReactNode }) {
  const brief = useBriefStore((state) => state.brief)

  useAutoSave()

  useEffect(() => {
    if (!brief) {
      useBriefStore.getState().initializeBrief()
    }
  }, [brief])

  return <>{children}</>
}
