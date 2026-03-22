import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

// Use the Edge-safe config (no bcryptjs, no Prisma) for middleware
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  const isDashboard =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/monitors") ||
    nextUrl.pathname.startsWith("/incidents") ||
    nextUrl.pathname.startsWith("/status-pages") ||
    nextUrl.pathname.startsWith("/analytics") ||
    nextUrl.pathname.startsWith("/alerts") ||
    nextUrl.pathname.startsWith("/team") ||
    nextUrl.pathname.startsWith("/settings");

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|status).*)"],
};
