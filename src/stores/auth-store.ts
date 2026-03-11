import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthProfile, AuthStatus, AuthUser } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  profile: AuthProfile | null
  status: AuthStatus
  setSessionUser: (user: AuthUser | null) => void
  setProfile: (profile: AuthProfile | null) => void
  clearAuth: () => void
  setStatus: (status: AuthStatus) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector(
      immer((set) => ({
        user: null,
        profile: null,
        status: 'loading',

        setSessionUser: (user) => {
          set((state) => {
            state.user = user
          })
        },

        setProfile: (profile) => {
          set((state) => {
            state.profile = profile
          })
        },

        clearAuth: () => {
          set((state) => {
            state.user = null
            state.profile = null
            state.status = 'anonymous'
          })
        },

        setStatus: (status) => {
          set((state) => {
            state.status = status
          })
        },
      }))
    ),
    { name: 'auth-store' }
  )
)
