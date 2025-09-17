import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'auth-session'

export async function login(email: string, password: string): Promise<{ success: boolean; user?: any }> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    }) as any

    if (!user || !user.password) {
      return { success: false }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return { success: false }
    }

    // Create session with user info
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false }
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<{ userId: string; email: string; name: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(SESSION_COOKIE)
    
    if (!session?.value) {
      return null
    }

    // Parse the session data
    const sessionData = JSON.parse(session.value)
    
    // Validate that the session has the expected structure
    if (!sessionData.userId || !sessionData.email || !sessionData.name || !sessionData.role) {
      // Invalid session format, clear it
      cookieStore.delete(SESSION_COOKIE)
      return null
    }

    return sessionData
  } catch (error) {
    console.error('Session parsing error:', error)
    // Clear invalid session cookie
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    return null
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

export async function requireAuth(): Promise<{ userId: string; email: string; name: string; role: string }> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}