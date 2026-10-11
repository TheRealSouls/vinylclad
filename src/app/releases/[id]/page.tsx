import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  addPricePoint, deleteCollectionItem, deletePricePoint, deleteRelease, deleteWish, linkDiscogs,
  syncReleaseAction, updateCollectionItem, updateWish, wishRelease,
} from "@/actions/records";
import { ActionForm, ButtonForm } from "@/components/forms";
import { Checkbox, CurrencySelect, FORMAT_NAMES, Field, GradeSelect, WishFields } from "@/components/fields";
import { Confidence, Cover, Delta } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { prisma } from "@/lib/db";
import { GRADES, conditionFactor, isGrade } from "@/lib/grades";
import { releaseDetail } from "@/lib/queries";
import { hasToken } from "@/lib/sources/discogs";
import { valueRelease } from "@/lib/valuation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await prisma.release.findUnique({ where: { id: (await params).id }, select: { artist: true, title: true } });
  return { title: r ? `${r.artist}, ${r.title}` : "Release" };
}

const KIND_NAME: Record<string, string> = {
  SOLD: "Sold",
  ASKING: "Asking",
  LOWEST: "Lowest listed",
  SUGGESTED: "Suggested",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const toInputDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function ReleasePage({ params }: Props) {
  const { id } = await params;
  const [release, ctx] = await Promise.all([releaseDetail(id), loadContext()]);
  if (!release) notFound();
  const { money, settings, convert } = ctx;
  const valuation = valueRelease(release.prices, convert);
  const floor = release.prices.find((p) => p.kind === "LOWEST");
  const wish = release.wishes[0];
  const details = [
    FORMAT_NAMES[release.format] ?? release.format,
    release.year,
    release.country,
    release.pressing,
    release.variant,
    release.limited && "Limited",
  ].filter(Boolean);

  return (
    <div className="grid gap-12">
      <section className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <Cover src={release.coverUrl} size={200} alt={`Cover of ${release.title}`} />
        <div className="min-w-0">
          <p className="text-lg text-muted">{release.artist}</p>
          <h1 className="text-[clamp(2rem,5vw,3.2rem)] uppercase">{release.title}</h1>
          <p className="mt-2">{details.join(" · ")}</p>
          <p className="text-sm text-muted mt-1">
            {[release.label, release.catalogNo && <span key="cat" className="num">{release.catalogNo}</span>]
              .filter(Boolean)
              .map((part, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {part}
                </span>
              ))}
            {release.genres && <span className="block">{release.genres}</span>}
          </p>
          {release.discogsId && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-5 text-sm">
              {release.wantCount != null && release.haveCount != null && (
                <div>
                  <dt className="label">Discogs demand</dt>
                  <dd>
                    <span className="num">{release.wantCount.toLocaleString("en-GB")}</span> want,{" "}
                    <span className="num">{release.haveCount.toLocaleString("en-GB")}</span> have
                  </dd>
                </div>
              )}
              {release.rating != null && release.ratingCount ? (
                <div>
                  <dt className="label">Rating</dt>
                  <dd>
                    <span className="num">{release.rating.toFixed(2)}</span> / 5 from {release.ratingCount}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="label">Links</dt>
                <dd className="flex gap-3">
                  <a href={`https://www.discogs.com/release/${release.discogsId}`} target="_blank" rel="noreferrer" className="underline">
                    Release
                  </a>
                  <a href={`https://www.discogs.com/sell/release/${release.discogsId}`} target="_blank" rel="noreferrer" className="underline">
                    For sale
                  </a>
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl uppercase border-b-2 border-ink pb-2">Value</h2>
          {valuation ? (
            <>
              <p className="mt-4">
                <span className="num text-4xl">{money(valuation.nm)}</span>{" "}
                <span className="text-muted">for a Near Mint copy</span>
              </p>
              <p className="text-sm text-muted mt-1">
                {valuation.used === 1 ? (
                  "From a single price, so treat it as rough. "
                ) : (
                  <>
                    Range <span className="num">{money(valuation.low)}</span> to{" "}
                    <span className="num">{money(valuation.high)}</span> from {valuation.used} prices.{" "}
                  </>
                )}
                <Confidence value={valuation.confidence} />
              </p>
              <table className="table mt-4 max-w-sm">
                <thead>
                  <tr>
                    <th>Record grade</th>
                    <th className="r">Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADES.slice(0, 5).map((g) => (
                    <tr key={g}>
                      <td className="num">{g}</td>
                      <td className="r num">{money(valuation.nm * conditionFactor(g))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-muted mt-4">
              Not enough evidence for a value yet. Add a sold or asking price you have seen below
              {release.discogsId && !hasToken() && ", or add a Discogs token in settings for per-grade prices"}.
            </p>
          )}
          {floor && (
            <p className="text-sm mt-3">
              Cheapest copy on Discogs, any grade:{" "}
              <span className="num">{money(convert(floor.price, floor.currency))}</span>{" "}
              <span className="text-faint">({dateFmt.format(floor.observedAt)})</span>
            </p>
          )}
          <div className="mt-5">
            {release.discogsId ? (
              <ActionForm action={syncReleaseAction.bind(null, release.id)} submit="Update from Discogs" quiet>
                {release.syncedAt && (
                  <p className="text-[13px] text-faint mb-2">Last updated {dateFmt.format(release.syncedAt)}</p>
                )}
              </ActionForm>
            ) : (
              <ActionForm action={linkDiscogs.bind(null, release.id)} submit="Link" quiet>
                <Field label="Discogs release">
                  <input name="discogs" className="input" placeholder="Link or release number" />
                </Field>
              </ActionForm>
            )}
          </div>
        </div>

        <div className="grid gap-8 content-start">
          <div>
            <h2 className="text-2xl uppercase border-b-2 border-ink pb-2">Your copies</h2>
            {release.items.length === 0 && <p className="text-muted mt-4">You do not own this one.</p>}
            {release.items.map((item) => {
              const worth =
                valuation && isGrade(item.mediaGrade) && isGrade(item.sleeveGrade)
                  ? valuation.nm * conditionFactor(item.mediaGrade, item.sleeveGrade, item.sealed)
                  : null;
              const gain = worth != null && item.paid != null ? worth - item.paid : null;
              return (
                <details key={item.id} className="border-b border-line py-3">
                  <summary className="cursor-pointer flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="num">{item.sealed ? "Sealed" : `${item.mediaGrade} / ${item.sleeveGrade}`}</span>
                      {item.status !== "KEEP" && (
                        <span className="ml-2 text-[12px] uppercase tracking-wide font-semibold text-accent">
                          {item.status === "SOLD" ? "Sold" : "For sale"}
                        </span>
                      )}
                    </span>
                    <span className="text-sm">
                      {worth != null && <span className="num">{money(worth)}</span>}
                      {gain != null && (
                        <>
                          {" "}
                          (<Delta value={gain} text={money(Math.abs(gain))} />)
                        </>
                      )}
                    </span>
                  </summary>
                  <ActionForm action={updateCollectionItem.bind(null, item.id)} submit="Save" className="grid gap-4 sm:grid-cols-2 mt-4">
                    <Field label="Record grade"><GradeSelect name="mediaGrade" defaultValue={item.mediaGrade} /></Field>
                    <Field label="Sleeve grade"><GradeSelect name="sleeveGrade" defaultValue={item.sleeveGrade} /></Field>
                    <Field label={`Paid, ${settings.currency}`}>
                      <input name="paid" inputMode="decimal" defaultValue={item.paid ?? ""} className="input num" />
                    </Field>
                    <Field label="Bought on">
                      <input name="acquiredAt" type="date" defaultValue={toInputDate(item.acquiredAt)} className="input" />
                    </Field>
                    <Field label="Bought from"><input name="source" defaultValue={item.source ?? ""} className="input" /></Field>
                    <Field label="Status">
                      <select name="status" defaultValue={item.status} className="input">
                        <option value="KEEP">Keeping</option>
                        <option value="FOR_SALE">For sale</option>
                        <option value="SOLD">Sold</option>
                      </select>
                    </Field>
                    <Field label={`Sold for, ${settings.currency}`} hint="Only when sold">
                      <input name="soldPrice" inputMode="decimal" defaultValue={item.soldPrice ?? ""} className="input num" />
                    </Field>
                    <div className="self-end pb-2"><Checkbox name="sealed" label="Still sealed" defaultChecked={item.sealed} /></div>
                    <Field label="Notes" className="sm:col-span-2">
                      <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} className="input" />
                    </Field>
                  </ActionForm>
                  <div className="mt-3">
                    <ButtonForm action={deleteCollectionItem.bind(null, item.id)} label="Remove this copy" confirm="Remove this copy from your collection?" />
                  </div>
                </details>
              );
            })}
          </div>

          <div>
            <h2 className="text-2xl uppercase border-b-2 border-ink pb-2">Wishlist</h2>
            {wish ? (
              <div className="mt-4">
                <ActionForm action={updateWish.bind(null, wish.id)} submit="Save">
                  <WishFields currency={settings.currency} defaults={wish} framed={false} />
                </ActionForm>
                <div className="mt-3">
                  <ButtonForm action={deleteWish.bind(null, wish.id)} label="Take off wishlist" />
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <p className="text-muted">Not on your wishlist.</p>
                <ButtonForm action={wishRelease.bind(null, release.id)} label="Add it" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl uppercase border-b-2 border-ink pb-2">Price evidence</h2>
        {release.prices.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Seen</th>
                  <th>Where</th>
                  <th>Kind</th>
                  <th>Grade</th>
                  <th className="r">Price</th>
                  <th className="r">In {settings.currency}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {release.prices.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{dateFmt.format(p.observedAt)}</td>
                    <td>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="underline">{p.source.toLowerCase()}</a>
                      ) : (
                        p.source.toLowerCase()
                      )}
                    </td>
                    <td>{KIND_NAME[p.kind] ?? p.kind}</td>
                    <td className="num">{p.grade ?? <span className="text-faint">–</span>}</td>
                    <td className="r num">{p.price.toFixed(2)} {p.currency}</td>
                    <td className="r num">{money(convert(p.price, p.currency))}</td>
                    <td className="r"><ButtonForm action={deletePricePoint.bind(null, p.id)} label="Delete" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[13px] text-faint mt-3 max-w-3xl">
          Sales count most. Asking prices are taken down 15% since many never sell. The cheapest Discogs listing is
          shown as a floor but left out of the value, since it is usually the most worn copy. Older prices fade,
          losing half their weight every four months.
        </p>
        <details className="mt-4 border border-line-strong bg-surface">
          <summary className="cursor-pointer px-4 py-3 font-semibold">Add a price you have seen</summary>
          <ActionForm action={addPricePoint.bind(null, release.id)} submit="Add price" resetOnOk className="grid gap-4 sm:grid-cols-4 px-4 pb-5 pt-1">
            <Field label="Kind">
              <select name="kind" className="input">
                <option value="SOLD">Sold for</option>
                <option value="ASKING">Asking price</option>
              </select>
            </Field>
            <Field label="Where">
              <select name="source" className="input">
                <option value="DISCOGS">Discogs</option>
                <option value="EBAY">eBay</option>
                <option value="VINTED">Vinted</option>
                <option value="AMAZON">Amazon</option>
                <option value="MANUAL">Elsewhere</option>
              </select>
            </Field>
            <Field label="Price"><input name="price" inputMode="decimal" required className="input num" /></Field>
            <Field label="Currency"><CurrencySelect defaultValue={settings.currency} /></Field>
            <Field label="Record grade"><GradeSelect name="grade" allowBlank defaultValue="" /></Field>
            <Field label="Date"><input name="observedAt" type="date" className="input" /></Field>
            <Field label="Link" className="sm:col-span-2"><input name="url" type="url" className="input" /></Field>
          </ActionForm>
        </details>
      </section>

      <section className="border-t border-line pt-4">
        <ButtonForm
          action={deleteRelease.bind(null, release.id)}
          label="Delete this release"
          confirm="Delete this release, your copies of it, its prices and its wishlist entry?"
        />
      </section>
    </div>
  );
}
