import { validSameOrigin } from "./auth";
import { errorJson, json, securityHeaders } from "./http";
import type { Env } from "./types";

const RECIPIENT = "podroz.martyna@gmail.com";
const UNAVAILABLE = "Nie udało się wysłać zgłoszenia. Spróbuj ponownie lub napisz na podroz.martyna@gmail.com.";
const MAX_BODY_BYTES = 32_000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const FIELDS = [
  ["Wybrana usługa", 120, true], ["Imię", 100, true], ["Telefon", 40, false],
  ["Preferowany kontakt", 20, true], ["Kierunek podróży", 200, true],
  ["Termin podróży", 120, false], ["Lotniska wylotowe", 200, true],
  ["Elastyczność terminu", 120, false], ["Uczestnicy podróży", 80, true],
  ["Budżet podróży", 100, false], ["Liczba dni", 2, false], ["Bagaż", 100, false],
  ["Standard noclegu", 120, false], ["Opis potrzeb", 5000, true]
] as const;

export interface InquiryInput {
  email: string;
  fields: Record<string, string>;
  submissionId: string;
  isBot: boolean;
}

export class InquiryValidationError extends Error {}

export function parseInquiryInput(value: unknown): InquiryInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InquiryValidationError("Nieprawidłowe dane formularza.");
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw._honey === "string" && raw._honey.trim()) {
    return { email: "", fields: {}, submissionId: "", isBot: true };
  }
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new InquiryValidationError("Podaj poprawny adres e-mail.");
  }
  if (raw["Zgoda na kontakt"] !== "Tak") {
    throw new InquiryValidationError("Zaznacz zgodę na kontakt w sprawie zgłoszenia.");
  }
  const fields: Record<string, string> = {};
  for (const [name, maxLength, required] of FIELDS) {
    const field = typeof raw[name] === "string" ? raw[name].trim() : "";
    if (required && !field) throw new InquiryValidationError(`Uzupełnij pole: ${name}.`);
    if (field.length > maxLength) throw new InquiryValidationError(`Pole „${name}” jest zbyt długie.`);
    fields[name] = field;
  }
  if (!["Dobór lotu i noclegu", "Indywidualny plan podróży", "Nie wiem, potrzebuję podpowiedzi"].includes(fields["Wybrana usługa"] ?? "")) {
    throw new InquiryValidationError("Wybierz usługę z listy.");
  }
  if (!["E-mail", "Telefon"].includes(fields["Preferowany kontakt"] ?? "")) {
    throw new InquiryValidationError("Wybierz preferowany sposób kontaktu.");
  }
  if (!["Podróżuję solo", "Z partnerem", "Z rodziną", "W większej grupie"].includes(fields["Uczestnicy podróży"] ?? "")) {
    throw new InquiryValidationError("Wybierz uczestników podróży z listy.");
  }
  if ((fields["Opis potrzeb"] ?? "").length < 20) {
    throw new InquiryValidationError("Opisz swoje potrzeby w co najmniej 20 znakach.");
  }
  const days = fields["Liczba dni"];
  if (days && (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 60)) {
    throw new InquiryValidationError("Podaj liczbę dni od 1 do 60.");
  }
  const submissionId = raw.submissionId ?? crypto.randomUUID();
  if (typeof submissionId !== "string" || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(submissionId)) {
    throw new InquiryValidationError("Nieprawidłowy identyfikator zgłoszenia. Odśwież stronę i spróbuj ponownie.");
  }
  return { email, fields, submissionId, isBot: false };
}

async function takeRateLimit(request: Request, env: Env): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.VISITOR_SALT), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`inquiry:${request.headers.get("CF-Connecting-IP") ?? "unknown"}`));
  const attemptKey = [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Date.now();
  await env.DB.prepare("DELETE FROM inquiry_attempts WHERE updated_at < ?").bind(now - 48 * WINDOW_MS).run();
  // One atomic update prevents simultaneous submissions from bypassing the limit.
  const row = await env.DB.prepare(`INSERT INTO inquiry_attempts (attempt_key, attempts, window_started_at, updated_at)
    VALUES (?, 1, ?, ?)
    ON CONFLICT(attempt_key) DO UPDATE SET
      attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE MIN(attempts + 1, 6) END,
      window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END,
      updated_at = excluded.updated_at
    RETURNING attempts`).bind(attemptKey, now, now, now - WINDOW_MS, now - WINDOW_MS).first<{ attempts: number }>();
  return Boolean(row && row.attempts <= MAX_ATTEMPTS);
}

