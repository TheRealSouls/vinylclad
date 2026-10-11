"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { refreshRates } from "@/lib/fx";
import { errorState, optText, parse, type ActionState } from "./shared";

const money = z.coerce.number().min(0).max(1000);
const share = z.coerce.number().min(0).max(100).transform((pct) => pct / 100);

const settingsFields = z.object({
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two letter country code, like GB"),
  postcode: optText,
  currency: z.string().length(3),
  shipDomestic: money,
  shipSameZone: money,
  shipCrossZone: money,
  shipWorld: money,
  importChargePct: share,
  sellingFeePct: share,
  packagingCost: money,
  dealThresholdPct: share,
});

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const data = parse(settingsFields, fd);
    const row = { ...data, postcode: data.postcode ?? null };
    await prisma.settings.upsert({ where: { id: 1 }, update: row, create: { id: 1, ...row } });
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Settings saved" };
}

export async function refreshRatesAction(_: ActionState): Promise<ActionState> {
  try {
    const n = await refreshRates();
    revalidatePath("/", "layout");
    return { ok: `Updated ${n} exchange rates` };
  } catch (e) {
    return errorState(e);
  }
}
