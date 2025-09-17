import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import LoginForm from './login-form'

export default async function LoginPage() {
  // Redirect if already authenticated
  if (await isAuthenticated()) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Equipment Inspection Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin panel
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}