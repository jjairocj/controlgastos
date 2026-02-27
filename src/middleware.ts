import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Ignorar rutas públicas o de assets
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    const token = request.cookies.get('auth-token')
    const isLoginPage = request.nextUrl.pathname === '/login'

    // Si no hay token y no es el login, redirigir al login
    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si hay token y trata de ir al login, enviarlo al app
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
