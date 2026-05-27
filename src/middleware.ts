import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth"];
const PUBLIC_API = ["/api/seed", "/api/reset", "/api/agent/tick"]; // protected by secret param

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth + maintenance APIs
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Allow static + favicon
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  // Check session
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
