/**
 * Список источников, которым разрешены запросы к публичным эндпоинтам.
 * Wildcard не используется: только Lovable-домены и адрес внешнего фронтенда.
 */
const DEFAULT_ORIGINS = ["https://megaaudit.lovable.app"];

function allowedOrigins(): string[] {
  const extra = (process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function isAllowed(origin: string): boolean {
  if (allowedOrigins().includes(origin)) return true;
  // Превью-домены Lovable и локальная разработка этого же проекта.
  return /^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)*\.lovable\.app$/i.test(origin)
    || /^http:\/\/localhost:\d+$/.test(origin);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowed(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(request) },
  });
}
