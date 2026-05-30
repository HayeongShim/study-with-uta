export const ACCESS_COOKIE = "study_with_uta_access";

export function isAccessProtectionEnabled() {
  return Boolean(process.env.APP_ACCESS_PASSWORD);
}

export async function createAccessToken(password: string) {
  const secret = process.env.APP_ACCESS_SECRET || process.env.APP_ACCESS_PASSWORD || "";
  const input = `${password}:${secret}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidAccessPassword(password: string) {
  return Boolean(process.env.APP_ACCESS_PASSWORD && password === process.env.APP_ACCESS_PASSWORD);
}
