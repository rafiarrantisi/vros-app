'use client'

// Admin Customers — ported from Telkom/vros_admin.jsx Admin_Customers.
// CRUD for master customers table. Writes go directly via Supabase under RLS.

import { useEffect, useMemo, useState } from 'react'

import { Badge, type BadgeColor } from '@/components/Badge'
import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { CORRIDORS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/lib/types'

const DEST_COLOR: Record<string, BadgeColor> = {
  Jakarta: 'blue',
  Surabaya: 'purple',
  Malang: 'green',
}

interface FormState {
  id: string
  name: string
  dest: string
  contact: string
}

function emptyForm(nextId: string): FormState {
  return { id: nextId, name: '', dest: 'Jakarta', contact: '' }
}

function customerToForm(c: Customer): FormState {
  return { id: c.id, name: c.name, dest: c.dest, contact: c.contact ?? '' }
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [form, setForm] = useState<FormState>(emptyForm('C01'))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sb = createClient()

  const load = async () => {
    const { data } = await sb.from('customers').select('*').order('id', { ascending: true })
    setCustomers((data ?? []) as Customer[])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      [c.name, c.dest, c.contact ?? ''].join(' ').toLowerCase().includes(q),
    )
  }, [customers, search])

  function nextId(): string {
    return `C${String(customers.length + 1).padStart(2, '0')}`
  }

  function openCreate() {
    setErrorMsg(null)
    setForm(emptyForm(nextId()))
    setModal('create')
  }

  function openEdit(c: Customer) {
    setErrorMsg(null)
    setForm(customerToForm(c))
    setModal('edit')
  }

  const updateField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.name || !form.dest) {
      setErrorMsg('Name and destination required')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)

    const row = {
      id: form.id,
      name: form.name,
      dest: form.dest,
      contact: form.contact || null,
    }

    const { error } =
      modal === 'create'
        ? await sb.from('customers').insert(row)
        : await sb.from('customers').update(row).eq('id', form.id)

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
    const { error } = await sb.from('customers').delete().eq('id', deleteId)
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
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
        <Btn onClick={openCreate} icon="plus">
          Add Customer
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
              {['ID', 'Name', 'Destination', 'Contact', 'Actions'].map((h) => (
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
                  colSpan={5}
                  style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}
                >
                  No customers
                </td>
              </tr>
            )}
            {filtered.map((c, i) => (
              <tr
                key={c.id}
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
                  {c.id}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1a2035',
                  }}
                >
                  {c.name}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <Badge label={c.dest} color={DEST_COLOR[c.dest] ?? 'gray'} />
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {c.contact ?? '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
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
                      onClick={() => setDeleteId(c.id)}
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
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid #f0f2f7',
            fontSize: 11,
            color: '#8896b3',
          }}
        >
          {filtered.length} of {customers.length}
        </div>
      </Card>

      {modal && (
        <Modal
          title={`${modal === 'create' ? 'Add' : 'Edit'} Customer`}
          onClose={() => setModal(null)}
          width={420}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FormInput
              label="Customer Name"
              value={form.name}
              onChange={(v) => updateField('name', v)}
              required
            />
            <FormSelect
              label="Destination"
              value={form.dest}
              onChange={(v) => updateField('dest', v)}
              options={[...CORRIDORS]}
              required
            />
            <FormInput
              label="Contact"
              value={form.contact}
              onChange={(v) => updateField('contact', v)}
              mono
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <Btn onClick={() => setModal(null)} variant="ghost">
              Cancel
            </Btn>
            <Btn onClick={handleSave} icon="save" disabled={submitting}>
              {submitting ? 'Saving…' : modal === 'create' ? 'Add' : 'Save'}
            </Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Customer?" onClose={() => setDeleteId(null)} width={360}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Delete <strong>{customers.find((c) => c.id === deleteId)?.name}</strong>?
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
