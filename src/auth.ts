import type { Env } from "./types";

const COOKIE_NAME = "__Host-mp_admin";
const SESSION_SECONDS = 12 * 60 * 60;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const encoder = new TextEncoder();

interface SessionPayload {
  v: 1;
  email: string;
  exp: number;
  credential: string;
}

interface LoginAttemptRow {
  failures: number;
  window_started_at: number;
  blocked_until: number | null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

function configured(env: Env): env is Env & Required<Pick<Env, "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "SESSION_SECRET">> {
  return Boolean(env.ADMIN_EMAIL?.trim() && env.ADMIN_PASSWORD && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);
}

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

async function credentialMarker(env: Env & { ADMIN_PASSWORD: string; SESSION_SECRET: string }): Promise<string> {
  return bytesToBase64Url(await hmac(env.SESSION_SECRET, `credential:${env.ADMIN_PASSWORD}`));
}

function isLocalBypass(env: Env): boolean {
  return String(env.ALLOW_LOCAL_ADMIN) === "1";
}

export function authConfigured(env: Env): boolean {
  return configured(env);
}

export async function authorizeAdmin(request: Request, env: Env): Promise<boolean> {
  if (isLocalBypass(env)) return true;
  if (!configured(env)) return false;
  const session = cookieValue(request);
  if (!session || session.length > 2048) return false;
  const [encodedPayload, encodedSignature, ...rest] = session.split(".");
  if (!encodedPayload || !encodedSignature || rest.length) return false;
  const suppliedSignature = base64UrlToBytes(encodedSignature);
  if (!suppliedSignature) return false;
  const expectedSignature = await hmac(env.SESSION_SECRET, encodedPayload);
  if (suppliedSignature.length !== expectedSignature.length) return false;
  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |= (suppliedSignature[index] ?? 0) ^ (expectedSignature[index] ?? 0);
  }
  if (difference !== 0) return false;

  const payloadBytes = base64UrlToBytes(encodedPayload);
  if (!payloadBytes) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SessionPayload>;
    const expectedEmail = env.ADMIN_EMAIL.trim().toLowerCase();
    const expectedCredential = await credentialMarker(env);
    return payload.v === 1
      && typeof payload.exp === "number"
      && payload.exp > Math.floor(Date.now() / 1000)
      && typeof payload.email === "string"
      && await secureEqual(payload.email, expectedEmail)
      && typeof payload.credential === "string"
      && await secureEqual(payload.credential, expectedCredential);
  } catch {
    return false;
  }
}

export async function createAdminSession(env: Env): Promise<string | null> {
  if (!configured(env)) return null;
  const payload: SessionPayload = {
    v: 1,
    email: env.ADMIN_EMAIL.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    credential: await credentialMarker(env)
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(env.SESSION_SECRET, encodedPayload));
  return `${COOKIE_NAME}=${encodedPayload}.${signature}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSession(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

async function attemptKey(request: Request, env: Env): Promise<string> {
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const secret = env.SESSION_SECRET || "unconfigured";
  return bytesToBase64Url(await hmac(secret, `login-attempt:${address}`));
}

export async function loginBlocked(request: Request, env: Env): Promise<boolean> {
  if (!env.DB) return false;
  const key = await attemptKey(request, env);
  const row = await env.DB.prepare(
    "SELECT failures, window_started_at, blocked_until FROM admin_login_attempts WHERE attempt_key = ?"
  ).bind(key).first<LoginAttemptRow>();
  return Boolean(row?.blocked_until && row.blocked_until > Date.now());
}

export async function recordFailedLogin(request: Request, env: Env): Promise<void> {
  if (!env.DB) return;
  const now = Date.now();
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE updated_at < ?").bind(now - 24 * 60 * 60 * 1000).run();
  const key = await attemptKey(request, env);
  const existing = await env.DB.prepare(
    "SELECT failures, window_started_at, blocked_until FROM admin_login_attempts WHERE attempt_key = ?"
  ).bind(key).first<LoginAttemptRow>();
  const stillInWindow = existing && now - existing.window_started_at < ATTEMPT_WINDOW_MS;
  const failures = stillInWindow ? existing.failures + 1 : 1;
  const windowStartedAt = stillInWindow ? existing.window_started_at : now;
  const blockedUntil = failures >= MAX_ATTEMPTS ? now + ATTEMPT_WINDOW_MS : null;
  await env.DB.prepare(
    `INSERT INTO admin_login_attempts (attempt_key, failures, window_started_at, blocked_until, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(attempt_key) DO UPDATE SET failures = excluded.failures,
       window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until,
       updated_at = excluded.updated_at`
  ).bind(key, failures, windowStartedAt, blockedUntil, now).run();
}

export async function clearFailedLogins(request: Request, env: Env): Promise<void> {
  if (!env.DB) return;
  const key = await attemptKey(request, env);
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE attempt_key = ?").bind(key).run();
}

export async function validCredentials(email: string, password: string, env: Env): Promise<boolean> {
  if (!configured(env)) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const [emailMatches, passwordMatches] = await Promise.all([
    secureEqual(normalizedEmail, env.ADMIN_EMAIL.trim().toLowerCase()),
    secureEqual(password, env.ADMIN_PASSWORD)
  ]);
  return emailMatches && passwordMatches;
}

export function validSameOrigin(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
