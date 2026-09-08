"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getOrder, cancelOrder, type Order } from "@/lib/api/orders";

export default function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = use(params);
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    getOrder(token, id).then(setOrder);
  }, [token, id]);

  async function handleCancel() {
    if (!token || !cancelReason.trim()) return;
    const updated = await cancelOrder(token, id, cancelReason.trim());
    setOrder(updated);
    setShowCancelForm(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          {!order && <p className="text-[var(--color-ink)]/50">Loading…</p>}

          {order && (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="font-display text-3xl">{order.orderNumber}</h1>
                  <p className="text-sm text-[var(--color-ink)]/50">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span className="rounded-full border border-[var(--color-copper)]/30 px-4 py-1 text-xs uppercase tracking-wide">
                  {order.orderStatus}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between rounded-xl border border-[var(--color-copper)]/15 bg-white p-4">
                    <div>
                      <p className="font-medium">{item.titleSnapshot}</p>
                      <p className="text-sm text-[var(--color-ink)]/50">Qty {item.quantity}</p>
                    </div>
                    <p className="font-display copper-text">₹{item.itemTotal.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-2 rounded-xl border border-[var(--color-copper)]/15 bg-white p-5 text-sm">
                <p className="flex justify-between"><span>Payment</span><span>{order.paymentMethod} · {order.paymentStatus}</span></p>
                <p className="flex justify-between"><span>Tracking</span><span>{order.trackingStatus}</span></p>
                {order.trackingNumber && <p className="flex justify-between"><span>Tracking #</span><span>{order.trackingNumber}</span></p>}
                <p className="flex justify-between font-display text-lg copper-text"><span>Total</span><span>₹{order.finalTotal.toLocaleString("en-IN")}</span></p>
              </div>

              {order.orderStatus !== "cancelled" && order.orderStatus !== "delivered" && (
                <div className="mt-6">
                  {!showCancelForm ? (
                    <button type="button" onClick={() => setShowCancelForm(true)} className="text-sm text-red-600">
                      Cancel this order
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Reason for cancellation"
                        className="rounded-lg border border-[var(--color-copper)]/25 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="self-start rounded-full border border-red-600 px-6 py-2 text-sm text-red-600"
                      >
                        Confirm Cancellation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
