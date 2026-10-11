import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl uppercase">Not in the crates</h1>
      <p className="text-muted mt-2">
        Nothing lives at this address. <Link href="/" className="underline">Back to the overview</Link>.
      </p>
    </div>
  );
}
