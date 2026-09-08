"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getAddresses, addAddress, type Address, type AddressInput } from "@/lib/api/addresses";
import { startCheckout, verifyRazorpayPayment, placeCodOrder, placeQrOrder, type CheckoutStart } from "@/lib/api/checkout";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const EMPTY_ADDRESS: AddressInput = {
  label: "Home",
  contactName: "",
  contactPhone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  locality: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

export default function CheckoutPage() {
  const { token, user } = useAuth();
  const { cart, refresh } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [checkoutData, setCheckoutData] = useState<CheckoutStart | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD" | "UPI_QR">("RAZORPAY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAddresses(token).then((list) => {
      setAddresses(list);
      const preferred = list.find((a) => a.isDefault) ?? list[0];
      if (preferred) setSelectedAddressId(preferred._id);
    });
    startCheckout(token).then(setCheckoutData);
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <h1 className="font-display text-2xl">Sign in to check out</h1>
          <Link
            href="/account?next=/checkout"
            className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)]"
          >
            Sign In
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  async function handleAddAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    const created = await addAddress(token, newAddress);
    setAddresses((prev) => [...prev, created]);
    setSelectedAddressId(created._id);
    setShowAddForm(false);
    setNewAddress(EMPTY_ADDRESS);
  }

  async function handlePlaceOrder() {
    if (!token || !selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      if (paymentMethod === "COD") {
        const order = await placeCodOrder(token, selectedAddressId);
        await refresh();
        router.push(`/orders/${order.orderId}`);
        return;
      }

      if (paymentMethod === "UPI_QR") {
        const order = await placeQrOrder(token, selectedAddressId);
        await refresh();
        router.push(`/orders/${order.orderId}`);
        return;
      }

      if (!checkoutData) throw new Error("Checkout not ready yet");

      const razorpay = new window.Razorpay({
        key: checkoutData.razorpayKeyId,
        order_id: checkoutData.razorpayOrderId,
        amount: checkoutData.razorpayOrderAmount,
        name: "PeetalHouse",
        theme: { color: "#b87333" },
        prefill: { name: user?.name, email: user?.email },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const order = await verifyRazorpayPayment(token, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            deliveryAddressId: selectedAddressId,
          });
          await refresh();
          router.push(`/orders/${order.orderId}`);
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="mb-4 font-display text-2xl">Delivery Address</h1>
              <div className="flex flex-col gap-3">
                {addresses.map((address) => (
                  <label
                    key={address._id}
                    className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
                      selectedAddressId === address._id
                        ? "border-[var(--color-copper-bright)] bg-white"
                        : "border-[var(--color-copper)]/15 bg-white/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selectedAddressId === address._id}
                        onChange={() => setSelectedAddressId(address._id)}
                      />
                      <span className="font-medium">{address.label}</span>
                    </div>
                    <p className="text-sm text-[var(--color-ink)]/60">
                      {address.contactName}, {address.addressLine1}, {address.locality}, {address.city}, {address.state}{" "}
                      {address.postalCode}
                    </p>
                  </label>
                ))}

                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="self-start text-sm copper-text font-medium"
                  >
                    + Add new address
                  </button>
                )}

                {showAddForm && (
                  <form onSubmit={handleAddAddress} className="flex flex-col gap-3 rounded-xl border border-[var(--color-copper)]/20 bg-white p-4">
                    {(
                      [
                        ["contactName", "Full name"],
                        ["contactPhone", "Phone"],
                        ["addressLine1", "Address line 1"],
                        ["locality", "Locality"],
                        ["city", "City"],
                        ["state", "State"],
                        ["postalCode", "Postal code"],
                      ] as const
                    ).map(([field, placeholder]) => (
                      <input
                        key={field}
                        required
                        placeholder={placeholder}
                        value={newAddress[field]}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="rounded-lg border border-[var(--color-copper)]/25 px-3 py-2 text-sm outline-none focus:border-[var(--color-copper-bright)]"
                      />
                    ))}
                    <button
                      type="submit"
                      className="self-start rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-2 text-sm font-medium text-[var(--color-charcoal)]"
                    >
                      Save Address
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl">Payment Method</h2>
              <div className="flex flex-col gap-3">
                {(["RAZORPAY", "COD", "UPI_QR"] as const).map((method) => (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-4 ${
                      paymentMethod === method ? "border-[var(--color-copper-bright)] bg-white" : "border-[var(--color-copper)]/15 bg-white/60"
                    }`}
                  >
                    <input type="radio" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                    <span>{method === "RAZORPAY" ? "Card / UPI / Netbanking (Razorpay)" : method === "COD" ? "Cash on Delivery" : "UPI QR (pay seller directly)"}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <aside className="h-fit rounded-xl border border-[var(--color-copper)]/15 bg-white p-6">
            <h2 className="mb-4 font-display text-xl">Order Summary</h2>
            {cart && (
              <div className="flex flex-col gap-2 text-sm">
                <p className="flex justify-between text-[var(--color-ink)]/60">
                  <span>Subtotal</span>
                  <span>₹{cart.subtotal.toLocaleString("en-IN")}</span>
                </p>
                <p className="flex justify-between text-[var(--color-ink)]/60">
                  <span>Shipping</span>
                  <span>₹{cart.shipping.toLocaleString("en-IN")}</span>
                </p>
                <p className="flex justify-between font-display text-lg copper-text">
                  <span>Total</span>
                  <span>₹{cart.finalTotal.toLocaleString("en-IN")}</span>
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !selectedAddressId}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-6 py-3 font-medium text-[var(--color-charcoal)] disabled:opacity-60"
            >
              {isSubmitting ? "Placing Order…" : "Place Order"}
            </button>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
