// Admin-only user management.
//   POST   — create user (auth.users + public.users)
//   PATCH  — update user (public.users fields + optional password reset)
//   DELETE — remove user (cascades to public.users via FK)
//
// Guarded by admin role. Requires SUPABASE_SERVICE_ROLE_KEY (server env).

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

interface CreateBody {
  id: string
  username: string
  password: string
  name: string
  role: UserRole
  customer_id?: string | null
  vehicle_id?: string | null
  assigned_plan_id?: string | null
  dept?: string | null
}

interface UpdateBody {
  id: string
  username?: string
  password?: string
  name?: string
  role?: UserRole
  customer_id?: string | null
  vehicle_id?: string | null
  assigned_plan_id?: string | null
  dept?: string | null
}

async function requireAdmin() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 as const }
  return { ok: true as const }
}

function synthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@vros.local`
}

export async function POST(req: Request) {
  const gate = await requireAdmin()
  if ('error' in gate) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status })
  }

  const body = (await req.json()) as CreateBody
  if (!body.username || !body.password || !body.name || !body.role) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Create auth.users row via admin API.
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: synthEmail(body.username),
    password: body.password,
    email_confirm: true,
  })
  if (authErr || !authData.user) {
    return NextResponse.json(
      { success: false, error: `Auth create failed: ${authErr?.message ?? 'unknown'}` },
      { status: 500 },
    )
  }

  // 2. Insert public.users row with matching id.
  const { error: profileErr } = await admin.from('users').insert({
    id: authData.user.id,
    username: body.username,
    name: body.name,
    role: body.role,
    dept: body.dept ?? null,
    customer_id: body.customer_id ?? null,
    vehicle_id: body.vehicle_id ?? null,
    assigned_plan_id: body.assigned_plan_id ?? null,
  })
  if (profileErr) {
    // Roll back auth user if profile insert fails.
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { success: false, error: `Profile create failed: ${profileErr.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, id: authData.user.id })
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin()
  if ('error' in gate) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status })
  }

  const body = (await req.json()) as UpdateBody
  if (!body.id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Optional: rotate password + update email on username change.
  const authPatch: { password?: string; email?: string } = {}
  if (body.password) authPatch.password = body.password
  if (body.username) authPatch.email = synthEmail(body.username)
  if (Object.keys(authPatch).length) {
    const { error } = await admin.auth.admin.updateUserById(body.id, authPatch)
    if (error) {
      return NextResponse.json(
        { success: false, error: `Auth update failed: ${error.message}` },
        { status: 500 },
      )
    }
  }

  const profilePatch: Record<string, unknown> = {}
  if (body.username !== undefined) profilePatch.username = body.username
  if (body.name !== undefined) profilePatch.name = body.name
  if (body.role !== undefined) profilePatch.role = body.role
  if (body.dept !== undefined) profilePatch.dept = body.dept
  if (body.customer_id !== undefined) profilePatch.customer_id = body.customer_id
  if (body.vehicle_id !== undefined) profilePatch.vehicle_id = body.vehicle_id
  if (body.assigned_plan_id !== undefined) profilePatch.assigned_plan_id = body.assigned_plan_id

  if (Object.keys(profilePatch).length) {
    const { error } = await admin.from('users').update(profilePatch).eq('id', body.id)
    if (error) {
      return NextResponse.json(
        { success: false, error: `Profile update failed: ${error.message}` },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin()
  if ('error' in gate) {
    return NextResponse.json({ success: false, error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const admin = createAdminClient()
  // Cascade FK on public.users(id) → auth.users(id) handles the profile row.
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json(
      { success: false, error: `Delete failed: ${error.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
