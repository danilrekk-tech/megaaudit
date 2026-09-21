import { createFileRoute } from "@tanstack/react-router";
import { addonPricesInputSchema, fetchAddonPrices } from "@/lib/addon-prices.functions";
import { corsHeaders, jsonResponse, preflight } from "@/lib/cors.server";

export const Route = createFileRoute("/api/public/addon-prices")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => preflight(request),
      POST: async ({ request }) => {
        if (!corsHeaders(request)["access-control-allow-origin"] && request.headers.get("origin")) {
          return new Response("Forbidden origin", { status: 403 });
        }
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return jsonResponse(request, { error: "invalid json" }, 400);
        }
        const parsed = addonPricesInputSchema.safeParse(payload);
        if (!parsed.success) return jsonResponse(request, { error: "invalid payload" }, 400);
        return jsonResponse(request, await fetchAddonPrices(parsed.data.addons));
      },
    },
  },
});
