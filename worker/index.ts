import {
  authConfigured,
  authorizeAdmin,
  clearAdminSession,
  clearFailedLogins,
  createAdminSession,
  loginBlocked,
  recordFailedLogin,
  validCredentials,
  validSameOrigin
} from "../src/auth";
import {
  createTrip,
  deleteTrip,
  duplicateTrip,
  getPublicLink,
  getPublicTripBySlug,
  getTrip,
  listTrips,
  updateTrip
} from "../src/db";
import { recordEvent, visitorForRequest } from "../src/events";
import { errorJson, json, requestJson, securityHeaders } from "../src/http";
import {
  NewsletterValidationError,
  parseNewsletterInput,
  subscribeWithMailerLite,
  takeNewsletterRateLimit
} from "../src/newsletter";
import { renderPublicTrip } from "../src/public-page";
import { parseTripInput, validateHttpUrl, ValidationError } from "../src/trips";
import type { Env } from "../src/types";
import { activateGuide, protectedGuide, publicGuidePreview, purchaseComplete, stripeWebhook } from "../src/commerce";
import {
  listGuideAccessCustomers,
  resendGuideAccess,
  resetGuideDevices,
  revokeGuideDevice,
  setGuideAccessEnabled,
  validCommerceDeviceId,
  validCommerceOrderId
} from "../src/commerce-admin";

const ADMIN_CSP = "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://martynapodroze.pl data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const PUBLIC_CSP = "default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; font-src https://fonts.gstatic.com; img-src 'self' https://martynapodroze.pl; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function notFound(): Response {
  return new Response("Nie znaleziono strony.", { status: 404, headers: securityHeaders("text/plain; charset=utf-8") });
}

function databaseReady(env: Env): boolean {
  return Boolean(env.DB);
}

async function adminAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/admin/wyjazdy") {
    url.pathname = "/admin/wyjazdy/";
    return Response.redirect(url.toString(), 308);
  }
  const assetPath = url.pathname;
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return notFound();
  const headers = new Headers(asset.headers);
  headers.set("Cache-Control", assetPath.endsWith("/") || assetPath.endsWith("index.html") ? "no-store" : "private, max-age=300");
  headers.set("Content-Security-Policy", ADMIN_CSP);
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(asset.body, { status: asset.status, headers });
}

async function adminSession(request: Request, env: Env): Promise<Response> {
  if (!validSameOrigin(request)) return errorJson("Żądanie ma nieprawidłowe źródło.", 403);
  if (request.method === "DELETE") {
    return json({ authenticated: false }, 200, { "Set-Cookie": clearAdminSession() });
  }
  if (request.method !== "POST") return errorJson("Nieobsługiwana metoda.", 405);
  if (!authConfigured(env)) return errorJson("Logowanie nie zostało skonfigurowane.", 503);
  if (!databaseReady(env)) return errorJson("Brak powiązania D1 o nazwie DB.", 503);
  if (await loginBlocked(request, env)) {
    return errorJson("Zbyt wiele prób. Spróbuj ponownie za 15 minut.", 429);
  }

  let input: unknown;
  try {
    input = await requestJson(request);
  } catch {
    return errorJson("Nieprawidłowe dane logowania.", 400);
  }
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const email = typeof candidate.email === "string" ? candidate.email.slice(0, 254) : "";
  const password = typeof candidate.password === "string" ? candidate.password.slice(0, 1024) : "";
  if (!(await validCredentials(email, password, env))) {
    await recordFailedLogin(request, env);
    return errorJson("Nieprawidłowy e-mail lub hasło.", 401);
  }

  await clearFailedLogins(request, env);
  const cookie = await createAdminSession(env);
  if (!cookie) return errorJson("Logowanie nie zostało skonfigurowane.", 503);
  return json({ authenticated: true }, 200, { "Set-Cookie": cookie });
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique|constraint/i.test(error.message);
}

