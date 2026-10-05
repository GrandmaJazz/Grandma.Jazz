import { NextResponse, type NextRequest } from 'next/server';
import { needsPageSlash } from './lib/canonicalPath.cjs';

export function middleware(request: NextRequest) {
  if (needsPageSlash(request.nextUrl.pathname, request.headers.get('rsc') === '1')) {
    // NextURL retains the original trailingSlash flag when pathname changes.
    // A native URL preserves the added slash in the Location header.
    const url = new URL(request.url);
    url.pathname += '/';
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
