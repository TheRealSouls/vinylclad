import { GRADES, GRADE_NAMES } from "@/lib/grades";
import { CURRENCIES } from "@/lib/money";

export const FORMAT_NAMES: Record<string, string> = {
  LP: "LP",
  "2LP": "2×LP",
  "3LP": "3×LP",
  BOX: "Box set",
  "12IN": '12" single',
  "10IN": '10"',
  "7IN": '7"',
};

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-faint mt-1">{hint}</span>}
    </label>
  );
}

export function GradeSelect({ name, defaultValue = "VG+", allowBlank = false }: {
  name: string;
  defaultValue?: string | null;
  allowBlank?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="input">
      {allowBlank && <option value="">Not stated</option>}
      {GRADES.map((g) => (
        <option key={g} value={g}>
          {g}, {GRADE_NAMES[g]}
        </option>
      ))}
    </select>
  );
}

export function CurrencySelect({ name = "currency", defaultValue }: { name?: string; defaultValue: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className="input">
      {CURRENCIES.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-accent" />
      {label}
    </label>
  );
}

/** Discogs link plus manual fields, shared by the collection and wishlist forms. */
export function ReleaseFields() {
  return (
    <fieldset className="grid gap-4">
      <Field
        label="Discogs release"
        hint="Paste the release link or its number. Artist, pressing, cover and current prices are filled in from Discogs."
      >
        <input name="discogs" className="input" placeholder="https://www.discogs.com/release/…" />
      </Field>
      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold">Not on Discogs? Enter it by hand</summary>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Field label="Artist">
            <input name="artist" className="input" />
          </Field>
          <Field label="Title">
            <input name="title" className="input" />
          </Field>
          <Field label="Format">
            <select name="format" className="input" defaultValue="LP">
              {Object.entries(FORMAT_NAMES).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <input name="year" inputMode="numeric" className="input" />
          </Field>
          <Field label="Label">
            <input name="label" className="input" />
          </Field>
          <Field label="Catalogue number">
            <input name="catalogNo" className="input num" />
          </Field>
          <Field label="Pressing" hint="First press, reissue, repress">
            <input name="pressing" className="input" />
          </Field>
          <Field label="Variant" hint="Colour or edition">
            <input name="variant" className="input" />
          </Field>
          <Checkbox name="limited" label="Limited edition" />
        </div>
      </details>
    </fieldset>
  );
}

export function WishFields({
  currency,
  defaults,
  framed = true,
}: {
  currency: string;
  framed?: boolean;
  defaults?: { maxPrice: number | null; minGrade: string; priority: number; purpose: string; notes: string | null };
}) {
  return (
    <fieldset className={`grid gap-4 sm:grid-cols-2 ${framed ? "border-t border-ink pt-5" : ""}`}>
      <legend className="sr-only">What you would accept</legend>
      <Field label={`Most you would pay, ${currency}`} hint="Landed, with postage and import charges">
        <input name="maxPrice" inputMode="decimal" defaultValue={defaults?.maxPrice ?? ""} className="input num" />
      </Field>
      <Field label="Lowest record grade">
        <GradeSelect name="minGrade" defaultValue={defaults?.minGrade ?? "VG+"} />
      </Field>
      <Field label="Priority">
        <select name="priority" defaultValue={defaults?.priority ?? 2} className="input">
          <option value={1}>High</option>
          <option value={2}>Normal</option>
          <option value={3}>Low</option>
        </select>
      </Field>
      <Field label="Buying it to" hint="Flip wishes only count as hits when resale would make money">
        <select name="purpose" defaultValue={defaults?.purpose ?? "LISTEN"} className="input">
          <option value="LISTEN">Keep and play</option>
          <option value="FLIP">Flip</option>
        </select>
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <textarea name="notes" rows={2} defaultValue={defaults?.notes ?? ""} className="input" />
      </Field>
    </fieldset>
  );
}
