import { securityHeaders } from "./http";
import type { Env } from "./types";

const GUIDE_AMOUNT = 5900;
const GUIDE_CURRENCY = "pln";
const MAX_GUIDE_DEVICES = 3;
const DEVICE_COOKIE = "mp_lombardia_access";
const TOKEN_TOLERANCE_SECONDS = 300;
const GITHUB_GUIDE_ROOT = "https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/f8200f534ea8ac506aa24681e54237aa6799532f/como";
const GUIDE_PREVIEW_ROOT = "/podglad/como/";
const ROME_GUIDE_ROOT = "https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/d478ae8b606dbef33b6fcc1ce6c51ca71f691dfa/rome";
const SHARED_GUIDE_ROOT = "https://raw.githubusercontent.com/pawelgodlewsky-cloud/martynapodroze/5dd34292590f15ecc3b0f10b3f6fb67d1d146b13/guides";
const ROME_PREVIEW_ROOT = "/podglad/rzym/";
const ROME_DEVICE_COOKIE = "mp_rome_access";
const GUIDE_CSP = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://unpkg.com https://tile.openstreetmap.org",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join("; ");

interface StripeCheckoutSession {
  id?: string;
  payment_status?: string;
  payment_intent?: string | null;
  payment_link?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
}

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: StripeCheckoutSession };
}

interface OrderRow {
  id: string;
  customer_email: string;
  status: string;
  email_sent_at: string | null;
  access_disabled_at: string | null;
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] ?? character);
}

function page(title: string, heading: string, body: string, status = 200): Response {
  const headers = securityHeaders("text/html; charset=utf-8");
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  return new Response(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${htmlEscape(title)}</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f5f0e7;color:#20271f;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(100%,600px);background:#fffdf8;border:1px solid #ded5c6;padding:clamp(28px,6vw,52px);text-align:center}small{display:block;color:#7b573f;letter-spacing:.14em;font-weight:700;margin-bottom:14px}h1{font-family:Georgia,serif;font-size:clamp(32px,7vw,48px);font-weight:500;line-height:1.05;margin:0 0 18px}p{color:#556055;line-height:1.65;margin:0 0 14px}a.button{display:inline-flex;min-height:52px;align-items:center;justify-content:center;margin-top:12px;padding:0 24px;background:#556247;color:white;text-decoration:none;font-weight:700}a.text{color:#556247}</style></head><body><main class="card"><small>MARTYNA_PODROZE</small><h1>${htmlEscape(heading)}</h1>${body}</main></body></html>`, { status, headers });
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sha256(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()): Promise<boolean> {
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1] ?? "";
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value ?? "");
  const parsedTimestamp = Number(timestamp);
  if (!Number.isInteger(parsedTimestamp) || Math.abs(Math.floor(now / 1000) - parsedTimestamp) > TOKEN_TOLERANCE_SECONDS) return false;
  const expected = bytesToHex(await hmac(secret, `${timestamp}.${payload}`));
  return signatures.some((signature) => safeEqual(signature, expected));
}

async function accessToken(sessionId: string, secret: string): Promise<string> {
  return `${sessionId}.${bytesToBase64Url(await hmac(secret, `activate:${sessionId}`))}`;
}

async function guideAccessLink(sessionId: string, secret: string): Promise<string> {
  const token = await accessToken(sessionId, secret);
  return `https://martynapodroze.pl/como/?token=${encodeURIComponent(token)}`;
}