export async function sendInquiryEmail(input: InquiryInput, env: Env): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.TRANSACTIONAL_FROM_EMAIL) return false;
  const text = ["Nowe zgłoszenie ze strony https://martynapodroze.pl/", `Adres e-mail: ${input.email}`,
    ...FIELDS.map(([name]) => `${name}: ${input.fields[name] || "—"}`), "Zgoda na kontakt: Tak",
    `Numer zgłoszenia: ${input.submissionId}`].join("\n\n");
  const body = JSON.stringify({ from: env.TRANSACTIONAL_FROM_EMAIL, to: [RECIPIENT], reply_to: input.email,
    subject: "Nowe zgłoszenie ze strony Martyna Podróże", text });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const fingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json",
        "Idempotency-Key": `inquiry/${input.submissionId}/${fingerprint}` },
      body, signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return false;
    const result = await response.json() as { id?: unknown };
    return typeof result.id === "string" && Boolean(result.id);
  } catch {
    return false;
  }
}

function formError(message: string, status: number): Response {
  const headers = securityHeaders("text/html; charset=utf-8");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  const safeMessage = message.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
  return new Response(`<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nie udało się wysłać zgłoszenia</title><main><h1>Nie udało się wysłać zgłoszenia</h1><p>${safeMessage}</p><p><a href="/#zamowienie">Wróć do formularza</a> lub <a href="mailto:${RECIPIENT}">napisz e-mail</a>.</p></main></html>`, { status, headers });
}

export async function inquiryApi(request: Request, env: Env): Promise<Response> {
  const wantsJson = request.headers.get("Accept")?.includes("application/json") ?? false;
  const fail = (message: string, status: number) => wantsJson ? errorJson(message, status) : formError(message, status);
  if (request.method !== "POST") return fail("Nieobsługiwana metoda.", 405);
  if (!validSameOrigin(request)) return fail("Żądanie ma nieprawidłowe źródło.", 403);
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) return fail("Zgłoszenie jest zbyt duże.", 413);
  const contentType = request.headers.get("Content-Type")?.split(";")[0];
  if (!["application/json", "application/x-www-form-urlencoded"].includes(contentType ?? "")) {
    return fail("Nieprawidłowy format zgłoszenia.", 415);
  }
  let input: InquiryInput;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return fail("Zgłoszenie jest zbyt duże.", 413);
    let data: unknown;
    if (contentType === "application/json") {
      data = JSON.parse(body);
    } else {
      const entries: [string, string][] = [];
      new URLSearchParams(body).forEach((value, name) => entries.push([name, value]));
      data = Object.fromEntries(entries);
    }
    input = parseInquiryInput(data);
  } catch (error) {
    return fail(error instanceof InquiryValidationError ? error.message : "Nieprawidłowe dane formularza.", 422);
  }
  const success = () => wantsJson ? json({ ok: true, message: "Zgłoszenie zostało wysłane. Dziękuję!" }, 202)
    : new Response(null, { status: 303, headers: { Location: "/dziekujemy.html", "Cache-Control": "no-store" } });
  if (input.isBot) return success();
  if (!env.DB || !env.RESEND_API_KEY || !env.TRANSACTIONAL_FROM_EMAIL || (env.VISITOR_SALT?.length ?? 0) < 16) {
    return fail(UNAVAILABLE, 503);
  }
  try {
    if (!(await takeRateLimit(request, env))) return fail("Zbyt wiele prób. Spróbuj ponownie za godzinę lub napisz na podroz.martyna@gmail.com.", 429);
    if (!(await sendInquiryEmail(input, env))) return fail(UNAVAILABLE, 503);
    return success();
  } catch {
    return fail(UNAVAILABLE, 503);
  }
}
