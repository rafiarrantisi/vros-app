'use client'

// Customer Portal — ported from Telkom/vros_customer.jsx.
// Two in-page tabs: "My Orders" (FR-13) + "Track Driver" (FR-14).
// Polling replaced by Supabase Realtime on `driver_locations`.
// Own-rows enforced client-side by RLS on orders/route_plans/driver_locations.

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import { StatusBadge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { signOut } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import type {
  Checkpoint,
  DriverLocation,
  Order,
  RoutePlan,
  UserProfile,
} from '@/lib/types'

type PortalTab = 'orders' | 'track'

type DriverLocMap = Record<string, DriverLocation>

interface LoadedData {
  profile: UserProfile | null
  orders: Order[]
  plans: RoutePlan[]
  checkpoints: Checkpoint[]
  drivers: UserProfile[]
  locs: DriverLocMap
}

const EMPTY: LoadedData = {
  profile: null,
  orders: [],
  plans: [],
  checkpoints: [],
  drivers: [],
  locs: {},
}

export default function CustomerPortalPage() {
  const [tab, setTab] = useState<PortalTab>('orders')
  const [data, setData] = useState<LoadedData>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    let mounted = true

    const load = async () => {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return

      const [profileRes, orderRes, planRes, cpRes, dloc, drvRes] = await Promise.all([
        sb.from('users').select('*').eq('id', user.id).single(),
        sb.from('orders').select('*').order('date', { ascending: false }),
        sb.from('route_plans').select('*'),
        sb.from('checkpoints').select('*').order('idx', { ascending: true }),
        sb.from('driver_locations').select('*'),
        sb.from('users').select('*').eq('role', 'driver'),
      ])

      const locMap: DriverLocMap = {}
      for (const l of (dloc.data ?? []) as DriverLocation[]) {
        locMap[l.driver_id] = l
      }

      if (!mounted) return
      setData({
        profile: (profileRes.data ?? null) as UserProfile | null,
        orders: (orderRes.data ?? []) as Order[],
        plans: (planRes.data ?? []) as RoutePlan[],
        checkpoints: (cpRes.data ?? []) as Checkpoint[],
        drivers: (drvRes.data ?? []) as UserProfile[],
        locs: locMap,
      })
      setLoading(false)
    }

    load()

    // Realtime: replace 5s polling with postgres_changes push.
    const channel = sb
      .channel('customer-dloc')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        (payload) => {
          setData((prev) => {
            const next = { ...prev.locs }
            if (payload.eventType === 'DELETE') {
              const old = payload.old as Partial<DriverLocation>
              if (old.driver_id) delete next[old.driver_id]
            } else {
              const row = payload.new as DriverLocation
              next[row.driver_id] = row
            }
            return { ...prev, locs: next }
          })
        },
      )
      .subscribe()

    return () => {
      mounted = false
      sb.removeChannel(channel)
    }
  }, [])

  const myOrders = useMemo(() => {
    if (!data.profile?.customer_id) return []
    return data.orders.filter((o) => o.customer_id === data.profile?.customer_id)
  }, [data.orders, data.profile])

  const activeOrder = myOrders.find((o) => o.status === 'in-transit') ?? null
  const activePlan = activeOrder
    ? data.plans.find((p) => p.id === activeOrder.route_plan_id) ?? null
    : null
  const driverLoc = activePlan?.driver_id ? data.locs[activePlan.driver_id] ?? null : null

  if (loading || !data.profile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f0f2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        Memuat data…
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f2f7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8ecf4',
          padding: '0 28px',
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="order" size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2035' }}>
              Customer Portal — VROS
            </div>
            <div style={{ fontSize: 10, color: '#8896b3' }}>
              PT. Pindad International Logistic
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
            {data.profile.name}
          </div>
          <Badge label="Customer" color="purple" />
          <button
            type="button"
            onClick={async () => {
              await signOut()
              window.location.href = '/login'
            }}
            style={{
              background: '#f8fafc',
              border: '1px solid #e8ecf4',
              borderRadius: 7,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon name="logout" size={12} color="#475569" />
            Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 28px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 22,
            background: '#fff',
            padding: 4,
            borderRadius: 10,
            border: '1px solid #e8ecf4',
            width: 'fit-content',
          }}
        >
          {(
            [
              { id: 'orders', label: 'My Orders', icon: 'order' },
              { id: 'track', label: 'Track Driver', icon: 'map' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 18px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                background: tab === t.id ? '#2563eb' : 'transparent',
                color: tab === t.id ? '#fff' : '#6b7fa3',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'DM Sans',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'all 0.15s',
              }}
            >
              <Icon name={t.icon} size={13} color={tab === t.id ? '#fff' : '#6b7fa3'} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'orders' && <CustomerOrders myOrders={myOrders} />}
        {tab === 'track' && (
          <CustomerTrack
            activeOrder={activeOrder}
            activePlan={activePlan}
            driverLoc={driverLoc}
            drivers={data.drivers}
            checkpoints={data.checkpoints}
          />
        )}
      </div>
    </div>
  )
}

