'use client'

import { useEffect } from 'react'
import { useBriefStore } from '@/stores/brief-store'

export function useBeforeUnloadWarning() {
  const briefStatus = useBriefStore((s) => s.brief?.status)

  useEffect(() => {
    if (briefStatus !== 'in_progress') return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [briefStatus])
}
