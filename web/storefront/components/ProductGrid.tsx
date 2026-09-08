import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/api/discovery";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product._id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-copper)]/15 bg-white transition-shadow hover:shadow-lg hover:shadow-[var(--color-copper)]/10"
    >
      <div className="relative aspect-square w-full bg-[var(--color-cream-deep)]">
        {product.imageUrls[0] && (
          <Image
            src={product.imageUrls[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-[var(--color-copper-deep)]">{product.region}</span>
        <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
        <span className="mt-auto font-display text-base copper-text">₹{product.price.toLocaleString("en-IN")}</span>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, title, subtitle }: { products: Product[]; title: string; subtitle?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 text-center">
        {subtitle && <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-deep)]">{subtitle}</span>}
        <h2 className="mt-2 font-display text-3xl">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {products.length === 0 && <p className="text-center text-[var(--color-ink)]/50">No products to show yet.</p>}
    </section>
  );
}
