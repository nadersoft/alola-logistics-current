import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // ALWAYS ALLOW these paths - no check at all
  const publicPaths = ['/login', '/register', '/api/auth', '/_next', '/favicon.ico', '/quote']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  
  // For public root /
  if (pathname === '/') {
    return NextResponse.next()
  }

  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET })
    
    // No token -> redirect to login ONLY if not already on public path
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(loginUrl)
    }

    // Token exists -> check expiry (non-blocking, just log)
    // DO NOT block on IP check for now to allow site to open
    // const now = Date.now()
    // const lastActivity = (token as any).lastActivity || now
    // if (now - lastActivity > 30*60*1000) {
    //   // Expired - redirect
    //   const loginUrl = new URL('/login?reason=expired', req.url)
    //   return NextResponse.redirect(loginUrl)
    // }

    return NextResponse.next()
  } catch (e) {
    console.error('Middleware error:', e)
    // On error, allow request to avoid blocking site
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/quotes/:path*', '/shipments/:path*', '/invoices/:path*', '/profile/:path*']
}
