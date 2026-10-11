import { prisma } from "./db";
import * as discogs from "./sources/discogs";

/** Creates a release from Discogs, or returns the one already stored for that ID. */
export async function importFromDiscogs(discogsId: number) {
  const existing = await prisma.release.findUnique({ where: { discogsId } });
  if (existing) return existing;
  const data = await discogs.getRelease(discogsId);
  return prisma.release.create({ data: { ...data, syncedAt: new Date() } });
}

/**
 * Refreshes a release's Discogs community counts and records today's
 * marketplace prices: the lowest asking price, and with a token the
 * suggested price for every grade. Returns how many prices were added.
 */
export async function syncRelease(releaseId: string): Promise<number> {
  const release = await prisma.release.findUniqueOrThrow({ where: { id: releaseId } });
  if (!release.discogsId) throw new Error("Link this release to Discogs first");
  const { currency } = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const [fresh, stats, suggestions] = await Promise.all([
    discogs.getRelease(release.discogsId),
    discogs.getMarketStats(release.discogsId, currency),
    discogs.hasToken() ? discogs.getPriceSuggestions(release.discogsId) : Promise.resolve([]),
  ]);

  const url = `https://www.discogs.com/sell/release/${release.discogsId}`;
  const points = [
    ...(stats.lowest
      ? [{ kind: "LOWEST", grade: null, price: stats.lowest.value, currency: stats.lowest.currency }]
      : []),
    ...suggestions.map((s) => ({ kind: "SUGGESTED", grade: s.grade, price: s.price, currency: s.currency })),
  ];

  await prisma.$transaction([
    prisma.release.update({
      where: { id: releaseId },
      data: {
        haveCount: fresh.haveCount,
        wantCount: fresh.wantCount,
        rating: fresh.rating,
        ratingCount: fresh.ratingCount,
        coverUrl: release.coverUrl ?? fresh.coverUrl,
        syncedAt: new Date(),
      },
    }),
    prisma.pricePoint.createMany({
      data: points.map((p) => ({ ...p, releaseId, source: "DISCOGS", url })),
    }),
  ]);
  return points.length;
}
