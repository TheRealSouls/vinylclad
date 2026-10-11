/** Rates against EUR. Live ones come from the ECB feed (see fx.ts); these
 * fill in until the first refresh and for anything the feed leaves out. */
export const FALLBACK_PER_EUR: Record<string, number> = {
  EUR: 1,
  GBP: 0.85,
  USD: 1.12,
  CAD: 1.59,
  AUD: 1.6,
  JPY: 177,
  SEK: 11.2,
  DKK: 7.47,
  NOK: 10.7,
  PLN: 4.38,
  CHF: 0.93,
  CZK: 24.4,
};

export type Rates = Record<string, number>;

/** Builds a converter into `home`. Unknown currencies throw rather than guess. */
export function converter(home: string, rates: Rates) {
  const perEur = (code: string) => {
    const rate = rates[code] ?? FALLBACK_PER_EUR[code];
    if (!rate) throw new Error(`No exchange rate for ${code}`);
    return rate;
  };
  return (amount: number, from: string) => (from === home ? amount : (amount / perEur(from)) * perEur(home));
}

export type Convert = ReturnType<typeof converter>;

export function formatMoney(amount: number | null | undefined, currency: string, opts: { whole?: boolean } = {}) {
  if (amount == null || Number.isNaN(amount)) return "–";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: opts.whole ? 0 : 2,
    minimumFractionDigits: opts.whole ? 0 : 2,
  }).format(amount);
}

export function formatPct(share: number, signed = false) {
  const pct = Math.round(share * 1000) / 10;
  return `${signed && pct > 0 ? "+" : ""}${pct}%`;
}

export const CURRENCIES = Object.keys(FALLBACK_PER_EUR);
