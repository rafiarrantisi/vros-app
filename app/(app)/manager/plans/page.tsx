'use client'

// Manager Plan History — ported from Telkom/vros_manager.jsx Manager_PlanHistory.

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { createClient } from '@/lib/supabase/client'
import type { RoutePlan } from '@/lib/types'

type PlanFilter = 'all' | 'confirmed' | 'in-transit' | 'delivered'
const FILTERS: PlanFilter[] = ['all', 'confirmed', 'in-transit', 'delivered']

function utilColor(pct: number): string {
  if (pct > 80) return '#ef4444'
  if (pct > 60) return '#f59e0b'
  return '#22c55e'
}

function statusLabel(s: RoutePlan['status']): string {
  if (s === 'delivered') return 'Delivered'
  if (s === 'in-transit') return 'In Transit'
  if (s === 'confirmed') return 'Confirmed'
  return 'Draft'
}

function statusColor(s: RoutePlan['status']): 'green' | 'blue' | 'purple' | 'gray' {
  if (s === 'delivered') return 'green'
  if (s === 'in-transit') return 'blue'
  if (s === 'confirmed') return 'purple'
  return 'gray'
}

export default function ManagerPlansPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PlanFilter>('all')

  useEffect(() => {
    const sb = createClient()
    const load = async () => {
      const { data } = await sb.from('route_plans').select('*').order('created_at', { ascending: true })
      setPlans((data ?? []) as RoutePlan[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const mF = filter === 'all' || p.status === filter
      const haystack = [p.id, p.vehicle, ...(p.sequence ?? [])].join(' ').toLowerCase()
      const mQ = !search || haystack.includes(search.toLowerCase())
      return mF && mQ
    })
  }, [plans, search, filter])

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plan ID, vehicle, destination…"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            fontSize: 12,
            fontFamily: 'DM Sans',
            outline: 'none',
            color: '#1a2035',
          }}
        />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 13px',
              borderRadius: 7,
              border: '1.5px solid',
              borderColor: filter === f ? '#3b82f6' : '#e2e8f0',
              background: filter === f ? '#eff6ff' : '#fff',
              color: filter === f ? '#1d4ed8' : '#64748b',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'DM Sans',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[
                'Plan ID',
                'Orders',
                'Route Sequence',
                'Vehicle',
                'Distance',
                'Weight Util.',
                'Vol Util.',
                'Confirmed',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#8896b3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    borderBottom: '1px solid #f0f2f7',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No plans found
                </td>
              </tr>
            )}
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: '1px solid #f8fafc',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc',
                }}
              >
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    fontWeight: 700,
                    color: '#2563eb',
                  }}
                >
                  {p.id}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {p.order_ids.join(', ')}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#1a2035', whiteSpace: 'nowrap' }}>
                  Bandung → {(p.sequence ?? []).join(' → ')} → Bandung
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>{p.vehicle}</td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {p.distance} km
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 48,
                        height: 4,
                        background: '#f0f2f7',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${p.weight_pct ?? 0}%`,
                          background: utilColor(p.weight_pct ?? 0),
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>
                      {p.weight_pct ?? 0}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 48,
                        height: 4,
                        background: '#f0f2f7',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${p.vol_pct ?? 0}%`,
                          background: utilColor(p.vol_pct ?? 0),
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#475569' }}>
                      {p.vol_pct ?? 0}%
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#6b7fa3',
                  }}
                >
                  {p.confirmed_at ? p.confirmed_at.slice(0, 10) : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <Badge label={statusLabel(p.status)} color={statusColor(p.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid #f0f2f7',
            fontSize: 11,
            color: '#8896b3',
          }}
        >
          {filtered.length} of {plans.length} plans
        </div>
      </Card>
    </div>
  )
}
