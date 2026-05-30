import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, createAccessToken, isAccessProtectionEnabled, isValidAccessPassword } from "@/lib/access";

export async function POST(request: NextRequest) {
  if (!isAccessProtectionEnabled()) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/"));

  if (!(await isValidAccessPassword(password))) {
    const url = new URL("/unlock", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", nextPath);
    return NextResponse.redirect(url, 303);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, await createAccessToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(new URL(nextPath, request.url), 303);
}

function normalizeNextPath(nextPath: string) {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  return nextPath;
}
