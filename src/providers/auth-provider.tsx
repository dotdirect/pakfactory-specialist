'use client'

import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { useOptionalSupabase } from '@/providers/supabase-provider'
import { useAuthStore } from '@/stores/auth-store'
import { usePlatformStore } from '@/stores/platform-store'
import { normalizeAuthProfile, normalizeAuthUser } from '@/types/auth'

function syncAuthenticatedUser(user: User) {
  const authStore = useAuthStore.getState()
  const platformStore = usePlatformStore.getState()
  const normalizedUser = normalizeAuthUser(user)
  const profile = normalizeAuthProfile(user)

  authStore.setSessionUser(normalizedUser)
  authStore.setProfile(profile)
  authStore.setStatus('authenticated')

  if (profile?.preferredAgent) {
    platformStore.setActiveAgent(profile.preferredAgent)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useOptionalSupabase()

  useEffect(() => {
    if (!supabase) {
      useAuthStore.getState().clearAuth()
      usePlatformStore.getState().resetPlatform()
      return
    }

    let isMounted = true

    const initializeAuth = async () => {
      useAuthStore.getState().setStatus('loading')

      const { data, error } = await supabase.auth.getUser()

      if (!isMounted) return

      if (error || !data.user) {
        useAuthStore.getState().clearAuth()
        usePlatformStore.getState().resetPlatform()
        return
      }

      syncAuthenticatedUser(data.user)
    }

    void initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        useAuthStore.getState().clearAuth()
        usePlatformStore.getState().resetPlatform()
        return
      }

      syncAuthenticatedUser(session.user)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return <>{children}</>
}
