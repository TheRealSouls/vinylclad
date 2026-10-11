import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionFactor, parseGrade } from "./grades";
import { converter } from "./money";
import { estimateShipping, importCharge, route } from "./shipping";
import { valueRelease } from "./valuation";
import { scoreListing, type DealSettings } from "./deals";

const gbp = converter("GBP", { EUR: 1, GBP: 0.85, USD: 1.1 });
const now = new Date("2026-10-01");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const settings: DealSettings = {
  country: "GB",
  shipDomestic: 4.5,
  shipSameZone: 12,
  shipCrossZone: 16,
  shipWorld: 28,
  importChargePct: 0.2,
  sellingFeePct: 0.125,
  packagingCost: 2,
  dealThresholdPct: 0.2,
};

test("grades parse from marketplace wording", () => {
  assert.equal(parseGrade("Very Good Plus (VG+)"), "VG+");
  assert.equal(parseGrade("Near Mint (NM or M-)"), "NM");
  assert.equal(parseGrade("Mint (M)"), "M");
  assert.equal(parseGrade("Good Plus (G+)"), "G+");
  assert.equal(parseGrade("near mint"), "NM");
  assert.equal(parseGrade("vg"), "VG");
  assert.equal(parseGrade(""), null);
});

test("condition weighs the record over the sleeve, sealed counts as mint", () => {
  assert.equal(conditionFactor("NM"), 1);
  assert.ok(conditionFactor("NM", "VG") > conditionFactor("VG", "NM"));
  assert.equal(conditionFactor("G", "G", true), conditionFactor("M"));
});

test("currency conversion goes through EUR", () => {
  assert.equal(gbp(10, "GBP"), 10);
  assert.ok(Math.abs(gbp(100, "EUR") - 85) < 1e-9);
  assert.ok(Math.abs(gbp(110, "USD") - 85) < 1e-9);
  assert.throws(() => gbp(1, "XYZ"));
});

test("routes and customs follow the customs areas", () => {
  assert.equal(route("GB", "GB"), "DOMESTIC");
  assert.equal(route("DE", "FR"), "SAME_ZONE");
  assert.equal(route("DE", "GB"), "CROSS_ZONE");
  assert.equal(route("US", "GB"), "WORLD");
  assert.equal(route(null, "GB"), "UNKNOWN");
  assert.equal(estimateShipping(null, settings), settings.shipWorld);
  assert.equal(importCharge(100, "FR", { ...settings, country: "DE" }), 0);
  assert.equal(importCharge(100, "DE", settings), 20);
});

test("valuation normalises grades to Near Mint and takes the weighted median", () => {
  const v = valueRelease(
    [
      { source: "X", kind: "SOLD", grade: "NM", price: 30, currency: "GBP", observedAt: daysAgo(5) },
      { source: "X", kind: "SOLD", grade: "NM", price: 32, currency: "GBP", observedAt: daysAgo(10) },
      { source: "X", kind: "SOLD", grade: "VG+", price: 0.68 * 31, currency: "GBP", observedAt: daysAgo(3) },
    ],
    gbp,
    now,
  );
  assert.ok(v);
  assert.ok(Math.abs(v.nm - 31) < 0.01, `expected about 31, got ${v.nm}`);
});

test("valuation trims a wild outlier", () => {
  const sold = (price: number) => ({ source: "X", kind: "SOLD", grade: "NM", price, currency: "GBP", observedAt: daysAgo(1) });
  const v = valueRelease([sold(20), sold(21), sold(22), sold(23), sold(400)], gbp, now);
  assert.ok(v);
  assert.equal(v.used, 4);
  assert.ok(v.high < 30);
});

test("old prices fade and confidence follows the evidence", () => {
  const sold = (price: number, age: number) => ({ source: "X", kind: "SOLD", grade: "NM", price, currency: "GBP", observedAt: daysAgo(age) });
  const v = valueRelease([sold(50, 700), sold(20, 1), sold(20, 2)], gbp, now);
  assert.ok(v);
  assert.equal(v.nm, 20);
  assert.ok(v.confidence < 0.5);
  assert.equal(valueRelease([], gbp, now), null);
  // The cheapest listing alone is a floor, not a value.
  assert.equal(
    valueRelease([{ source: "DISCOGS", kind: "LOWEST", grade: null, price: 6, currency: "GBP", observedAt: daysAgo(0) }], gbp, now),
    null,
  );
});

test("deal score prices the copy to the door", () => {
  const valuation = { nm: 50, low: 40, high: 60, confidence: 1, used: 6 };
  // A German seller to a UK address: estimated cross-border postage plus 20% import charge.
  const s = scoreListing(
    { price: 20, currency: "EUR", shipping: null, sellerCountry: "DE", grade: "NM", sleeveGrade: "NM" },
    valuation,
    settings,
    gbp,
  );
  assert.equal(s.shippingEstimated, true);
  assert.ok(Math.abs(s.landed - (17 + 16) * 1.2) < 1e-9);
  assert.equal(s.value, 50);
  assert.equal(s.verdict, "GOOD");
  assert.ok(Math.abs((s.flipProfit ?? 0) - (50 * 0.875 - 2 - s.landed)) < 1e-9);

  const unknown = scoreListing({ price: 5, currency: "GBP", shipping: 0, sellerCountry: "GB", grade: null, sleeveGrade: null }, null, settings, gbp);
  assert.equal(unknown.verdict, "UNKNOWN");
});
