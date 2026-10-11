"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { country, errorState, optGrade, optMoney, optText, parse, type ActionState } from "./shared";

const listingFields = z.object({
  releaseId: z.string().min(1, "Pick which release this listing is for"),
  url: z.url("Paste the listing's link"),
  title: optText,
  source: z.enum(["DISCOGS", "EBAY", "VINTED", "AMAZON", "OTHER"]),
  price: z.coerce.number().positive("Price must be above zero"),
  currency: z.string().length(3),
  shipping: optMoney,
  sellerCountry: country,
  grade: optGrade,
  sleeveGrade: optGrade,
});

export async function addListing(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const data = parse(listingFields, fd);
    const release = await prisma.release.findUniqueOrThrow({ where: { id: data.releaseId } });
    await prisma.listing.create({
      data: { ...data, title: data.title ?? `${release.artist}, ${release.title}` },
    });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Listing added" };
}

const STATUSES = ["ACTIVE", "GONE", "DISMISSED", "BOUGHT"] as const;

export async function setListingStatus(id: string, status: (typeof STATUSES)[number]) {
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  await prisma.listing.update({ where: { id }, data: { status, lastSeenAt: new Date() } });
  revalidatePath("/", "layout");
}
