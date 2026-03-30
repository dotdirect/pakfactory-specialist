'use client'

import { createContext, useContext, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseContextValue {
  supabase: SupabaseClient | null
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasValidConfig =
      isValidSupabaseUrl(supabaseUrl) &&
      !!supabaseAnonKey &&
      typeof supabaseAnonKey === 'string'

    if (!hasValidConfig) {
      if (process.env.NODE_ENV === 'production') {
        console.error(
          'SupabaseProvider: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set and valid.'
        )
      }

      return null
    }

    return createClient()
  })

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx?.supabase) {
    throw new Error('useSupabase must be used within a configured SupabaseProvider')
  }

  return ctx.supabase
}

export function useOptionalSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useOptionalSupabase must be used within SupabaseProvider')
  return ctx.supabase
}
