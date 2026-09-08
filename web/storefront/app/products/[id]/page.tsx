import Image from "next/image";
import type { Metadata } from "next";
import { getProduct, getRelatedProducts } from "@/lib/api/products";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductGrid } from "@/components/ProductGrid";
import { AddToCartButton } from "@/components/AddToCartButton";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id, { next: { revalidate } });
  return {
    title: `${product.title} — PeetalHouse`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const [product, related] = await Promise.all([
    getProduct(id, { next: { revalidate } }),
    getRelatedProducts(id, { next: { revalidate } }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.imageUrls,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--color-copper)]/15 bg-[var(--color-cream-deep)]">
            {product.imageUrls[0] && (
              <Image src={product.imageUrls[0]} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            )}
          </div>

          <div className="flex flex-col gap-5">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-deep)]">{product.region}</span>
            <h1 className="font-display text-4xl">{product.title}</h1>
            <p className="font-display text-2xl copper-text">₹{product.price.toLocaleString("en-IN")}</p>
            <p className="leading-7 text-[var(--color-ink)]/70">{product.description}</p>
            <p className="text-sm text-[var(--color-ink)]/50">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>

            <div className="mt-2">
              <AddToCartButton productId={product._id} />
            </div>

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--color-copper)]/25 px-3 py-1 text-xs text-[var(--color-ink)]/60">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && <ProductGrid products={related} title="You May Also Like" />}
      </main>

      <SiteFooter />
    </div>
  );
}
