"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseReleaseId } from "@/lib/sources/discogs";
import { importFromDiscogs, syncRelease } from "@/lib/sync";
import {
  checkbox, errorState, grade, optDate, optGrade, optInt, optMoney, optText, parse, type ActionState,
} from "./shared";

const FORMATS = ["LP", "2LP", "3LP", "BOX", "12IN", "10IN", "7IN"] as const;

const releaseFields = z.object({
  discogs: optText,
  artist: optText,
  title: optText,
  year: optInt,
  label: optText,
  catalogNo: optText,
  format: z.enum(FORMATS).default("LP"),
  variant: optText,
  pressing: optText,
  limited: checkbox,
});

/** Finds or creates the release a form describes, from Discogs when an ID or URL is given. */
async function resolveRelease(fd: FormData) {
  const f = parse(releaseFields, fd);
  if (f.discogs) {
    const id = parseReleaseId(f.discogs);
    if (!id) throw new Error("That does not look like a Discogs release ID or link");
    const release = await importFromDiscogs(id);
    // Pull today's prices straight away so the record has a value from the start.
    await syncRelease(release.id).catch(() => 0);
    return release;
  }
  if (!f.artist || !f.title) throw new Error("Give a Discogs link, or at least an artist and title");
  const { discogs: _, artist, title, ...rest } = f;
  return prisma.release.create({ data: { artist, title, ...rest } });
}

const itemFields = z.object({
  mediaGrade: grade,
  sleeveGrade: grade,
  sealed: checkbox,
  paid: optMoney,
  acquiredAt: optDate,
  source: optText,
  notes: optText,
});

export async function addToCollection(_: ActionState, fd: FormData): Promise<ActionState> {
  let releaseId: string;
  try {
    const item = parse(itemFields, fd);
    const release = await resolveRelease(fd);
    await prisma.collectionItem.create({ data: { ...item, releaseId: release.id } });
    releaseId = release.id;
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  redirect(`/releases/${releaseId}`);
}

const itemUpdate = itemFields.extend({
  status: z.enum(["KEEP", "FOR_SALE", "SOLD"]),
  soldPrice: optMoney,
});

export async function updateCollectionItem(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const data = parse(itemUpdate, fd);
    await prisma.collectionItem.update({
      where: { id },
      data: {
        ...data,
        acquiredAt: data.acquiredAt ?? null,
        paid: data.paid ?? null,
        source: data.source ?? null,
        notes: data.notes ?? null,
        soldPrice: data.status === "SOLD" ? (data.soldPrice ?? null) : null,
        soldAt: data.status === "SOLD" ? new Date() : null,
      },
    });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

export async function deleteCollectionItem(id: string) {
  const item = await prisma.collectionItem.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect(`/releases/${item.releaseId}`);
}

const wishFields = z.object({
  maxPrice: optMoney,
  minGrade: grade.default("VG+"),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  purpose: z.enum(["LISTEN", "FLIP"]).default("LISTEN"),
  notes: optText,
});

export async function addToWishlist(_: ActionState, fd: FormData): Promise<ActionState> {
  let releaseId: string;
  try {
    const wish = parse(wishFields, fd);
    const release = await resolveRelease(fd);
    await prisma.wishlistItem.upsert({
      where: { releaseId: release.id },
      update: wish,
      create: { ...wish, releaseId: release.id },
    });
    releaseId = release.id;
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  redirect(`/releases/${releaseId}`);
}

/** Puts an already stored release on the wishlist. */
export async function wishRelease(releaseId: string) {
  await prisma.wishlistItem.upsert({ where: { releaseId }, update: {}, create: { releaseId } });
  revalidatePath("/", "layout");
}

export async function updateWish(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const data = parse(wishFields, fd);
    await prisma.wishlistItem.update({
      where: { id },
      data: { ...data, maxPrice: data.maxPrice ?? null, notes: data.notes ?? null },
    });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

export async function deleteWish(id: string) {
  await prisma.wishlistItem.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function syncReleaseAction(releaseId: string, _: ActionState): Promise<ActionState> {
  try {
    const added = await syncRelease(releaseId);
    revalidatePath("/", "layout");
    return { ok: added ? `Added ${added} price${added === 1 ? "" : "s"} from Discogs` : "Discogs has no copies listed right now" };
  } catch (e) {
    return errorState(e);
  }
}

const linkFields = z.object({ discogs: z.string().trim().min(1, "Paste a Discogs release link or ID") });

export async function linkDiscogs(releaseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const id = parseReleaseId(parse(linkFields, fd).discogs);
    if (!id) throw new Error("That does not look like a Discogs release ID or link");
    const taken = await prisma.release.findUnique({ where: { discogsId: id } });
    if (taken && taken.id !== releaseId) throw new Error(`Already linked to ${taken.artist}, ${taken.title}`);
    await prisma.release.update({ where: { id: releaseId }, data: { discogsId: id } });
    await syncRelease(releaseId);
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Linked and synced" };
}

const priceFields = z.object({
  kind: z.enum(["SOLD", "ASKING"]),
  source: z.enum(["DISCOGS", "EBAY", "VINTED", "AMAZON", "MANUAL"]),
  grade: optGrade,
  price: z.coerce.number().positive("Price must be above zero"),
  currency: z.string().length(3),
  observedAt: optDate,
  url: optText,
});

export async function addPricePoint(releaseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const data = parse(priceFields, fd);
    await prisma.pricePoint.create({ data: { ...data, releaseId, observedAt: data.observedAt ?? new Date() } });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Price added" };
}

export async function deletePricePoint(id: string) {
  await prisma.pricePoint.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function deleteRelease(id: string) {
  await prisma.release.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/collection");
}
