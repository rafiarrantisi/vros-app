// POST /api/optimize
// Manager-only endpoint. Loads pending orders + fleet + distance matrix from
// Supabase, runs CVRP server-side, returns draft route plans. Does NOT persist —
// manager reviews drafts in the UI and confirms, which triggers a separate
// insert into route_plans + orders.status update.

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { runCVRP, toMatrix } from '@/lib/cvrp'
import type { DistanceRow, Order, Vehicle } from '@/lib/types'

interface OptimizeResponse {
  success: boolean
  drafts?: ReturnType<typeof runCVRP>
  error?: string
}

export async function POST(): Promise<NextResponse<OptimizeResponse>> {
  const sb = await createClient()

  // 1. AuthN + AuthZ — manager only (admin allowed so ops can demo).
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileErr } = await sb
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileErr || !profile) {
    return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 403 })
  }
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  // 2. Load inputs in parallel. RLS is authoritative — manager sees all.
  const [ordersRes, vehiclesRes, distRes] = await Promise.all([
    sb.from('orders').select('*').eq('status', 'pending'),
    sb.from('vehicles').select('*'),
    sb.from('distances_matrix').select('*'),
  ])

  if (ordersRes.error) {
    return NextResponse.json(
      { success: false, error: `Load orders failed: ${ordersRes.error.message}` },
      { status: 500 },
    )
  }
  if (vehiclesRes.error) {
    return NextResponse.json(
      { success: false, error: `Load vehicles failed: ${vehiclesRes.error.message}` },
      { status: 500 },
    )
  }
  if (distRes.error) {
    return NextResponse.json(
      { success: false, error: `Load distances failed: ${distRes.error.message}` },
      { status: 500 },
    )
  }

  const orders = (ordersRes.data ?? []) as Order[]
  const vehicles = (vehiclesRes.data ?? []) as Vehicle[]
  const matrix = toMatrix((distRes.data ?? []) as DistanceRow[])

  if (orders.length === 0) {
    return NextResponse.json({ success: true, drafts: [] })
  }

  // 3. Run CVRP — pure, deterministic.
  const drafts = runCVRP(orders, vehicles, matrix)

  return NextResponse.json({ success: true, drafts })
}
