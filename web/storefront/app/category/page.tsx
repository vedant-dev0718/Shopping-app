import Link from "next/link";
import { getDiscoveryCategories } from "@/lib/api/categories";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const revalidate = 60;

export default async function CategoriesIndexPage() {
  const categories = await getDiscoveryCategories({ next: { revalidate } });
  const shoppable = categories.filter((category) => category.productCount > 0);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-deep)]">
              Find Your Perfect Match
            </span>
            <h1 className="mt-2 font-display text-3xl">All Categories</h1>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {shoppable.map((category) => (
              <Link
                key={category.name}
                href={`/category/${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-[var(--color-copper)]/15 bg-white p-8 text-center transition-shadow hover:shadow-lg hover:shadow-[var(--color-copper)]/10"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-copper)]/40 bg-gradient-to-br from-[var(--color-cream-deep)] to-white font-display text-xl text-[var(--color-copper-deep)]">
                  {category.name.charAt(0)}
                </span>
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-xs text-[var(--color-ink)]/50">{category.productCount} items</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