async function adminApi(request: Request, env: Env, pathname: string): Promise<Response> {
  if (!databaseReady(env)) return errorJson("Brak powiązania D1 o nazwie DB.", 503);
  if (String(env.ALLOW_LOCAL_ADMIN) !== "1" && !validSameOrigin(request)) {
    return errorJson("Żądanie ma nieprawidłowe źródło.", 403);
  }

  if (pathname === "/api/admin/guide-access") {
    if (request.method !== "GET") return errorJson("Nieobsługiwana metoda.", 405);
    return json({ customers: await listGuideAccessCustomers(env) });
  }

  const guideDeviceMatch = pathname.match(/^\/api\/admin\/guide-access\/([^/]+)\/devices\/([^/]+)\/revoke$/);
  if (guideDeviceMatch) {
    if (request.method !== "POST") return errorJson("Nieobsługiwana metoda.", 405);
    const orderId = guideDeviceMatch[1] ?? "";
    const deviceId = guideDeviceMatch[2] ?? "";
    if (!validCommerceOrderId(orderId) || !validCommerceDeviceId(deviceId)) return errorJson("Nieprawidłowy identyfikator.", 400);
    return await revokeGuideDevice(env, orderId, deviceId)
      ? json({ ok: true })
      : errorJson("Urządzenie nie jest już aktywne.", 404);
  }

  const guideActionMatch = pathname.match(/^\/api\/admin\/guide-access\/([^/]+)\/(enable|disable|reset-devices|resend)$/);
  if (guideActionMatch) {
    if (request.method !== "POST") return errorJson("Nieobsługiwana metoda.", 405);
    const orderId = guideActionMatch[1] ?? "";
    const action = guideActionMatch[2] ?? "";
    if (!validCommerceOrderId(orderId)) return errorJson("Nieprawidłowy identyfikator zamówienia.", 400);
    if (action === "enable" || action === "disable") {
      return await setGuideAccessEnabled(env, orderId, action === "enable")
        ? json({ ok: true })
        : errorJson("Nie znaleziono aktywnego zakupu.", 404);
    }
    if (action === "reset-devices") {
      return await resetGuideDevices(env, orderId) ? json({ ok: true }) : errorJson("Nie znaleziono zakupu.", 404);
    }
    return await resendGuideAccess(env, orderId)
      ? json({ ok: true })
      : errorJson("Nie udało się wysłać wiadomości. Sprawdź, czy dostęp jest aktywny.", 409);
  }

  if (pathname === "/api/admin/trips") {
    if (request.method === "GET") return json({ trips: await listTrips(env) });
    if (request.method === "POST") {
      try {
        const trip = parseTripInput(await requestJson(request));
        return json({ trip: await createTrip(env, trip) }, 201);
      } catch (error) {
        if (error instanceof ValidationError) return errorJson(error.message, 422);
        if (isConstraintError(error)) return errorJson("Ten slug jest już używany. Wybierz inny.", 409);
        throw error;
      }
    }
    return errorJson("Nieobsługiwana metoda.", 405);
  }

  const duplicateMatch = pathname.match(/^\/api\/admin\/trips\/([a-f0-9-]+)\/duplicate$/i);
  if (duplicateMatch) {
    if (request.method !== "POST") return errorJson("Nieobsługiwana metoda.", 405);
    const duplicated = await duplicateTrip(env, duplicateMatch[1] ?? "");
    return duplicated ? json({ trip: duplicated }, 201) : errorJson("Nie znaleziono propozycji.", 404);
  }

  const tripMatch = pathname.match(/^\/api\/admin\/trips\/([a-f0-9-]+)$/i);
  if (tripMatch) {
    const id = tripMatch[1] ?? "";
    if (request.method === "GET") {
      const trip = await getTrip(env, id);
      return trip ? json({ trip }) : errorJson("Nie znaleziono propozycji.", 404);
    }
    if (request.method === "PUT") {
      try {
        const input = parseTripInput(await requestJson(request));
        const trip = await updateTrip(env, id, input);
        return trip ? json({ trip }) : errorJson("Nie znaleziono propozycji.", 404);
      } catch (error) {
        if (error instanceof ValidationError) return errorJson(error.message, 422);
        if (isConstraintError(error)) return errorJson("Ten slug jest już używany. Wybierz inny.", 409);
        throw error;
      }
    }
    if (request.method === "DELETE") {
      return await deleteTrip(env, id) ? json({ deleted: true }) : errorJson("Nie znaleziono propozycji.", 404);
    }
    return errorJson("Nieobsługiwana metoda.", 405);
  }

  return errorJson("Nie znaleziono endpointu.", 404);
}

async function newsletterApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return errorJson("Nieobsługiwana metoda.", 405);
  if (!validSameOrigin(request)) return errorJson("Żądanie ma nieprawidłowe źródło.", 403);
  if (!databaseReady(env)) return errorJson("Newsletter jest chwilowo niedostępny.", 503);
  try {
    const input = parseNewsletterInput(await requestJson(request));
    if (input.isBot) return json({ ok: true }, 202);
    if (!(await takeNewsletterRateLimit(request, env))) {
      return errorJson("Zbyt wiele prób. Spróbuj ponownie później.", 429);
    }
    const result = await subscribeWithMailerLite(input.email, env);
    if (result === "invalid") return errorJson("Podaj poprawny adres e-mail.", 422);
    if (result === "unavailable") return errorJson("Newsletter jest chwilowo niedostępny. Spróbuj ponownie później.", 503);
    return json({ ok: true, message: "Sprawdź skrzynkę i potwierdź zapis do newslettera." }, 202);
  } catch (error) {
    if (error instanceof NewsletterValidationError) return errorJson(error.message, 422);
    return errorJson("Nieprawidłowe dane formularza.", 400);
  }
}

