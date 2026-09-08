import Link from "next/link";
import type { Category } from "@/lib/api/categories";

export function CategoryRail({ categories }: { categories: Category[] }) {
  const shoppable = categories.filter((category) => category.productCount > 0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-deep)]">Find Your Perfect Match</span>
        <h2 className="mt-2 font-display text-3xl">Shop by Category</h2>
      </div>

      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
        {shoppable.map((category) => (
          <Link
            key={category.name}
            href={`/category/${encodeURIComponent(category.name)}`}
            className="group flex w-28 flex-shrink-0 flex-col items-center gap-3 text-center"
          >
            <span
              className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-copper)]/40 bg-gradient-to-br from-[var(--color-cream-deep)] to-white font-display text-2xl text-[var(--color-copper-deep)] transition-transform group-hover:scale-105 group-hover:border-[var(--color-copper-bright)]"
            >
              {category.name.charAt(0)}
            </span>
            <span className="text-sm font-medium">{category.name}</span>
            <span className="text-xs text-[var(--color-ink)]/50">{category.productCount} items</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
