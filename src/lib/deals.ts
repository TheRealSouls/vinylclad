import { conditionFactor, isGrade, type Grade } from "./grades";
import type { Convert } from "./money";
import { estimateShipping, importCharge, type ShippingSettings } from "./shipping";
import type { Valuation } from "./valuation";

export type DealSettings = ShippingSettings & {
  sellingFeePct: number;
  packagingCost: number;
  dealThresholdPct: number;
};

export type ListingInput = {
  price: number;
  currency: string;
  shipping: number | null;
  sellerCountry: string | null;
  grade: string | null;
  sleeveGrade: string | null;
};

export type Verdict = "STEAL" | "GOOD" | "FAIR" | "OVER" | "UNKNOWN";

export type DealScore = {
  price: number;
  shipping: number;
  shippingEstimated: boolean;
  importCharge: number;
  /** Everything it costs to get the record home. */
  landed: number;
  /** Market value of this copy, null when the release has no price data. */
  value: number | null;
  /** Share under market value. Negative means over. */
  discount: number | null;
  /** Profit if resold at market value after fees and packaging. */
  flipProfit: number | null;
  verdict: Verdict;
};

// Plenty of listings (Vinted, eBay) state no grade. Assume a played copy rather than the best case.
const UNGRADED: Grade = "VG";

export function landedCost(listing: ListingInput, s: DealSettings, convert: Convert) {
  const price = convert(listing.price, listing.currency);
  const shippingEstimated = listing.shipping == null;
  const shipping = shippingEstimated
    ? estimateShipping(listing.sellerCountry, s)
    : convert(listing.shipping as number, listing.currency);
  const duty = importCharge(price + shipping, listing.sellerCountry, s);
  return { price, shipping, shippingEstimated, importCharge: duty, landed: price + shipping + duty };
}

export function scoreListing(
  listing: ListingInput,
  valuation: Valuation | null,
  s: DealSettings,
  convert: Convert,
): DealScore {
  const cost = landedCost(listing, s, convert);
  if (!valuation) return { ...cost, value: null, discount: null, flipProfit: null, verdict: "UNKNOWN" };

  const media = isGrade(listing.grade) ? listing.grade : UNGRADED;
  const sleeve = isGrade(listing.sleeveGrade) ? listing.sleeveGrade : null;
  const value = valuation.nm * conditionFactor(media, sleeve);
  const discount = 1 - cost.landed / value;
  const flipProfit = value * (1 - s.sellingFeePct) - s.packagingCost - cost.landed;

  let verdict: Verdict = "OVER";
  if (discount >= s.dealThresholdPct * 2) verdict = "STEAL";
  else if (discount >= s.dealThresholdPct) verdict = "GOOD";
  else if (discount >= 0) verdict = "FAIR";

  return { ...cost, value, discount, flipProfit, verdict };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  STEAL: "Steal",
  GOOD: "Good deal",
  FAIR: "Fair",
  OVER: "Overpriced",
  UNKNOWN: "No price data",
};
