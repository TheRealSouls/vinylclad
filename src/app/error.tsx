"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl uppercase">Something broke</h1>
      <p className="text-muted mt-2">{error.message || "The page failed to load."}</p>
      <button onClick={reset} className="btn mt-4">
        Try again
      </button>
    </div>
  );
}
