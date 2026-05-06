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

// Form captures per-product weight and per-packaging dimensions; totals auto-
// computed and shown read-only. On submit, totals are stored in weight_ton/vol_m3
// (the columns CVRP reads) alongside the per-unit breakdown.
interface FormState {
  id: string
  customer_id: string
  customer: string
  dest: string
  weight_per_product_kg: string
  quantity: string
  length_per_pkg_m: string
  width_per_pkg_m: string
  height_per_pkg_m: string
  total_packaging: string
  // Derived/display only — recomputed via deriveTotals() in updateField.
  total_weight_kg: number
  total_vol_m3: number
  notes: string
}

const EMPTY_FORM: FormState = {
  id: '',
  customer_id: '',
  customer: '',
  dest: 'Jakarta',
  weight_per_product_kg: '',
  quantity: '1',
  length_per_pkg_m: '',
  width_per_pkg_m: '',
  height_per_pkg_m: '',
  total_packaging: '1',
  total_weight_kg: 0,
  total_vol_m3: 0,
  notes: '',
}

function nextOrderId(existingCount: number): string {
  return `PO-2026-${String(existingCount + 1).padStart(3, '0')}`
}

function deriveTotals(f: FormState): { total_weight_kg: number; total_vol_m3: number } {
  const wpp = parseFloat(f.weight_per_product_kg) || 0
  const qty = parseFloat(f.quantity) || 0
  const l = parseFloat(f.length_per_pkg_m) || 0
  const w = parseFloat(f.width_per_pkg_m) || 0
  const h = parseFloat(f.height_per_pkg_m) || 0
  const pkg = parseFloat(f.total_packaging) || 0
  return {
    total_weight_kg: parseFloat((wpp * qty).toFixed(2)),
    total_vol_m3: parseFloat((l * w * h * pkg).toFixed(4)),
  }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, id: nextOrderId(orders.length) })
    setEditTarget(null)
    setModal('create')
  }

  const openEdit = (o: Order) => {
    const next: FormState = {
      id: o.id,
      customer_id: o.customer_id,
      customer: o.customer,
      dest: o.dest,
      weight_per_product_kg: String(o.weight_per_product_kg ?? ''),
      quantity: String(o.quantity ?? 1),
      length_per_pkg_m: String(o.length_per_pkg_m ?? ''),
      width_per_pkg_m: String(o.width_per_pkg_m ?? ''),
      height_per_pkg_m: String(o.height_per_pkg_m ?? ''),
      total_packaging: String(o.total_packaging ?? 1),
      total_weight_kg: 0,
      total_vol_m3: 0,
      notes: o.notes ?? '',
    }
    const totals = deriveTotals(next)
    setForm({ ...next, ...totals })
    setEditTarget(o.id)
    setModal('edit')
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      const dimensionKey =
        key === 'weight_per_product_kg' ||
        key === 'quantity' ||
        key === 'length_per_pkg_m' ||
        key === 'width_per_pkg_m' ||
        key === 'height_per_pkg_m' ||
        key === 'total_packaging'
      if (dimensionKey) {
        const t = deriveTotals(next)
        next.total_weight_kg = t.total_weight_kg
        next.total_vol_m3 = t.total_vol_m3
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
    if (!form.customer_id) {
      alert(
        'Customer wajib dipilih dari daftar. Jika belum ada, tambahkan dulu di Admin > Customer Master.',
      )
      return
    }
    if (!form.weight_per_product_kg || !form.quantity) return

    const totals = deriveTotals(form)
    const weightTon = parseFloat((totals.total_weight_kg / 1000).toFixed(3))
    const volM3 = totals.total_vol_m3
    const lengthM = parseFloat(form.length_per_pkg_m) || 0
    const widthM = parseFloat(form.width_per_pkg_m) || 0
    const heightM = parseFloat(form.height_per_pkg_m) || 0
    const wpp = parseFloat(form.weight_per_product_kg) || 0
    const qty = parseInt(form.quantity, 10) || 1
    const pkg = parseInt(form.total_packaging, 10) || 1

    const baseRow = {
      customer_id: form.customer_id || null,
      customer: form.customer,
      dest: form.dest,
      weight_ton: weightTon,
      length_m: lengthM,
      width_m: widthM,
      height_m: heightM,
      vol_m3: volM3,
      weight_per_product_kg: wpp,
      quantity: qty,
      length_per_pkg_m: lengthM,
      width_per_pkg_m: widthM,
      height_per_pkg_m: heightM,
      total_packaging: pkg,
      notes: form.notes || null,
    }

    if (modal === 'create') {
      const row = {
        id: form.id,
        ...baseRow,
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
      const { error } = await sb.from('orders').update(baseRow).eq('id', editTarget)
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
              <div
                style={{
                  gridColumn: '1/-1',
                  padding: '10px 12px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#92400e',
                  lineHeight: 1.5,
                }}
              >
                Customer wajib dipilih dari daftar di atas. Bila belum terdaftar, tambahkan dulu
                lewat menu <strong>Admin &gt; Customer Master</strong>, lalu kembali ke form ini.
              </div>
            )}
            <FormInput
              label="Weight / Product (kg)"
              value={form.weight_per_product_kg}
              onChange={(v) => updateField('weight_per_product_kg', v)}
              type="number"
              placeholder="0"
              mono
              required
            />
            <FormInput
              label="Quantity"
              value={form.quantity}
              onChange={(v) => updateField('quantity', v)}
              type="number"
              placeholder="1"
              mono
              required
            />
            <FormInput
              label="Total Weight (kg)"
              value={form.total_weight_kg ? String(form.total_weight_kg) : '—'}
              onChange={() => {}}
              readOnly
              mono
            />
            <FormInput
              label="Total Volume (m³)"
              value={form.total_vol_m3 ? String(form.total_vol_m3) : '—'}
              onChange={() => {}}
              readOnly
              mono
            />
            <FormInput
              label="Length / Packaging (m)"
              value={form.length_per_pkg_m}
              onChange={(v) => updateField('length_per_pkg_m', v)}
              type="number"
              placeholder="0"
              mono
            />
            <FormInput
              label="Width / Packaging (m)"
              value={form.width_per_pkg_m}
              onChange={(v) => updateField('width_per_pkg_m', v)}
              type="number"
              placeholder="0"
              mono
            />
            <FormInput
              label="Height / Packaging (m)"
              value={form.height_per_pkg_m}
              onChange={(v) => updateField('height_per_pkg_m', v)}
              type="number"
              placeholder="0"
              mono
            />
            <FormInput
              label="Total Packaging"
              value={form.total_packaging}
              onChange={(v) => updateField('total_packaging', v)}
              type="number"
              placeholder="1"
              mono
              required
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
