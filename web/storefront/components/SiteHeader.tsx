"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";

const NAV_LINKS = [
  { href: "/", label: "New In" },
  { href: "/reels", label: "Reels" },
  { href: "/category", label: "Categories" },
  { href: "/sellers", label: "Sell With Us" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-copper)]/20 bg-[var(--color-charcoal)] text-[var(--color-cream)]">
      <div className="bg-[var(--color-copper-deep)]/90 px-6 py-1.5 text-center text-xs tracking-[0.2em] text-[var(--color-cream)] uppercase">
        Free shipping over ₹999 · Certified artisans · Secure payments
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
        <Link href="/" className="font-display text-2xl tracking-wide copper-text">
          PeetalHouse
        </Link>

        <nav className="hidden items-center gap-8 text-sm tracking-wide text-[var(--color-silver)] md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--color-copper-bright)]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/search" aria-label="Search" className="hover:text-[var(--color-copper-bright)]">
            Search
          </Link>
          <Link href="/account" aria-label="Account" className="hover:text-[var(--color-copper-bright)]">
            {user ? user.name.split(" ")[0] : "Account"}
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="rounded-full border border-[var(--color-copper)]/50 px-4 py-1.5 hover:border-[var(--color-copper-bright)] hover:text-[var(--color-copper-bright)]"
          >
            Cart{itemCount > 0 ? ` (${itemCount})` : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
