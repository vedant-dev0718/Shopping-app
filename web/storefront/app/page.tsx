import { getDiscoveryFeed, type Product, type Reel } from "@/lib/api/discovery";
import { getDiscoveryCategories } from "@/lib/api/categories";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { CategoryRail } from "@/components/CategoryRail";
import { ReelsSpotlight } from "@/components/ReelsSpotlight";
import { ProductGrid } from "@/components/ProductGrid";
import { AssuranceStrip } from "@/components/AssuranceStrip";

export const revalidate = 60;

function splitFeed(feed: Awaited<ReturnType<typeof getDiscoveryFeed>>) {
  const products = new Map<string, Product>();
  const reels: Reel[] = [];

  for (const item of feed) {
    if (item.type === "product") {
      products.set(item.data._id, item.data);
    } else {
      reels.push(item.data);
      for (const product of item.data.taggedProductIds) {
        products.set(product._id, product);
      }
    }
  }

  return { products: Array.from(products.values()), reels };
}

export default async function Home() {
  const [feed, categories] = await Promise.all([
    getDiscoveryFeed({ next: { revalidate } }),
    getDiscoveryCategories({ next: { revalidate } }),
  ]);

  const { products, reels } = splitFeed(feed);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <CategoryRail categories={categories} />
        <ReelsSpotlight reels={reels} />
        <ProductGrid products={products} title="Trending Now" subtitle="Curated For You" />
        <AssuranceStrip />
      </main>

      <SiteFooter />
    </div>
  );
}
