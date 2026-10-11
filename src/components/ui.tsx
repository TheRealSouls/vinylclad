import Link from "next/link";
import clsx from "clsx";
import { VERDICT_LABEL, type Verdict } from "@/lib/deals";
import { FORMAT_NAMES } from "./fields";

export function PageHead({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-4xl uppercase">{title}</h1>
        {sub && <p className="text-muted mt-1 max-w-2xl">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Cover({ src, size = 44, alt = "" }: { src: string | null; size?: number; alt?: string }) {
  if (!src) {
    // No artwork: a plain disc in the same footprint so rows stay aligned.
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 bg-surface-2 border border-line"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 10 10" className="w-full h-full">
          <circle cx="5" cy="5" r="3.6" fill="var(--color-line-strong)" />
          <circle cx="5" cy="5" r="1.2" fill="var(--color-surface-2)" />
        </svg>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 object-cover border border-line bg-surface-2"
      style={{ width: size, height: size }}
    />
  );
}

type ReleaseLike = {
  id: string;
  artist: string;
  title: string;
  year: number | null;
  format: string;
  variant?: string | null;
  pressing?: string | null;
  coverUrl: string | null;
};

/** Cover, artist and title, linking to the release page. */
export function ReleaseCell({ release }: { release: ReleaseLike }) {
  const details = [FORMAT_NAMES[release.format] ?? release.format, release.year, release.pressing, release.variant]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/releases/${release.id}`} className="flex items-center gap-3 group min-w-[220px] max-w-[340px]">
      <Cover src={release.coverUrl} />
      <span className="min-w-0">
        <span className="block font-semibold group-hover:underline truncate">{release.title}</span>
        <span className="block text-sm text-muted truncate">{release.artist}</span>
        <span className="block text-[13px] text-faint truncate">{details}</span>
      </span>
    </Link>
  );
}

export function VerdictTag({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={clsx(
        "inline-block px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide border whitespace-nowrap",
        verdict === "STEAL" && "bg-good text-surface border-good",
        verdict === "GOOD" && "bg-good-bg text-good border-good",
        verdict === "FAIR" && "border-line-strong text-muted",
        verdict === "OVER" && "border-accent text-accent",
        verdict === "UNKNOWN" && "border-line text-faint",
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

/** A positive or negative amount, signed and coloured. */
export function Delta({ value, text }: { value: number; text: string }) {
  return (
    <span className={clsx("num", value > 0 ? "text-good" : value < 0 ? "text-accent" : "text-muted")}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {text}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-line-strong px-5 py-8 text-muted">{children}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto -mx-4 px-4">{children}</div>;
}

export function Confidence({ value }: { value: number }) {
  const label = value >= 0.7 ? "Solid" : value >= 0.35 ? "Fair" : "Thin";
  return (
    <span className="text-[13px] text-faint" title="How much recent price evidence backs this value">
      {label} data
    </span>
  );
}
