import { z } from "zod";
import { GRADES } from "@/lib/grades";

export type ActionState = { error?: string; ok?: string } | undefined;

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optText = z.preprocess(blankToUndefined, z.string().trim().max(500).optional());
export const optMoney = z.preprocess(blankToUndefined, z.coerce.number().min(0).max(1_000_000).optional());
export const optInt = z.preprocess(blankToUndefined, z.coerce.number().int().optional());
export const grade = z.enum(GRADES);
export const optGrade = z.preprocess(blankToUndefined, z.enum(GRADES).optional());
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
export const optDate = z.preprocess(blankToUndefined, z.coerce.date().optional());
export const country = z.preprocess(
  blankToUndefined,
  z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two letter country code, like GB or DE").optional(),
);

export function parse<T extends z.ZodType>(schema: T, fd: FormData): z.infer<T> {
  const result = schema.safeParse(Object.fromEntries(fd));
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    throw new Error(field ? `${field}: ${issue.message}` : issue.message);
  }
  return result.data;
}

export function errorState(e: unknown): ActionState {
  // Next signals redirects by throwing; those must keep propagating.
  if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
  return { error: e instanceof Error ? e.message : "Something went wrong" };
}
