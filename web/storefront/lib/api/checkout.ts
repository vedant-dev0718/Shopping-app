import { apiPost } from "./client";
import type { Cart } from "./cart";

export type StorePaymentGroup = {
  storeId: string;
  storeName: string;
  amount: number;
  currency: string;
  upiId?: string;
  qrCode?: string;
  qrCodeLabel?: string;
};

export type CheckoutStart = {
  cart: Cart;
  razorpayKeyId: string;
  razorpayOrderId: string;
  razorpayOrderAmount: number;
  shippingOptions: { label: string; amount: number }[];
  paymentMethods: ("UPI_QR" | "COD" | "RAZORPAY")[];
  storePaymentGroups: StorePaymentGroup[];
};

export type OrderConfirmation = {
  orderNumber: string;
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  trackingStatus: string;
  finalTotal: number;
};

export function startCheckout(token: string) {
  return apiPost<CheckoutStart>("/checkout/start", undefined, token);
}

export function verifyRazorpayPayment(
  token: string,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    deliveryAddressId: string;
  },
) {
  return apiPost<OrderConfirmation>(
    "/checkout/verify",
    { ...input, paymentMethod: "RAZORPAY" },
    token,
  );
}

export function placeCodOrder(token: string, deliveryAddressId: string) {
  return apiPost<OrderConfirmation>(
    "/checkout/place-cod",
    { paymentMethod: "COD", deliveryAddressId },
    token,
  );
}

export function placeQrOrder(token: string, deliveryAddressId: string) {
  return apiPost<OrderConfirmation>(
    "/checkout/place-qr-payment",
    { paymentMethod: "UPI_QR", deliveryAddressId },
    token,
  );
}
