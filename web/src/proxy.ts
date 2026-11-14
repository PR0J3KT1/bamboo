import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/* A quick turn-away for /admin when there's no session cookie at all, so a stranger lands on
   sign-in instead of the "no access" screen. It proves nothing: every admin page and action still
   checks the account and its role in the database. */
export function proxy(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();
  const url = new URL("/sign-in", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
