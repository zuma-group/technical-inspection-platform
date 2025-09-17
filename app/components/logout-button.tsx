'use client'

import { useTransition } from 'react'
import { logoutAction } from '@/app/logout/actions'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  )
}