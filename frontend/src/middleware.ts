import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/_next',
  '/images',
  '/favicon.ico',
  '/api',
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.startsWith('/api')) {
    return true;
  }
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf|eot)$/i.test(pathname)) {
    return true;
  }
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths & static assets
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for token in cookie (set by client after OIDC callback)
  const tokenCookie = request.cookies.get('kms_auth_present');

  if (!tokenCookie || tokenCookie.value !== 'true') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|images|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
