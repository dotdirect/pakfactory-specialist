'use client'

import { useEffect, useRef } from 'react'
import { useBriefStore } from '@/stores/brief-store'

export function useAutoSave(debounceMs = 2000) {
  const brief = useBriefStore((state) => state.brief)
  const lastUpdatedField = useBriefStore((state) => state.lastUpdatedField)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!brief || !lastUpdatedField) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/briefs/${brief.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brief),
        })
      } catch (error) {
        console.error('[auto-save] failed', error)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [brief, lastUpdatedField, debounceMs])
}
