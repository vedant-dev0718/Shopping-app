"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function CartPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const router = useRouter();

  if (!authLoading && !token) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <h1 className="font-display text-2xl">Sign in to view your cart</h1>
          <Link
            href="/account?next=/cart"
            className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)]"
          >
            Sign In
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h1 className="mb-8 font-display text-3xl">Your Cart</h1>

          {isLoading && <p className="text-[var(--color-ink)]/50">Loading…</p>}

          {!isLoading && (!cart || cart.items.length === 0) && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-[var(--color-ink)]/50">Your cart is empty.</p>
              <Link href="/category" className="copper-text font-display text-lg">
                Continue Shopping →
              </Link>
            </div>
          )}

          {cart && cart.items.length > 0 && (
            <div className="flex flex-col gap-6">
              {cart.items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--color-copper)]/15 bg-white p-4"
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream-deep)]">
                    {item.productId.imageUrls[0] && (
                      <Image src={item.productId.imageUrls[0]} alt={item.productId.title} fill sizes="80px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.productId.title}</p>
                    <p className="text-sm text-[var(--color-ink)]/50">₹{item.priceSnapshot.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(item._id, Math.max(1, item.quantity - 1))}
                      className="h-8 w-8 rounded-full border border-[var(--color-copper)]/30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItem(item._id, item.quantity + 1)}
                      className="h-8 w-8 rounded-full border border-[var(--color-copper)]/30"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item._id)}
                    className="text-sm text-[var(--color-ink)]/40 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-copper)]/20 pt-6 text-right">
                <p className="text-sm text-[var(--color-ink)]/60">Subtotal: ₹{cart.subtotal.toLocaleString("en-IN")}</p>
                <p className="text-sm text-[var(--color-ink)]/60">Shipping: ₹{cart.shipping.toLocaleString("en-IN")}</p>
                <p className="font-display text-xl copper-text">Total: ₹{cart.finalTotal.toLocaleString("en-IN")}</p>
                <button
                  type="button"
                  onClick={() => router.push("/checkout")}
                  className="mt-4 self-end rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)]"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
