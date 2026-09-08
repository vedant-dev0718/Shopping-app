"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductGrid } from "@/components/ProductGrid";
import { searchGlobal, type GlobalSearchResult } from "@/lib/api/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      setResults(await searchGlobal(query.trim()));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="font-display text-3xl">Search PeetalHouse</h1>
          <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, sellers, reels…"
              className="flex-1 rounded-full border border-[var(--color-copper)]/30 bg-white px-6 py-3 outline-none focus:border-[var(--color-copper-bright)]"
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)]"
            >
              Search
            </button>
          </form>
        </section>

        {isLoading && <p className="text-center text-[var(--color-ink)]/50">Searching…</p>}

        {results && !isLoading && (
          <>
            <ProductGrid products={results.products} title="Products" />

            {results.stores.length > 0 && (
              <section className="mx-auto max-w-7xl px-6 py-8">
                <h2 className="mb-6 font-display text-2xl">Sellers</h2>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                  {results.stores.map((store) => (
                    <Link
                      key={store._id}
                      href={`/sellers/${store._id}`}
                      className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-copper)]/15 bg-white p-6 text-center"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[var(--color-cream-deep)]">
                        {store.profileImageUrl && (
                          <Image src={store.profileImageUrl} alt={store.storeName} fill sizes="64px" className="object-cover" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{store.storeName}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.products.length === 0 && results.stores.length === 0 && results.reels.length === 0 && (
              <p className="py-16 text-center text-[var(--color-ink)]/50">No results found.</p>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
