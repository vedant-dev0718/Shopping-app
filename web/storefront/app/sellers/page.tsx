import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function SellWithUsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-24 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-deep)]">For Artisans &amp; Sellers</span>
          <h1 className="mt-2 font-display text-4xl">Sell With PeetalHouse</h1>
          <p className="mt-6 leading-7 text-[var(--color-ink)]/70">
            Reach thousands of buyers looking for handcrafted, one-of-a-kind pieces. List your products and reels,
            manage orders, and grow your independent business — all from the PeetalHouse seller app.
          </p>
          <Link
            href="/account"
            className="mt-10 inline-block rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)]"
          >
            Get Started
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
