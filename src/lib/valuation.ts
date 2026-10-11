import { conditionFactor, isGrade, type Grade } from "./grades";
import type { Convert } from "./money";

export type PriceInput = {
  source: string;
  kind: string; // SOLD | ASKING | LOWEST | SUGGESTED
  grade: string | null;
  price: number;
  currency: string;
  observedAt: Date;
};

export type Valuation = {
  /** Estimated Near Mint value in home currency. */
  nm: number;
  low: number;
  high: number;
  /** 0 to 1, from how much recent evidence there is. */
  confidence: number;
  /** Points that survived the outlier trim. */
  used: number;
};

const HALF_LIFE_DAYS = 120;

/**
 * How much each kind of price counts, and how it is adjusted before use.
 * Sales are the truth. Asking prices run high, since plenty never sell.
 * The lowest Discogs listing is left out: it is usually the most worn copy
 * on sale, in an unstated grade, so it says where the floor is and nothing
 * about what a good copy is worth.
 */
const KIND: Record<string, { weight: number; adjust: number }> = {
  SOLD: { weight: 1, adjust: 1 },
  SUGGESTED: { weight: 0.8, adjust: 1 },
  ASKING: { weight: 0.5, adjust: 0.85 },
};

// Grade assumed for a price that does not state one: the most common grade on the market.
const ASSUMED_GRADE: Grade = "VG+";

type Weighted = { value: number; weight: number };

function weightedQuantile(points: Weighted[], q: number): number {
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, p) => sum + p.weight, 0);
  let running = 0;
  for (const p of sorted) {
    running += p.weight;
    if (running >= q * total) return p.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Near Mint market value from every price seen for a release. Each price is
 * converted to home currency, scaled to what a Near Mint copy would fetch,
 * weighted by kind and age, trimmed of outliers, and the weighted median
 * taken. Returns null with no usable prices.
 */
export function valueRelease(prices: PriceInput[], convert: Convert, now = new Date()): Valuation | null {
  const points: Weighted[] = [];
  for (const p of prices) {
    const kind = KIND[p.kind];
    if (!kind || p.price <= 0) continue;
    const grade = isGrade(p.grade) ? p.grade : ASSUMED_GRADE;
    const ageDays = Math.max(0, (now.getTime() - p.observedAt.getTime()) / 86_400_000);
    points.push({
      value: (convert(p.price, p.currency) * kind.adjust) / conditionFactor(grade),
      weight: kind.weight * 0.5 ** (ageDays / HALF_LIFE_DAYS),
    });
  }
  if (points.length === 0) return null;

  let kept = points;
  if (points.length >= 4) {
    const q1 = weightedQuantile(points, 0.25);
    const q3 = weightedQuantile(points, 0.75);
    const fence = 1.5 * (q3 - q1);
    kept = points.filter((p) => p.value >= q1 - fence && p.value <= q3 + fence);
  }

  // Six fresh sales is full confidence.
  const totalWeight = kept.reduce((sum, p) => sum + p.weight, 0);
  return {
    nm: weightedQuantile(kept, 0.5),
    low: weightedQuantile(kept, 0.2),
    high: weightedQuantile(kept, 0.8),
    confidence: Math.min(1, totalWeight / 6),
    used: kept.length,
  };
}

/** What one copy is worth given its condition. */
export function valueCopy(v: Valuation, media: Grade, sleeve: Grade | null, sealed = false): number {
  return v.nm * conditionFactor(media, sleeve, sealed);
}
