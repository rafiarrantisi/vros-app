'use client'

// Admin Distance Matrix — ported from Telkom/vros_admin.jsx Admin_DistanceMatrix.
// Click a cell to edit inter-city distance (km). Symmetric — both (from,to) and
// (to,from) upserted together.

import { useEffect, useMemo, useState } from 'react'

import { Card } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { createClient } from '@/lib/supabase/client'
import { toMatrix } from '@/lib/cvrp'
import type { DistMatrix, DistanceRow } from '@/lib/types'

const NODES = ['Bandung', 'Jakarta', 'Surabaya', 'Malang'] as const

interface EditingCell {
  from: string
  to: string
}

export default function AdminDistancesPage() {
  const [rows, setRows] = useState<DistanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [val, setVal] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const sb = createClient()

  const load = async () => {
    const { data } = await sb.from('distances_matrix').select('*')
    setRows((data ?? []) as DistanceRow[])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const matrix: DistMatrix = useMemo(() => toMatrix(rows), [rows])

  function startEdit(from: string, to: string) {
    if (from === to) return
    setErrorMsg(null)
    setEditing({ from, to })
    setVal(String(matrix[from]?.[to] ?? ''))
  }

  async function saveEdit() {
    if (!editing) return
    const { from, to } = editing
    const km = parseInt(val, 10) || 0

    const { error } = await sb
      .from('distances_matrix')
      .upsert([
        { from_node: from, to_node: to, km },
        { from_node: to, to_node: from, km },
      ])

    if (error) {
      setErrorMsg(error.message)
      return
    }
    setEditing(null)
    await load()
  }

  if (loading) {
    return <div style={{ padding: 28, color: '#94a3b8', fontSize: 13 }}>Memuat data…</div>
  }

  return (
    <div style={{ padding: 28, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: '#8896b3', marginBottom: 16 }}>
        Inter-city distance matrix (km) used by Clarke-Wright Savings Algorithm. Click a cell to
        edit. Distances are symmetric (AC-7/FR-11).
      </div>

      {errorMsg && (
        <Card style={{ marginBottom: 14, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>{errorMsg}</div>
        </Card>
      )}

      <Card style={{ display: 'inline-block', minWidth: 460 }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  padding: '10px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8896b3',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  textAlign: 'left',
                }}
              >
                From \ To
              </th>
              {NODES.map((n) => (
                <th
                  key={n}
                  style={{
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#1a2035',
                    textAlign: 'center',
                  }}
                >
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NODES.map((from) => (
              <tr key={from} style={{ borderTop: '1px solid #f0f2f7' }}>
                <td
                  style={{
                    padding: '10px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1a2035',
                    background: '#f8fafc',
                  }}
                >
                  {from}
                </td>
                {NODES.map((to) => {
                  const dist = matrix[from]?.[to]
                  const isEdit = editing && editing.from === from && editing.to === to
                  const isDiag = from === to
                  return (
                    <td
                      key={to}
                      onClick={() => startEdit(from, to)}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'center',
                        background: isDiag ? '#f8fafc' : isEdit ? '#eff6ff' : '#fff',
                        cursor: isDiag ? 'default' : 'pointer',
                        borderLeft: '1px solid #f0f2f7',
                        minWidth: 80,
                      }}
                    >
                      {isDiag ? (
                        <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>
                      ) : isEdit ? (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void saveEdit()
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            style={{
                              width: 54,
                              padding: '3px 6px',
                              borderRadius: 5,
                              border: '1.5px solid #3b82f6',
                              fontSize: 12,
                              fontFamily: 'DM Mono',
                              textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            style={{
                              background: '#22c55e',
                              border: 'none',
                              borderRadius: 4,
                              padding: '3px 5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Icon name="check" size={10} color="#fff" />
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'DM Mono',
                            fontWeight: 600,
                            color: dist ? '#1a2035' : '#94a3b8',
                          }}
                        >
                          {dist || '—'}
                          <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>km</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div
        style={{
          marginTop: 12,
          padding: '10px 14px',
          background: '#fffbeb',
          borderRadius: 8,
          border: '1px solid #fde68a',
          fontSize: 11,
          color: '#92400e',
          maxWidth: 460,
        }}
      >
        <strong>AC-7:</strong> Scope dibatasi pada 3 koridor PT. PIL: Bandung–Jakarta, Bandung–Surabaya,
        Bandung–Malang.
      </div>
    </div>
  )
}
