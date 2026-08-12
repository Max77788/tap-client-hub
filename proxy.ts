import { type NextRequest, NextResponse } from "next/server";

/**
 * Auth proxy — replaces middleware.ts in Next.js 16.
 * Checks for demo cookie or Supabase session cookie.
 * Protects all routes except /login and /auth/callback.
 * Role-based access is handled by sidebar + per-page logic.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieHeader = request.headers.get("cookie") || "";

  // Only the server-issued signed demo session is authoritative.
  const hasDemoCookie = /(?:^|;\s*)tap_demo_session=([^;]*)/.test(cookieHeader);

  // Check for Supabase auth token cookie (handles chunked cookies: .0, .1, etc.)
  const hasAuthToken = /(?:^|;\s*)sb-[^-]+-auth-token(?:\.\d+)?=/.test(cookieHeader);

  const { pathname } = request.nextUrl;

  // Redirect to /login if unauthenticated and not already on a public route
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/icon-192x192.png" ||
    pathname === "/icon-512x512.png";

  if (!hasDemoCookie && !hasAuthToken && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the originally requested destination through authentication.
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
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
