// Manager-only sub-layout — blocks admin from viewing manager pages.

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function ManagerLayout({
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
  if (profile?.role !== 'manager') redirect('/admin/accounts')

  return <>{children}</>
}
