"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";

export function AddToCartButton({ productId }: { productId: string }) {
  const { token } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");

  async function handleClick() {
    if (!token) {
      router.push(`/account?next=/products/${productId}`);
      return;
    }
    setStatus("adding");
    await addItem(productId, 1);
    setStatus("added");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "adding"}
      className="rounded-full bg-gradient-to-r from-[var(--color-copper-deep)] to-[var(--color-copper-bright)] px-8 py-3 font-medium text-[var(--color-charcoal)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {status === "added" ? "Added to Cart" : status === "adding" ? "Adding…" : "Add to Cart"}
    </button>
  );
}
