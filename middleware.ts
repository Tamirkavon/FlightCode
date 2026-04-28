import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const isPublic = publicPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
