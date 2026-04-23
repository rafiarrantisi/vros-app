'use client'

// Admin Accounts — ported from Telkom/vros_admin.jsx Admin_Accounts + AccountTable.
// Three sub-tabs: internal (manager/admin), customer, driver.
// Writes go through /api/admin/users (service-role required for auth.users CRUD).

import { useEffect, useMemo, useState } from 'react'

import { Badge, type BadgeColor } from '@/components/Badge'
import { Btn } from '@/components/Btn'
import { Card } from '@/components/Card'
import { FormInput } from '@/components/FormInput'
import { FormSelect } from '@/components/FormSelect'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile, UserRole } from '@/lib/types'

type AccountType = 'internal' | 'customer' | 'driver'

const ROLE_COLOR: Record<UserRole, BadgeColor> = {
  manager: 'blue',
  admin: 'red',
  customer: 'purple',
  driver: 'yellow',
}
const ROLE_LABEL: Record<UserRole, string> = {
  manager: 'Operational Manager',
  admin: 'Administrator',
  customer: 'Customer',
  driver: 'Driver',
}

interface FormState {
  id: string
  username: string
  password: string
  name: string
  role: UserRole
  customer_id: string
  vehicle_id: string
  assigned_plan_id: string
}

function emptyForm(type: AccountType): FormState {
  return {
    id: '',
    username: '',
    password: '',
    name: '',
    role: type === 'internal' ? 'manager' : type,
    customer_id: '',
    vehicle_id: '',
    assigned_plan_id: '',
  }
}

