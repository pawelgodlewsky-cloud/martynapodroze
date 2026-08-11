export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

export function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export async function requestJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 200_000) throw new Error("Żądanie jest zbyt duże.");
  const body = await request.text();
  if (body.length > 200_000) throw new Error("Żądanie jest zbyt duże.");
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error("Nieprawidłowy JSON.");
  }
}

export function securityHeaders(contentType: string): Headers {
  return new Headers({
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
}
