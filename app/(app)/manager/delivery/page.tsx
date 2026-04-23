'use client'

// Manager Delivery Status — ported from Telkom/vros_staff.jsx Staff_DeliveryStatus.
// Lists actionable (confirmed/in-transit) route plans; clicking outcome
// flips plan → delivered + every assigned order → delivered with outcome.

import { useEffect, useState } from 'react'

import { Badge } from '@/components/Badge'
import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { createClient } from '@/lib/supabase/client'
import type { DeliveryOutcome, Order, RoutePlan } from '@/lib/types'

export default function ManagerDeliveryPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const sb = createClient()

  const load = async () => {
    const [planRes, orderRes] = await Promise.all([
      sb.from('route_plans').select('*').order('created_at', { ascending: true }),
      sb.from('orders').select('*'),
    ])
    setPlans((planRes.data ?? []) as RoutePlan[])
    setOrders((orderRes.data ?? []) as Order[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actionable = plans.filter((p) => p.status === 'in-transit' || p.status === 'confirmed')

  async function handleUpdate(plan: RoutePlan, outcome: DeliveryOutcome) {
    setErrorMsg(null)
    const { error: planErr } = await sb
      .from('route_plans')
      .update({ status: 'delivered' })
      .eq('id', plan.id)
    if (planErr) {
      setErrorMsg(`Failed to update plan: ${planErr.message}`)
      return
    }

    const { error: orderErr } = await sb
      .from('orders')
      .update({ status: 'delivered', delivery_outcome: outcome })
      .in('id', plan.order_ids)
    if (orderErr) {
      setErrorMsg(`Failed to update orders: ${orderErr.message}`)
      return
    }

    await load()
  }

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: '#8896b3', marginTop: 2 }}>
          Update delivery outcomes for confirmed and in-transit routes (FR-08)
        </div>
      </div>

      {errorMsg && (
        <Card style={{ marginBottom: 14, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{errorMsg}</div>
        </Card>
      )}

      {actionable.length === 0 ? (
        <EmptyState
          icon="status"
          title="No Pending Updates"
          sub="All confirmed routes have been updated. Dispatch new orders to continue."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {actionable.map((plan) => {
            const planOrders = orders.filter((o) => plan.order_ids.includes(o.id))
            return (
              <Card key={plan.id} style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#1a2035',
                      marginBottom: 3,
                      fontFamily: 'DM Mono',
                    }}
                  >
                    {plan.id}
                  </div>
                  <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 6 }}>
                    Bandung → {plan.sequence.join(' → ')} → Bandung · {plan.distance} km ·{' '}
                    {plan.vehicle}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {planOrders.map((o) => (
                      <span
                        key={o.id}
                        style={{
                          fontSize: 10,
                          fontFamily: 'DM Mono',
                          background: '#f0f2f7',
                          padding: '2px 8px',
                          borderRadius: 4,
                          color: '#475569',
                        }}
                      >
                        {o.id}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Badge
                    label={plan.status === 'in-transit' ? 'In Transit' : 'Confirmed'}
                    color={plan.status === 'in-transit' ? 'blue' : 'purple'}
                  />
                  <Btn
                    onClick={() => handleUpdate(plan, 'on-time')}
                    variant="success"
                    size="sm"
                    icon="check"
                  >
                    On-Time
                  </Btn>
                  <Btn
                    onClick={() => handleUpdate(plan, 'late')}
                    variant="danger"
                    size="sm"
                    icon="alert"
                  >
                    Late
                  </Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
