/** JWT segment count for standard Supabase access tokens. */
const JWT_SEGMENT_COUNT = 3;

/** Returns true when value looks like a valid Supabase access_token JWT. */
export function isValidAccessToken(token: unknown): token is string {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (trimmed === "undefined" || trimmed === "null") return false;
  if (trimmed.startsWith("Bearer ")) return false;
  return trimmed.split(".").length === JWT_SEGMENT_COUNT;
}

export function assertValidAccessToken(token: unknown): string {
  if (!isValidAccessToken(token)) {
    throw new Error("Invalid or missing access token.");
  }
  return token;
}
