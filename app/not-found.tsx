import Link from "next/link";
import { Anchor, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--alola-slate)] px-4 text-center text-gray-800">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-white shadow-lg">
          <SearchX className="size-8 text-[var(--primary)]" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight text-[var(--alola-dark)]">404</h1>
        <p className="mt-4 text-lg font-semibold text-[var(--alola-dark)]">Page not found</p>
        <p className="mt-2 text-sm text-gray-500">
          The page or shipment reference you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent)]"
          >
            <Anchor className="size-4" />
            Back to Home
          </Link>
          <Link
            href="/#tracking"
            className="rounded-xl border bg-white px-5 py-2.5 text-sm font-semibold text-[var(--primary)] transition-all hover:bg-[var(--alola-slate)]"
          >
            Track a shipment
          </Link>
        </div>
      </div>
    </main>
  );
}
