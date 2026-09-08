import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Useful Links",
    links: [
      { label: "Delivery Information", href: "/delivery-information" },
      { label: "Payment Options", href: "/payment-options" },
      { label: "Track Your Order", href: "/orders" },
      { label: "Returns", href: "/returns" },
      { label: "Find a Seller", href: "/sellers" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "About PeetalHouse", href: "/about" },
      { label: "Help & FAQs", href: "/help" },
      { label: "Sell With Us", href: "/sellers/onboarding" },
      { label: "Cookie Policy", href: "/cookie-policy" },
    ],
  },
  {
    title: "Contact Us",
    links: [
      { label: "1800-000-0000", href: "tel:18000000000" },
      { label: "support@peetalhouse.in", href: "mailto:support@peetalhouse.in" },
      { label: "Chat With Us", href: "/support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-[var(--color-charcoal)] text-[var(--color-silver)]">
      <div className="copper-divider" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-display text-xl copper-text">PeetalHouse</span>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--color-silver)]/80">
            A curated marketplace for handcrafted fashion, decor and gifts from artisans and independent sellers across India.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="mb-4 font-display text-sm uppercase tracking-[0.15em] text-[var(--color-copper-bright)]">
              {column.title}
            </h3>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[var(--color-copper-bright)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="copper-divider" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-[var(--color-silver)]/70 sm:flex-row">
        <span>© 2026 PeetalHouse. All rights reserved.</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-[var(--color-copper-bright)]">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="hover:text-[var(--color-copper-bright)]">Privacy Notice</Link>
        </div>
      </div>
    </footer>
  );
}
