import { prisma } from "./db";
import type { Context } from "./context";
import { scoreListing, type DealScore } from "./deals";
import { gradeRank, isGrade, type Grade } from "./grades";
import { valueCopy, valueRelease, type Valuation } from "./valuation";

// Older prices carry almost no weight after a couple of years, so skip loading them.
const PRICE_WINDOW_DAYS = 730;

const pricesSince = () => ({ observedAt: { gte: new Date(Date.now() - PRICE_WINDOW_DAYS * 86_400_000) } });

const withPrices = { prices: { where: pricesSince() } } as const;

const asGrade = (g: string): Grade => (isGrade(g) ? g : "VG+");

export async function collectionRows(ctx: Context, status?: string) {
  const items = await prisma.collectionItem.findMany({
    where: status ? { status } : { status: { not: "SOLD" } },
    include: { release: { include: withPrices } },
    orderBy: { createdAt: "desc" },
  });
  return items.map((item) => {
    const valuation = valueRelease(item.release.prices, ctx.convert);
    const value = valuation
      ? valueCopy(valuation, asGrade(item.mediaGrade), asGrade(item.sleeveGrade), item.sealed)
      : null;
    return { item, release: item.release, valuation, value };
  });
}

export type CollectionRow = Awaited<ReturnType<typeof collectionRows>>[number];

export function collectionTotals(rows: CollectionRow[]) {
  let value = 0;
  let paid = 0;
  let valued = 0;
  let paidForValued = 0;
  for (const r of rows) {
    if (r.item.paid != null) paid += r.item.paid;
    if (r.value == null) continue;
    value += r.value;
    valued += 1;
    if (r.item.paid != null) paidForValued += r.item.paid;
  }
  return { count: rows.length, valued, value, paid, paidForValued };
}

export type DealRow = {
  listing: Awaited<ReturnType<typeof loadListings>>[number];
  valuation: Valuation | null;
  score: DealScore;
};

function loadListings(where: object) {
  return prisma.listing.findMany({
    where,
    include: { release: { include: withPrices } },
    orderBy: { lastSeenAt: "desc" },
  });
}

export async function dealRows(ctx: Context, where: object = { status: "ACTIVE" }): Promise<DealRow[]> {
  const listings = await loadListings(where);
  const rows = listings.map((listing) => {
    const valuation = listing.release ? valueRelease(listing.release.prices, ctx.convert) : null;
    return { listing, valuation, score: scoreListing(listing, valuation, ctx.settings, ctx.convert) };
  });
  // Best discount first; listings that cannot be valued go last.
  return rows.sort((a, b) => (b.score.discount ?? -Infinity) - (a.score.discount ?? -Infinity));
}

export async function wishlistRows(ctx: Context) {
  const wishes = await prisma.wishlistItem.findMany({
    include: {
      release: { include: { ...withPrices, listings: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
  return wishes.map((wish) => {
    const valuation = valueRelease(wish.release.prices, ctx.convert);
    const minRank = gradeRank(asGrade(wish.minGrade));
    // Listings that meet the grade floor, cheapest landed first. Ungraded ones are kept: the seller can be asked.
    const offers = wish.release.listings
      .filter((l) => !isGrade(l.grade) || gradeRank(l.grade) <= minRank)
      .map((listing) => ({ listing, score: scoreListing(listing, valuation, ctx.settings, ctx.convert) }))
      .sort((a, b) => a.score.landed - b.score.landed);
    const best = offers[0] ?? null;
    const fitsBudget = (o: (typeof offers)[number]) => wish.maxPrice == null || o.score.landed <= wish.maxPrice;
    // A FLIP wish only counts as a hit when reselling would make money.
    const hit = offers.find((o) => fitsBudget(o) && (wish.purpose !== "FLIP" || (o.score.flipProfit ?? 0) > 0)) ?? null;
    return { wish, release: wish.release, valuation, best, hit, offerCount: offers.length };
  });
}

export async function releaseDetail(id: string) {
  return prisma.release.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "desc" } },
      wishes: true,
      prices: { orderBy: { observedAt: "desc" } },
    },
  });
}

/** Lets the listing form offer every stored release. */
export function releaseOptions() {
  return prisma.release.findMany({
    select: { id: true, artist: true, title: true, year: true, format: true },
    orderBy: [{ artist: "asc" }, { title: "asc" }],
  });
}
