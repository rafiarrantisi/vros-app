'use client'

// Manager Live Tracking — added in Revision Round 1 (#6).
// Mirrors the customer track tab pattern (postgres_changes Realtime push) but
// shows ALL active drivers stacked vertically with compact horizontal timelines
// for at-a-glance fleet oversight.

import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { createClient } from '@/lib/supabase/client'
import type {
  Checkpoint,
  DriverLocation,
  RoutePlan,
  UserProfile,
} from '@/lib/types'

type DriverLocMap = Record<string, DriverLocation>

interface LoadedData {
  drivers: UserProfile[]
  plans: RoutePlan[]
  checkpoints: Checkpoint[]
  locs: DriverLocMap
}

const EMPTY: LoadedData = {
  drivers: [],
  plans: [],
  checkpoints: [],
  locs: {},
}

export default function ManagerTrackingPage() {
  const [data, setData] = useState<LoadedData>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    let mounted = true

    const load = async () => {
      const [drvRes, planRes, cpRes, dloc] = await Promise.all([
        sb.from('users').select('*').eq('role', 'driver'),
        sb.from('route_plans').select('*'),
        sb.from('checkpoints').select('*').order('idx', { ascending: true }),
        sb.from('driver_locations').select('*'),
      ])

      const locMap: DriverLocMap = {}
      for (const l of (dloc.data ?? []) as DriverLocation[]) {
        locMap[l.driver_id] = l
      }

      if (!mounted) return
      setData({
        drivers: (drvRes.data ?? []) as UserProfile[],
        plans: (planRes.data ?? []) as RoutePlan[],
        checkpoints: (cpRes.data ?? []) as Checkpoint[],
        locs: locMap,
      })
      setLoading(false)
    }

    load()

    // Realtime: same pattern as customer portal, no per-customer filter.
    const channel = sb
      .channel('manager-dloc')
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

  const activeDrivers = useMemo(() => {
    // A driver is "active" if there's a driver_locations row for them AND
    // their assigned plan is in confirmed/in-transit (i.e. on-trip).
    return data.drivers
      .filter((d) => data.locs[d.id])
      .map((d) => {
        const loc = data.locs[d.id]
        const plan =
          data.plans.find(
            (p) => p.driver_id === d.id && (p.status === 'confirmed' || p.status === 'in-transit'),
          ) ?? null
        return { driver: d, location: loc, plan }
      })
  }, [data])

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 16 }}>
        Live position of every driver currently on a confirmed route. Updates push from Supabase
        Realtime — no refresh needed.
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          padding: '12px 16px',
          background: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="truck" size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {activeDrivers.length} {activeDrivers.length === 1 ? 'driver' : 'drivers'} on the road
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            Real-time position broadcast every checkpoint update
          </div>
        </div>
      </div>

      {activeDrivers.length === 0 ? (
        <EmptyState
          icon="map"
          title="No drivers currently on trip"
          sub="When drivers update their location during an active route, they'll appear here in real time."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeDrivers.map(({ driver, location, plan }) => (
            <DriverTrackCard
              key={driver.id}
              driver={driver}
              location={location}
              plan={plan}
              checkpoints={data.checkpoints}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DriverTrackCardProps {
  driver: UserProfile
  location: DriverLocation
  plan: RoutePlan | null
  checkpoints: Checkpoint[]
}

function DriverTrackCard({ driver, location, plan, checkpoints }: DriverTrackCardProps) {
  const dest = location.dest
  const cps = checkpoints.filter((c) => c.corridor === dest).sort((a, b) => a.idx - b.idx)
  const curIdx = location.checkpoint_idx
  const cur = cps[curIdx] ?? null
  const total = Math.max(cps.length - 1, 1)
  const pct = Math.round((curIdx / total) * 100)
  const isArrived = curIdx >= cps.length - 1 && cps.length > 0

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 18px',
          borderBottom: '1px solid #f0f2f7',
          background: '#fafbfc',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#f59e0b22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: '#f59e0b',
            flexShrink: 0,
          }}
        >
          {driver.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2035' }}>
            {driver.name}{' '}
            <span style={{ fontSize: 11, color: '#8896b3', fontWeight: 500 }}>
              · {driver.username}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'DM Mono', marginTop: 2 }}>
            {plan ? `${plan.id} · ${plan.vehicle}` : 'No active plan'} · Bandung → {dest}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: isArrived ? '#16a34a' : '#2563eb',
              fontFamily: 'DM Mono',
              lineHeight: 1,
            }}
          >
            {pct}%
          </div>
          <div style={{ fontSize: 10, color: '#8896b3', marginTop: 3 }}>
            {isArrived ? 'arrived' : 'progress'}
          </div>
        </div>
      </div>

      {/* Horizontal timeline */}
      <div style={{ padding: '20px 24px 16px' }}>
        {/* Progress bar background */}
        <div
          style={{
            position: 'relative',
            height: 4,
            background: '#e8ecf4',
            borderRadius: 2,
            margin: '0 12px 14px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${pct}%`,
              background: isArrived ? '#22c55e' : '#2563eb',
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }}
          />
        </div>

        {/* Checkpoint dots row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cps.length}, 1fr)`,
            gap: 4,
            marginTop: -22,
          }}
        >
          {cps.map((cp, i) => {
            const done = i < curIdx
            const current = i === curIdx
            return (
              <div
                key={`${cp.corridor}-${cp.idx}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: current ? '#2563eb' : done ? '#22c55e' : '#e8ecf4',
                    border: current ? '3px solid #93c5fd' : 'none',
                    boxShadow: current ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done && <Icon name="check" size={9} color="#fff" />}
                  {current && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#fff',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: current ? 700 : done ? 600 : 400,
                    color: current ? '#1d4ed8' : done ? '#1a2035' : '#94a3b8',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {cp.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#94a3b8',
                    fontFamily: 'DM Mono',
                  }}
                >
                  {cp.km} km
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer: current location detail */}
      {cur && (
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #f0f2f7',
            background: '#fafbfc',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            fontSize: 11,
            color: '#475569',
          }}
        >
          <span style={{ fontWeight: 700, color: '#1a2035' }}>📍 {cur.name}</span>
          <span style={{ color: '#8896b3' }}>· {cur.km} km from depot</span>
          <span style={{ color: '#8896b3', fontFamily: 'DM Mono' }}>
            · Last update: {location.timestamp}
          </span>
          {location.note && (
            <span style={{ fontStyle: 'italic', color: '#6b7fa3' }}>
              · &quot;{location.note}&quot;
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
