"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getOrders, type Order } from "@/lib/api/orders";

export default function OrdersPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!token) return;
    getOrders(token).then(setOrders);
  }, [token]);

  if (!authLoading && !token) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <h1 className="font-display text-2xl">Sign in to view your orders</h1>
          <Link
            href="/account?next=/orders"
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
          <h1 className="mb-8 font-display text-3xl">Your Orders</h1>

          {orders === null && <p className="text-[var(--color-ink)]/50">Loading…</p>}
          {orders?.length === 0 && <p className="text-[var(--color-ink)]/50">No orders yet.</p>}

          <div className="flex flex-col gap-4">
            {orders?.map((order) => (
              <Link
                key={order._id}
                href={`/orders/${order._id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-copper)]/15 bg-white p-5"
              >
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-[var(--color-ink)]/50">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-display copper-text">₹{order.finalTotal.toLocaleString("en-IN")}</p>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-ink)]/50">{order.orderStatus}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
