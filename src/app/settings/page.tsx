import type { Metadata } from "next";
import { refreshRatesAction, saveSettings } from "@/actions/settings";
import { ActionForm } from "@/components/forms";
import { CurrencySelect, Field } from "@/components/fields";
import { PageHead } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { prisma } from "@/lib/db";
import { hasToken } from "@/lib/sources/discogs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const pct = (share: number) => Math.round(share * 1000) / 10;

export default async function SettingsPage() {
  const { settings: s } = await loadContext();
  const latestRate = await prisma.fxRate.findFirst({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="max-w-3xl grid gap-12">
      <PageHead title="Settings" sub="Where records get delivered and what reselling costs. Every price on the site is worked out from these." />

      <ActionForm action={saveSettings} submit="Save settings" className="grid gap-10">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="text-2xl uppercase border-b-2 border-ink pb-2 mb-4 w-full font-bold [font-stretch:78%]">
            Delivery address
          </legend>
          <Field label="Country" hint="Two letters, like GB or DE">
            <input name="country" defaultValue={s.country} maxLength={2} required className="input uppercase" />
          </Field>
          <Field label="Postcode" hint="Kept for courier quotes later">
            <input name="postcode" defaultValue={s.postcode ?? ""} className="input uppercase" />
          </Field>
          <Field label="Currency">
            <CurrencySelect defaultValue={s.currency} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="text-2xl uppercase border-b-2 border-ink pb-2 mb-4 w-full font-bold [font-stretch:78%]">
            Postage for one LP, when a listing does not say
          </legend>
          <Field label="From your own country">
            <input name="shipDomestic" defaultValue={s.shipDomestic} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Same customs area" hint="Inside the EU, for an EU address">
            <input name="shipSameZone" defaultValue={s.shipSameZone} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Across a European border" hint="EU to UK, Norway or Switzerland, and back">
            <input name="shipCrossZone" defaultValue={s.shipCrossZone} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Rest of the world" hint="Also used when the seller's country is unknown">
            <input name="shipWorld" defaultValue={s.shipWorld} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Import charges, %" hint="VAT plus courier handling when a parcel crosses customs">
            <input name="importChargePct" defaultValue={pct(s.importChargePct)} inputMode="decimal" className="input num" />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="text-2xl uppercase border-b-2 border-ink pb-2 mb-4 w-full font-bold [font-stretch:78%]">
            Reselling
          </legend>
          <Field label="Fees, %" hint="Discogs 9% plus payment">
            <input name="sellingFeePct" defaultValue={pct(s.sellingFeePct)} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Packaging per record">
            <input name="packagingCost" defaultValue={s.packagingCost} inputMode="decimal" className="input num" />
          </Field>
          <Field label="Deal threshold, %" hint="How far under value counts as a deal">
            <input name="dealThresholdPct" defaultValue={pct(s.dealThresholdPct)} inputMode="decimal" className="input num" />
          </Field>
        </fieldset>
      </ActionForm>

      <section>
        <h2 className="text-2xl uppercase border-b-2 border-ink pb-2 mb-4">Data sources</h2>
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="font-semibold">Exchange rates</dt>
            <dd className="text-muted mb-2">
              European Central Bank reference rates.{" "}
              {latestRate
                ? `Last pulled ${latestRate.updatedAt.toLocaleDateString("en-GB")}.`
                : "Not pulled yet, so built-in rates are in use."}
            </dd>
            <ActionForm action={refreshRatesAction} submit="Update rates" quiet />
          </div>
          <div>
            <dt className="font-semibold">Discogs</dt>
            <dd className="text-muted">
              {hasToken()
                ? "Token found. Search and per-grade price suggestions are on."
                : "No token. Release details and the lowest listed price still work. Add DISCOGS_TOKEN to .env for per-grade price suggestions."}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