async function publicTrip(request: Request, env: Env, slug: string, context: ExecutionContext): Promise<Response> {
  if (!databaseReady(env)) return new Response("Moduł jest chwilowo niedostępny.", { status: 503 });
  const trip = await getPublicTripBySlug(env, slug);
  if (!trip) return notFound();
  const visitor = visitorForRequest(request);
  if (visitor) context.waitUntil(recordEvent(env, trip.id, null, null, "view", visitor.id));
  const headers = securityHeaders("text/html; charset=utf-8");
  headers.set("Content-Security-Policy", PUBLIC_CSP);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (visitor?.setCookie) headers.append("Set-Cookie", visitor.setCookie);
  return new Response(renderPublicTrip(trip, request.url), { headers });
}

async function goRedirect(request: Request, env: Env, id: string, context: ExecutionContext): Promise<Response> {
  if (!databaseReady(env)) return new Response("Moduł jest chwilowo niedostępny.", { status: 503 });
  const link = await getPublicLink(env, id);
  if (!link) return notFound();
  let destination: string;
  try {
    destination = validateHttpUrl(link.url);
  } catch {
    return new Response("Link jest nieprawidłowy.", { status: 410, headers: securityHeaders("text/plain; charset=utf-8") });
  }
  const visitor = visitorForRequest(request);
  if (visitor) context.waitUntil(recordEvent(env, link.trip_id, link.id, link.type, "click", visitor.id));
  const headers = securityHeaders("text/plain; charset=utf-8");
  headers.set("Location", destination);
  if (visitor?.setCookie) headers.append("Set-Cookie", visitor.setCookie);
  return new Response(null, { status: 302, headers });
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/admin/wyjazdy/login") {
        url.pathname = "/admin/wyjazdy/login/";
        return Response.redirect(url.toString(), 308);
      }
      if (url.pathname.startsWith("/admin/wyjazdy/login/")) {
        if (url.pathname === "/admin/wyjazdy/login/" && await authorizeAdmin(request, env)) {
          return Response.redirect(`${url.origin}/admin/wyjazdy/`, 302);
        }
        return adminAsset(request, env);
      }
      if (url.pathname === "/admin/wyjazdy" || url.pathname.startsWith("/admin/wyjazdy/")) {
        if (!(await authorizeAdmin(request, env))) {
          return Response.redirect(`${url.origin}/admin/wyjazdy/login/`, 302);
        }
        return adminAsset(request, env);
      }
      if (url.pathname === "/api/admin/session") return adminSession(request, env);
      if (url.pathname.replace(/\/$/, "") === "/api/newsletter/subscribe") return newsletterApi(request, env);
      if (url.pathname.replace(/\/$/, "") === "/api/stripe/webhook") return stripeWebhook(request, env);
      if (url.pathname === "/dostep/lombardia" || url.pathname.startsWith("/dostep/lombardia/")) {
        return activateGuide(request, env);
      }
      if (url.pathname === "/zakup/lombardia" || url.pathname.startsWith("/zakup/lombardia/")) {
        return purchaseComplete(request, env);
      }
      if (url.pathname === "/podglad/como" || url.pathname.startsWith("/podglad/como/")) {
        return publicGuidePreview(request, env);
      }
      if (url.pathname === "/como" || url.pathname.startsWith("/como/")) return protectedGuide(request, env);
      if (url.pathname === "/api/admin/trips" || url.pathname.startsWith("/api/admin/trips/") ||
          url.pathname === "/api/admin/guide-access" || url.pathname.startsWith("/api/admin/guide-access/")) {
        if (!(await authorizeAdmin(request, env))) return errorJson("Sesja wygasła. Zaloguj się ponownie.", 401);
        return adminApi(request, env, url.pathname.replace(/\/$/, ""));
      }
      const tripMatch = url.pathname.match(/^\/w\/([a-z0-9-]+)\/?$/);
      if (tripMatch && request.method === "GET") return publicTrip(request, env, tripMatch[1] ?? "", context);
      const goMatch = url.pathname.match(/^\/go\/([a-f0-9-]+)\/?$/i);
      if (goMatch && request.method === "GET") return goRedirect(request, env, goMatch[1] ?? "", context);
      return notFound();
    } catch (error) {
      console.error("trip-module-error", error instanceof Error ? error.message : "unknown");
      return url.pathname.startsWith("/api/")
        ? errorJson("Wystąpił nieoczekiwany błąd.", 500)
        : new Response("Wystąpił nieoczekiwany błąd.", { status: 500, headers: securityHeaders("text/plain; charset=utf-8") });
    }
  }
} satisfies ExportedHandler<Env>;