export default function AdminAccountsPage() {
  const [tab, setTab] = useState<AccountType>('internal')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const sb = createClient()

  const load = async () => {
    const { data } = await sb.from('users').select('*').order('username', { ascending: true })
    setUsers((data ?? []) as UserProfile[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { internal, customers, drivers } = useMemo(() => {
    return {
      internal: users.filter((u) => u.role === 'manager' || u.role === 'admin'),
      customers: users.filter((u) => u.role === 'customer'),
      drivers: users.filter((u) => u.role === 'driver'),
    }
  }, [users])

  const tabs: Array<{ id: AccountType; label: string; color: string }> = [
    { id: 'internal', label: `Internal (${internal.length})`, color: '#2563eb' },
    { id: 'customer', label: `Customers (${customers.length})`, color: '#8b5cf6' },
    { id: 'driver', label: `Drivers (${drivers.length})`, color: '#f59e0b' },
  ]

  const activeList = tab === 'internal' ? internal : tab === 'customer' ? customers : drivers

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: '#fff',
          padding: 4,
          borderRadius: 10,
          border: '1px solid #e8ecf4',
          width: 'fit-content',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 18px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              background: tab === t.id ? t.color : 'transparent',
              color: tab === t.id ? '#fff' : '#6b7fa3',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'DM Sans',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <Card style={{ marginBottom: 14, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{errorMsg}</div>
        </Card>
      )}

      <AccountTable
        type={tab}
        users={activeList}
        allUsers={users}
        reload={load}
        setError={setErrorMsg}
      />
    </div>
  )
}

// ── AccountTable ─────────────────────────────────────────────────────

interface AccountTableProps {
  type: AccountType
  users: UserProfile[]
  allUsers: UserProfile[]
  reload: () => Promise<void>
  setError: (msg: string | null) => void
}

function AccountTable({ type, users, allUsers, reload, setError }: AccountTableProps) {
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null)
  const [form, setForm] = useState<FormState>(emptyForm(type))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const headers: string[] =
    type === 'internal'
      ? ['ID', 'Name', 'Username', 'Role', 'Actions']
      : type === 'customer'
        ? ['ID', 'Name', 'Username', 'Customer ID', 'Actions']
        : ['ID', 'Name', 'Username', 'Vehicle', 'Assigned Plan', 'Actions']

  function nextSyntheticId(): string {
    const prefix = type === 'internal' ? 'U' : type === 'customer' ? 'CU' : 'D'
    const count = allUsers.filter((u) => u.username.startsWith(prefix.toLowerCase())).length + 1
    return `${prefix}${String(count).padStart(2, '0')}`
  }

  function openCreate() {
    setError(null)
    setForm({
      ...emptyForm(type),
      id: nextSyntheticId(),
    })
    setModal('create')
  }

  function openEdit(u: UserProfile) {
    setError(null)
    setForm({
      id: u.id,
      username: u.username,
      password: '',
      name: u.name,
      role: u.role,
      customer_id: u.customer_id ?? '',
      vehicle_id: u.vehicle_id ?? '',
      assigned_plan_id: u.assigned_plan_id ?? '',
    })
    setModal('edit')
  }

  const updateField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.username || !form.name) return
    if (modal === 'create' && !form.password) {
      setError('Password required for new accounts')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (modal === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            name: form.name,
            role: form.role,
            customer_id: type === 'customer' ? form.customer_id || null : null,
            vehicle_id: type === 'driver' ? form.vehicle_id || null : null,
            assigned_plan_id: type === 'driver' ? form.assigned_plan_id || null : null,
          }),
        })
        const body = await res.json()
        if (!body.success) {
          setError(body.error ?? 'Create failed')
          setSubmitting(false)
          return
        }
      } else if (modal === 'edit') {
        const patch: Record<string, unknown> = {
          id: form.id,
          username: form.username,
          name: form.name,
          role: form.role,
        }
        if (form.password) patch.password = form.password
        if (type === 'customer') patch.customer_id = form.customer_id || null
        if (type === 'driver') {
          patch.vehicle_id = form.vehicle_id || null
          patch.assigned_plan_id = form.assigned_plan_id || null
        }
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const body = await res.json()
        if (!body.success) {
          setError(body.error ?? 'Update failed')
          setSubmitting(false)
          return
        }
      }
      setModal(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    setError(null)
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(deleteId)}`, {
      method: 'DELETE',
    })
    const body = await res.json()
    if (!body.success) {
      setError(body.error ?? 'Delete failed')
      return
    }
    setDeleteId(null)
    await reload()
  }

  const modalTitle =
    type === 'internal' ? 'Staff/Manager' : type === 'customer' ? 'Customer' : 'Driver'

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn onClick={openCreate} icon="plus">
          {type === 'internal'
            ? 'Add Staff/Manager'
            : type === 'customer'
              ? 'Add Customer Account'
              : 'Add Driver Account'}
        </Btn>
      </div>

      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h) => (
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
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}
                >
                  No accounts
                </td>
              </tr>
            )}
            {users.map((u, i) => (
              <tr
                key={u.id}
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
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.id.slice(0, 8)}…
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1a2035',
                  }}
                >
                  {u.name}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'DM Mono',
                    color: '#475569',
                  }}
                >
                  {u.username}
                </td>
                {type === 'internal' && (
                  <td style={{ padding: '10px 14px' }}>
                    <Badge label={ROLE_LABEL[u.role]} color={ROLE_COLOR[u.role]} />
                  </td>
                )}
                {type === 'customer' && (
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontFamily: 'DM Mono',
                      color: '#6b7fa3',
                    }}
                  >
                    {u.customer_id || '—'}
                  </td>
                )}
                {type === 'driver' && (
                  <>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#475569' }}>
                      {u.vehicle_id || '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        fontFamily: 'DM Mono',
                        color: '#6b7fa3',
                      }}
                    >
                      {u.assigned_plan_id || '—'}
                    </td>
                  </>
                )}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
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
                      onClick={() => setDeleteId(u.id)}
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
          {users.length} accounts
        </div>
      </Card>

      {modal && (
        <Modal
          title={`${modal === 'create' ? 'Add' : 'Edit'} ${modalTitle} Account`}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormInput
              label="Full Name"
              value={form.name}
              onChange={(v) => updateField('name', v)}
              placeholder="Full name"
              required
            />
            <FormInput
              label="Username"
              value={form.username}
              onChange={(v) => updateField('username', v)}
              placeholder="Login username"
              required
              mono
            />
            <FormInput
              label="Password"
              value={form.password}
              onChange={(v) => updateField('password', v)}
              placeholder={modal === 'edit' ? 'Leave blank to keep' : 'New password'}
              type="password"
              required={modal === 'create'}
            />
            {type === 'internal' && (
              <FormSelect
                label="Role"
                value={form.role}
                onChange={(v) => updateField('role', v as UserRole)}
                options={[
                  { value: 'manager', label: 'Operational Manager' },
                  { value: 'admin', label: 'Administrator' },
                ]}
                required
              />
            )}
            {type === 'customer' && (
              <FormInput
                label="Customer ID"
                value={form.customer_id}
                onChange={(v) => updateField('customer_id', v)}
                placeholder="e.g. C01"
                mono
              />
            )}
            {type === 'driver' && (
              <>
                <FormInput
                  label="Vehicle Unit ID"
                  value={form.vehicle_id}
                  onChange={(v) => updateField('vehicle_id', v)}
                  placeholder="e.g. V01"
                  mono
                />
                <FormInput
                  label="Assigned Plan ID"
                  value={form.assigned_plan_id}
                  onChange={(v) => updateField('assigned_plan_id', v)}
                  placeholder="e.g. RP-015"
                  mono
                />
              </>
            )}
          </div>
          {type === 'customer' && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                background: '#fffbeb',
                borderRadius: 8,
                border: '1px solid #fde68a',
                fontSize: 11,
                color: '#92400e',
              }}
            >
              <strong>Privacy (AC-10):</strong> Customer hanya dapat melihat pesanan milik
              Customer ID yang terdaftar. Tidak ada akses ke pesanan customer lain.
            </div>
          )}
          {type === 'driver' && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                background: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
                fontSize: 11,
                color: '#166534',
              }}
            >
              <strong>Isolasi (AC-12):</strong> Driver hanya dapat melihat rute yang di-assign
              ke akun mereka sendiri.
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 16,
            }}
          >
            <Btn onClick={() => setModal(null)} variant="ghost">
              Cancel
            </Btn>
            <Btn onClick={handleSave} icon="save" disabled={submitting}>
              {submitting ? 'Saving…' : modal === 'create' ? 'Create Account' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Account?" onClose={() => setDeleteId(null)} width={380}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
            Delete account <strong>{users.find((u) => u.id === deleteId)?.name}</strong>?
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
    </>
  )
}
