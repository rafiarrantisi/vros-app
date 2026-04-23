'use client'

// Manager Optimizer — ported from Telkom/vros_staff.jsx Staff_Optimizer.
// CVRP runs server-side via POST /api/optimize. On confirm, writes route_plans
// rows + flips orders.status='confirmed' + sets route_plan_id.

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import { Btn } from '@/components/Btn'
import { CapBar } from '@/components/CapBar'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { DEPOT } from '@/lib/constants'
import { calcRouteDist, getDist, permutations, toMatrix } from '@/lib/cvrp'
import { createClient } from '@/lib/supabase/client'
import type { DistMatrix, Order, RoutePlanDraft, Vehicle } from '@/lib/types'

const STEPS = [
  'Initializing individual routes…',
  'Computing savings matrix (Clarke-Wright)…',
  'Applying dual capacity constraints…',
  'Merging optimal routes…',
  'Running Brute Force sequencing (3! permutations)…',
  'Validating feasibility…',
  'Done ✓',
]

const COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b']

function nextPlanId(existingCount: number, draftIndex: number): string {
  return `RP-${String(existingCount + draftIndex + 1).padStart(3, '0')}`
}

export default function ManagerOptimizerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [matrix, setMatrix] = useState<DistMatrix>({})
  const [existingPlanCount, setExistingPlanCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const [drafts, setDrafts] = useState<RoutePlanDraft[] | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const sb = createClient()

  const load = async () => {
    const [ordersRes, vehRes, distRes, planCount] = await Promise.all([
      sb.from('orders').select('*').order('created_at', { ascending: true }),
      sb.from('vehicles').select('*'),
      sb.from('distances_matrix').select('*'),
      sb.from('route_plans').select('id', { count: 'exact', head: true }),
    ])
    const ordersData = (ordersRes.data ?? []) as Order[]
    setOrders(ordersData)
    setVehicles((vehRes.data ?? []) as Vehicle[])
    setMatrix(toMatrix(distRes.data ?? []))
    setExistingPlanCount(planCount.count ?? 0)
    const pendingIds = ordersData.filter((o) => o.status === 'pending').map((o) => o.id)
    setSelected(pendingIds)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pending = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders])

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    setDrafts(null)
  }

  async function runOptimize() {
    if (!selected.length) return
    setRunning(true)
    setDrafts(null)
    setConfirmed(false)
    setErrorMsg(null)
    setStep(0)

    // 7-step animation — mirrors v3 narrative pacing.
    for (let i = 1; i < STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 450))
      setStep(i)
    }

    try {
      const res = await fetch('/api/optimize', { method: 'POST' })
      const body = (await res.json()) as { success: boolean; drafts?: RoutePlanDraft[]; error?: string }
      if (!body.success || !body.drafts) {
        setErrorMsg(body.error ?? 'Optimization failed')
        setRunning(false)
        return
      }
      // Keep only drafts whose orderIds are fully within `selected` — matches v3
      // behaviour where user can deselect orders client-side.
      const filteredDrafts = body.drafts.filter((d) =>
        d.orderIds.every((id) => selected.includes(id)),
      )
      setDrafts(filteredDrafts)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
    setRunning(false)
  }

  async function handleConfirm() {
    if (!drafts || drafts.length === 0) return
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) {
      setErrorMsg('Session expired — please log in again.')
      return
    }

    const nowIso = new Date().toISOString()
    const planRows = drafts.map((d, idx) => ({
      id: nextPlanId(existingPlanCount, idx),
      order_ids: d.orderIds,
      sequence: d.sequence,
      vehicle: d.vehicle,
      total_weight: d.totalWeight,
      total_vol: d.totalVol,
      distance: d.distance,
      savings: d.savings,
      status: 'confirmed',
      confirmed_at: nowIso,
      confirmed_by: user.id,
      weight_pct: d.weightPct,
      vol_pct: d.volPct,
      driver_id: null,
    }))

    const { error: planErr } = await sb.from('route_plans').insert(planRows)
    if (planErr) {
      setErrorMsg(`Failed to save plans: ${planErr.message}`)
      return
    }

    // Flip orders: pending → confirmed + set route_plan_id per order.
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      const planId = planRows[i].id
      const { error: updErr } = await sb
        .from('orders')
        .update({ status: 'confirmed', route_plan_id: planId })
        .in('id', d.orderIds)
      if (updErr) {
        setErrorMsg(`Failed to update orders: ${updErr.message}`)
        return
      }
    }

    setConfirmed(true)
    setDrafts(null)
    setSelected([])
    await load()
  }

  const baseKm = selected.reduce((acc, id) => {
    const o = orders.find((x) => x.id === id)
    return acc + (o ? getDist(matrix, DEPOT, o.dest) * 2 : 0)
  }, 0)
  const optKm = drafts ? drafts.reduce((a, r) => a + r.distance, 0) : 0
  const saved = baseKm - optKm

  const vehicleByType = useMemo(() => {
    const m = new Map<string, Vehicle>()
    for (const v of vehicles) m.set(v.type, v)
    return m
  }, [vehicles])

  const allPerms = (stops: readonly string[]) =>
    permutations(stops)
      .map((p) => ({ seq: p, dist: calcRouteDist(matrix, p) }))
      .sort((a, b) => a.dist - b.dist)

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  if (confirmed) {
    return (
      <div
        style={{
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            background: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Icon name="check" size={28} color="#22c55e" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a2035', marginBottom: 8 }}>
          Routing Plan Confirmed!
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#8896b3',
            textAlign: 'center',
            maxWidth: 340,
            marginBottom: 20,
          }}
        >
          The optimized route plan has been saved. Orders are ready for dispatch.
        </div>
        <Btn onClick={() => setConfirmed(false)} variant="primary" icon="optimize">
          Optimize More Orders
        </Btn>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 28,
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Left: order selection */}
      <div
        style={{
          width: 290,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <Card>
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
            Select Pending Orders
          </div>
          {pending.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              No pending orders
            </div>
          ) : (
            pending.map((o) => {
              const on = selected.includes(o.id)
              return (
                <div
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  style={{
                    display: 'flex',
                    gap: 9,
                    padding: '9px 11px',
                    borderRadius: 8,
                    border: `1.5px solid ${on ? '#3b82f6' : '#e8ecf4'}`,
                    background: on ? '#eff6ff' : '#fafbfc',
                    cursor: 'pointer',
                    marginBottom: 7,
                    transition: 'all 0.12s',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 1,
                      border: `2px solid ${on ? '#3b82f6' : '#cbd5e1'}`,
                      background: on ? '#3b82f6' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on && <Icon name="check" size={10} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: 'DM Mono',
                        fontWeight: 700,
                        color: '#1a2035',
                      }}
                    >
                      {o.id}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: '#8896b3',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.customer}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                        → {o.dest}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: '#8896b3',
                          fontFamily: 'DM Mono',
                        }}
                      >
                        {o.weight_ton}T · {o.vol_m3 ?? 0}m³
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <Btn onClick={runOptimize} disabled={running || !selected.length} fullWidth icon="optimize">
            {running ? 'Running CVRP…' : 'Run CVRP Algorithm'}
          </Btn>
        </Card>

        <Card>
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
            Distance Comparison
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div
              style={{
                background: '#fef2f2',
                borderRadius: 8,
                padding: '10px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#ef4444',
                  fontFamily: 'DM Mono',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {baseKm} km
              </div>
              <div style={{ color: '#8896b3', fontSize: 10, marginTop: 2 }}>
                Manual (baseline)
              </div>
            </div>
            <div
              style={{
                background: '#f0fdf4',
                borderRadius: 8,
                padding: '10px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#22c55e',
                  fontFamily: 'DM Mono',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {drafts ? optKm : '—'} km
              </div>
              <div style={{ color: '#8896b3', fontSize: 10, marginTop: 2 }}>
                CVRP Optimized
              </div>
            </div>
          </div>
          {drafts && saved > 0 && (
            <div
              style={{
                marginTop: 10,
                background: '#eff6ff',
                borderRadius: 8,
                padding: '7px 12px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                Saved {saved} km{' '}
              </span>
              <span style={{ fontSize: 11, color: '#6b7fa3' }}>
                ({Math.round((saved / baseKm) * 100)}% reduction)
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Right: results */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {errorMsg && (
          <Card style={{ marginBottom: 14, borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{errorMsg}</div>
          </Card>
        )}

        {running && (
          <Card>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1a2035',
                marginBottom: 16,
              }}
            >
              Running CVRP — Clarke-Wright + Brute Force
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: i > step ? 0.25 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        i < step ? '#22c55e' : i === step ? '#2563eb' : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i < step ? (
                      <Icon name="check" size={10} color="#fff" />
                    ) : i === step ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTopColor: '#fff',
                          animation: 'spin 0.6s linear infinite',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#94a3b8',
                          display: 'block',
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: i === step ? '#1d4ed8' : i < step ? '#16a34a' : '#94a3b8',
                      fontWeight: i === step ? 600 : 400,
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {drafts && !running && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="check" size={14} color="#22c55e" /> {drafts.length} route
                {drafts.length > 1 ? 's' : ''} generated
              </div>
              {drafts.length > 0 && (
                <Btn onClick={handleConfirm} variant="success" icon="save">
                  Confirm &amp; Save Plan
                </Btn>
              )}
            </div>

            {drafts.map((route, ri) => {
              const c = COLORS[ri % COLORS.length]
              const veh = vehicleByType.get(route.vehicle)
              const stops = Array.from(new Set(route.sequence))
              const perms = stops.length > 1 ? allPerms(stops) : []
              const planOrders = orders.filter((o) => route.orderIds.includes(o.id))
              const util = Math.max(route.weightPct, route.volPct)
              const utilColor = util > 80 ? 'red' : util > 50 ? 'yellow' : 'green'

              return (
                <Card key={route.id} style={{ marginBottom: 14, borderLeft: `3px solid ${c}` }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#1a2035',
                          marginBottom: 2,
                        }}
                      >
                        {route.id}
                      </div>
                      <div style={{ fontSize: 12, color: '#8896b3' }}>
                        Bandung → {route.sequence.join(' → ')} → Bandung
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: c,
                          fontFamily: 'DM Mono',
                        }}
                      >
                        {route.distance} km
                      </div>
                      <div style={{ fontSize: 10, color: '#8896b3' }}>round trip</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 12,
                      alignItems: 'center',
                      background: '#f8fafc',
                      borderRadius: 8,
                      padding: '9px 12px',
                    }}
                  >
                    <Icon name="truck" size={15} color={c} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2035' }}>
                        {route.vehicle}
                      </div>
                      <div style={{ fontSize: 10, color: '#8896b3' }}>
                        {veh?.max_weight ?? '—'}T · {veh?.max_vol?.toFixed(1) ?? '—'} m³ capacity
                      </div>
                    </div>
                    <Badge label={`${util}% utilized`} color={utilColor} />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <CapBar
                      label="Weight"
                      pct={route.weightPct}
                      text={`${route.totalWeight.toFixed(2)}T / ${veh?.max_weight ?? '—'}T`}
                    />
                    <CapBar
                      label="Volume"
                      pct={route.volPct}
                      text={`${route.totalVol.toFixed(2)} / ${veh?.max_vol?.toFixed(1) ?? '—'} m³`}
                    />
                  </div>

                  {perms.length > 1 && (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#8896b3',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          marginBottom: 6,
                        }}
                      >
                        Brute Force Sequencing — All {perms.length} permutations ({stops.length}! ={' '}
                        {perms.length})
                      </div>
                      <div
                        style={{
                          border: '1px solid #e8ecf4',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        {perms.map((p, pi) => (
                          <div
                            key={p.seq.join('-')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 12px',
                              background:
                                pi === 0 ? '#f0fdf4' : pi % 2 === 0 ? '#fff' : '#fafbfc',
                              borderBottom:
                                pi < perms.length - 1 ? '1px solid #f0f2f7' : 'none',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: 'DM Mono',
                                color: '#8896b3',
                                width: 16,
                              }}
                            >
                              #{pi + 1}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                fontSize: 11,
                                color: pi === 0 ? '#16a34a' : '#475569',
                                fontWeight: pi === 0 ? 700 : 400,
                              }}
                            >
                              Bandung → {p.seq.join(' → ')} → Bandung
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: 'DM Mono',
                                fontWeight: 700,
                                color: pi === 0 ? '#16a34a' : '#94a3b8',
                              }}
                            >
                              {p.dist} km
                            </span>
                            {pi === 0 && <Badge label="Optimal" color="green" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#8896b3',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      marginBottom: 6,
                    }}
                  >
                    Assigned Orders ({planOrders.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {planOrders.map((o) => (
                      <div
                        key={o.id}
                        style={{
                          padding: '4px 10px',
                          background: '#eff6ff',
                          borderRadius: 6,
                          fontSize: 10,
                          color: '#1d4ed8',
                          fontFamily: 'DM Mono',
                          fontWeight: 700,
                        }}
                      >
                        {o.id} · {o.dest}
                      </div>
                    ))}
                  </div>
                  {route.savings > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#6b7fa3' }}>
                      Merged routes saved{' '}
                      <strong style={{ color: '#16a34a' }}>{route.savings} km</strong>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {!drafts && !running && (
          <EmptyState
            icon="optimize"
            title="Ready to Optimize"
            sub="Select pending orders on the left, then run the CVRP algorithm (Clarke-Wright Savings + Brute Force sequencing) to generate optimal routes."
          />
        )}
      </div>
    </div>
  )
}
