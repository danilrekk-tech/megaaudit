import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, jsonResponse, preflight } from "@/lib/cors.server";
import { detectFormat } from "@/lib/site-detect.functions";

export const Route = createFileRoute("/api/public/detect-site")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url")?.trim();
        if (!url) return jsonResponse(request, { error: "url is required" }, 400);
        if (url.length > 2048) return jsonResponse(request, { error: "url is too long" }, 400);
        if (!corsHeaders(request)["access-control-allow-origin"] && request.headers.get("origin")) {
          return new Response("Forbidden origin", { status: 403 });
        }
        return jsonResponse(request, await detectFormat(url));
      },
    },
  },
});
