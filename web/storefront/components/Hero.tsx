import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-charcoal)] text-[var(--color-cream)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(217,140,74,0.35), transparent 45%), radial-gradient(circle at 80% 60%, rgba(199,194,184,0.18), transparent 50%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-[1.4fr_1fr] lg:py-28">
        <div className="flex flex-col justify-center gap-6">
          <span className="text-xs uppercase tracking-[0.35em] text-[var(--color-copper-bright)]">
            The PeetalHouse Edit
          </span>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Handcrafted Elegance,
            <br />
            <span className="copper-text">Delivered To You</span>
          </h1>
          <p className="max-w-md text-sm leading-6 text-[var(--color-silver)]">
            Discover one-of-a-kind fashion, decor and gifts made by independent artisans and sellers from across India.
          </p>
          <div className="flex gap-4">
            <Link
              href="/category"
              className="rounded-full bg-linear-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-7 py-3 text-sm font-medium text-[var(--color-charcoal)] transition-transform hover:scale-[1.02]"
            >
              Shop the Collection
            </Link>
            <Link
              href="/reels"
              className="rounded-full border border-[var(--color-copper)]/50 px-7 py-3 text-sm font-medium text-[var(--color-cream)] transition-colors hover:border-[var(--color-copper-bright)] hover:text-[var(--color-copper-bright)]"
            >
              Watch Reels
            </Link>
          </div>
        </div>

        <div className="grid grid-rows-2 gap-4">
          <div className="rounded-2xl border border-[var(--color-copper)]/25 bg-gradient-to-br from-[var(--color-copper-deep)]/25 to-transparent p-6">
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--color-copper-bright)]">New Arrivals</span>
            <p className="mt-2 font-display text-xl">Fresh drops from artisan sellers, every week</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-copper)]/25 bg-gradient-to-br from-transparent to-[var(--color-copper-deep)]/25 p-6">
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--color-copper-bright)]">Reels to Real Life</span>
            <p className="mt-2 font-display text-xl">Shop every product straight from the reel</p>
          </div>
        </div>
      </div>
    </section>
  );
}
