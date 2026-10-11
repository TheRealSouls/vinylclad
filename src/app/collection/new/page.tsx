import type { Metadata } from "next";
import { addToCollection } from "@/actions/records";
import { ActionForm } from "@/components/forms";
import { Checkbox, Field, GradeSelect, ReleaseFields } from "@/components/fields";
import { PageHead } from "@/components/ui";
import { loadContext } from "@/lib/context";

export const metadata: Metadata = { title: "Add a record" };

export default async function NewRecord() {
  const { settings } = await loadContext();
  return (
    <div className="max-w-3xl">
      <PageHead title="Add a record" sub="Something you own. Condition and what you paid decide its value and gain." />
      <ActionForm action={addToCollection} submit="Add to collection" className="grid gap-8">
        <ReleaseFields />
        <fieldset className="grid gap-4 sm:grid-cols-2 border-t border-ink pt-5">
          <legend className="sr-only">Your copy</legend>
          <Field label="Record grade">
            <GradeSelect name="mediaGrade" />
          </Field>
          <Field label="Sleeve grade">
            <GradeSelect name="sleeveGrade" />
          </Field>
          <Checkbox name="sealed" label="Still sealed" />
          <span className="hidden sm:block" />
          <Field label={`Paid, ${settings.currency}`} hint="Including postage">
            <input name="paid" inputMode="decimal" className="input num" />
          </Field>
          <Field label="Bought on">
            <input name="acquiredAt" type="date" className="input" />
          </Field>
          <Field label="Bought from" hint="Shop, site or seller">
            <input name="source" className="input" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea name="notes" rows={2} className="input" />
          </Field>
        </fieldset>
      </ActionForm>
    </div>
  );
}
