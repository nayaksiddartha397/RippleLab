import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthTestMode, TEST_SESSION_COOKIE } from "@/lib/auth/test-mode";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const protectedPaths = ["/dashboard", "/profile", "/scenarios"];
const publicAuthPaths = ["/auth/sign-in", "/auth/sign-up"];

function isPathWithin(pathname: string, roots: string[]) {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function signInRedirect(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/auth/sign-in";
  destination.search = "";
  destination.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(destination);
}

export async function proxy(request: NextRequest) {
  if (isAuthTestMode()) {
    const hasSession = Boolean(request.cookies.get(TEST_SESSION_COOKIE)?.value);
    if (!hasSession && isPathWithin(request.nextUrl.pathname, protectedPaths)) {
      return signInRedirect(request);
    }
    if (hasSession && isPathWithin(request.nextUrl.pathname, publicAuthPaths)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return isPathWithin(request.nextUrl.pathname, protectedPaths)
      ? signInRedirect(request)
      : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isPathWithin(request.nextUrl.pathname, protectedPaths)) {
    const redirectResponse = signInRedirect(request);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (user && isPathWithin(request.nextUrl.pathname, publicAuthPaths)) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/scenarios/:path*",
    "/auth/sign-in",
    "/auth/sign-up",
  ],
};
