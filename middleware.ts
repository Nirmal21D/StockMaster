import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Protect dashboard and all app routes
    if (path.startsWith('/dashboard') || path.startsWith('/products') || 
        path.startsWith('/receipts') || path.startsWith('/deliveries') ||
        path.startsWith('/requisitions') || path.startsWith('/transfers') ||
        path.startsWith('/ledger') || path.startsWith('/settings')) {
      if (!token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/products/:path*', '/receipts/:path*', 
            '/deliveries/:path*', '/requisitions/:path*', '/transfers/:path*',
            '/ledger/:path*', '/settings/:path*'],
};

