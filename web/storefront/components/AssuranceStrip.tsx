const ASSURANCES = [
  { title: "Handcrafted by Artisans", detail: "Every piece sourced directly from independent makers" },
  { title: "Secure Payments", detail: "Razorpay-backed checkout, COD and UPI available" },
  { title: "Easy Returns", detail: "7-day hassle-free returns on eligible items" },
  { title: "Pan-India Shipping", detail: "Delivered to your doorstep, tracked end-to-end" },
];

export function AssuranceStrip() {
  return (
    <section className="border-y border-[var(--color-copper)]/15 bg-[var(--color-cream-deep)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {ASSURANCES.map((item) => (
          <div key={item.title} className="text-center">
            <h3 className="font-display text-lg text-[var(--color-copper-deep)]">{item.title}</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--color-ink)]/60">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
