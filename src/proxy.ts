import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const ADMIN_COOKIE = "admin_access_token";

export default function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  const isLoginRoute =
    pathname === "/admin/login" || pathname === "/admin/login/";

  const hasAdminCookie = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

  // Redirect unauthenticated users to admin login.
  if (isAdminRoute && !isLoginRoute && !hasAdminCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 2. Redirect users with a cookie away from the login page.
  if (isLoginRoute && hasAdminCookie) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Preserve existing next-intl middleware.
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
