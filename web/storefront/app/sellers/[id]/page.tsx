import Image from "next/image";
import { getStore, getStoreProducts, getStoreReels } from "@/lib/api/stores";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductGrid } from "@/components/ProductGrid";
import { ReelsSpotlight } from "@/components/ReelsSpotlight";

export const revalidate = 60;

export default async function StorePage({ params }: PageProps<"/sellers/[id]">) {
  const { id } = await params;
  const [store, products, reels] = await Promise.all([
    getStore(id, { next: { revalidate } }),
    getStoreProducts(id, { next: { revalidate } }),
    getStoreReels(id, { next: { revalidate } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative h-64 w-full bg-[var(--color-charcoal)]">
          {store.bannerImageUrl && (
            <Image src={store.bannerImageUrl} alt={store.storeName} fill sizes="100vw" className="object-cover opacity-60" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[var(--color-cream)]">
            {store.profileImageUrl && (
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--color-copper-bright)]">
                <Image src={store.profileImageUrl} alt={store.storeName} fill sizes="80px" className="object-cover" />
              </div>
            )}
            <h1 className="font-display text-3xl">{store.storeName}</h1>
            <p className="text-sm text-[var(--color-silver)]">{store.region}</p>
          </div>
        </section>

        {store.story && (
          <section className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="leading-7 text-[var(--color-ink)]/70">{store.story}</p>
          </section>
        )}

        {reels.length > 0 && <ReelsSpotlight reels={reels} />}
        <ProductGrid products={products} title="Products" subtitle={store.storeName} />
      </main>
      <SiteFooter />
    </div>
  );
}
