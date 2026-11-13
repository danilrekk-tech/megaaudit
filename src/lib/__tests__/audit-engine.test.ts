import { describe, expect, it } from "vitest";
import { evaluateChecks, runAudit } from "../audit-engine";
import type { SiteChecks } from "../site-detect.functions";

const good: SiteChecks = { https: true, viewport: true, title: true, description: true, ogTags: true, forms: 1, phone: true, messengers: true, reviews: true, legal: true, images: 3, lazyImages: 0, scripts: 10, htmlKb: 80, h1: 1, schema: true };

describe("evaluateChecks", () => {
  it("no viewport is a mobile problem", () => {
    const r = evaluateChecks({ ...good, viewport: false }, "mobile");
    expect(r.penalty).toBe(18);
    expect(r.findings).toHaveLength(1);
  });
  it("healthy site has no trust penalty", () => {
    expect(evaluateChecks(good, "trust").penalty).toBe(0);
  });
});

describe("runAudit with real checks", () => {
  it("broken site scores lower than healthy one", () => {
    const bad = { ...good, viewport: false, forms: 0, phone: false, messengers: false, reviews: false, htmlKb: 900, scripts: 80 };
    const a = runAudit("x.ru", [], { detect: { reason: "", pages: 3, reached: true, checks: good } });
    const b = runAudit("x.ru", [], { detect: { reason: "", pages: 3, reached: true, checks: bad } });
    expect(b.overall).toBeLessThan(a.overall);
  });
});
