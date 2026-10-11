import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { loadContext } from "@/lib/context";
import { collectionRows, collectionTotals } from "@/lib/queries";
import { Confidence, Delta, Empty, PageHead, ReleaseCell, TableWrap } from "@/components/ui";

export const metadata: Metadata = { title: "Collection" };
export const dynamic = "force-dynamic";

const TABS = [
  { status: undefined, label: "On the shelf" },
  { status: "FOR_SALE", label: "For sale" },
  { status: "SOLD", label: "Sold" },
];

const SORTS = {
  added: "Recently added",
  value: "Value",
  gain: "Gain",
  artist: "Artist",
} as const;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const { status, sort = "added" } = await searchParams;
  const ctx = await loadContext();
  const { money } = ctx;
  const rows = await collectionRows(ctx, status);
  const totals = collectionTotals(rows);
  const gainOf = (r: (typeof rows)[number]) =>
    r.value != null && r.item.paid != null ? r.value - r.item.paid : null;

  if (sort === "value") rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  if (sort === "gain") rows.sort((a, b) => (gainOf(b) ?? -Infinity) - (gainOf(a) ?? -Infinity));
  if (sort === "artist") rows.sort((a, b) => a.release.artist.localeCompare(b.release.artist));

  const sold = status === "SOLD";
  const link = (params: { status?: string; sort?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.sort && params.sort !== "added") q.set("sort", params.sort);
    const s = q.toString();
    return `/collection${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHead
        title="Collection"
        sub={
          totals.count > 0 && !sold ? (
            <>
              {totals.count} records, <span className="num">{money(totals.value, true)}</span> estimated across the{" "}
              {totals.valued} with price data.
            </>
          ) : undefined
        }
        action={<Link href="/collection/new" className="btn">Add a record</Link>}
      />

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line mb-4">
        <nav className="flex gap-5">
          {TABS.map((t) => (
            <Link
              key={t.label}
              href={link({ status: t.status, sort })}
              className={clsx(
                "pb-2 border-b-2 -mb-px",
                t.status === status ? "border-ink font-semibold" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-3 pb-2 text-sm">
          <span className="text-faint">Sort</span>
          {Object.entries(SORTS).map(([key, label]) => (
            <Link
              key={key}
              href={link({ status, sort: key })}
              className={key === sort ? "font-semibold underline" : "text-muted hover:text-ink"}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty>
          {status ? "Nothing here." : (
            <>
              No records yet. <Link href="/collection/new" className="underline">Add the first one</Link> from a
              Discogs link.
            </>
          )}
        </Empty>
      ) : (
        <TableWrap>
          <table className="table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Grade</th>
                <th className="r">Paid</th>
                <th className="r">{sold ? "Sold for" : "Worth now"}</th>
                <th className="r">{sold ? "Profit" : "Gain"}</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const gain = sold
                  ? r.item.soldPrice != null && r.item.paid != null
                    ? r.item.soldPrice - r.item.paid
                    : null
                  : gainOf(r);
                return (
                  <tr key={r.item.id}>
                    <td><ReleaseCell release={r.release} /></td>
                    <td className="num whitespace-nowrap">
                      {r.item.sealed ? "Sealed" : `${r.item.mediaGrade} / ${r.item.sleeveGrade}`}
                    </td>
                    <td className="r num">{money(r.item.paid)}</td>
                    <td className="r num">{money(sold ? r.item.soldPrice : r.value)}</td>
                    <td className="r">{gain == null ? <span className="text-faint">–</span> : <Delta value={gain} text={money(Math.abs(gain))} />}</td>
                    <td>
                      {r.valuation ? (
                        <Confidence value={r.valuation.confidence} />
                      ) : (
                        <span className="text-[13px] text-faint">No prices</span>
                      )}
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
