import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const PUBLIC_ROUTES = ["/login", "/signup", "/auth"];

/** Public SEO / metadata routes crawlers must reach without auth. */
const PUBLIC_EXACT = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/llms.txt",
]);
const PUBLIC_PREFIXES = ["/icon", "/apple-icon", "/opengraph-image", "/twitter-image"];

/**
 * Refreshes the auth session on every request and gates the app routes.
 * Do not remove the getUser() call — it is what revalidates the token.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_ROUTES.some((p) => pathname.startsWith(p)) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated users cannot reach the app (but can see public pages).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users skip the marketing and auth screens — straight to the app.
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
