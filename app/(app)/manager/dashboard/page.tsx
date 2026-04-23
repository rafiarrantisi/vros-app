'use client'

// Manager Dashboard — ported from Telkom/vros_staff.jsx Staff_Dashboard.
// Data source: Supabase (orders + distances_matrix) instead of v3 window.VROS.

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { KPICard } from '@/components/KPICard'
import { StatusBadge } from '@/components/Badge'
import { DEPOT } from '@/lib/constants'
import { getDist, toMatrix } from '@/lib/cvrp'
import { createClient } from '@/lib/supabase/client'
import type { DistMatrix, Order } from '@/lib/types'

export default function ManagerDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [matrix, setMatrix] = useState<DistMatrix>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    const load = async () => {
      const [ordersRes, distRes] = await Promise.all([
        sb.from('orders').select('*').order('created_at', { ascending: true }),
        sb.from('distances_matrix').select('*'),
      ])
      setOrders((ordersRes.data ?? []) as Order[])
      setMatrix(toMatrix(distRes.data ?? []))
      setLoading(false)
    }
    load()
  }, [])

  const delivered = orders.filter((o) => o.status === 'delivered')
  const pending = orders.filter((o) => o.status === 'pending')
  const inTransit = orders.filter((o) => o.status === 'in-transit')
  const onTime = delivered.filter((o) => o.delivery_outcome === 'on-time').length
  const late = delivered.filter((o) => o.delivery_outcome === 'late').length
  const pct = delivered.length ? Math.round((onTime / delivered.length) * 100) : 0

  const r = 38
  const cx = 55
  const cy = 55
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const byDest = (['Jakarta', 'Surabaya', 'Malang'] as const).map((d) => ({
    d,
    count: delivered.filter((o) => o.dest === d).length,
    km: getDist(matrix, DEPOT, d),
  }))
  const maxCount = Math.max(...byDest.map((x) => x.count), 1)

  if (loading) {
    return (
      <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
    )
  }

  return (
    <div
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <KPICard
          label="On-Time Rate"
          value={`${pct}%`}
          sub={`${onTime}/${delivered.length} delivered`}
          accent="#22c55e"
          icon="check"
        />
        <KPICard
          label="Pending Orders"
          value={pending.length}
          sub="Awaiting optimization"
          accent="#f59e0b"
          icon="order"
        />
        <KPICard
          label="In Transit"
          value={inTransit.length}
          sub="Currently dispatched"
          accent="#2563eb"
          icon="truck"
        />
        <KPICard
          label="Late Deliveries"
          value={late}
          sub={`${delivered.length ? Math.round((late / delivered.length) * 100) : 0}% rate`}
          accent="#ef4444"
          icon="alert"
        />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Donut */}
        <Card
          style={{
            width: 210,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 14px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8896b3',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Feb 2026 Performance
          </div>
          <svg width={110} height={110} viewBox="0 0 110 110">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fee2e2" strokeWidth={11} />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#22c55e"
              strokeWidth={11}
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="round"
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill="#1a2035"
              fontFamily="DM Mono"
            >
              {pct}%
            </text>
            <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#8896b3" fontFamily="DM Sans">
              on-time
            </text>
          </svg>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, marginTop: 6 }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>● {onTime} On-Time</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>● {late} Late</span>
          </div>
        </Card>

        {/* Route breakdown */}
        <Card style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8896b3',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 14,
            }}
          >
            Deliveries by Route (Feb 2026)
          </div>
          {byDest.map(({ d, count, km }, i) => {
            const col = ['#3b82f6', '#8b5cf6', '#10b981'][i]
            return (
              <div key={d} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2035' }}>
                    Bandung → {d}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: '#8896b3' }}>
                    {count} orders · {km} km
                  </span>
                </div>
                <div style={{ height: 6, background: '#f0f2f7', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxCount) * 100}%`,
                      background: col,
                      borderRadius: 3,
                      transition: 'width 0.8s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </Card>

        {/* Recent orders */}
        <Card style={{ width: 270 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8896b3',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 12,
            }}
          >
            Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[...orders]
              .reverse()
              .slice(0, 6)
              .map((o) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        o.status === 'delivered'
                          ? o.delivery_outcome === 'on-time'
                            ? '#22c55e'
                            : '#ef4444'
                          : o.status === 'in-transit'
                            ? '#3b82f6'
                            : '#f59e0b',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1a2035',
                        fontFamily: 'DM Mono',
                      }}
                    >
                      {o.id}
                    </div>
                    <div style={{ fontSize: 10, color: '#8896b3' }}>
                      {o.dest} · {o.date}
                    </div>
                  </div>
                  <StatusBadge status={o.status} outcome={o.delivery_outcome} />
                </div>
              ))}
          </div>
        </Card>
      </div>

      {pending.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)',
            borderRadius: 12,
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="optimize" size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {pending.length} order{pending.length > 1 ? 's' : ''} pending route optimization
            </div>
            <div style={{ fontSize: 12, color: '#93c5fd' }}>
              Run the CVRP algorithm to generate optimized vehicle assignments
            </div>
          </div>
          <Link
            href="/manager/optimizer"
            style={{
              background: '#fff',
              color: '#1d4ed8',
              fontWeight: 700,
              fontSize: 13,
              padding: '8px 16px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
            }}
          >
            Optimize Now <Icon name="arrow" size={12} color="#1d4ed8" />
          </Link>
        </div>
      )}
    </div>
  )
}
