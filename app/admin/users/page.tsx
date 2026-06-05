'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/app/components/NavBar'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import type { User, Outlet } from '@/lib/types'

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  CEO: { bg: '#EFF6FF', text: '#1D4ED8' },
  MANAGER: { bg: '#F0FDF4', text: '#15803D' },
  STAFF: { bg: '#F9FAFB', text: '#6B7280' },
}

interface NewUserForm {
  name: string
  email: string
  phone: string
  role: 'MANAGER' | 'STAFF'
  outlet_id: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<NewUserForm>({
    name: '',
    email: '',
    phone: '',
    role: 'MANAGER',
    outlet_id: '',
  })

  async function load() {
    try {
      const [usersRes, outletRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/outlets').then(r => r.json()),
      ])
      setUsers((usersRes.users as User[]) ?? [])
      setOutlets(outletRes.outlets ?? [])
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    if (!isSupabaseConfigured) {
      setSuccess(`Demo: Would create ${form.role} account for ${form.email}`)
      setShowForm(false)
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Failed to add user')

      setSuccess(
        result.inviteWarning
          ? `${form.name} added. Invite warning: ${result.inviteWarning}`
          : `✓ ${form.name} added and invite sent to ${form.email}`
      )
      setShowForm(false)
      setForm({ name: '', email: '', phone: '', role: 'MANAGER', outlet_id: '' })
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setSubmitting(false)
    }
  }

  const outletName = (id: string | null) =>
    outlets.find(o => o.id === id)?.name ?? '—'

  return (
    <div className="min-h-screen bg-app-bg">
      <NavBar role="CEO" />

      <main className="max-w-4xl mx-auto px-4 py-5 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B5E' }}>
              User Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">CEO access only · {users.length} users</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setSuccess(''); setFormError('') }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ backgroundColor: '#F4A623', color: '#1B2B5E' }}
          >
            + Add User
          </button>
        </div>

        {success && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderLeft: '4px solid #22C55E' }}
          >
            <p className="text-sm font-medium" style={{ color: '#15803D' }}>{success}</p>
          </div>
        )}

        {!isSupabaseConfigured && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <p className="text-sm font-medium text-amber-800">Demo Mode</p>
            <p className="text-xs text-amber-700 mt-1">
              Supabase not configured. User data is not available.
            </p>
          </div>
        )}

        {/* Add User Form */}
        {showForm && (
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(27,43,94,0.1)', border: '1px solid #E5E7EB' }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1B2B5E' }}>Add New User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-[#1B2B5E]"
                    placeholder="Ramesh Kumar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-[#1B2B5E]"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-[#1B2B5E]"
                  placeholder="ramesh@malgudi.in"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Role *
                  </label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as 'MANAGER' | 'STAFF' }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-[#1B2B5E] bg-white"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                    Outlet *
                  </label>
                  <select
                    value={form.outlet_id}
                    onChange={e => setForm(f => ({ ...f, outlet_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-[#1B2B5E] bg-white"
                    required
                  >
                    <option value="">Select outlet…</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-600">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#1B2B5E', color: '#FFFFFF' }}
                >
                  {submitting ? 'Adding...' : 'Add User & Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}
          >
            <p className="text-gray-500 text-sm">No users yet. Add your first user above.</p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(27,43,94,0.08)', border: '1px solid #E5E7EB' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8F7F4', borderBottom: '1px solid #E5E7EB' }}>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Outlet</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">Phone</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const roleBadge = ROLE_BADGE[user.role] ?? ROLE_BADGE.STAFF
                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: i < users.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: '#1B2B5E' }}>{user.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-md"
                          style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{outletName(user.outlet_id)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{user.phone ?? '—'}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
