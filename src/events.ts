import type { Env } from "./types";

const COOKIE_NAME = "mp_visitor";
const CONSENT_COOKIE_NAME = "mp_cookie_consent";
const ANALYTICS_CONSENT = "analytics-v1";

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function analyticsConsent(request: Request): boolean {
  return cookieValue(request, CONSENT_COOKIE_NAME) === ANALYTICS_CONSENT;
}

export function visitorForRequest(request: Request): { id: string; setCookie: string | null } | null {
  if (!analyticsConsent(request)) return null;
  const existing = cookieValue(request, COOKIE_NAME);
  const id = existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : crypto.randomUUID();
  return {
    id,
    setCookie: `${COOKIE_NAME}=${id}; Path=/; Max-Age=15552000; Secure; SameSite=Lax`
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordEvent(
  env: Env,
  tripId: string,
  linkId: string | null,
  linkType: string | null,
  eventType: "view" | "click",
  visitorId: string
): Promise<void> {
  const salt = env.VISITOR_SALT;
  if (!salt || salt.length < 16) return;
  const bucketMs = eventType === "view" ? 30 * 60 * 1000 : 2 * 60 * 1000;
  const bucket = Math.floor(Date.now() / bucketMs);
  const anonymizedVisitor = await sha256(`${salt}:${visitorId}`);
  const eventKey = await sha256(`${anonymizedVisitor}:${tripId}:${linkId ?? "page"}:${eventType}:${bucket}`);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM trip_events WHERE created_at < datetime('now', '-12 months')"),
    env.DB.prepare(`
    INSERT OR IGNORE INTO trip_events (id, trip_id, link_id, link_type, event_type, visitor_id, event_key)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), tripId, linkId, linkType, eventType, anonymizedVisitor, eventKey)
  ]);
}
