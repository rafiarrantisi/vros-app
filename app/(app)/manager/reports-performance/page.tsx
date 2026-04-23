'use client'

// Manager Performance Report — ported from vros_manager.jsx Manager_PerformanceReport.

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { KPICard } from '@/components/KPICard'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/lib/types'

const DESTS = ['Jakarta', 'Surabaya', 'Malang'] as const
const ROUTE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

function destTextColor(dest: string): string {
  if (dest === 'Jakarta') return '#2563eb'
  if (dest === 'Surabaya') return '#8b5cf6'
  return '#10b981'
}

export default function ManagerPerformanceReportPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    const load = async () => {
      const { data } = await sb.from('orders').select('*').order('date', { ascending: true })
      setOrders((data ?? []) as Order[])
      setLoading(false)
    }
    load()
  }, [])

  const { delivered, onTime, late, pct, byDest } = useMemo(() => {
    const d = orders.filter((o) => o.status === 'delivered')
    const ot = d.filter((o) => o.delivery_outcome === 'on-time')
    const lt = d.filter((o) => o.delivery_outcome === 'late')
    const p = d.length ? Math.round((ot.length / d.length) * 100) : 0
    const by = DESTS.map((dest) => {
      const d2 = d.filter((o) => o.dest === dest)
      const otc = d2.filter((o) => o.delivery_outcome === 'on-time').length
      return {
        d: dest,
        total: d2.length,
        ot: otc,
        late: d2.length - otc,
        pct: d2.length ? Math.round((otc / d2.length) * 100) : 0,
      }
    })
    return { delivered: d, onTime: ot, late: lt, pct: p, byDest: by }
  }, [orders])

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 20 }}>
        KPI: On-Time Delivery Rate · FR-09 · Target: above 81%
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <KPICard
          label="On-Time Deliveries"
          value={onTime.length}
          sub={`of ${delivered.length} total`}
          accent="#22c55e"
          icon="check"
        />
        <KPICard
          label="Late Deliveries"
          value={late.length}
          sub={`${100 - pct}% delay rate`}
          accent="#ef4444"
          icon="alert"
        />
        <KPICard
          label="On-Time Rate"
          value={`${pct}%`}
          sub={pct >= 81 ? '✓ Target met' : '✗ Below target'}
          accent={pct >= 81 ? '#22c55e' : '#ef4444'}
          icon="report"
        />
        <KPICard label="Target" value="81%" sub="Baseline Feb 2026" accent="#6b7fa3" icon="info" />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {byDest.map((row, i) => {
          const col = ROUTE_COLORS[i]
          return (
            <Card key={row.d} style={{ flex: 1 }}>
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
                Bandung → {row.d}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: row.pct >= 80 ? '#16a34a' : '#dc2626',
                  fontFamily: 'DM Mono',
                  marginBottom: 4,
                }}
              >
                {row.pct}%
              </div>
              <div style={{ fontSize: 11, color: '#8896b3', marginBottom: 10 }}>on-time rate</div>
              <div
                style={{
                  height: 6,
                  background: '#f0f2f7',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${row.pct}%`,
                    background: col,
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{row.ot} on-time</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{row.late} late</span>
                <span style={{ color: '#8896b3' }}>{row.total} total</span>
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
          Delivery Log — Feb 2026
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['PO Number', 'Customer', 'Destination', 'Date', 'Vehicle', 'Status'].map((h) => (
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
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {delivered.map((o, i) => (
              <tr
                key={o.id}
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
                  {o.id}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#1a2035' }}>
                  {o.customer}
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: destTextColor(o.dest),
                  }}
                >
                  {o.dest}
                </td>
                <td
                  style={{
                    padding: '9px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#6b7fa3',
                  }}
                >
                  {o.date}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>
                  {o.vehicle ?? '—'}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <Badge
                    label={o.delivery_outcome === 'on-time' ? 'On-Time' : 'Late'}
                    color={o.delivery_outcome === 'on-time' ? 'green' : 'red'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
