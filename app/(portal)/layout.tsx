// Portal layout — no sidebar/topbar (customer + driver get full-screen surface
// to match v3). Role gate enforced here too, plus redirect to /login on no session.

import { redirect } from 'next/navigation'

import { ROLE_HOME } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const role = profile.role as 'manager' | 'admin' | 'customer' | 'driver'
  if (role !== 'customer' && role !== 'driver') {
    redirect(ROLE_HOME[role])
  }

  return <>{children}</>
}
