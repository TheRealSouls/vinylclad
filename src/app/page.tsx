import Link from "next/link";
import { loadContext } from "@/lib/context";
import { formatPct } from "@/lib/money";
import { collectionRows, collectionTotals, dealRows, wishlistRows } from "@/lib/queries";
import { Delta, Empty, ReleaseCell, TableWrap, VerdictTag } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const ctx = await loadContext();
  const { money } = ctx;
  const [rows, deals, wishes] = await Promise.all([collectionRows(ctx), dealRows(ctx), wishlistRows(ctx)]);
  const totals = collectionTotals(rows);
  const goodDeals = deals.filter((d) => d.score.verdict === "STEAL" || d.score.verdict === "GOOD").slice(0, 8);
  const hits = wishes.filter((w) => w.hit);
  const top = rows
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 6);

  if (totals.count === 0 && wishes.length === 0 && deals.length === 0) return <FirstRun />;

  const gain = totals.value - totals.paidForValued;

  return (
    <div className="grid gap-12">
      <section>
        <h1 className="text-[clamp(2rem,5vw,3.4rem)] uppercase max-w-4xl">
          {totals.count} record{totals.count === 1 ? "" : "s"}
          {totals.valued > 0 ? (
            <>
              , worth about <span className="num normal-case">{money(totals.value, true)}</span>
            </>
          ) : (
            " on the shelf"
          )}
        </h1>
        <p className="text-muted mt-3 max-w-2xl">
          {totals.valued < totals.count && (
            <>
              {totals.count - totals.valued} without price data yet, so not counted.{" "}
            </>
          )}
          {totals.paidForValued > 0 && (
            <>
              You paid <span className="num">{money(totals.paidForValued, true)}</span> for the valued ones:{" "}
              <Delta value={gain} text={money(Math.abs(gain), true)} /> on paper.
            </>
          )}
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2 mb-1">
          <h2 className="text-2xl uppercase">Deals under market value</h2>
          <Link href="/deals" className="text-sm underline">
            All {deals.length} listings
          </Link>
        </div>
        {goodDeals.length === 0 ? (
          <p className="text-muted py-4">
            Nothing at least {formatPct(ctx.settings.dealThresholdPct)} under value right now.{" "}
            <Link href="/deals" className="underline">Add a listing</Link> to check it.
          </p>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Verdict</th>
                  <th className="r">Landed</th>
                  <th className="r">Worth</th>
                  <th className="r">Under value</th>
                  <th className="r">If flipped</th>
                  <th>Where</th>
                </tr>
              </thead>
              <tbody>
                {goodDeals.map(({ listing, score }) => (
                  <tr key={listing.id}>
                    <td>{listing.release ? <ReleaseCell release={listing.release} /> : listing.title}</td>
                    <td><VerdictTag verdict={score.verdict} /></td>
                    <td className="r num">{money(score.landed)}</td>
                    <td className="r num">{money(score.value)}</td>
                    <td className="r num text-good">{formatPct(score.discount ?? 0)}</td>
                    <td className="r">
                      <Delta value={score.flipProfit ?? 0} text={money(Math.abs(score.flipProfit ?? 0))} />
                    </td>
                    <td>
                      <a href={listing.url} target="_blank" rel="noreferrer" className="underline text-sm">
                        {listing.source.toLowerCase()}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <section>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2 mb-1">
            <h2 className="text-2xl uppercase">Wishlist in budget</h2>
            <Link href="/wishlist" className="text-sm underline">
              Wishlist ({wishes.length})
            </Link>
          </div>
          {hits.length === 0 ? (
            <p className="text-muted py-4">No wishlist record is listed inside your budget at the moment.</p>
          ) : (
            <ul>
              {hits.map(({ wish, release, hit }) => (
                <li key={wish.id} className="flex items-center justify-between gap-4 py-3 border-b border-line">
                  <ReleaseCell release={release} />
                  <span className="text-right">
                    <span className="block num">{money(hit!.score.landed)}</span>
                    <a href={hit!.listing.url} target="_blank" rel="noreferrer" className="text-sm underline">
                      on {hit!.listing.source.toLowerCase()}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2 mb-1">
            <h2 className="text-2xl uppercase">Most valuable</h2>
            <Link href="/collection" className="text-sm underline">Collection</Link>
          </div>
          {top.length === 0 ? (
            <p className="text-muted py-4">Link records to Discogs or add prices to see what they are worth.</p>
          ) : (
            <ol>
              {top.map(({ item, release, value }, i) => (
                <li key={item.id} className="flex items-center gap-4 py-3 border-b border-line">
                  <span className="num text-faint w-5">{i + 1}</span>
                  <span className="flex-1 min-w-0"><ReleaseCell release={release} /></span>
                  <span className="text-right shrink-0">
                    <span className="block num">{money(value)}</span>
                    <span className="block text-[13px] text-faint">{item.mediaGrade}/{item.sleeveGrade}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function FirstRun() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-[clamp(2rem,5vw,3.4rem)] uppercase">Nothing on the shelf yet</h1>
      <p className="text-muted mt-3">
        Vinylclad values records from real marketplace prices and checks listings against them, postage and import
        charges to your door included. Three things get it going:
      </p>
      <ol className="mt-6 border-t border-ink">
        <Step n={1} href="/settings" title="Set where records ship to">
          Country and currency decide postage, import charges and which prices count as a deal.
        </Step>
        <Step n={2} href="/collection/new" title="Add a record you own">
          Paste a Discogs link. Cover, pressing details and current prices come with it.
        </Step>
        <Step n={3} href="/wishlist/new" title="Add one you are after">
          Set the most you would pay and the lowest grade you accept.
        </Step>
      </ol>
    </div>
  );
}

function Step({ n, href, title, children }: { n: number; href: string; title: string; children: React.ReactNode }) {
  return (
    <li className="border-b border-line py-4 flex gap-4">
      <span className="num text-2xl text-accent w-6">{n}</span>
      <span>
        <Link href={href} className="font-semibold underline">{title}</Link>
        <span className="block text-muted text-sm mt-0.5">{children}</span>
      </span>
    </li>
  );
}
