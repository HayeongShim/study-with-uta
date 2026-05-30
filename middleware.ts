import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, createAccessToken, isAccessProtectionEnabled } from "@/lib/access";

const PUBLIC_PATHS = ["/unlock", "/api/access", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  if (!isAccessProtectionEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expectedToken = await createAccessToken(process.env.APP_ACCESS_PASSWORD ?? "");
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (accessToken === expectedToken) {
    return NextResponse.next();
  }

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(unlockUrl);
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/public/")
  );
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
