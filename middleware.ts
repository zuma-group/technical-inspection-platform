import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow static assets in the public folder (by file extension)
  if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|css|js|map|woff2?|ttf|eot|otf)$/i.test(pathname)) {
    return NextResponse.next()
  }

  // Allow access to login page and API routes
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Check for authentication cookie
  const authCookie = request.cookies.get('auth-session')
  
  if (!authCookie?.value) {
    // No session cookie, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Try to parse the session data
    const sessionData = JSON.parse(authCookie.value)
    
    // Check if session has required fields
    if (!sessionData.userId || !sessionData.email || !sessionData.name || !sessionData.role) {
      // Invalid session format, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Valid session, allow access
    return NextResponse.next()
  } catch (error) {
    // Invalid JSON in session cookie, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|css|js|map|woff|woff2|ttf|eot|otf)).*)',
  ],
}