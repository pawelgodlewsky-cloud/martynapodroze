import type { Env } from "./types";

const encoder = new TextEncoder();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptRow {
  attempts: number;
  window_started_at: number;
}

export interface NewsletterInput {
  email: string;
  consent: true;
  isBot: boolean;
}

export class NewsletterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsletterValidationError";
  }
}

export function parseNewsletterInput(value: unknown): NewsletterInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NewsletterValidationError("Nieprawidłowe dane formularza.");
  }
  const raw = value as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const website = typeof raw.website === "string" ? raw.website.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new NewsletterValidationError("Podaj poprawny adres e-mail.");
  }
  if (raw.consent !== true) {
    throw new NewsletterValidationError("Zaznacz zgodę na otrzymywanie newslettera.");
  }
  return { email, consent: true, isBot: Boolean(website) };
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function takeNewsletterRateLimit(request: Request, env: Env): Promise<boolean> {
  const secret = env.VISITOR_SALT;
  if (!secret || secret.length < 16) return false;
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = await hmacHex(secret, `newsletter:${address}`);
  const now = Date.now();
  await env.DB.prepare("DELETE FROM newsletter_attempts WHERE updated_at < ?").bind(now - 48 * 60 * 60 * 1000).run();
  const existing = await env.DB.prepare(
    "SELECT attempts, window_started_at FROM newsletter_attempts WHERE attempt_key = ?"
  ).bind(key).first<AttemptRow>();
  const inWindow = existing && now - existing.window_started_at < WINDOW_MS;
  const attempts = inWindow ? existing.attempts : 0;
  if (attempts >= MAX_ATTEMPTS) return false;
  const windowStartedAt = inWindow ? existing.window_started_at : now;
  await env.DB.prepare(
    `INSERT INTO newsletter_attempts (attempt_key, attempts, window_started_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(attempt_key) DO UPDATE SET attempts = excluded.attempts,
       window_started_at = excluded.window_started_at, updated_at = excluded.updated_at`
  ).bind(key, attempts + 1, windowStartedAt, now).run();
  return true;
}

export async function subscribeWithMailerLite(email: string, env: Env): Promise<"ok" | "invalid" | "unavailable"> {
  const token = env.MAILERLITE_API_TOKEN;
  const groupId = env.MAILERLITE_GROUP_ID;
  if (!token || !groupId) return "unavailable";
  let response: Response;
  try {
    response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, groups: [groupId], status: "unconfirmed" }),
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    return "unavailable";
  }
  if (response.ok) return "ok";
  if (response.status === 422) return "invalid";
  return "unavailable";
}