async function validAccessToken(token: string, secret: string): Promise<string | null> {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const sessionId = token.slice(0, separator);
  if (!/^cs_(?:live|test)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  return safeEqual(token, await accessToken(sessionId, secret)) ? sessionId : null;
}

function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function deviceCookie(token: string): string {
  return `${DEVICE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
}

async function sendAccessEmail(email: string, link: string, env: Env): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.TRANSACTIONAL_FROM_EMAIL) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.TRANSACTIONAL_FROM_EMAIL,
      to: [email],
      subject: "Twój przewodnik po Lombardii jest gotowy",
      html: `<div style="background:#f5f0e7;padding:32px 16px;font-family:Arial,sans-serif;color:#20271f"><div style="max-width:600px;margin:auto;background:#fffdf8;border:1px solid #ded5c6;padding:36px"><p style="font-size:12px;letter-spacing:.14em;color:#7b573f;font-weight:700">MARTYNA_PODROZE</p><h1 style="font-family:Georgia,serif;font-weight:500">Twój przewodnik jest gotowy</h1><p style="line-height:1.6;color:#556055">Dziękuję za zakup interaktywnego przewodnika po Lombardii.</p><p style="line-height:1.6;color:#556055">Kliknij poniżej, aby aktywować dostęp. Przewodnik możesz uruchomić na maksymalnie trzech urządzeniach lub przeglądarkach.</p><p style="margin:28px 0"><a href="${htmlEscape(link)}" style="display:inline-block;background:#556247;color:#fff;text-decoration:none;padding:16px 24px;font-weight:700">Otwórz przewodnik</a></p><p style="font-size:14px;line-height:1.6;color:#6f776e">Zachowaj tę wiadomość. Jeśli przycisk nie działa, wklej ten adres do przeglądarki:<br><a href="${htmlEscape(link)}" style="color:#556247;word-break:break-all">${htmlEscape(link)}</a></p><p style="font-size:14px;line-height:1.6;color:#6f776e">W razie problemów napisz na <a href="mailto:podroz.martyna@gmail.com" style="color:#556247">podroz.martyna@gmail.com</a>.</p><p style="margin-top:28px">Miłego wyjazdu!<br>Martyna_podroze</p></div></div>`,
      text: `Dziękuję za zakup interaktywnego przewodnika po Lombardii.\n\nAktywuj dostęp: ${link}\n\nPrzewodnik możesz uruchomić na maksymalnie trzech urządzeniach lub przeglądarkach. Zachowaj tę wiadomość.\n\nPomoc: podroz.martyna@gmail.com\n\nMiłego wyjazdu!\nMartyna_podroze`
    })
  });
  return response.ok;
}

export async function sendGuideAccessForOrder(orderId: string, env: Env, force = false): Promise<boolean> {
  if (!env.COMMERCE_ACCESS_SECRET || !env.DB) return false;
  const order = await env.DB.prepare(`SELECT id, customer_email, status, email_sent_at, access_disabled_at
    FROM commerce_orders WHERE id = ?`).bind(orderId).first<OrderRow>();
  if (!order || order.status !== "paid" || order.access_disabled_at || (!force && order.email_sent_at)) return false;
  const sent = await sendAccessEmail(order.customer_email, await guideAccessLink(order.id, env.COMMERCE_ACCESS_SECRET), env);
  if (sent) {
    await env.DB.prepare("UPDATE commerce_orders SET email_sent_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id = ?").bind(order.id).run();
  }
  return sent;
}

export async function stripeWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!env.STRIPE_WEBHOOK_SECRET || !env.COMMERCE_ACCESS_SECRET || !env.DB) return new Response("Commerce is not configured", { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature") ?? "";
  if (!(await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET))) return new Response("Invalid signature", { status: 400 });

  let event: StripeEvent;
  try { event = JSON.parse(payload) as StripeEvent; } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!event.id || !event.type) return new Response("Invalid event", { status: 400 });
  const processed = await env.DB.prepare("SELECT id FROM commerce_webhook_events WHERE id = ?").bind(event.id).first();
  if (processed) return new Response("ok");
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return new Response("ignored");

  const session = event.data?.object;
  const email = (session?.customer_details?.email ?? session?.customer_email ?? "").trim().toLowerCase();
  if (!session?.id || session.payment_status !== "paid" || !/^\S+@\S+\.\S+$/.test(email)) return new Response("Session is not paid or has no email", { status: 400 });
  if (session.amount_total !== GUIDE_AMOUNT || session.currency?.toLowerCase() !== GUIDE_CURRENCY) return new Response("Unexpected product", { status: 400 });
  if (env.STRIPE_PAYMENT_LINK_ID && session.payment_link !== env.STRIPE_PAYMENT_LINK_ID) return new Response("Unexpected payment link", { status: 400 });

  await env.DB.prepare(`INSERT INTO commerce_orders (id, payment_intent_id, customer_email, amount_total, currency, payment_link_id)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payment_intent_id=excluded.payment_intent_id, customer_email=excluded.customer_email, updated_at=CURRENT_TIMESTAMP`)
    .bind(session.id, session.payment_intent ?? null, email, session.amount_total, session.currency.toLowerCase(), session.payment_link ?? null).run();
  const order = await env.DB.prepare("SELECT id, customer_email, status, email_sent_at, access_disabled_at FROM commerce_orders WHERE id = ?").bind(session.id).first<OrderRow>();
  if (!order || order.status !== "paid") return new Response("Order unavailable", { status: 409 });

  if (!order.email_sent_at) {
    const sent = await sendGuideAccessForOrder(order.id, env);
    if (!sent) return new Response("Email delivery failed", { status: 503 });
  }
  await env.DB.prepare("INSERT OR IGNORE INTO commerce_webhook_events (id, event_type) VALUES (?, ?)").bind(event.id, event.type).run();
  return new Response("ok");
}

export async function activateGuide(request: Request, env: Env): Promise<Response> {
  if (!env.COMMERCE_ACCESS_SECRET || !env.DB) return page("Dostęp niedostępny", "Spróbuj ponownie później", "<p>System dostępu jest chwilowo niedostępny.</p>", 503);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return page("Dostęp do przewodnika", "Otwórz link z wiadomości", '<p>Po zakupie otrzymasz wiadomość z indywidualnym linkiem aktywacyjnym.</p><p>Nie widzisz wiadomości? Sprawdź folder spam lub napisz na <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>');
  const orderId = await validAccessToken(token, env.COMMERCE_ACCESS_SECRET);
  if (!orderId) return page("Nieprawidłowy link", "Ten link nie działa", '<p>Otwórz link bezpośrednio z wiadomości po zakupie albo skontaktuj się z nami.</p><p><a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a></p>', 403);
  const order = await env.DB.prepare("SELECT id, customer_email, status, email_sent_at, access_disabled_at FROM commerce_orders WHERE id = ?").bind(orderId).first<OrderRow>();
  if (!order || order.status !== "paid" || order.access_disabled_at) return page("Brak dostępu", "Ten dostęp nie jest aktywny", '<p>Jeśli potrzebujesz pomocy, napisz na <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>', 403);

  const currentDevice = cookieValue(request, DEVICE_COOKIE);
  if (currentDevice) {
    const currentHash = await sha256(currentDevice);
    const active = await env.DB.prepare("SELECT id FROM commerce_devices WHERE order_id = ? AND token_hash = ? AND revoked_at IS NULL").bind(orderId, currentHash).first();
    if (active) return Response.redirect(`${url.origin}/como/`, 302);
  }

  const rawDeviceToken = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const deviceHash = await sha256(rawDeviceToken);
  for (let slot = 1; slot <= MAX_GUIDE_DEVICES; slot += 1) {
    const result = await env.DB.prepare(`INSERT INTO commerce_devices (id, order_id, slot, token_hash) VALUES (?, ?, ?, ?)
      ON CONFLICT(order_id, slot) DO UPDATE SET id=excluded.id, token_hash=excluded.token_hash,
      created_at=CURRENT_TIMESTAMP, last_used_at=CURRENT_TIMESTAMP, revoked_at=NULL
      WHERE commerce_devices.revoked_at IS NOT NULL`).bind(crypto.randomUUID(), orderId, slot, deviceHash).run();
    if (result.meta.changes > 0) {
      const headers = new Headers({ Location: `${url.origin}/como/`, "Cache-Control": "no-store", "Set-Cookie": deviceCookie(rawDeviceToken) });
      return new Response(null, { status: 302, headers });
    }
  }
  return page("Limit urządzeń", "Dostęp jest już aktywny na trzech urządzeniach lub przeglądarkach", '<p>Otwórz przewodnik w jednej z wcześniej używanych przeglądarek.</p><p>Jeżeli zmieniłaś urządzenie, napisz na <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>. Pomożemy zresetować dostęp.</p>', 403);
}

export async function purchaseComplete(request: Request, env: Env): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  const order = /^cs_(?:live|test)_[A-Za-z0-9]+$/.test(sessionId) && env.DB
    ? await env.DB.prepare("SELECT id FROM commerce_orders WHERE id = ? AND status = 'paid' AND access_disabled_at IS NULL").bind(sessionId).first()
    : null;
  const detail = order
    ? "<p>Płatność została potwierdzona. Link aktywacyjny wysłaliśmy na adres podany przy płatności.</p>"
    : "<p>Kończymy potwierdzanie płatności. Link aktywacyjny otrzymasz e-mailem za chwilę.</p>";
  return page("Dziękujemy za zakup", "Przewodnik jest prawie u Ciebie", `${detail}<p>Sprawdź też folder Oferty lub Spam. W razie problemów napisz na <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>`);
}

function contentType(pathname: string): string {
  const extension = pathname.split(".").pop()?.toLowerCase();
  return ({ html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", webmanifest: "application/manifest+json", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", pdf: "application/pdf" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}

export async function publicGuidePreview(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  const path = url.pathname.slice(GUIDE_PREVIEW_ROOT.length);
  const separator = path.indexOf("/");
  const token = separator >= 0 ? path.slice(0, separator) : path;
  if (!env.GUIDE_PREVIEW_TOKEN || !/^[A-Za-z0-9_-]{24,128}$/.test(token) || !safeEqual(token, env.GUIDE_PREVIEW_TOKEN)) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }
  if (separator < 0) return Response.redirect(`${url.origin}${GUIDE_PREVIEW_ROOT}${token}/`, 308);

  let relative = path.slice(separator);
  if (!relative || relative.endsWith("/")) relative += "index.html";
  if (relative.includes("..")) return new Response("Not found", { status: 404 });
  const upstream = await fetch(`${GITHUB_GUIDE_ROOT}${relative}`, { headers: { "User-Agent": "martynapodroze-preview-worker" } });
  if (!upstream.ok) return new Response("Nie znaleziono pliku.", { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", contentType(relative));
  headers.set("Cache-Control", relative.endsWith("index.html") || relative.endsWith("sw.js") ? "no-store" : "public, max-age=3600");
  headers.set("Content-Security-Policy", GUIDE_CSP);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Cross-Origin-Resource-Policy");
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

export async function protectedGuide(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (new URL(request.url).searchParams.has("token")) return activateGuide(request, env);
  const deviceToken = cookieValue(request, DEVICE_COOKIE);
  if (!deviceToken || !env.DB) return Response.redirect(`${new URL(request.url).origin}/dostep/lombardia/`, 302);
  const deviceHash = await sha256(deviceToken);
  const device = await env.DB.prepare(`SELECT d.id FROM commerce_devices d JOIN commerce_orders o ON o.id=d.order_id
    WHERE d.token_hash=? AND d.revoked_at IS NULL AND o.status='paid' AND o.access_disabled_at IS NULL`).bind(deviceHash).first<{ id: string }>();
  if (!device) return Response.redirect(`${new URL(request.url).origin}/dostep/lombardia/`, 302);
  await env.DB.prepare("UPDATE commerce_devices SET last_used_at=CURRENT_TIMESTAMP WHERE id = ?").bind(device.id).run();

  const url = new URL(request.url);
  let relative = url.pathname.slice("/como".length);
  if (!relative || relative.endsWith("/")) relative += "index.html";
  if (relative.includes("..")) return new Response("Not found", { status: 404 });
  const upstream = await fetch(`${GITHUB_GUIDE_ROOT}${relative}`, { headers: { "User-Agent": "martynapodroze-access-worker" } });
  if (!upstream.ok) return new Response("Nie znaleziono pliku.", { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", contentType(relative));
  headers.set("Cache-Control", relative.endsWith("index.html") || relative.endsWith("sw.js") ? "private, no-store" : "private, max-age=3600");
  headers.set("Content-Security-Policy", GUIDE_CSP);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Cross-Origin-Resource-Policy");
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

async function proxyGuideFile(request: Request, upstreamRoot: string, relative: string, isPrivate: boolean): Promise<Response> {
  if (!relative || relative.endsWith("/")) relative += "index.html";
  if (relative.includes("..")) return new Response("Not found", { status: 404 });
  const upstream = await fetch(`${upstreamRoot}${relative}`, { headers: { "User-Agent": "martynapodroze-guide-worker" } });
  if (!upstream.ok) return new Response("Nie znaleziono pliku.", { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", contentType(relative));
  headers.set("Cache-Control", relative.endsWith("index.html") || relative.endsWith("sw.js") ? `${isPrivate ? "private, " : ""}no-store` : `${isPrivate ? "private" : "public"}, max-age=3600`);
  headers.set("Content-Security-Policy", GUIDE_CSP);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Cross-Origin-Resource-Policy");
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

export async function publicRomePreview(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  const path = url.pathname.slice(ROME_PREVIEW_ROOT.length);
  const separator = path.indexOf("/");
  const token = separator >= 0 ? path.slice(0, separator) : path;
  if (!env.GUIDE_PREVIEW_TOKEN || !/^[A-Za-z0-9_-]{24,128}$/.test(token) || !safeEqual(token, env.GUIDE_PREVIEW_TOKEN)) {
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }
  if (separator < 0) return Response.redirect(`${url.origin}${ROME_PREVIEW_ROOT}${token}/`, 308);
  return proxyGuideFile(request, ROME_GUIDE_ROOT, path.slice(separator), false);
}

export async function publicRomeTest(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  if (url.pathname === "/romatest123") return Response.redirect(`${url.origin}/romatest123/`, 308);
  return proxyGuideFile(request, ROME_GUIDE_ROOT, url.pathname.slice("/romatest123".length), false);
}

export async function activateRomeGuide(request: Request, env: Env): Promise<Response> {
  if (!env.COMMERCE_ACCESS_SECRET || !env.DB) return page("Dostęp niedostępny", "Spróbuj ponownie później", "<p>System dostępu jest chwilowo niedostępny.</p>", 503);
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return page("Dostęp do przewodnika po Rzymie", "Otwórz link z wiadomości", '<p>Po zakupie otrzymasz indywidualny link aktywacyjny.</p><p>Pomoc: <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>');
  const orderId = await validAccessToken(token, env.COMMERCE_ACCESS_SECRET);
  if (!orderId) return page("Nieprawidłowy link", "Ten link nie działa", '<p>Skontaktuj się z nami: <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>', 403);
  const order = await env.DB.prepare("SELECT id FROM commerce_orders WHERE id=? AND status='paid' AND access_disabled_at IS NULL AND product_slug='rzym'").bind(orderId).first();
  if (!order) return page("Brak dostępu", "Ten zakup nie obejmuje przewodnika po Rzymie", '<p>Jeśli to błąd, napisz na <a class="text" href="mailto:podroz.martyna@gmail.com">podroz.martyna@gmail.com</a>.</p>', 403);
  const current = cookieValue(request, ROME_DEVICE_COOKIE);
  if (current) {
    const active = await env.DB.prepare("SELECT id FROM commerce_devices WHERE order_id=? AND token_hash=? AND revoked_at IS NULL").bind(orderId, await sha256(current)).first();
    if (active) return Response.redirect(`${url.origin}/rzym/`, 302);
  }
  const raw = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await sha256(raw);
  for (let slot=1; slot<=MAX_GUIDE_DEVICES; slot+=1) {
    const result = await env.DB.prepare(`INSERT INTO commerce_devices (id,order_id,slot,token_hash) VALUES (?,?,?,?)
      ON CONFLICT(order_id,slot) DO UPDATE SET id=excluded.id,token_hash=excluded.token_hash,created_at=CURRENT_TIMESTAMP,last_used_at=CURRENT_TIMESTAMP,revoked_at=NULL
      WHERE commerce_devices.revoked_at IS NOT NULL`).bind(crypto.randomUUID(),orderId,slot,hash).run();
    if (result.meta.changes > 0) return new Response(null,{status:302,headers:{Location:`${url.origin}/rzym/`,"Cache-Control":"no-store","Set-Cookie":`${ROME_DEVICE_COOKIE}=${encodeURIComponent(raw)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`}});
  }
  return page("Limit urządzeń", "Dostęp jest już aktywny na trzech urządzeniach", '<p>Napisz do nas, jeśli potrzebujesz zresetować urządzenia.</p>', 403);
}

export async function protectedRomeGuide(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  if (url.searchParams.has("token")) return activateRomeGuide(request, env);
  const token = cookieValue(request, ROME_DEVICE_COOKIE);
  if (!token || !env.DB) return Response.redirect(`${url.origin}/dostep/rzym/`, 302);
  const device = await env.DB.prepare(`SELECT d.id FROM commerce_devices d JOIN commerce_orders o ON o.id=d.order_id
    WHERE d.token_hash=? AND d.revoked_at IS NULL AND o.status='paid' AND o.access_disabled_at IS NULL AND o.product_slug='rzym'`).bind(await sha256(token)).first<{id:string}>();
  if (!device) return Response.redirect(`${url.origin}/dostep/rzym/`, 302);
  await env.DB.prepare("UPDATE commerce_devices SET last_used_at=CURRENT_TIMESTAMP WHERE id=?").bind(device.id).run();
  return proxyGuideFile(request, ROME_GUIDE_ROOT, url.pathname.slice("/rzym".length), true);
}

export async function sharedGuideAsset(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  return proxyGuideFile(request, SHARED_GUIDE_ROOT, new URL(request.url).pathname.slice("/guides".length), false);
}

export const commerceInternals = { verifyStripeSignature, accessToken, guideAccessLink, validAccessToken, sha256 };
