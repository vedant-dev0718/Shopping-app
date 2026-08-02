# API Integration Plan — KMP Frontend ↔ Backend Contract Closure

## Status as of 2026-08-02

The KMP shared module has 80 Kotlin files across 7 delivery phases.  
`BackendFlowMode` defaults to `MOCK`; no screen hits the real backend until the mode is switched to `LIVE`.  
This document tracks what needs to close before the first live end-to-end run is viable.

---

## 1. What Is Already Wired (Do Not Re-engineer)

| Domain | KMP files | Backend module | Phase |
|---|---|---|---|
| Auth (login, signup, OTP, reset, Google) | `AuthRepository`, `AuthUseCase`, `AuthModels` | `modules/auth` | 2 |
| Catalog (products, reels, stores) | `ProductRepository`, `ReelRepository`, `StoreRepository`, `CatalogUseCase` | `modules/products`, `modules/reels`, `modules/stores` | 3 |
| Discovery (home feed) | `DiscoveryRepository` | `modules/discovery` | 3 |
| Cart | `CartRepository`, `CartUseCase` | `modules/cart` | 3 |
| Orders (buyer) | `OrderRepository`, `OrderUseCase` | `modules/orders` | 3 |
| Checkout + Razorpay | `CheckoutRepository`, `CheckoutModels` | `modules/checkout` | 3 |
| Addresses | `AddressRepository` | `modules/addresses` | 3 |
| Search | `SearchRepository`, `SearchUseCase` | `modules/search` | 4 |
| Seller orders (accept/ship/reject) | `SellerOrderRepository`, `SellerUseCase` | `modules/sellerOrders` | 6 |
| Bargain Days | `BargainRepository`, `BargainUseCase` | `modules/bargain` | 7 |

`ApiClient` (Ktor), `AppError`, `NetworkResult`, and `ApiEnvelope` are stable and shared by all of the above.

---

## 2. Confirmed Contract Alignment (Closed Items)

These were resolved in the previous backend-integration pass and must not be rolled back:

| Item | KMP field | Backend field | Status |
|---|---|---|---|
| Checkout verify address key | `deliveryAddressId` | `deliveryAddressId` | ✅ aligned |
| Seller ship carrier key | `trackingCarrier` | `trackingCarrier` | ✅ aligned |
| Seller reject body | `reason` + `messageToBuyer` | `reason` + `messageToBuyer` (both required) | ✅ aligned |
| Response envelope shape | `{ success, message, data }` | `successResponse / errorResponse` | ✅ aligned |
| Error `message` field on 4xx/5xx | `AppError.Api.serverMessage` reads `message` | All controllers use `errorResponse` | ✅ aligned |

---

## 3. Open Contract Items (Must Resolve Before Live Switch)

### 3.1 Field-level validation errors

**Gap:** Backend `express-validator` can return `errors[]` arrays on 400 responses (e.g. signup, address creation). KMP `ApiClient` currently parses only top-level `message`. UI will show a generic error instead of the specific field hint.

**Required action (Backend):** Confirm whether `errors[]` will always be present alongside `message` on 400, or if `message` is always a human-readable summary sufficient for UI display.  
**Required action (KMP):** If `errors[]` is needed, extend `ApiEnvelope` to carry `errors: List<String>?` and surface in `AppError.Api`.

**Owner:** Backend agent confirms policy; KMP frontend implements envelope extension if needed.

---

### 3.2 Auth reset rate-limit UX copy

**Gap:** Backend returns `429` with a `message` string. The exact wording is unconfirmed. KMP passes `serverMessage` directly to UI — if wording leaks account-enumeration hints, the UI will display them.

