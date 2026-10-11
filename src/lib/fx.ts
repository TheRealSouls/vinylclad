import { prisma } from "./db";

const FEED = "https://api.frankfurter.dev/v1/latest?base=EUR";

/** Pulls the latest ECB reference rates. They update once a working day. */
export async function refreshRates(): Promise<number> {
  const res = await fetch(FEED, { cache: "no-store" });
  if (!res.ok) throw new Error(`Exchange rate feed answered ${res.status}`);
  const body = (await res.json()) as { rates: Record<string, number> };
  const rates = { EUR: 1, ...body.rates };
  await prisma.$transaction(
    Object.entries(rates).map(([currency, perEur]) =>
      prisma.fxRate.upsert({ where: { currency }, update: { perEur }, create: { currency, perEur } }),
    ),
  );
  return Object.keys(rates).length;
}
