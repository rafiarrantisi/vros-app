'use client'

// Manager Utilization Report — ported from vros_manager.jsx Manager_UtilizationReport.

import { useEffect, useMemo, useState } from 'react'

import { CapBar } from '@/components/CapBar'
import { Card } from '@/components/Card'
import { KPICard } from '@/components/KPICard'
import { createClient } from '@/lib/supabase/client'
import type { RoutePlan } from '@/lib/types'

const VEHICLE_TYPES = ['Towing', 'CDD Box', 'Fuso Bak', 'CDE Box'] as const

function utilColor(pct: number): string {
  if (pct > 80) return '#ef4444'
  if (pct > 60) return '#f59e0b'
  return '#22c55e'
}

export default function ManagerUtilizationReportPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    const load = async () => {
      const { data } = await sb.from('route_plans').select('*').order('created_at', { ascending: true })
      setPlans((data ?? []) as RoutePlan[])
      setLoading(false)
    }
    load()
  }, [])

  const { delivered, avgW, avgV, byVehicle } = useMemo(() => {
    const d = plans.filter((p) => p.status === 'delivered')
    const aw = d.length ? Math.round(d.reduce((a, p) => a + (p.weight_pct ?? 0), 0) / d.length) : 0
    const av = d.length ? Math.round(d.reduce((a, p) => a + (p.vol_pct ?? 0), 0) / d.length) : 0
    const bv = VEHICLE_TYPES.map((v) => {
      const vPlans = d.filter((p) => p.vehicle === v)
      return {
        v,
        count: vPlans.length,
        avgW: vPlans.length
          ? Math.round(vPlans.reduce((a, p) => a + (p.weight_pct ?? 0), 0) / vPlans.length)
          : 0,
        avgV: vPlans.length
          ? Math.round(vPlans.reduce((a, p) => a + (p.vol_pct ?? 0), 0) / vPlans.length)
          : 0,
      }
    })
    return { delivered: d, avgW: aw, avgV: av, byVehicle: bv }
  }, [plans])

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 20 }}>
        KPI: Vehicle Utilization Rate (Weight & Volume) · FR-09
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <KPICard
          label="Avg Weight Utilization"
          value={`${avgW}%`}
          sub="Across all delivered routes"
          accent="#2563eb"
          icon="util"
        />
        <KPICard
          label="Avg Volume Utilization"
          value={`${avgV}%`}
          sub="Across all delivered routes"
          accent="#8b5cf6"
          icon="util"
        />
        <KPICard
          label="Plans Analyzed"
          value={delivered.length}
          sub="Delivered route plans"
          accent="#10b981"
          icon="report"
        />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {byVehicle.map(({ v, count, avgW: aw, avgV: av }) => (
          <Card key={v} style={{ flex: 1 }}>
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
              {v}
            </div>
            <div style={{ fontSize: 13, color: '#1a2035', fontWeight: 600, marginBottom: 10 }}>
              {count} route{count !== 1 ? 's' : ''}
            </div>
            <CapBar label="Avg Weight" pct={aw} text={`${aw}%`} />
            <div style={{ marginTop: 8 }}>
              <CapBar label="Avg Volume" pct={av} text={`${av}%`} />
            </div>
          </Card>
        ))}
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
          Per-Route Utilization Detail
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[
                'Plan ID',
                'Vehicle',
                'Route',
                'Weight Load',
                'Vol Load',
                'Weight Util.',
                'Volume Util.',
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
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>
                  {p.vehicle}
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    color: '#1a2035',
                    whiteSpace: 'nowrap',
                  }}
                >
                  → {(p.sequence ?? []).join(' → ')}
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {p.total_weight?.toFixed(2) ?? '—'} T
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {p.total_vol?.toFixed(2) ?? '—'} m³
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 52,
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
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'DM Mono',
                        color: '#475569',
                        minWidth: 28,
                      }}
                    >
                      {p.weight_pct ?? 0}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 52,
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
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'DM Mono',
                        color: '#475569',
                        minWidth: 28,
                      }}
                    >
                      {p.vol_pct ?? 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