**Required action (Backend):** Confirm final `429` message text for:
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-otp`
- `POST /api/auth/reset-password`

Text must be account-enumeration-safe (e.g. "Too many attempts. Try again in X minutes." not "No account with that email.").

**Owner:** Backend agent confirms and locks message text. No KMP change needed once text is confirmed safe.

---

### 3.3 Backward compatibility aliases

**Gap:** Older iOS builds (pre-KMP migration) may still send `addressId` (checkout) and `courier` (ship). Live backend receives real traffic from both build generations simultaneously during rollout.

**Required action (Backend):** Add temporary fallback aliases:
- `checkout/verify`: accept `addressId` as fallback when `deliveryAddressId` is absent.
- `seller/orders/:id/ship`: accept `courier` as fallback when `trackingCarrier` is absent.

**Removal gate:** Remove aliases after the old native Swift `APIClient` is fully decommissioned and confirmed at < 1% of traffic.

**Owner:** Backend agent implements; KMP continues to send correct keys.

---

### 3.4 Shiprocket webhook `503` in production

**Gap:** When `SHIPROCKET_WEBHOOK_SECRET` is absent in production, the backend returns `503`. No KMP or iOS code calls this webhook directly — but it affects order status updates that the buyer order detail screen polls for.

**Required action (Backend):** Confirm that `503` responses on the webhook endpoint do not propagate as order status changes that would confuse the buyer-facing `OrderRepository.getOrder` response.

**Required action (iOS/KMP):** `OrderRepository` should treat a stale/unchanged status as non-error; no special handling of `503` needed on the client.

**Owner:** Backend agent confirms order status isolation; no KMP change required.

---

### 3.5 Missing KMP domains (not yet in ServiceLocator)

The following backend modules have routes and controllers but no corresponding KMP repository or use-case:

| Backend module | Missing KMP module | Needed for screen |
|---|---|---|
| `modules/analytics` | `AnalyticsRepository` | Seller Insights / Analytics screen |
| `modules/cancellations` | `CancellationRepository` | My Orders → Cancel Order |
| `modules/returns` | `ReturnRepository` | Returns & Refunds screen |
| `modules/refunds` | `RefundRepository` | Returns & Refunds screen |
| `modules/likes` | `LikeRepository` | Product / Reel like button |
| `modules/comments` | `CommentRepository` | Reel comments |
| `modules/recommendations` | `RecommendationRepository` | Buyer Home — "For You" row |
| `modules/contact` | `ContactRepository` | Settings → Contact Support |
| `modules/uploads` | Multipart upload flow | Upload Reel screen |
| `modules/finance` | `FinanceRepository` | Seller Dashboard → Earnings |
| `modules/safety` | `SafetyRepository` | Report product/user |

**Required action (KMP):** Implement repositories for each domain above using the existing `ApiClient` + `runCatchingNetwork` pattern.  
**Required action (Backend):** Confirm request/response shapes for cancellations, returns, and refunds — these have the most complex state machines.

---

## 4. Live Switch Checklist

Before changing `ServiceLocator` default from `BackendFlowMode.MOCK` to `BackendFlowMode.LIVE`:

- [ ] `MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SHIPROCKET_WEBHOOK_SECRET` are all set in production `.env`.
- [ ] Items 3.1–3.4 above are resolved and confirmed by the backend agent.
- [ ] `AppConfig` is initialized with `BackendFlowMode.LIVE` in the iOS `NotWhatApp.swift` entry point (currently uses default `MOCK`).
- [ ] `defaultApiBaseUrl()` in `PlatformHttpClient.kt` points to the correct production base URL (not `localhost:5001`).
- [ ] Backend `/api/health` returns `200` and is reachable from the simulator/device.
- [ ] Auth login, seller login, checkout flow, and bargain submission pass a manual smoke test against the live backend.
- [ ] `npm test -- --runInBand` is green on the backend after any compatibility alias additions.

---

## 5. Integration Test Targets (Shared Module)

These test scenarios cover the highest-risk integration points and should be added to `shared/src/commonTest/`:

| Scenario | Test target | Key assertion |
|---|---|---|
| Login returns token + role | `AuthRepository` | `AuthResponseDto.token` non-null, `role` maps to `AuthRoleDto` |
| Reset OTP 429 | `AuthRepository.forgotPassword` | `AppError.Api(429, ...)` thrown, `serverMessage` non-blank |
| Checkout verify sends `deliveryAddressId` | `CheckoutRepository` | Serialized JSON key is `deliveryAddressId` not `addressId` |
| Seller ship sends `trackingCarrier` | `SellerOrderRepository` | Serialized JSON key is `trackingCarrier` not `courier` |
| Seller reject sends both fields | `SellerOrderRepository` | Both `reason` and `messageToBuyer` present in body |
| API envelope missing `data` | `ApiClient` | `AppError.Deserialization` thrown, not NPE |
| HTTP 500 maps cleanly | `ApiClient` | `AppError.Server(500)` not `AppError.Unknown` |

---

## 6. Backend Contract Closure — Action Table

This is the agenda for the backend-agent handshake:

| # | Item | Action required | Owner | Blocking live? |
|---|---|---|---|---|
| B-1 | `errors[]` policy on 400 | Confirm: `message` is always sufficient, or `errors[]` must be parsed | Backend | Yes — affects signup/address UX |
| B-2 | 429 message wording for reset flow | Confirm and lock enumeration-safe strings | Backend | Yes — security |
| B-3 | `addressId` fallback alias on checkout/verify | Implement or formally decline | Backend | Yes — during rollout |
| B-4 | `courier` fallback alias on ship | Implement or formally decline | Backend | Yes — during rollout |
| B-5 | Order status isolation from webhook 503 | Confirm no status side-effect | Backend | Yes — order detail screen |
| B-6 | Cancellations request/response shape | Document or point to validation file | Backend | Needed for cancellation KMP module |
| B-7 | Returns + refunds state machine | Document transitions and required fields | Backend | Needed for returns KMP module |
| B-8 | Uploads multipart endpoint shape | Document `Content-Type` boundary and field names | Backend | Needed for reel upload KMP module |
| B-9 | Regression tests for confirmed contracts | Add for B-3, B-4, and reset-flow limiters | Backend | No — quality gate |

---

## 7. Frontend Implementation Queue (KMP Phase 8+)

Ordered by buyer journey criticality:

1. `CancellationRepository` + `OrderUseCase.cancelOrder` — blocks My Orders screen
2. `ReturnRepository` + `RefundRepository` — blocks Returns & Refunds screen  
3. `LikeRepository` — blocks product/reel engagement
4. `RecommendationRepository` — blocks home feed personalization row
5. `CommentRepository` — blocks reel comment thread
6. `AnalyticsRepository` — blocks Seller Insights screen
7. `ContactRepository` — blocks Settings → Contact Support
8. `FinanceRepository` — blocks Seller Earnings
9. Multipart upload flow in `ReelRepository` — blocks Upload Reel screen
10. `SafetyRepository` — blocks report flow

Each repository follows the same pattern:
```
class XRepository(private val client: ApiClient) {
    suspend fun action(token: String, ...): NetworkResult<XDto> =
        runCatchingNetwork { client.post("x/route", body, token) }
}
```
Add to `ServiceLocator` and expose through the appropriate use-case.

---

## 8. Compatibility Notes

- Old native Swift `APIClient` (ios/NotWhat/Services) and new KMP `ApiClient` coexist during migration. They share the same base URL from `Constants.swift` / `defaultApiBaseUrl()`. Keep both pointing to the same backend until the Swift layer is fully decommissioned.
- `ApiEnvelope<T>` uses `@JsonNames("id", "_id")` guards for MongoDB `_id` fields. Any new model DTOs must include the same guard on id fields.
- `BackendFlowMode.MOCK` must remain the default in `ServiceLocator` until the live switch checklist above is fully satisfied.
