'use server'

import { login } from '@/lib/auth'

export async function loginAction(email: string, password: string) {
  try {
    const result = await login(email, password)
    if (result.success) {
      return { success: true, user: result.user }
    } else {
      return { success: false, error: 'Invalid email or password' }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'An error occurred during login' }
  }
}