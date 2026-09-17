import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import type { Addon } from "@/lib/audit-types";
import { getAddonPrices } from "@/lib/addon-prices.functions";

export function useAddonPrices(addons: Addon[]) {
  const loadPrices = useServerFn(getAddonPrices);
  const requestKey = addons.map((addon) => `${addon.id}:${addon.page_url}`).join("|");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requestKey) {
      setPrices({});
      return;
    }

    let active = true;
    setLoading(true);
    const requested = requestKey.split("|").map((entry) => {
      const separator = entry.indexOf(":");
      return { id: entry.slice(0, separator), pageUrl: entry.slice(separator + 1) };
    });

    void loadPrices({ data: { addons: requested } })
      .then((results) => {
        if (!active) return;
        const next: Record<string, number> = {};
        results.forEach((result) => {
          if (result.price !== null) next[result.id] = result.price;
        });
        setPrices(next);
      })
      .catch(() => {
        if (active) setPrices({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadPrices, requestKey]);

  return useMemo(() => ({ prices, loading }), [loading, prices]);
}