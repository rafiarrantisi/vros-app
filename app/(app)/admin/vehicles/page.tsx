'use client'

// Admin Vehicles — ported from Telkom/vros_admin.jsx Admin_Vehicles.
// Writes go directly to Supabase (RLS allows admin role).

import { useEffect, useState } from 'react'

import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { FormInput } from '@/components/FormInput'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle } from '@/lib/types'

interface FormState {
  id: string
  type: string
  brand: string
  year: string
  units: string
  max_weight: string
  max_vol: string
  tire: string
  length: string
  width: string
  height: string
  available: string
}

function emptyForm(nextId: string): FormState {
  return {
    id: nextId,
    type: '',
    brand: 'Isuzu',
    year: '2021',
    units: '1',
    max_weight: '6',
    max_vol: '26.266',
    tire: '6',
    length: '6',
    width: '1.92',
    height: '2.28',
    available: '1',
  }
}

function vehicleToForm(v: Vehicle): FormState {
  return {
    id: v.id,
    type: v.type,
    brand: v.brand ?? '',
    year: v.year?.toString() ?? '',
    units: v.units.toString(),
    max_weight: v.max_weight.toString(),
    max_vol: v.max_vol.toString(),
    tire: v.tire?.toString() ?? '',
    length: v.length?.toString() ?? '',
    width: v.width?.toString() ?? '',
    height: v.height?.toString() ?? '',
    available: v.available.toString(),
  }
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [form, setForm] = useState<FormState>(emptyForm('V01'))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sb = createClient()

  const load = async () => {
    const { data } = await sb.from('vehicles').select('*').order('id', { ascending: true })
    setVehicles((data ?? []) as Vehicle[])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function nextId(): string {
    return `V${String(vehicles.length + 1).padStart(2, '0')}`
  }

  function openCreate() {
    setErrorMsg(null)
    setForm(emptyForm(nextId()))
    setModal('create')
  }

  function openEdit(v: Vehicle) {
    setErrorMsg(null)
    setForm(vehicleToForm(v))
    setModal('edit')
  }

  const updateField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.type) {
      setErrorMsg('Vehicle type required')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)

    const row = {
      id: form.id,
      type: form.type,
      brand: form.brand || null,
      year: form.year ? parseInt(form.year, 10) : null,
      units: parseInt(form.units || '1', 10),
      max_weight: parseFloat(form.max_weight || '0'),
      max_vol: parseFloat(form.max_vol || '0'),
      tire: form.tire ? parseInt(form.tire, 10) : null,
      length: form.length ? parseFloat(form.length) : null,
      width: form.width ? parseFloat(form.width) : null,
      height: form.height ? parseFloat(form.height) : null,
      available: parseInt(form.available || form.units || '1', 10),
    }

    const { error } =
      modal === 'create'
        ? await sb.from('vehicles').insert(row)
        : await sb.from('vehicles').update(row).eq('id', form.id)

    if (error) {
      setErrorMsg(error.message)
      setSubmitting(false)
      return
    }

    setModal(null)
    setSubmitting(false)
    await load()
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await sb.from('vehicles').delete().eq('id', deleteId)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setDeleteId(null)
    await load()
  }

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={openCreate} icon="plus">
          Add Vehicle Type
        </Btn>
      </div>

      {errorMsg && (
        <Card style={{ marginBottom: 14, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{errorMsg}</div>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {[
                'ID',
                'Type',
                'Brand',
                'Year',
                'Units',
                'Max Weight',
                'Max Volume',
                'L×W×H',
                'Avail.',
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
            {vehicles.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}
                >
                  No vehicles
                </td>
              </tr>
            )}
            {vehicles.map((v, i) => (
              <tr
                key={v.id}
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
                    color: '#8896b3',
                  }}
                >
                  {v.id}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a2035',
                  }}
                >
                  {v.type}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>
                  {v.brand ?? '—'}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.year ?? '—'}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.units}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.max_weight}T
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.max_vol.toFixed(3)}m³
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.length ?? '—'}×{v.width ?? '—'}×{v.height ?? '—'}m
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {v.available}/{v.units}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      style={{
                        background: '#eff6ff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 9px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#2563eb',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Icon name="edit" size={11} color="#2563eb" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(v.id)}
                      style={{
                        background: '#fef2f2',
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 9px',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: '#ef4444',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Icon name="trash" size={11} color="#ef4444" />
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal
          title={`${modal === 'create' ? 'Add' : 'Edit'} Vehicle Type`}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormInput
              label="Vehicle Type"
              value={form.type}
              onChange={(v) => updateField('type', v)}
              placeholder="e.g. CDD Box"
              required
            />
            <FormInput
              label="Brand"
              value={form.brand}
              onChange={(v) => updateField('brand', v)}
            />
            <FormInput
              label="Year"
              value={form.year}
              onChange={(v) => updateField('year', v)}
              type="number"
              mono
            />
            <FormInput
              label="Total Units"
              value={form.units}
              onChange={(v) => updateField('units', v)}
              type="number"
              mono
            />
            <FormInput
              label="Available"
              value={form.available}
              onChange={(v) => updateField('available', v)}
              type="number"
              mono
            />
            <FormInput
              label="Max Weight (T)"
              value={form.max_weight}
              onChange={(v) => updateField('max_weight', v)}
              type="number"
              mono
              required
            />
            <FormInput
              label="Max Volume (m³)"
              value={form.max_vol}
              onChange={(v) => updateField('max_vol', v)}
              type="number"
              mono
              required
            />
            <FormInput
              label="Length (m)"
              value={form.length}
              onChange={(v) => updateField('length', v)}
              type="number"
              mono
            />
            <FormInput
              label="Width (m)"
              value={form.width}
              onChange={(v) => updateField('width', v)}
              type="number"
              mono
            />
            <FormInput
              label="Height (m)"
              value={form.height}
              onChange={(v) => updateField('height', v)}
              type="number"
              mono
            />
            <FormInput
              label="Tire"
              value={form.tire}
              onChange={(v) => updateField('tire', v)}
              type="number"
              mono
            />
          </div>
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}
          >
            <Btn onClick={() => setModal(null)} variant="ghost">
              Cancel
            </Btn>
            <Btn onClick={handleSave} icon="save" disabled={submitting}>
              {submitting ? 'Saving…' : modal === 'create' ? 'Add Vehicle' : 'Save'}
            </Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Vehicle?" onClose={() => setDeleteId(null)} width={360}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Delete <strong>{vehicles.find((v) => v.id === deleteId)?.type}</strong>?
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
