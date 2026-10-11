import type { Metadata } from "next";
import Link from "next/link";
import { deleteWish } from "@/actions/records";
import { ButtonForm } from "@/components/forms";
import { Empty, PageHead, ReleaseCell, TableWrap } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { conditionFactor, isGrade } from "@/lib/grades";
import { wishlistRows } from "@/lib/queries";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

const PRIORITY = { 1: "High", 2: "Normal", 3: "Low" } as Record<number, string>;

export default async function WishlistPage() {
  const ctx = await loadContext();
  const { money } = ctx;
  const rows = await wishlistRows(ctx);
  const hits = rows.filter((r) => r.hit).length;

  return (
    <>
      <PageHead
        title="Wishlist"
        sub={rows.length > 0 ? `${rows.length} wanted, ${hits} listed inside budget right now.` : undefined}
        action={<Link href="/wishlist/new" className="btn">Add to wishlist</Link>}
      />
      {rows.length === 0 ? (
        <Empty>
          Nothing wanted yet. <Link href="/wishlist/new" className="underline">Add a record</Link> with the most you
          would pay for it.
        </Empty>
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Wants</th>
                <th className="r">Budget</th>
                <th className="r">Typical price</th>
                <th className="r">Cheapest found</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ wish, release, valuation, best, hit, offerCount }) => {
                const typical = valuation && isGrade(wish.minGrade) ? valuation.nm * conditionFactor(wish.minGrade) : null;
                return (
                  <tr key={wish.id}>
                    <td><ReleaseCell release={release} /></td>
                    <td className="text-sm whitespace-nowrap">
                      <span className="num">{wish.minGrade}</span> or better
                      <span className="block text-faint">
                        {PRIORITY[wish.priority]} · {wish.purpose === "FLIP" ? "to flip" : "to keep"}
                      </span>
                    </td>
                    <td className="r num">{money(wish.maxPrice)}</td>
                    <td className="r num">{money(typical)}</td>
                    <td className="r">
                      {best ? (
                        <>
                          <span className="num block">{money(best.score.landed)}</span>
                          <a href={best.listing.url} target="_blank" rel="noreferrer" className="text-[13px] underline">
                            {best.listing.source.toLowerCase()}
                            {offerCount > 1 && `, ${offerCount} found`}
                          </a>
                        </>
                      ) : (
                        <span className="text-faint">–</span>
                      )}
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {hit ? (
                        <span className="font-semibold text-good">In budget</span>
                      ) : best && wish.maxPrice != null && best.score.landed > wish.maxPrice ? (
                        <span className="text-muted">
                          Over by <span className="num">{money(best.score.landed - wish.maxPrice)}</span>
                        </span>
                      ) : best ? (
                        <span className="text-muted">No profit to flip</span>
                      ) : (
                        <span className="text-faint">Nothing listed</span>
                      )}
                    </td>
                    <td className="r">
                      <ButtonForm action={deleteWish.bind(null, wish.id)} label="Remove" confirm="Take this off the wishlist?" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
