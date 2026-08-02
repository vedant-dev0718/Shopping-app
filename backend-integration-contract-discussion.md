# Backend Integration and Contract Discussion (Frontend <-> Backend)

## Purpose
Start the integration stream between shared KMP client code and backend API contracts, and provide a concrete agenda for backend-agent discussion.

## Scope covered in this pass
- Shared KMP request payload alignment for checkout and seller-order actions.
- Contract review for auth reset flow and Shiprocket webhook hardening behavior.
- Backend discussion checklist with action owners.

## Contract fixes implemented now (KMP client)
1. Checkout verify request key updated to backend contract.
- Shared now sends `deliveryAddressId` (previously `addressId`).
- Backend validation currently requires `deliveryAddressId` or `shippingInfo`.

2. Seller ship request key updated to backend contract.
- Shared now sends `trackingCarrier` (previously `courier`).
- Backend ship endpoint validates `trackingCarrier` as optional metadata.

3. Seller reject request updated to backend contract.
- Shared now sends both `reason` and `messageToBuyer`.
- Backend reject endpoint validates both fields as required.

## Current contract assumptions
1. API envelope
- Shared KMP expects API responses in envelope format:
  - `success: boolean`
  - `message: string`
  - `data: object | array | null`
- Error parsing on shared side currently relies primarily on `message`.

2. Auth reset flow
- Expected sequence:
  1. `POST /auth/forgot-password`
  2. `POST /auth/verify-reset-otp`
  3. `POST /auth/reset-password`
- Shared should handle `429` for rate limiting and use backend `message` for user-facing copy.

3. Shiprocket webhook behavior
- Webhook route returns raw webhook-style JSON acknowledgements.
- In production, missing Shiprocket secret should fail closed (`503`).
- In non-production, missing secret can be bypassed for local development.

## Discussion agenda for backend agent
1. Error contract stability
- Confirm that all relevant endpoints always return top-level `message` on `4xx/5xx`.
- Confirm whether field-level validation errors should be surfaced as `errors[]` consistently.

2. Auth reset limits and UX contract
- Confirm final thresholds/window for:
  - forgot-password
  - verify-reset-otp
  - reset-password
- Confirm user-safe wording for `429` messages to avoid account enumeration hints.

3. Webhook response policy
- Confirm long-term policy that provider webhooks can return minimal raw JSON (not full app envelope) without affecting observability/reporting expectations.
- Confirm logging fields required for replay/debug (shipment ID, order ID, status, signature verdict).

4. Checkout verify request compatibility
- Confirm whether backend should temporarily accept both `addressId` and `deliveryAddressId` for backward compatibility with old clients.

5. Seller action payload compatibility
- Confirm whether backend should support legacy alias `courier` in `ship` payload for older app versions.
- Confirm whether `messageToBuyer` may become optional in future or remains required.

## Proposed backend tasks (discussion output)
1. Add temporary compatibility aliases
- `checkout/verify`: accept `addressId` as fallback to `deliveryAddressId`.
- `seller/orders/:id/ship`: accept `courier` as fallback to `trackingCarrier`.

2. Publish contract notes in backend docs
- Add endpoint request/response examples for reset flow and seller order mutations.
- Include webhook 400/503 behavior and expected provider retry posture.

3. Add regression tests
- Checkout verify with `deliveryAddressId`.
- Seller reject requires both `reason` and `messageToBuyer`.
- Seller ship accepts `trackingCarrier` and legacy alias (if fallback added).
- Auth reset endpoints return stable `429` message field.

## Validation checklist after backend sync
1. Shared KMP tests pass.
2. Backend tests for affected routes pass.
3. End-to-end seller flow works:
- accept -> reject (with buyer message) -> ship -> delivered updates.
4. End-to-end checkout verify works using `deliveryAddressId`.
5. Password reset flow handles rate limiting cleanly in frontend.

## Files updated in this pass
- `shared/src/commonMain/kotlin/com/notwhat/shared/checkout/CheckoutModels.kt`
- `shared/src/commonMain/kotlin/com/notwhat/shared/seller/SellerOrderModels.kt`
- `shared/src/commonMain/kotlin/com/notwhat/shared/seller/SellerOrderRepository.kt`
