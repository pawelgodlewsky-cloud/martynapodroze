import {
  LINK_TYPES,
  TRIP_STATUSES,
  type LinkType,
  type TripInput,
  type TripLinkInput,
  type TripStatus
} from "./types";

const MONTH_SLUGS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "wrzesnia",
  "pazdziernika",
  "listopada",
  "grudnia"
];

const DISPLAY_MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia"
];

const MAX_TEXT = 5000;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function readDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function makeTripSlug(destination: string, startDate: string, endDate: string): string {
  const start = readDate(startDate);
  const end = readDate(endDate);
  if (!start || !end) return slugify(destination);

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = MONTH_SLUGS[start.getUTCMonth()] ?? "";
  const endMonth = MONTH_SLUGS[end.getUTCMonth()] ?? "";
  const dates = start.getUTCMonth() === end.getUTCMonth()
    ? `${startDay}-${endDay}-${endMonth}`
    : `${startDay}-${startMonth}-${endDay}-${endMonth}`;

  return slugify(`${destination}-${dates}`);
}

function text(value: unknown, field: string, required = false, max = MAX_TEXT): string {
  if (value === null || value === undefined) value = "";
  if (typeof value !== "string") throw new ValidationError(`Pole „${field}” ma nieprawidłowy format.`);
  const normalized = value.trim();
  if (required && !normalized) throw new ValidationError(`Uzupełnij pole „${field}”.`);
  if (normalized.length > max) throw new ValidationError(`Pole „${field}” jest zbyt długie.`);
  return normalized;
}

function amount(value: unknown, field: string, required = false): number | null {
  if (value === "" || value === null || value === undefined) {
    if (required) throw new ValidationError(`Uzupełnij pole „${field}”.`);
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
    throw new ValidationError(`Pole „${field}” musi być poprawną, nieujemną kwotą.`);
  }
  return Math.round(parsed * 100) / 100;
}

function integer(value: unknown, field: string): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
    throw new ValidationError(`Pole „${field}” musi być nieujemną liczbą całkowitą.`);
  }
  return parsed;
}

export function validateHttpUrl(value: unknown, field = "URL"): string {
  const raw = text(value, field, true, 4000);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError(`Pole „${field}” musi zawierać poprawny adres URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError(`Pole „${field}” dopuszcza tylko adresy http/https.`);
  }
  if (!parsed.hostname) throw new ValidationError(`Pole „${field}” musi zawierać nazwę hosta.`);
  return parsed.toString();
}

function currency(value: unknown): string {
  const normalized = text(value ?? "PLN", "waluta", true, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new ValidationError("Waluta musi mieć trzyliterowy kod, np. PLN.");
  return normalized;
}

function optionalIsoDateTime(value: unknown): string | null {
  const normalized = text(value, "wygasa", false, 40);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) throw new ValidationError("Data wygaśnięcia jest nieprawidłowa.");
  return date.toISOString();
}

function parseLink(value: unknown, index: number, fallbackCurrency: string): TripLinkInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`Element ${index + 1} ma nieprawidłowy format.`);
  }
  const raw = value as Record<string, unknown>;
  const type = text(raw.type, `typ elementu ${index + 1}`, true, 20) as LinkType;
  if (!LINK_TYPES.includes(type)) throw new ValidationError(`Element ${index + 1} ma nieobsługiwany typ.`);

  return {
    id: text(raw.id, "identyfikator elementu", false, 80) || undefined,
    type,
    label: text(raw.label, `nazwa elementu ${index + 1}`, true, 180),
    description: text(raw.description, `opis elementu ${index + 1}`) || null,
    price: amount(raw.price, `cena elementu ${index + 1}`),
    currency: currency(raw.currency ?? fallbackCurrency),
    url: validateHttpUrl(raw.url, `URL elementu ${index + 1}`),
    sort_order: index,
    from_location: text(raw.from_location, `skąd — element ${index + 1}`, false, 180) || null,
    to_location: text(raw.to_location, `dokąd — element ${index + 1}`, false, 180) || null,
    provider: text(raw.provider, `dostawca — element ${index + 1}`, false, 180) || null,
    nights: integer(raw.nights, `liczba nocy — element ${index + 1}`)
  };
}

export function parseTripInput(value: unknown): TripInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Nieprawidłowy format propozycji.");
  }
  const raw = value as Record<string, unknown>;
  const destination = text(raw.destination, "kierunek", true, 140);
  const startDate = text(raw.start_date, "data od", true, 10);
  const endDate = text(raw.end_date, "data do", true, 10);
  const start = readDate(startDate);
  const end = readDate(endDate);
  if (!start || !end) throw new ValidationError("Podaj poprawny zakres dat.");
  if (end < start) throw new ValidationError("Data powrotu nie może być wcześniejsza niż data wyjazdu.");

  const tripCurrency = currency(raw.currency ?? "PLN");
  const status = text(raw.status ?? "draft", "status", true, 20) as TripStatus;
  if (!TRIP_STATUSES.includes(status)) throw new ValidationError("Nieprawidłowy status propozycji.");
  if (!Array.isArray(raw.links) || raw.links.length < 2 || raw.links.length > 30) {
    throw new ValidationError("Dodaj lot i nocleg (maksymalnie 30 elementów)." );
  }
  const links = raw.links.map((link, index) => parseLink(link, index, tripCurrency));
  if (!links.some((link) => link.type === "flight")) throw new ValidationError("Dodaj link do lotu.");
  if (!links.some((link) => link.type === "lodging")) throw new ValidationError("Dodaj link do noclegu.");

  const requestedSlug = text(raw.slug, "slug", false, 100);
  const normalizedSlug = slugify(requestedSlug || makeTripSlug(destination, startDate, endDate));
  if (!normalizedSlug) throw new ValidationError("Nie udało się utworzyć poprawnego sluga.");

  return {
    slug: normalizedSlug,
    destination,
    country: text(raw.country, "kraj", true, 100),
    country_emoji: text(raw.country_emoji, "flaga", false, 16),
    departure_city: text(raw.departure_city, "miasto wylotu", true, 140),
    departure_airport: text(raw.departure_airport, "lotnisko", false, 180),
    start_date: startDate,
    end_date: endDate,
    total_price: amount(raw.total_price, "cena całkowita", true) ?? 0,
    currency: tripCurrency,
    personal_note: text(raw.personal_note, "Kilka słów ode mnie") || null,
    status,
    expires_at: optionalIsoDateTime(raw.expires_at),
    links
  };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatPrice(value: number | null, currencyCode: string): string {
  if (value === null) return "";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatTripDates(startDate: string, endDate: string, includeYear = true): string {
  const start = readDate(startDate);
  const end = readDate(endDate);
  if (!start || !end) return `${startDate}–${endDate}`;
  const startMonth = DISPLAY_MONTHS[start.getUTCMonth()] ?? "";
  const endMonth = DISPLAY_MONTHS[end.getUTCMonth()] ?? "";
  const yearSuffix = includeYear ? ` ${end.getUTCFullYear()}` : "";
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${endMonth}${yearSuffix}`;
  }
  return `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth}${yearSuffix}`;
}
