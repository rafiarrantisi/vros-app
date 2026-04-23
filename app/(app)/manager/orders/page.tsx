'use client'

// Manager Orders — ported from Telkom/vros_staff.jsx Staff_Orders.
// Handlers onCreate/onUpdate/onDelete → inline Supabase mutations.

import { useEffect, useState } from 'react'

import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { StatusBadge } from '@/components/Badge'
import { TODAY } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Customer, Order, OrderStatus } from '@/lib/types'

type FilterStatus = 'all' | OrderStatus

const CITIES = ['Jakarta', 'Surabaya', 'Malang'] as const
const FILTERS: FilterStatus[] = ['all', 'pending', 'confirmed', 'in-transit', 'delivered']

// Form uses cm/kg for UI convenience; converts to m/ton on submit.
interface FormState {
  id: string
  customer_id: string
  customer: string
  dest: string
  weight_kg: string
  length_cm: string
  width_cm: string
  height_cm: string
  vol_m3: number
  notes: string
}

const EMPTY_FORM: FormState = {
  id: '',
  customer_id: '',
  customer: '',
  dest: 'Jakarta',
  weight_kg: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  vol_m3: 0,
  notes: '',
}

function nextOrderId(existingCount: number): string {
  return `PO-2026-${String(existingCount + 1).padStart(3, '0')}`
}

function computeVol(lengthCm: string, widthCm: string, heightCm: string): number {
  const l = parseFloat(lengthCm) || 0
  const w = parseFloat(widthCm) || 0
  const h = parseFloat(heightCm) || 0
  return parseFloat((l * w * h / 1e6).toFixed(4))
}

