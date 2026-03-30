'use client'

import { useEffect, useRef } from 'react'
import { useBriefStore } from '@/stores/brief-store'
import { useAutoSave } from '@/hooks/use-auto-save'
import { useBeforeUnloadWarning } from '@/hooks/use-before-unload-warning'
import { ProjectBriefDebugFab } from '@/components/project/project-brief-debug-fab'

export function BriefProvider({ children }: { children: React.ReactNode }) {
  const brief = useBriefStore((state) => state.brief)
  const hasHydrated = useRef(false)

  useAutoSave()
  useBeforeUnloadWarning()

  // On mount: try to restore a saved session from localStorage.
  // If none found, initialize a fresh brief.
  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    const restored = useBriefStore.getState().hydrateSession()
    if (!restored && !useBriefStore.getState().brief) {
      useBriefStore.getState().initializeBrief()
    }
  }, [])

  // If brief gets cleared (e.g. after decline recovery), initialize a new one
  useEffect(() => {
    if (hasHydrated.current && !brief) {
      // Small guard: only init if sessionRecovery isn't actively declining
      const recovery = useBriefStore.getState().sessionRecovery
      if (recovery !== 'pending') {
        useBriefStore.getState().initializeBrief()
      }
    }
  }, [brief])

  return (
    <>
      {children}
      <ProjectBriefDebugFab />
    </>
  )
}
