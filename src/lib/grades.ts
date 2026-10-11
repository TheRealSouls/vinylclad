/**
 * Goldmine grading. The multipliers say what a copy in that grade fetches
 * compared with a Near Mint one. They sit between the strict Goldmine guide
 * (VG+ at half of NM) and what Discogs sales show, where clean VG+ copies
 * often go for two thirds or more.
 */
export const GRADES = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_NAMES: Record<Grade, string> = {
  M: "Mint",
  NM: "Near Mint",
  "VG+": "Very Good Plus",
  VG: "Very Good",
  "G+": "Good Plus",
  G: "Good",
  F: "Fair",
  P: "Poor",
};

const MULTIPLIER: Record<Grade, number> = {
  M: 1.15,
  NM: 1,
  "VG+": 0.68,
  VG: 0.42,
  "G+": 0.26,
  G: 0.16,
  F: 0.08,
  P: 0.04,
};

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && (GRADES as readonly string[]).includes(value);
}

/** Order for comparisons: 0 is Mint, higher is worse. */
export function gradeRank(grade: Grade): number {
  return GRADES.indexOf(grade);
}

/**
 * Value of a copy relative to Near Mint. The record carries most of the
 * price, the sleeve the rest. A sealed copy is priced as Mint.
 */
export function conditionFactor(media: Grade, sleeve: Grade | null = null, sealed = false): number {
  if (sealed) return MULTIPLIER.M;
  if (!sleeve) return MULTIPLIER[media];
  return 0.75 * MULTIPLIER[media] + 0.25 * MULTIPLIER[sleeve];
}

/** Turns marketplace wording ("Very Good Plus (VG+)", "Near Mint (NM or M-)") into a grade. */
export function parseGrade(text: string | null | undefined): Grade | null {
  if (!text) return null;
  const inBrackets = text.match(/\(([A-Z]{1,2}\+?)[\s)]/);
  if (inBrackets && isGrade(inBrackets[1])) return inBrackets[1];
  const upper = text.trim().toUpperCase();
  if (isGrade(upper)) return upper;
  const byName = (Object.entries(GRADE_NAMES) as [Grade, string][]).find(
    ([, name]) => name.toUpperCase() === upper,
  );
  return byName ? byName[0] : null;
}
