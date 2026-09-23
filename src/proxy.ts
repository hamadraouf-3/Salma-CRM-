import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/users"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (pathname === "/login" || pathname === "/signup") {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAdminOnly && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludes API auth routes, Next's own internals, and any request for a static file (anything with a
  // file extension — favicon.ico, logo.png, etc.) so public assets referenced by unauthenticated pages
  // like /login are never redirected to themselves.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
