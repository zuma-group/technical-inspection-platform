'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createUserAction, updateUserAction, deleteUserAction } from './actions'
import { Icons } from '@/lib/icons'

type User = { id: string; name: string; email: string; role: string; createdAt: Date }

export default function ManageUsers({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', email: '', role: 'TECHNICIAN', password: '' })
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
  }, [users, filter])

  const resetForm = () => setForm({ name: '', email: '', role: 'TECHNICIAN', password: '' })

  const handleCreate = () => {
    if (!form.name || !form.email || !form.password) {
      setMessage({ type: 'error', text: 'Name, email, and password are required' })
      return
    }
    startTransition(async () => {
      const res = await createUserAction({ ...form })
      if (res.success) {
        setUsers(prev => [res.data as User, ...prev])
        resetForm()
        setMessage({ type: 'success', text: 'User created' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to create user' })
      }
    })
  }

  const handleUpdate = (id: string, updates: { name?: string; email?: string; role?: string; newPassword?: string }) => {
    startTransition(async () => {
      const res = await updateUserAction(id, updates)
      if (res.success) {
        setUsers(prev => prev.map(u => (u.id === id ? (res.data as User) : u)))
        setMessage({ type: 'success', text: 'User updated' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update user' })
      }
    })
  }

  const handleDelete = (id: string) => {
    if (id === currentUserId) {
      setMessage({ type: 'error', text: 'You cannot delete your own account' })
      return
    }
    if (!confirm('Delete this user? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteUserAction(id)
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== id))
        setMessage({ type: 'success', text: 'User deleted' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to delete user' })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Create user */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="form-input"
        />
      <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="form-input"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="form-select"
        >
          <option value="TECHNICIAN">Technician</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="form-input"
        />
        <button onClick={handleCreate} disabled={isPending} className="btn btn-primary">
          {isPending ? 'Creating…' : 'Create User'}
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-md w-full">
          <input
            type="text"
            placeholder="Search users by name, email, or role…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input pl-10"
          />
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {filter && (
          <button onClick={() => setFilter('')} className="btn btn-secondary text-sm px-3 py-2">
            Clear
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded border-2 text-sm ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Users table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '8px' }}>{u.name}</td>
                <td style={{ padding: '8px' }}>{u.email}</td>
                <td style={{ padding: '8px' }}>
                  <select
                    value={u.role}
                    onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
                    className="form-select"
                  >
                    <option value="TECHNICIAN">Technician</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td style={{ padding: '8px' }}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const name = prompt('Update name', u.name) || undefined
                        if (name === undefined) return
                        handleUpdate(u.id, { name })
                      }}
                      className="btn btn-secondary text-sm px-3 py-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const email = prompt('Update email', u.email) || undefined
                        if (email === undefined) return
                        handleUpdate(u.id, { email })
                      }}
                      className="btn btn-secondary text-sm px-3 py-2"
                    >
                      Change Email
                    </button>
                    <button
                      onClick={() => {
                        const pw = prompt('New password (leave blank to cancel)') || ''
                        if (!pw) return
                        handleUpdate(u.id, { newPassword: pw })
                      }}
                      className="btn btn-warning text-sm px-3 py-2"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === currentUserId}
                      className="btn btn-danger text-sm px-3 py-2 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