// ── My Orders ────────────────────────────────────────────────────────

function CustomerOrders({ myOrders }: { myOrders: Order[] }) {
  const active = myOrders.filter((o) => o.status === 'in-transit')
  const pending = myOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed')
  const delivered = myOrders.filter((o) => o.status === 'delivered')

  const summary: Array<[string, number, string]> = [
    ['Active Shipments', active.length, '#2563eb'],
    ['Pending', pending.length, '#f59e0b'],
    ['Delivered', delivered.length, '#22c55e'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {summary.map(([l, v, c]) => (
          <Card key={l} style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c, fontFamily: 'DM Mono' }}>{v}</div>
            <div style={{ fontSize: 11, color: '#8896b3', fontWeight: 600, marginTop: 2 }}>{l}</div>
          </Card>
        ))}
      </div>

      {active.map((o) => (
        <Card key={o.id} style={{ border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#3b82f6',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>IN TRANSIT</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'DM Mono',
                color: '#8896b3',
                marginLeft: 'auto',
              }}
            >
              {o.id}
            </span>
          </div>
          <OrderCard o={o} />
        </Card>
      ))}

      <Card style={{ padding: 0 }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #f0f2f7',
            fontSize: 13,
            fontWeight: 700,
            color: '#1a2035',
          }}
        >
          Order History ({myOrders.length} orders)
        </div>
        {myOrders.length === 0 ? (
          <EmptyState
            icon="order"
            title="No orders yet"
            sub="Your delivery orders will appear here once created by PT. PIL operations team."
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['PO Number', 'Destination', 'Date', 'Weight', 'Volume', 'Notes', 'Status'].map(
                  (h) => (
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {myOrders.map((o, i) => (
                <tr
                  key={o.id}
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
                    {o.id}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          o.dest === 'Jakarta'
                            ? '#2563eb'
                            : o.dest === 'Surabaya'
                              ? '#8b5cf6'
                              : '#10b981',
                      }}
                    >
                      {o.dest}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontFamily: 'DM Mono',
                      color: '#6b7fa3',
                    }}
                  >
                    {o.date}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontFamily: 'DM Mono',
                      color: '#475569',
                    }}
                  >
                    {o.weight_ton}T
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontFamily: 'DM Mono',
                      color: '#475569',
                    }}
                  >
                    {o.vol_m3 ?? '—'} m³
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#8896b3' }}>
                    {o.notes ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={o.status} outcome={o.delivery_outcome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function OrderCard({ o }: { o: Order }) {
  const fields: Array<[string, string | number | null, boolean]> = [
    ['Destination', o.dest, false],
    ['Order Date', o.date, false],
    ['Weight', `${o.weight_ton} Ton`, true],
    ['Volume', `${o.vol_m3 ?? '—'} m³`, true],
    ['Vehicle', o.vehicle ?? '—', false],
    ['Route Plan', o.route_plan_id ?? '—', true],
    ['Notes', o.notes ?? '—', false],
    ['Status', null, false],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {fields.map(([label, value, mono]) => (
        <div key={label}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#8896b3',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 3,
            }}
          >
            {label}
          </div>
          {label === 'Status' ? (
            <StatusBadge status={o.status} outcome={o.delivery_outcome} />
          ) : (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#1a2035',
                fontFamily: mono ? 'DM Mono' : 'DM Sans',
              }}
            >
              {value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Track Driver ─────────────────────────────────────────────────────

interface CustomerTrackProps {
  activeOrder: Order | null
  activePlan: RoutePlan | null
  driverLoc: DriverLocation | null
  drivers: UserProfile[]
  checkpoints: Checkpoint[]
}

function CustomerTrack({
  activeOrder,
  activePlan,
  driverLoc,
  drivers,
  checkpoints,
}: CustomerTrackProps) {
  if (!activeOrder) {
    return (
      <EmptyState
        icon="map"
        title="No Active Shipment"
        sub="Driver tracking is only available while your order is in transit. Check back when your shipment is dispatched."
      />
    )
  }

  const dest = activeOrder.dest
  const cps = checkpoints.filter((c) => c.corridor === dest).sort((a, b) => a.idx - b.idx)
  const curIdx = driverLoc ? driverLoc.checkpoint_idx : 0
  const cur = cps[curIdx] ?? null
  const total = Math.max(cps.length - 1, 1)
  const pct = Math.round((curIdx / total) * 100)
  const isArrived = curIdx >= cps.length - 1 && cps.length > 0

  const driverName = activePlan?.driver_id
    ? drivers.find((d) => d.id === activePlan.driver_id)?.name ?? '—'
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div
        style={{
          background: isArrived
            ? 'linear-gradient(135deg,#14532d,#16a34a)'
            : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
          borderRadius: 12,
          padding: '18px 22px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={isArrived ? 'check' : 'truck'} size={22} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            {isArrived ? 'Shipment Arrived!' : 'Shipment In Transit'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {activeOrder.id} · Bandung → {dest} · Driver: {driverName}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono' }}>
            {pct}%
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>route progress</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8896b3',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 16,
            }}
          >
            Route Progress — Bandung → {dest}
          </div>

          <div
            style={{
              height: 6,
              background: '#f0f2f7',
              borderRadius: 3,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: '#2563eb',
                borderRadius: 3,
                transition: 'width 0.8s ease',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            {cps.map((cp, i) => {
              const done = i < curIdx
              const current = i === curIdx
              return (
                <div
                  key={`${cp.corridor}-${cp.idx}`}
                  style={{ display: 'flex', gap: 14, position: 'relative' }}
                >
                  {i < cps.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 11,
                        top: 24,
                        width: 2,
                        height: '100%',
                        background: done ? '#2563eb' : '#e8ecf4',
                        zIndex: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      flexShrink: 0,
                      zIndex: 1,
                      marginTop: 2,
                      background: current ? '#2563eb' : done ? '#22c55e' : '#e8ecf4',
                      border: current ? '3px solid #93c5fd' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: current ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                    }}
                  >
                    {done && <Icon name="check" size={11} color="#fff" />}
                    {current && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#fff',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: 20, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: current ? 700 : done ? 600 : 400,
                        color: current ? '#1d4ed8' : done ? '#1a2035' : '#94a3b8',
                      }}
                    >
                      {cp.name}
                      {current && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            background: '#eff6ff',
                            color: '#2563eb',
                            padding: '2px 7px',
                            borderRadius: 10,
                            fontWeight: 700,
                          }}
                        >
                          📍 Driver is here
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#8896b3',
                        marginTop: 1,
                        fontFamily: 'DM Mono',
                      }}
                    >
                      {cp.km} km from depot
                      {current && driverLoc && (
                        <span style={{ marginLeft: 8, color: '#6b7fa3' }}>
                          · Last update: {driverLoc.timestamp}
                        </span>
                      )}
                      {current && driverLoc?.note && (
                        <span style={{ marginLeft: 8, fontStyle: 'italic' }}>
                          &quot;{driverLoc.note}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              Current Position
            </div>
            {cur ? (
              <>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: '#1a2035', marginBottom: 6 }}
                >
                  {cur.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#6b7fa3',
                    marginBottom: 4,
                  }}
                >
                  Lat: {cur.lat?.toFixed(4) ?? '—'}°
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#6b7fa3',
                    marginBottom: 12,
                  }}
                >
                  Lng: {cur.lng?.toFixed(4) ?? '—'}°
                </div>
                <div style={{ padding: '8px 10px', background: '#f0f2f7', borderRadius: 7 }}>
                  <div style={{ fontSize: 10, color: '#8896b3', marginBottom: 2 }}>
                    Distance covered
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#2563eb',
                      fontFamily: 'DM Mono',
                    }}
                  >
                    {cur.km} km
                  </div>
                  <div style={{ fontSize: 10, color: '#8896b3' }}>
                    of {cps[cps.length - 1]?.km ?? '—'} km total
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 12 }}>No location data</div>
            )}
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
              Shipment Info
            </div>
            {(
              [
                ['Order', activeOrder.id, true],
                ['Vehicle', activeOrder.vehicle ?? '—', false],
                ['Weight', `${activeOrder.weight_ton} T`, true],
                ['Notes', activeOrder.notes ?? '—', false],
              ] as const
            ).map(([l, v, mono]) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  marginBottom: 7,
                }}
              >
                <span style={{ color: '#8896b3' }}>{l}</span>
                <span
                  style={{
                    color: '#1a2035',
                    fontWeight: 600,
                    fontFamily: mono ? 'DM Mono' : 'DM Sans',
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </Card>
          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              textAlign: 'center',
              padding: '6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse 1.5s infinite',
              }}
            />
            Live · realtime via Supabase
          </div>
        </div>
      </div>
    </div>
  )
}
