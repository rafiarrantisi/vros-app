// (app) layout — Sidebar shell for manager + admin.
// Server component: fetches role, redirects to /login or role home if mismatch.

import { redirect } from 'next/navigation'

import { ROLE_HOME } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    redirect(ROLE_HOME[profile.role as 'customer' | 'driver'])
  }

  const role = profile.role as 'manager' | 'admin'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar userName={profile.name} role={role} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar role={role} />
        <main style={{ flex: 1, overflowY: 'auto', background: '#f0f2f7' }}>{children}</main>
      </div>
    </div>
  )
}
