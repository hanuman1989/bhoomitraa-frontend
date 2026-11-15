import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { USER_COOKIE } from "./lib/userAuth/constants";

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

  const localePrefix = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  const accountPath = (
    localePrefix ? pathname.slice(localePrefix.length + 1) : pathname
  ).replace(/\/$/, "");
  const isAccountRoute =
    accountPath === "/account" || accountPath.startsWith("/account/");
  const isPublicAccountRoute = [
    "/account/login",
    "/account/register",
    "/account/reset-password",
  ].includes(accountPath);
  const hasUserCookie = Boolean(request.cookies.get(USER_COOKIE)?.value);
  if (isAccountRoute && !isPublicAccountRoute && !hasUserCookie) {
    return NextResponse.redirect(
      new URL(
        `${localePrefix ? `/${localePrefix}` : ""}/account/login`,
        request.url,
      ),
    );
  }
  // Guest pages verify /account/me before redirecting signed-in Farmers.
  // Cookie presence alone would send an expired session into a redirect loop.

  // Preserve existing next-intl middleware.
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