function destColor(dest: string): string {
  if (dest === 'Jakarta') return '#2563eb'
  if (dest === 'Surabaya') return '#8b5cf6'
  return '#10b981'
}

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sb = createClient()

  const load = async () => {
    const [ordersRes, custRes] = await Promise.all([
      sb.from('orders').select('*').order('created_at', { ascending: true }),
      sb.from('customers').select('*').order('id', { ascending: true }),
    ])
    setOrders((ordersRes.data ?? []) as Order[])
    setCustomers((custRes.data ?? []) as Customer[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, id: nextOrderId(orders.length) })
    setEditTarget(null)
    setModal('create')
  }

  const openEdit = (o: Order) => {
    setForm({
      id: o.id,
      customer_id: o.customer_id,
      customer: o.customer,
      dest: o.dest,
      weight_kg: String(Math.round(o.weight_ton * 1000)),
      length_cm: String(Math.round((o.length_m ?? 0) * 100)),
      width_cm: String(Math.round((o.width_m ?? 0) * 100)),
      height_cm: String(Math.round((o.height_m ?? 0) * 100)),
      vol_m3: o.vol_m3 ?? 0,
      notes: o.notes ?? '',
    })
    setEditTarget(o.id)
    setModal('edit')
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'length_cm' || key === 'width_cm' || key === 'height_cm') {
        next.vol_m3 = computeVol(next.length_cm, next.width_cm, next.height_cm)
      }
      if (key === 'customer_id') {
        const c = customers.find((x) => x.id === value)
        if (c) {
          next.customer = c.name
          next.dest = c.dest
        }
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!form.customer || !form.weight_kg) return

    const weightTon = parseFloat((parseFloat(form.weight_kg || '0') / 1000).toFixed(3))
    const lengthM = parseFloat((parseFloat(form.length_cm || '0') / 100).toFixed(2))
    const widthM = parseFloat((parseFloat(form.width_cm || '0') / 100).toFixed(2))
    const heightM = parseFloat((parseFloat(form.height_cm || '0') / 100).toFixed(2))

    if (modal === 'create') {
      const row = {
        id: form.id,
        customer_id: form.customer_id || null,
        customer: form.customer,
        dest: form.dest,
        weight_ton: weightTon,
        length_m: lengthM,
        width_m: widthM,
        height_m: heightM,
        vol_m3: form.vol_m3,
        notes: form.notes || null,
        status: 'pending' as const,
        delivery_outcome: null,
        date: TODAY,
        vehicle: null,
        route_plan_id: null,
      }
      const { error } = await sb.from('orders').insert(row)
      if (error) {
        alert(`Insert failed: ${error.message}`)
        return
      }
    } else if (modal === 'edit' && editTarget) {
      const patch = {
        customer_id: form.customer_id || null,
        customer: form.customer,
        dest: form.dest,
        weight_ton: weightTon,
        length_m: lengthM,
        width_m: widthM,
        height_m: heightM,
        vol_m3: form.vol_m3,
        notes: form.notes || null,
      }
      const { error } = await sb.from('orders').update(patch).eq('id', editTarget)
      if (error) {
        alert(`Update failed: ${error.message}`)
        return
      }
    }
    setModal(null)
    await load()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await sb.from('orders').delete().eq('id', deleteId)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    setDeleteId(null)
    await load()
  }

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchQuery =
      !search ||
      [o.id, o.customer, o.dest].join(' ').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchQuery
  })

  const canEdit = (o: Order) => o.status === 'pending'
  const canDelete = (o: Order) => o.status === 'pending'

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO, customer, destination…"
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
            onClick={() => setFilterStatus(f)}
            style={{
              padding: '7px 13px',
              borderRadius: 7,
              border: '1.5px solid',
              borderColor: filterStatus === f ? '#3b82f6' : '#e2e8f0',
              background: filterStatus === f ? '#eff6ff' : '#fff',
              color: filterStatus === f ? '#1d4ed8' : '#64748b',
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
        <Btn onClick={openCreate} icon="plus">
          New Order
        </Btn>
      </div>

      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[
                'PO Number',
                'Customer',
                'Destination',
                'Date',
                'Weight',
                'Volume',
                'Notes',
                'Status',
                'Actions',
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
                <td
                  colSpan={9}
                  style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}
                >
                  No orders found
                </td>
              </tr>
            )}
            {filtered.map((o, i) => (
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
                    fontWeight: 600,
                    color: '#2563eb',
                  }}
                >
                  {o.id}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#1a2035',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.customer}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: destColor(o.dest),
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
                  {o.vol_m3 ?? 0} m³
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    color: '#8896b3',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.notes || '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <StatusBadge status={o.status} outcome={o.delivery_outcome} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {canEdit(o) && (
                      <button
                        type="button"
                        onClick={() => openEdit(o)}
                        style={{
                          background: '#eff6ff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        <Icon name="edit" size={12} color="#2563eb" />
                        Edit
                      </button>
                    )}
                    {canDelete(o) && (
                      <button
                        type="button"
                        onClick={() => setDeleteId(o.id)}
                        style={{
                          background: '#fef2f2',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        <Icon name="trash" size={12} color="#ef4444" />
                        Del
                      </button>
                    )}
                  </div>
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
          {filtered.length} of {orders.length} orders
        </div>
      </Card>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'create' ? 'Create Delivery Order' : 'Edit Delivery Order'}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormInput label="PO Number" value={form.id} onChange={() => {}} readOnly mono />
            <FormSelect
              label="Destination"
              value={form.dest}
              onChange={(v) => updateField('dest', v)}
              options={[...CITIES]}
              required
            />
            <div style={{ gridColumn: '1/-1' }}>
              <FormSelect
                label="Customer"
                value={form.customer_id}
                onChange={(v) => updateField('customer_id', v)}
                options={[
                  { value: '', label: '— Select Customer —' },
                  ...customers.map((c) => ({ value: c.id, label: c.name })),
                ]}
                required
              />
            </div>
            {!form.customer_id && (
              <div style={{ gridColumn: '1/-1' }}>
                <FormInput
                  label="Customer Name (manual)"
                  value={form.customer}
                  onChange={(v) => updateField('customer', v)}
                  placeholder="e.g. PT. Baru Jaya"
                  required
                />
              </div>
            )}
            <FormInput
              label="Weight (kg)"
              value={form.weight_kg}
              onChange={(v) => updateField('weight_kg', v)}
              type="number"
              placeholder="0"
              mono
              required
            />
            <FormInput
              label="Auto Volume (m³)"
              value={form.vol_m3 ? String(form.vol_m3) : '—'}
              onChange={() => {}}
              readOnly
              mono
            />
            <FormInput
              label="Length (cm)"
              value={form.length_cm}
              onChange={(v) => updateField('length_cm', v)}
              type="number"
              placeholder="0"
              mono
            />
            <FormInput
              label="Width (cm)"
              value={form.width_cm}
              onChange={(v) => updateField('width_cm', v)}
              type="number"
              placeholder="0"
              mono
            />
            <FormInput
              label="Height (cm)"
              value={form.height_cm}
              onChange={(v) => updateField('height_cm', v)}
              type="number"
              placeholder="0"
              mono
            />
            <div
              style={{
                gridColumn: '1/-1',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6b7fa3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Special instructions…"
                rows={2}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 13,
                  fontFamily: 'DM Sans',
                  color: '#1a2035',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 18,
            }}
          >
            <Btn onClick={() => setModal(null)} variant="ghost">
              Cancel
            </Btn>
            <Btn onClick={handleSubmit} icon="save">
              {modal === 'create' ? 'Create Order' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Modal title="Delete Order?" onClose={() => setDeleteId(null)} width={380}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Are you sure you want to delete{' '}
            <strong style={{ fontFamily: 'DM Mono' }}>{deleteId}</strong>? This action cannot
            be undone.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn onClick={() => setDeleteId(null)} variant="ghost">
              Cancel
            </Btn>
            <Btn onClick={handleDelete} variant="danger" icon="trash">
              Delete
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
