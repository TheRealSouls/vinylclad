import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { addListing, setListingStatus } from "@/actions/listings";
import { ActionForm, ButtonForm } from "@/components/forms";
import { CurrencySelect, Field, GradeSelect } from "@/components/fields";
import { Delta, Empty, PageHead, ReleaseCell, TableWrap, VerdictTag } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { formatPct } from "@/lib/money";
import { dealRows, releaseOptions } from "@/lib/queries";

export const metadata: Metadata = { title: "Deals" };
export const dynamic = "force-dynamic";

const TABS = [
  { status: "ACTIVE", label: "Live" },
  { status: "BOUGHT", label: "Bought" },
  { status: "DISMISSED", label: "Dismissed" },
  { status: "GONE", label: "Gone" },
];

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "ACTIVE" } = await searchParams;
  const ctx = await loadContext();
  const { money, settings } = ctx;
  const [rows, releases] = await Promise.all([dealRows(ctx, { status }), releaseOptions()]);

  return (
    <>
      <PageHead
        title="Deals"
        sub={
          <>
            Every listing priced to your door in {settings.country}: postage, and import charges when it crosses a
            customs border. A deal is at least {formatPct(settings.dealThresholdPct)} under what that copy is worth.
          </>
        }
      />

      <details className="border border-line-strong bg-surface mb-8" open={rows.length === 0 && status === "ACTIVE"}>
        <summary className="cursor-pointer px-4 py-3 font-semibold">Check a listing</summary>
        <div className="px-4 pb-5 pt-1">
          {releases.length === 0 ? (
            <p className="text-muted">
              Add the release to your <Link href="/wishlist/new" className="underline">wishlist</Link> or{" "}
              <Link href="/collection/new" className="underline">collection</Link> first, so there is a value to
              compare against.
            </p>
          ) : (
            <ActionForm action={addListing} submit="Score it" resetOnOk className="grid gap-4 sm:grid-cols-4">
              <Field label="Release" className="sm:col-span-2">
                <select name="releaseId" className="input" required>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.artist}, {r.title}
                      {r.year ? ` (${r.year})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Link" className="sm:col-span-2">
                <input name="url" type="url" required className="input" placeholder="https://" />
              </Field>
              <Field label="Site">
                <select name="source" className="input">
                  <option value="DISCOGS">Discogs</option>
                  <option value="EBAY">eBay</option>
                  <option value="VINTED">Vinted</option>
                  <option value="AMAZON">Amazon</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Price">
                <input name="price" inputMode="decimal" required className="input num" />
              </Field>
              <Field label="Currency">
                <CurrencySelect defaultValue={settings.currency} />
              </Field>
              <Field label="Postage" hint="Blank to estimate">
                <input name="shipping" inputMode="decimal" className="input num" />
              </Field>
              <Field label="Seller country" hint="Two letters, like DE">
                <input name="sellerCountry" maxLength={2} className="input uppercase" />
              </Field>
              <Field label="Record grade">
                <GradeSelect name="grade" allowBlank defaultValue="" />
              </Field>
              <Field label="Sleeve grade">
                <GradeSelect name="sleeveGrade" allowBlank defaultValue="" />
              </Field>
            </ActionForm>
          )}
        </div>
      </details>

      <nav className="flex gap-5 border-b border-line mb-4">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={t.status === "ACTIVE" ? "/deals" : `/deals?status=${t.status}`}
            className={clsx(
              "pb-2 border-b-2 -mb-px",
              t.status === status ? "border-ink font-semibold" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Empty>No listings here.</Empty>
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Copy</th>
                <th className="r">Landed</th>
                <th className="r">Worth</th>
                <th>Verdict</th>
                <th className="r">If flipped</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ listing, score }) => (
                <tr key={listing.id}>
                  <td>{listing.release ? <ReleaseCell release={listing.release} /> : listing.title}</td>
                  <td className="text-sm whitespace-nowrap">
                    <a href={listing.url} target="_blank" rel="noreferrer" className="underline font-medium">
                      {listing.source.toLowerCase()}
                    </a>
                    <span className="block text-faint">
                      {listing.grade ? `${listing.grade}${listing.sleeveGrade ? ` / ${listing.sleeveGrade}` : ""}` : "Ungraded"}
                      {listing.sellerCountry && ` · ${listing.sellerCountry}`}
                    </span>
                  </td>
                  <td className="r">
                    <span className="num font-medium block">{money(score.landed)}</span>
                    <span
                      className="num block text-[12px] text-faint max-w-[150px] ml-auto"
                      title={score.shippingEstimated ? "Postage estimated from the seller's country" : undefined}
                    >
                      {money(score.price)} + {score.shippingEstimated && "~"}
                      {money(score.shipping)}
                      {score.importCharge > 0 && <> + {money(score.importCharge)} import</>}
                    </span>
                  </td>
                  <td className="r num">{money(score.value)}</td>
                  <td className="whitespace-nowrap">
                    <VerdictTag verdict={score.verdict} />
                    {score.discount != null && (
                      <span className="block text-[13px] text-faint mt-0.5">
                        {score.discount >= 0
                          ? `${formatPct(score.discount)} under`
                          : `${formatPct(-score.discount)} over`}
                      </span>
                    )}
                  </td>
                  <td className="r">
                    {score.flipProfit == null ? (
                      <span className="text-faint">–</span>
                    ) : (
                      <Delta value={score.flipProfit} text={money(Math.abs(score.flipProfit))} />
                    )}
                  </td>
                  <td className="r whitespace-nowrap">
                    {status === "ACTIVE" ? (
                      <span className="inline-flex flex-col items-end gap-1">
                        <ButtonForm action={setListingStatus.bind(null, listing.id, "BOUGHT")} label="Bought" />
                        <ButtonForm action={setListingStatus.bind(null, listing.id, "DISMISSED")} label="Dismiss" />
                      </span>
                    ) : (
                      <ButtonForm action={setListingStatus.bind(null, listing.id, "ACTIVE")} label="Restore" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <p className="text-[13px] text-faint mt-4">
        Landed is price + postage + import charges. ~ marks estimated postage. Ungraded copies are valued as VG. &ldquo;If flipped&rdquo; is resale at market value
        after {formatPct(settings.sellingFeePct)} fees and {money(settings.packagingCost)} packaging.
      </p>
    </>
  );
}
