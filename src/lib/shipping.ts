/**
 * Postage and import costs to the home address. Countries are grouped into
 * customs areas: anything crossing from one area into another may pick up
 * import VAT and a handling fee on arrival.
 */
const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// Close enough that post is cheap, but each is its own customs area.
const EUROPE_OTHER = new Set(["GB", "NO", "CH", "IS"]);

export function customsArea(country: string): string {
  const code = country.toUpperCase();
  return EU.has(code) ? "EU" : code;
}

function isEurope(country: string) {
  const code = country.toUpperCase();
  return EU.has(code) || EUROPE_OTHER.has(code);
}

export type ShippingSettings = {
  country: string;
  shipDomestic: number;
  shipSameZone: number;
  shipCrossZone: number;
  shipWorld: number;
  importChargePct: number;
};

export type Route = "DOMESTIC" | "SAME_ZONE" | "CROSS_ZONE" | "WORLD" | "UNKNOWN";

export function route(from: string | null | undefined, to: string): Route {
  if (!from) return "UNKNOWN";
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return "DOMESTIC";
  if (customsArea(a) === customsArea(b)) return "SAME_ZONE";
  if (isEurope(a) && isEurope(b)) return "CROSS_ZONE";
  return "WORLD";
}

/** Estimated postage in home currency when a listing does not state it. */
export function estimateShipping(from: string | null | undefined, s: ShippingSettings): number {
  switch (route(from, s.country)) {
    case "DOMESTIC":
      return s.shipDomestic;
    case "SAME_ZONE":
      return s.shipSameZone;
    case "CROSS_ZONE":
      return s.shipCrossZone;
    // Unknown origin is priced as the worst case so it never looks better than it is.
    default:
      return s.shipWorld;
  }
}

/** Import VAT and handling on goods plus postage, when a parcel crosses a customs border. */
export function importCharge(goodsAndPostage: number, from: string | null | undefined, s: ShippingSettings): number {
  const r = route(from, s.country);
  if (r === "DOMESTIC" || r === "SAME_ZONE") return 0;
  return goodsAndPostage * s.importChargePct;
}
