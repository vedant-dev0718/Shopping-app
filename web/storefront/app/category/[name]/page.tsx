import { getProducts } from "@/lib/api/products";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductGrid } from "@/components/ProductGrid";

export const revalidate = 60;

export default async function CategoryPage({ params }: PageProps<"/category/[name]">) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const products = await getProducts({ category: decoded }, { next: { revalidate } });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <ProductGrid products={products} title={decoded} subtitle="Shop by Category" />
      </main>
      <SiteFooter />
    </div>
  );
}
