// Root redirector — sends authenticated users to their role home.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/lib/types'

export default async function Root() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()

  const role = (profile?.role ?? 'manager') as UserRole
  redirect(ROLE_HOME[role])
}
