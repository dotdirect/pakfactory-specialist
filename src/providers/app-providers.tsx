'use client'

import { AuthProvider } from '@/providers/auth-provider'
import { SupabaseProvider } from '@/providers/supabase-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <AuthProvider>{children}</AuthProvider>
    </SupabaseProvider>
  )
}
