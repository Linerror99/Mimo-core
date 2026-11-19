import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/timeline",
  "/accounts",
  "/categories",
  "/projects",
  "/goals",
  "/projection",
  "/notifications",
  "/trash",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionMarker = request.cookies.has("mimo_session");
  if (!hasSessionMarker) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/timeline/:path*",
    "/accounts/:path*",
    "/categories/:path*",
    "/projects/:path*",
    "/goals/:path*",
    "/projection/:path*",
    "/notifications/:path*",
    "/trash/:path*",
    "/settings/:path*",
  ],
};
