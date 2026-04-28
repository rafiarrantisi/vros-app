'use client'

// Manager Delivery Status — list of confirmed/in-transit route plans.
// Manager dapat:
//   1. Assign driver ke plan yang baru di-confirm (status auto-flip jadi in-transit)
//   2. Ganti / lepas driver (reassign atau unassign)
//   3. Tandai outcome akhir (on-time / late) saat pengiriman selesai

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/Badge'
import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { FormSelect } from '@/components/FormSelect'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import type { DeliveryOutcome, Order, RoutePlan, UserProfile } from '@/lib/types'

interface AssignModalState {
  plan: RoutePlan
  selectedDriver: string
}

export default function ManagerDeliveryPage() {
  const [plans, setPlans] = useState<RoutePlan[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sb = createClient()

  const load = async () => {
    const [planRes, orderRes, driverRes] = await Promise.all([
      sb.from('route_plans').select('*').order('created_at', { ascending: true }),
      sb.from('orders').select('*'),
      sb.from('users').select('*').eq('role', 'driver').order('username', { ascending: true }),
    ])
    setPlans((planRes.data ?? []) as RoutePlan[])
    setOrders((orderRes.data ?? []) as Order[])
    setDrivers((driverRes.data ?? []) as UserProfile[])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actionable = plans.filter((p) => p.status === 'in-transit' || p.status === 'confirmed')

  const driverById = useMemo(() => {
    const m = new Map<string, UserProfile>()
    for (const d of drivers) m.set(d.id, d)
    return m
  }, [drivers])

  // For each driver, count active plans excluding the one being modified — used
  // to show "sudah pegang RP-XX" warning di modal.
  function activePlansForDriver(driverId: string, excludePlanId?: string): RoutePlan[] {
    return plans.filter(
      (p) =>
        p.driver_id === driverId &&
        (p.status === 'confirmed' || p.status === 'in-transit') &&
        p.id !== excludePlanId,
    )
  }

  async function handleAssign() {
    if (!assignModal) return
    const { plan, selectedDriver } = assignModal
    if (!selectedDriver) {
      setErrorMsg('Pilih driver terlebih dahulu.')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)

    // 1. Update route plan: driver_id + auto-flip ke in-transit. Reassign juga
    //    aman karena dari actionable filter, plan.status hanya 'confirmed' atau
    //    'in-transit', dan target akhirnya selalu 'in-transit'.
    const { error: planErr } = await sb
      .from('route_plans')
      .update({ driver_id: selectedDriver, status: 'in-transit' })
      .eq('id', plan.id)
    if (planErr) {
      setErrorMsg(`Gagal assign driver: ${planErr.message}`)
      setSubmitting(false)
      return
    }

    // 2. Update semua orders di plan ini: driver_id + status sinkron
    const { error: orderErr } = await sb
      .from('orders')
      .update({ driver_id: selectedDriver, status: 'in-transit' })
      .in('id', plan.order_ids)
    if (orderErr) {
      setErrorMsg(`Gagal update orders: ${orderErr.message}`)
      setSubmitting(false)
      return
    }

    setAssignModal(null)
    setSubmitting(false)
    await load()
  }

  async function handleUnassign() {
    if (!assignModal) return
    const { plan } = assignModal
    setSubmitting(true)
    setErrorMsg(null)

    // Revert plan: driver_id null + status balik ke confirmed (kalau sebelumnya
    // in-transit hasil auto-flip).
    const { error: planErr } = await sb
      .from('route_plans')
      .update({ driver_id: null, status: 'confirmed' })
      .eq('id', plan.id)
    if (planErr) {
      setErrorMsg(`Gagal lepas driver: ${planErr.message}`)
      setSubmitting(false)
      return
    }

    const { error: orderErr } = await sb
      .from('orders')
      .update({ driver_id: null, status: 'confirmed' })
      .in('id', plan.order_ids)
    if (orderErr) {
      setErrorMsg(`Gagal update orders: ${orderErr.message}`)
      setSubmitting(false)
      return
    }

    setAssignModal(null)
    setSubmitting(false)
    await load()
  }

  async function handleOutcome(plan: RoutePlan, outcome: DeliveryOutcome) {
    setErrorMsg(null)
    const { error: planErr } = await sb
      .from('route_plans')
      .update({ status: 'delivered' })
      .eq('id', plan.id)
    if (planErr) {
      setErrorMsg(`Gagal update plan: ${planErr.message}`)
      return
    }

    const { error: orderErr } = await sb
      .from('orders')
      .update({ status: 'delivered', delivery_outcome: outcome })
      .in('id', plan.order_ids)
    if (orderErr) {
      setErrorMsg(`Gagal update orders: ${orderErr.message}`)
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
          Assign driver ke route plan baru, lalu update outcome saat pengiriman selesai.
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
            const assignedDriver = plan.driver_id ? driverById.get(plan.driver_id) : null
            const isInTransit = plan.status === 'in-transit'
            return (
              <Card key={plan.id} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Top row: plan info + status badge */}
                <div
                  style={{
                    display: 'flex',
                    gap: 18,
                    padding: '16px 18px 12px',
                    alignItems: 'flex-start',
                  }}
                >
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
                  <Badge
                    label={isInTransit ? 'In Transit' : 'Confirmed'}
                    color={isInTransit ? 'blue' : 'purple'}
                  />
                </div>

                {/* Driver row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    background: assignedDriver ? '#f8fafc' : '#fffbeb',
                    borderTop: '1px solid #f0f2f7',
                  }}
                >
                  {assignedDriver ? (
                    <>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#f59e0b22',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#f59e0b',
                          flexShrink: 0,
                        }}
                      >
                        {assignedDriver.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2035' }}>
                          {assignedDriver.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#8896b3', fontFamily: 'DM Mono' }}>
                          {assignedDriver.username}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignModal({ plan, selectedDriver: assignedDriver.id })
                        }
                        style={{
                          background: 'transparent',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          padding: '5px 12px',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: '#475569',
                          fontWeight: 600,
                          fontFamily: 'DM Sans',
                        }}
                      >
                        Ganti
                      </button>
                    </>
                  ) : (
                    <>
                      <Icon name="alert" size={14} color="#d97706" />
                      <div style={{ flex: 1, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                        Belum di-assign driver
                      </div>
                      <Btn
                        onClick={() => setAssignModal({ plan, selectedDriver: '' })}
                        size="sm"
                        icon="users"
                      >
                        Assign Driver
                      </Btn>
                    </>
                  )}
                </div>

                {/* Outcome row — only show when in-transit (i.e. driver assigned) */}
                {isInTransit && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 18px',
                      borderTop: '1px solid #f0f2f7',
                      background: '#fff',
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 11, color: '#8896b3' }}>
                      Pengiriman selesai? Tandai outcome akhirnya:
                    </div>
                    <Btn
                      onClick={() => handleOutcome(plan, 'on-time')}
                      variant="success"
                      size="sm"
                      icon="check"
                    >
                      On-Time
                    </Btn>
                    <Btn
                      onClick={() => handleOutcome(plan, 'late')}
                      variant="danger"
                      size="sm"
                      icon="alert"
                    >
                      Late
                    </Btn>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {assignModal && (
        <AssignDriverModal
          state={assignModal}
          drivers={drivers}
          activePlansForDriver={activePlansForDriver}
          onChange={(selectedDriver) =>
            setAssignModal({ ...assignModal, selectedDriver })
          }
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onClose={() => setAssignModal(null)}
          submitting={submitting}
        />
      )}
    </div>
  )
}

interface AssignDriverModalProps {
  state: AssignModalState
  drivers: UserProfile[]
  activePlansForDriver: (driverId: string, excludePlanId?: string) => RoutePlan[]
  onChange: (driverId: string) => void
  onAssign: () => void
  onUnassign: () => void
  onClose: () => void
  submitting: boolean
}

function AssignDriverModal({
  state,
  drivers,
  activePlansForDriver,
  onChange,
  onAssign,
  onUnassign,
  onClose,
  submitting,
}: AssignDriverModalProps) {
  const { plan, selectedDriver } = state
  const isReassign = !!plan.driver_id
  const conflicts = selectedDriver ? activePlansForDriver(selectedDriver, plan.id) : []

  return (
    <Modal
      title={isReassign ? `Ganti Driver — ${plan.id}` : `Assign Driver — ${plan.id}`}
      onClose={onClose}
      width={460}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
          Rute: <strong>Bandung → {plan.sequence.join(' → ')} → Bandung</strong>
          <br />
          Kendaraan: <strong>{plan.vehicle}</strong> · {plan.distance} km · {plan.order_ids.length}{' '}
          order
        </div>

        <FormSelect
          label="Pilih Driver"
          value={selectedDriver}
          onChange={onChange}
          options={[
            { value: '', label: '— Pilih Driver —' },
            ...drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.username})` })),
          ]}
          required
        />

        {conflicts.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 11,
              color: '#92400e',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <Icon name="alert" size={13} color="#d97706" />
            <div>
              <strong>Driver ini sudah memegang plan aktif lain:</strong>{' '}
              {conflicts.map((p) => p.id).join(', ')}.
              <br />
              Tetap bisa di-assign — manager memutuskan apakah driver bisa handle dua plan
              sekaligus.
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: isReassign ? 'space-between' : 'flex-end',
          gap: 10,
          marginTop: 18,
          alignItems: 'center',
        }}
      >
        {isReassign && (
          <button
            type="button"
            onClick={onUnassign}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: '1px solid #fca5a5',
              borderRadius: 7,
              padding: '7px 13px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 11,
              color: '#dc2626',
              fontWeight: 600,
              fontFamily: 'DM Sans',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon name="x" size={11} color="#dc2626" />
            Lepas Assignment
          </button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={onClose} variant="ghost">
            Batal
          </Btn>
          <Btn onClick={onAssign} icon="save" disabled={submitting || !selectedDriver}>
            {submitting ? 'Menyimpan…' : isReassign ? 'Simpan' : 'Assign'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
