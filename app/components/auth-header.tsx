import { getSession } from '@/lib/auth'
import LogoutButton from './logout-button'

export default async function AuthHeader() {
  const session = await getSession()

  if (!session) {
    return null
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="text-sm text-gray-600">
            Signed in as <span className="font-medium">{session.name}</span> ({session.role})
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}