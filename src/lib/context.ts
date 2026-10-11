import { prisma } from "./db";
import { converter, formatMoney } from "./money";

/**
 * Settings plus a currency converter and formatter for the home currency.
 * Every page that shows a price starts here.
 */
export async function loadContext() {
  const [settings, rates] = await Promise.all([
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.fxRate.findMany(),
  ]);
  const convert = converter(
    settings.currency,
    Object.fromEntries(rates.map((r) => [r.currency, r.perEur])),
  );
  const money = (amount: number | null | undefined, whole = false) => formatMoney(amount, settings.currency, { whole });
  return { settings, convert, money };
}

export type Context = Awaited<ReturnType<typeof loadContext>>;
