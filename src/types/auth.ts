import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

export const AuthStatusSchema = z.enum([
  'loading',
  'authenticated',
  'anonymous',
])
export type AuthStatus = z.infer<typeof AuthStatusSchema>

export const AuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
})
export type AuthUser = z.infer<typeof AuthUserSchema>

export const AuthProfileSchema = z.object({
  fullName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: z.string().nullable(),
  preferredAgent: z.string().nullable(),
})
export type AuthProfile = z.infer<typeof AuthProfileSchema>

const UserMetadataSchema = z
  .object({
    full_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    preferred_agent: z.string().nullable().optional(),
  })
  .passthrough()

function parseUserMetadata(user: User) {
  const parsed = UserMetadataSchema.safeParse(user.user_metadata)
  return parsed.success ? parsed.data : {}
}

function normalizeAvatarUrl(value: string | null | undefined) {
  if (!value) return null

  const parsed = z.string().url().safeParse(value)
  return parsed.success ? parsed.data : null
}

export function normalizeAuthUser(user: User): AuthUser {
  const metadata = parseUserMetadata(user)

  return AuthUserSchema.parse({
    id: user.id,
    email: user.email ?? null,
    name: metadata.full_name ?? metadata.name ?? null,
  })
}

export function normalizeAuthProfile(user: User): AuthProfile | null {
  const metadata = parseUserMetadata(user)

  const profile = AuthProfileSchema.parse({
    fullName: metadata.full_name ?? metadata.name ?? null,
    avatarUrl: normalizeAvatarUrl(metadata.avatar_url),
    role: metadata.role ?? null,
    preferredAgent: metadata.preferred_agent ?? null,
  })

  const hasProfileData = Object.values(profile).some((value) => value !== null)
  return hasProfileData ? profile : null
}
