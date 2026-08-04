import { NextResponse, type NextRequest } from 'next/server';

/**
 * Authenticated routes were each re-implementing their own `getAuth()` guard,
 * and a new page was one forgotten check away from leaking. This is a cheap
 * presence check on the session cookie -- it does not validate the session, which
 * needs database access the edge runtime does not have. The pages still call
 * getAuth(); this just avoids rendering them for obviously-anonymous visitors and
 * keeps the redirect in one place.
 */
const PROTECTED_PREFIXES = ['/new', '/my-auctions', '/my-bids'];

// Lucia's default cookie name. Keep in sync with lib/auth.ts if it is customised.
const SESSION_COOKIE = 'auth_session';

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL('/sign-in', request.url);
  // So the user lands back where they were trying to go.
  signIn.searchParams.set('next', pathname);
  return NextResponse.redirect(signIn);
};

export const config = {
  matcher: ['/new/:path*', '/my-auctions/:path*', '/my-bids/:path*'],
};
