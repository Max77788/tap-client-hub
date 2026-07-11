import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Auth proxy — replaces middleware.ts in Next.js 16.
 * Checks for demo cookie or Supabase session cookie.
 * Protects all routes except /login and /auth/callback.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieHeader = request.headers.get("cookie") || "";

  // Check for demo login cookie
  const hasDemoCookie = /(?:^|;\s*)tap_demo_user=([^;]*)/.test(cookieHeader);

  // Check for Supabase auth token cookie
  const hasAuthToken = /(?:^|;\s*)sb-[^-]+-auth-token=/.test(cookieHeader);

  const { pathname } = request.nextUrl;

  // Redirect to /login if unauthenticated and not already on a public route
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/");

  if (!hasDemoCookie && !hasAuthToken && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based access control ──
  // Extract role from cookie
  const roleMatch = cookieHeader.match(/(?:^|;\s*)tap_demo_role=([^;]*)/);
  const userRole = roleMatch ? decodeURIComponent(roleMatch[1]) : "staff";

  // Pages restricted to admin/owner only
  const adminOnlyPages = ["/users", "/vault", "/settings"];
  // Pages restricted to admin/manager only
  const managerPlusPages = ["/workload", "/time"];

  if (adminOnlyPages.some(p => pathname.startsWith(p))) {
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (managerPlusPages.some(p => pathname.startsWith(p))) {
    if (userRole !== "admin" && userRole !== "owner" && userRole !== "manager") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect authenticated users away from login
  if ((hasDemoCookie || hasAuthToken) && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
