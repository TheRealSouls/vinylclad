import { parseGrade, type Grade } from "../grades";

/**
 * Discogs API. Release lookup and marketplace stats are public. Search and
 * price suggestions need a personal access token in DISCOGS_TOKEN.
 * Unauthenticated calls are limited to 25 a minute, authenticated to 60.
 */
const API = "https://api.discogs.com";
const USER_AGENT = "Vinylclad/0.1";

export function hasToken() {
  return Boolean(process.env.DISCOGS_TOKEN);
}

async function call<T>(path: string, needsToken = false): Promise<T> {
  const token = process.env.DISCOGS_TOKEN;
  if (needsToken && !token) throw new Error("This needs a Discogs token (DISCOGS_TOKEN in .env)");
  const res = await fetch(`${API}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      ...(token ? { Authorization: `Discogs token=${token}` } : {}),
    },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Discogs has no release with that ID");
  if (res.status === 429) throw new Error("Discogs rate limit reached, try again in a minute");
  if (!res.ok) throw new Error(`Discogs answered ${res.status}`);
  return res.json() as Promise<T>;
}

/** Accepts a bare ID or any discogs.com release URL. */
export function parseReleaseId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/discogs\.com\/(?:[^/]+\/)?release\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

type RawRelease = {
  id: number;
  title: string;
  year?: number;
  country?: string;
  artists?: { name: string }[];
  labels?: { name: string; catno: string }[];
  formats?: { name: string; qty: string; descriptions?: string[]; text?: string }[];
  genres?: string[];
  images?: { type: string; uri: string }[];
  community?: { have: number; want: number; rating?: { count: number; average: number } };
};

export type DiscogsRelease = {
  discogsId: number;
  artist: string;
  title: string;
  year: number | null;
  label: string | null;
  catalogNo: string | null;
  country: string | null;
  format: string;
  variant: string | null;
  pressing: string | null;
  limited: boolean;
  genres: string | null;
  coverUrl: string | null;
  haveCount: number | null;
  wantCount: number | null;
  rating: number | null;
  ratingCount: number | null;
};

// Discogs appends "(2)" and similar to tell apart artists who share a name.
const cleanArtist = (name: string) => name.replace(/\s\(\d+\)$/, "");

function mapFormat(formats: RawRelease["formats"]): { format: string; descriptions: string[]; text: string | null } {
  const vinyl = formats?.find((f) => f.name === "Vinyl");
  const box = formats?.find((f) => f.name === "Box Set");
  const descriptions = vinyl?.descriptions ?? [];
  const qty = Number(vinyl?.qty ?? 1);
  let format = "LP";
  if (box || qty > 3) format = "BOX";
  else if (descriptions.includes('7"')) format = "7IN";
  else if (descriptions.includes('10"')) format = "10IN";
  else if (descriptions.includes('12"') && !descriptions.includes("LP")) format = "12IN";
  else if (qty === 2) format = "2LP";
  else if (qty === 3) format = "3LP";
  return { format, descriptions, text: vinyl?.text?.trim() || null };
}

export async function getRelease(id: number): Promise<DiscogsRelease> {
  const r = await call<RawRelease>(`/releases/${id}`);
  const { format, descriptions, text } = mapFormat(r.formats);
  const pressing = descriptions.includes("Reissue")
    ? "Reissue"
    : descriptions.includes("Repress")
      ? "Repress"
      : null;
  const primary = r.images?.find((i) => i.type === "primary") ?? r.images?.[0];
  return {
    discogsId: r.id,
    artist: (r.artists ?? []).map((a) => cleanArtist(a.name)).join(", ") || "Unknown artist",
    title: r.title,
    year: r.year || null,
    label: r.labels?.[0]?.name ?? null,
    catalogNo: r.labels?.[0]?.catno ?? null,
    country: r.country ?? null,
    format,
    variant: text,
    pressing,
    limited: descriptions.includes("Limited Edition"),
    genres: r.genres?.join(", ") ?? null,
    coverUrl: primary?.uri ?? null,
    haveCount: r.community?.have ?? null,
    wantCount: r.community?.want ?? null,
    rating: r.community?.rating?.average ?? null,
    ratingCount: r.community?.rating?.count ?? null,
  };
}

/** The cheapest copy on the Discogs marketplace right now, in any grade. */
export async function getMarketStats(id: number, currency: string) {
  const s = await call<{ num_for_sale: number; lowest_price: { value: number; currency: string } | null }>(
    `/marketplace/stats/${id}?curr_abbr=${currency}`,
  );
  return { forSale: s.num_for_sale, lowest: s.lowest_price };
}

/** Discogs' own suggested price for each grade, from its sales history. Needs a token. */
export async function getPriceSuggestions(id: number): Promise<{ grade: Grade; price: number; currency: string }[]> {
  const body = await call<Record<string, { value: number; currency: string }>>(
    `/marketplace/price_suggestions/${id}`,
    true,
  );
  const out: { grade: Grade; price: number; currency: string }[] = [];
  for (const [label, p] of Object.entries(body)) {
    const grade = parseGrade(label);
    if (grade && p.value > 0) out.push({ grade, price: p.value, currency: p.currency });
  }
  return out;
}

export type SearchHit = { discogsId: number; title: string; year: string | null; format: string | null; thumb: string | null };

export async function searchReleases(query: string): Promise<SearchHit[]> {
  const body = await call<{
    results: { id: number; title: string; year?: string; format?: string[]; thumb?: string }[];
  }>(`/database/search?type=release&format=Vinyl&per_page=15&q=${encodeURIComponent(query)}`, true);
  return body.results.map((r) => ({
    discogsId: r.id,
    title: r.title,
    year: r.year ?? null,
    format: r.format?.join(", ") ?? null,
    thumb: r.thumb || null,
  }));
}
