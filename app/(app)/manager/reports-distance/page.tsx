'use client'

// Manager Distance Report — ported from vros_manager.jsx Manager_DistanceReport.

import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/Card'
import { KPICard } from '@/components/KPICard'
import { DEPOT } from '@/lib/constants'
import { getDist, toMatrix } from '@/lib/cvrp'
import { createClient } from '@/lib/supabase/client'
import type { DistMatrix, RoutePlan } from '@/lib/types'

const DESTS = ['Jakarta', 'Surabaya', 'Malang'] as const
const ROUTE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

export default function ManagerDistanceReportPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([])
  const [matrix, setMatrix] = useState<DistMatrix>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    const load = async () => {
      const [planRes, distRes] = await Promise.all([
        sb.from('route_plans').select('*').order('created_at', { ascending: true }),
        sb.from('distances_matrix').select('*'),
      ])
      setPlans((planRes.data ?? []) as RoutePlan[])
      setMatrix(toMatrix(distRes.data ?? []))
      setLoading(false)
    }
    load()
  }, [])

  const { delivered, total, byDest } = useMemo(() => {
    const d = plans.filter((p) => p.status === 'delivered')
    const t = d.reduce((a, p) => a + p.distance, 0)
    const by = DESTS.map((dest) => {
      const dPlans = d.filter((p) => (p.sequence ?? []).includes(dest))
      return {
        d: dest,
        count: dPlans.length,
        km: dPlans.reduce((a, p) => a + p.distance, 0),
        stdDist: getDist(matrix, DEPOT, dest) * 2,
      }
    })
    return { delivered: d, total: t, byDest: by }
  }, [plans, matrix])

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 20 }}>
        KPI: Total Route Distance · FR-09
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <KPICard
          label="Total Distance"
          value={`${total}km`}
          sub="All delivered plans"
          accent="#2563eb"
          icon="distance"
        />
        <KPICard
          label="Avg per Route"
          value={`${delivered.length ? Math.round(total / delivered.length) : 0}km`}
          sub="Average route distance"
          accent="#8b5cf6"
          icon="distance"
        />
        <KPICard
          label="Routes Tracked"
          value={delivered.length}
          sub="Completed route plans"
          accent="#10b981"
          icon="report"
        />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {byDest.map(({ d, count, km, stdDist }, i) => {
          const col = ROUTE_COLORS[i]
          const avg = count ? Math.round(km / count) : 0
          return (
            <Card key={d} style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8896b3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 10,
                }}
              >
                → {d}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: col,
                  fontFamily: 'DM Mono',
                  marginBottom: 2,
                }}
              >
                {km} km
              </div>
              <div style={{ fontSize: 11, color: '#8896b3', marginBottom: 10 }}>
                {count} routes · avg {avg} km
              </div>
              <div
                style={{
                  height: 5,
                  background: '#f0f2f7',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${total ? (km / total) * 100 : 0}%`,
                    background: col,
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: '#8896b3', marginTop: 6 }}>
                Std. distance: {stdDist} km/trip
              </div>
            </Card>
          )
        })}
      </div>

      <Card style={{ padding: 0 }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f0f2f7',
            fontSize: 13,
            fontWeight: 700,
            color: '#1a2035',
          }}
        >
          Route Distance Log
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[
                'Plan ID',
                'Route Sequence',
                'Vehicle',
                'Distance',
                'Weight Util.',
                'Confirmed',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '9px 14px',
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
            {delivered.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: '1px solid #f8fafc',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc',
                }}
              >
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    fontWeight: 600,
                    color: '#2563eb',
                  }}
                >
                  {p.id}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#1a2035' }}>
                  Bandung → {(p.sequence ?? []).join(' → ')} → Bandung
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>
                  {p.vehicle}
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 12,
                    fontFamily: 'DM Mono',
                    fontWeight: 700,
                    color: '#2563eb',
                  }}
                >
                  {p.distance} km
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {p.weight_pct ?? 0}%
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#6b7fa3',
                  }}
                >
                  {p.confirmed_at ? p.confirmed_at.slice(0, 10) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
