// Auth helpers — wrap Supabase Auth with the VROS username UX.
//
// VROS uses username (not email) for sign-in. We synthesize a throw-away email
// `${username}@vros.local` per user, which Supabase Auth requires internally.
// Seed script creates auth users with the same pattern; middleware & RLS read
// the real profile from `public.users` by `auth.uid()`.

import { createClient } from './supabase/client'
import type { UserRole } from './types'

const EMAIL_DOMAIN = '@vros.local'

export interface SignInResult {
  success: boolean
  role?: UserRole
  error?: string
}

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const sb = createClient()

  const { error: authError } = await sb.auth.signInWithPassword({
    email: `${username.trim().toLowerCase()}${EMAIL_DOMAIN}`,
    password,
  })

  if (authError) {
    return { success: false, error: 'Username atau password salah.' }
  }

  // Fetch role from profile table so the caller can route to the right home.
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return { success: false, error: 'Session error — coba login ulang.' }
  }

  const { data: profile, error: profileError } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile tidak ditemukan.' }
  }

  return { success: true, role: profile.role as UserRole }
}

export async function signOut(): Promise<void> {
  const sb = createClient()
  await sb.auth.signOut()
}
