# NotWhat Engineering Completion Plan

Prepared for hiring and onboarding an engineering team to finish NotWhat end to end.

Review date: June 28, 2026  
Repository reviewed: SwiftUI iOS app plus Node/Express/MongoDB backend  
Review type: static code and documentation review. Live Razorpay, Shiprocket, Cloudinary, email, App Store, and production server behavior still needs provider-side verification.

## 1. Executive Summary

NotWhat is a multi-vendor marketplace with buyer shopping, seller stores, shoppable reels, checkout, bargains/bidding, order management, returns, refunds, moderation, admin tooling, and seller analytics. The app is substantially built, but it is not yet production-ready. The highest-risk remaining work is not cosmetic; it is money movement, payout timing, provider verification, App Store auth/compliance, infrastructure hardening, and full end-to-end QA.

The next team should first stabilize the money and security flows, then prove shipping and payouts with real sandbox/live provider evidence, then complete App Store requirements and final UI/QA polish.

## 2. Status Legend

- Done: implemented in the current repo and visible in code.
- Partial: meaningful implementation exists, but gaps or production risks remain.
- Needs verification: code exists, but a real provider, production server, or device flow must prove it.
- Not implemented: no meaningful implementation found in the reviewed code.

## 3. Current Build and Repo State

The repo currently contains uncommitted work across backend address, auth, order, seller, store, and SwiftUI address/seller screens. The new team should begin by reviewing and preserving those changes before making broad edits.

Important existing docs:

- `README.md`
- `docs/testing.md`
- `docs/admin-qa-checklist.md`
- `docs/manual-qa-checklist.md`
- `docs/app-store-submission.md`
- `docs/app-store-privacy-label.md`

Important backend anchors:

- `backend/src/app.js`
- `backend/src/routes/index.js`
- `backend/src/modules/checkout/`
- `backend/src/modules/bargain/`
- `backend/src/modules/sellerOrders/`
- `backend/src/modules/orders/`
- `backend/src/modules/sellers/`
- `backend/src/modules/finance/`
- `backend/src/modules/auth/`
- `backend/src/modules/admin/`
- `backend/src/modules/adminTools/`
- `backend/src/modules/safety/`
- `backend/src/utils/razorpay.js`
- `backend/src/utils/shiprocket.js`

Important iOS anchors:

- `ios/NotWhat/App/AppRouter.swift`
- `ios/NotWhat/App/AppSession.swift`
- `ios/NotWhat/Services/`
- `ios/NotWhat/Views/`
- `ios/NotWhat/Components/`
- `ios/NotWhat/Info.plist`

## 4. What Is Already Done

### Buyer and Seller Marketplace

Status: Partial to Done

- Buyer browsing exists through discovery, trending, search, products, stores, reels, recommendations, cart, checkout, orders, returns, support, settings, and profile surfaces.
- Seller store setup, product management, reel upload, order management, Shiprocket pickup address syncing, analytics, and dashboard screens exist.
- Products support category, subcategory, region, stock, tags, multiple image URLs, save/click counts, and status.
- Reels support video URL, thumbnail, category, region, hashtags, tagged products, likes, comments, view tracking, and status.
- Store profiles include regional/category metadata and completed order count.
- Buyer recommendations exist using saved stores, preferred categories/regions, product clicks, reel views, and trending fallback.

Remaining risk:

- Final UI polish is not complete.
- Some screens may still contain placeholder/demo media fallbacks.
- Full device QA for empty states, text overlap, navigation, reels playback lifecycle, and all role flows is still required.

### Authentication and Accounts

Status: Partial to Done

- Email/password signup has a two-step OTP email verification flow.
- Google Sign-In exists for buyer and seller accounts.
- Login rate limiting is now stricter on `/api/auth/login`: 5 failed attempts per email/IP in 15 minutes.
- Failed login lockout exists in the user model/service.
- Password reset OTP and change-password flows exist.
- Google-only accounts are blocked from password change with proper messaging.
- Logout token blacklist exists.
- Account deletion exists on backend and iOS settings/support components.
- Admin login is separated under `/api/admin/login`.
- Admin TOTP/2FA is enforced when admin users log in.
- Admin seed script requires `ADMIN_PASSWORD`; no hardcoded fallback password was found in the current seed flow.

Remaining risk:

- Sign in with Apple is not implemented and is likely required if Google Sign-In remains available on iOS.
- Production Resend/domain verification still needs to be completed.
- Admin TOTP enrollment and recovery process needs an operational runbook.
- The production JWT secret must be confirmed as at least 64 random characters and never committed.

### Backend Security Foundations

Status: Partial

- `helmet` is enabled.
- `express-mongo-sanitize` is enabled.
- Auth/login, forgot-password, uploads/contact, and catalogue-style rate limiting foundations exist.
- Role-based middleware and ownership checks exist across many buyer/seller/admin routes.
- Security tests exist for auth roles and access control.

Remaining risk:

- `morgan('dev')` is still used outside test mode; production should use structured logs or `combined`, with sensitive query data removed.
- Sentry or equivalent error monitoring is not installed.
- HTTPS redirect and production reverse-proxy config are not in repo.
- PM2/systemd/process manager config is not in repo.
- No certificate pinning or jailbreak detection was found in the iOS app.
- `Info.plist` still permits `NSAllowsArbitraryLoadsInWebContent` and local/network ATS exceptions. This must be reviewed before App Store submission.

### Checkout and Razorpay

Status: Partial, needs provider verification

- Razorpay order creation exists.
- Razorpay signature verification exists.
- Razorpay raw-body webhook route exists before JSON parsing.
- Manual capture support exists through `RAZORPAY_MANUAL_CAPTURE_ENABLED` / `RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE`.
- Checkout validates Razorpay payment amount against the current cart before placing the order when a payment is fetched.
- Orders are created with seller acceptance, inventory reservation, payment flow metadata, commission, GST, seller earnings, and emails.
- Payment webhook handles `payment.authorized`, `payment.captured`, `payment.failed`, refund events, and basic order-paid logging.
- Razorpay Route transfer logic exists and can transfer seller net amount on hold while platform commission remains in the merchant account.
- Missing linked seller account creates a `PendingManualPayout` instead of pretending the transfer succeeded.

Remaining risk:

- Local/mock payment fallbacks still exist when Razorpay keys are missing. They should be impossible in production and covered by startup/deploy checks.
- Live Razorpay test evidence is still needed for UPI, cards, wallets, netbanking, failed payments, refunds, authorization expiry, manual capture, and Route transfers.
- Convenience fee/return-fee business rules are not finalized.
- COD is not implemented.
- Payment method names are present, but each method must be verified in the Razorpay account dashboard and test/live modes.

### Bargain and Bidding

Status: Partially fixed, needs regression and provider verification

The original critical bug was that a winning bid could capture money and reduce stock without a real order. Current code now:

- Creates an order from the winning bid before capture.
- Stores bid shipping info.
- Uses manual capture for bid payments.
- Validates captured amount against the winning bid order total.
- Marks capture failure on the linked order if capture fails.
- Sends winning-bid order confirmation emails.
- Reduces product stock after successful close.
- Initiates seller Route transfer after successful capture.

Remaining risk:

- Losing-bid authorization release currently marks bid status as lost but does not appear to call a provider-side refund/release for every losing authorization. Razorpay may auto-expire uncaptured authorizations, but the team must document and verify the exact behavior.
- `releaseAuthorization` intentionally throws for live authorized Razorpay payments because Razorpay does not provide immediate release for uncaptured authorizations. The product copy, admin status, and support process must reflect that it is an auto-expiry/auto-refund wait, not an instant bank unblock.
- Bidding should have focused regression tests for close, capture failure, amount mismatch, losing bids, stock, order visibility, and buyer emails.

### Seller Payouts and Finance

Status: Partial, launch blocker

- Seller earnings models exist.
- Commission settings exist globally and by seller override.
- Order item financials calculate platform commission and seller earnings.
- Razorpay Route transfer creation exists.
- Transfers are created on hold.
- Admin payout records can be created from eligible seller earnings.
- Admin can mark payouts paid/failed.
- Seller analytics exposes pending, eligible, paid, and held earnings.

Critical remaining gap:

- `markOrderEarningsEligible` exists but no active job or delivery/return-window flow was found calling it when the 7-day return window ends.
- `markOrderDelivered` releases Razorpay transfer hold on delivery, which can be earlier than the 7-day return window. This must be corrected if business policy says seller funds release only after the return window.
- Payout eligibility, transfer release, refunds, returns, and seller-visible balances need a single reconciled lifecycle.

Required outcome:

- Money should move only according to final business rules:
  - Buyer pays.
  - Seller confirms inventory.
  - Payment captures.
  - Shipment is created.
  - Courier confirms delivery.
  - Return window expires.
  - Seller earnings become eligible.
  - Seller payout is released or recorded.
  - Refund/return/cancellation reverses or blocks seller earnings.

### Shiprocket and Shipping

Status: Partial, needs sandbox/live verification

- Shiprocket API utility exists for auth, pickup registration, order creation, serviceability, AWB assignment, and label generation.
- Seller pickup-address registration and sync exists.
- Address models include Shiprocket sync metadata.
- Serviceability endpoint exists.
- Seller order shipment creation exists:
  - validates pickup/delivery pincodes,
  - checks serviceability,
  - creates Shiprocket order,
  - assigns AWB,
  - attempts label generation,
  - stores tracking number, courier, tracking URL, Shiprocket order/shipment IDs, and label URL.
- Shiprocket webhook exists and can mark orders delivered from courier events.
- The old auto-delivery job no longer auto-marks delivered; it flags shipped orders for review after 14 days without delivered webhook.

Remaining risk:

- Courier selection is automatic using the first returned courier. A seller-facing courier selection screen/workflow is still needed if sellers should choose courier and pricing.
- Shipping charges from Shiprocket are not yet fully integrated into checkout pricing or seller/buyer cost sharing.
- Buyer checkout serviceability during address entry is only partially represented. It needs final UX and backend enforcement.
- Shiprocket sandbox/live credentials and webhook signature setup must be proven.
- Return shipment flow is not fully automated with Shiprocket.

### Returns, Refunds, and Cancellations

Status: Partial to Done, needs full QA

- Buyer cancellation requests exist.
- Seller cancellation exists.
- Seller/admin cancellation approval/rejection support exists.
- 7-day return window is implemented in post-order service.
- Buyer return request exists.
- Seller return review and mark-return-received exist.
- Refund creation exists with Razorpay refund utility.
- Refund records and admin refund status updates exist.
- Refund/return/cancellation data appears in buyer, seller, and admin surfaces.

Remaining risk:

- Live refund mode is gated by `RAZORPAY_ENABLE_LIVE_REFUNDS`; production behavior must be verified.
- Refund webhook reconciliation is basic and should be expanded for idempotency, partial refunds, failures, disputes, and audit logs.
- Return shipping fee/convenience fee policy is not finalized.
- Chargeback/dispute evidence storage is not fully built.

### Admin Platform

Status: Strong partial

- Admin auth route exists.
- Admin dashboard, analytics, search, operations, management, content, settings, support, moderation, categories, regions, featured content, sellers, products, reels, comments, orders, payments, refunds, returns, shipments, and payout surfaces exist.
- Admin QA checklist exists.
- Admin can review KYC submissions, approve/reject seller KYC, onboard sellers to Razorpay, activate linked accounts, create payouts, mark payouts paid/failed, update commission settings, and moderate reported content.

Remaining risk:

- Admin KYC approval currently appears partly manual and not a full Razorpay KYC/penny-drop verification flow.
- Admin UX should be sorted and streamlined for daily operations.
- Admin action history and money reconciliation should be verified against realistic orders.
- Admin should never need MongoDB for normal operations.

### Content Moderation and Safety

Status: Partial

- User report and block APIs exist.
- Reported/blocked content is filtered out of user feeds/search/recommendations.
- Admin moderation reports/actions exist.
- Admin can hide/remove content, warn/suspend/ban users, and view moderation history.

Remaining risk:

- Cloudinary automated moderation is not configured.
- Seller-uploaded image/video policy, review queue, appeal process, and repeat-offender automation need final rules.
- App Store UGC policy checklist must be verified in production build.

### Media Storage

Status: Partial

- Cloudinary upload service exists for product images and reel videos.
- Image upload limits: 10 MB.
- Video upload limits: 100 MB.
- Cloudinary transformations exist for product images and reel thumbnails.
- Product model supports multiple images.

Remaining risk:

- S3/Amazon storage is not implemented.
- Cloudinary moderation is not enabled.
- Media lifecycle cleanup is not complete: deleting products/reels should remove unused Cloudinary assets where appropriate.
- Storage cost controls, video compression, adaptive streaming, CDN settings, and upload quotas need to be finalized.

### Testing and CI

Status: Partial

- Backend Jest test suite exists.
- Tests use `mongodb-memory-server` and mock external services.
- Coverage includes auth, roles, products, reels, cart, checkout, webhooks, Shiprocket, seller orders, refunds/returns/cancellations, seller analytics, commission, payouts, admin analytics, moderation, search safety, legal content, and support.
- GitHub Actions backend test workflow exists for pull requests and pushes to main.
- iOS XCTest and XCUITest source files exist.

Remaining risk:

- iOS test targets are not fully configured in the Xcode project according to `docs/testing.md`.
- CI currently runs backend tests only.
- No required CI gate for iOS build/test, linting, formatting, secrets scan, or production smoke tests was found.
- Live provider end-to-end tests must be separated from mocked CI tests.

## 5. Launch Blockers

These should be fixed before any public launch or real customer money.

1. Payout lifecycle must be corrected so seller funds are not released before the return window and seller earnings become eligible automatically after the correct period.
2. Razorpay manual capture, authorization expiry, refunds, Route transfer, linked-account onboarding, and live/test payment methods must be verified with provider evidence.
3. Losing-bid authorization handling must be made explicit and customer-safe.
4. Production must reject mock/local payment behavior.
5. Shiprocket sandbox/live flow must be proven end to end: pickup, serviceability, order, AWB, label, webhook, delivered status, return handling.
6. Sign in with Apple must be implemented if third-party login remains in the iOS app.
7. Production security hardening must be completed: HTTPS, logs, Sentry, process manager, secrets, ATS review, certificate pinning decision.
8. iOS App Store compliance must be closed: privacy policy URL, account deletion, UGC moderation, demo buyer/vendor accounts, production API, screenshots, no placeholder/demo media.
9. CI must prevent unsafe pushes: backend tests, iOS build, iOS tests once targets exist, secrets scan, and smoke checks.
10. Full regression QA must cover buyer, seller, admin, payment, shipping, returns, moderation, and support.

## 6. Priority Roadmap for the New Team

### Phase 0: Team Onboarding and Stabilization

Goal: understand the current repo, protect existing work, and create a safe delivery process.

Tasks:

- Review all uncommitted changes.
- Create a staging branch and protect `main`.
- Run backend tests.
- Run iOS build.
- Confirm local backend health.
- Confirm seeded buyer, seller, and admin credentials.
- Document environment variables for local, staging, and production.
- Add a shared issue tracker with the phases in this document.

Acceptance criteria:

- Backend tests pass locally and in GitHub Actions.
- iOS app builds from a clean checkout.
- Team has local `.env.example` and setup runbook.
- No developer depends on MongoDB console for normal product/admin workflows.

### Phase 1: Money and Security

Goal: make customer money safe before feature polish.

Tasks:

- Finalize Razorpay mode:
  - manual capture for seller-confirmed orders,
  - automatic capture only where explicitly intended,
  - no production mock payments,
  - amount verification everywhere.
- Fix payout release timing:
  - transfer on hold until return window expires,
  - automated eligibility job,
  - admin override with audit trail,
  - seller-visible payout states.
- Add full losing-bid authorization policy:
  - communicate auto-expiry clearly,
  - record expected release date,
  - add support/admin status.
- Expand refund/return reconciliation:
  - idempotent refund webhooks,
  - partial refunds,
  - refund failures,
  - dispute evidence.
- Harden auth and security:
  - production JWT secret validation,
  - Sentry,
  - structured production logs,
  - HTTPS redirect,
  - process manager,
  - secrets scan,
  - per-user upload/search rate limits.

Acceptance criteria:

- No flow can take buyer money without an order.
- No order can be marked paid with mismatched payment amount.
- No seller can receive funds before the approved payout policy.
- No local bypass works in production.
- Security smoke tests pass.

### Phase 2: Shipping and Fulfillment

Goal: make the physical delivery lifecycle real and observable.

Tasks:

- Complete Shiprocket sandbox setup.
- Verify pickup address registration and OTP flow.
- Enforce delivery address validation and serviceability before checkout payment.
- Add courier selection and pricing to seller shipment flow if required.
- Integrate Shiprocket pricing into checkout/order math.
- Finalize buyer/seller shipping cost policy.
- Generate label and AWB reliably.
- Show per-item tracking for multi-seller orders.
- Open tracking links in Safari.
- Build return shipment workflow.

Acceptance criteria:

- A seller can create a Shiprocket shipment from an accepted order.
- Buyer sees correct AWB/tracking.
- Shiprocket delivered webhook updates order state.
- Fallback job only flags review, not fake delivery.
- Admin can search and inspect shipments without MongoDB.

### Phase 3: App Store and Account Compliance

Goal: make iOS submission possible.

Tasks:

- Implement Sign in with Apple.
- Verify account deletion from app and backend.
- Publish privacy policy, terms, return policy, shipping policy, support page, and content policy on a web domain.
- Buy/configure domain for production API and email.
- Configure Resend or SMTP for production.
- Prepare App Review demo buyer, demo seller, and demo admin/vendor notes.
- Confirm UGC moderation controls are visible.
- Clean ATS settings and decide certificate pinning.
- Remove debug URLs, placeholder text, and seed-only media from production.

Acceptance criteria:

- App Review can log in as buyer and seller.
- Privacy URL is public.
- Account deletion works.
- Google and Apple auth coexist.
- Production build points to production API.

### Phase 4: Product, Catalog, Media, and Business Rules

Goal: finish marketplace depth and cost controls.

Tasks:

- Finalize category and region taxonomy.
- Wire admin-managed categories/regions to seller and buyer UIs.
- Complete multiple product image UX across listing, detail, cart, order, and seller edit.
- Add media deletion/lifecycle cleanup.
- Add Cloudinary moderation or review queue.
- Finalize upload limits and seller tiers.
- Implement subscription model for reel/upload counts if part of business model.
- Finalize seller order limits or tier benefits.

Acceptance criteria:

- Sellers can create/edit products and reels without placeholder data.
- Buyers can view multiple product images cleanly.
- Admin can manage categories/regions and featured content.
- Media costs are bounded by policy and automation.

### Phase 5: Notifications, Messaging, and Recommendations

Goal: make the app operational and responsive.

Tasks:

- Implement push notifications for:
  - order placed,
  - seller acceptance/rejection,
  - shipped,
  - delivered,
  - return/refund updates,
  - bargain won/lost,
  - admin/support actions where needed.
- Implement transactional email coverage.
- Decide whether in-app buyer/seller messaging is required for launch or deferred.
- Improve recommendation ranking using events, saves, orders, region/category, and reel engagement.

Acceptance criteria:

- Users are informed without needing to refresh.
- Seller and buyer notification preferences exist or are documented.
- Recommendation fallback remains safe and fast.

### Phase 6: Admin, QA, and Release Engineering

Goal: make the team able to ship safely.

Tasks:

- Sort and streamline admin pages.
- Add operational dashboards for:
  - failed payments,
  - pending refunds,
  - pending KYC,
  - Shiprocket failures,
  - payout holds,
  - disputed orders,
  - reports/support.
- Add GitHub required checks.
- Add iOS build/test workflow.
- Configure test targets in Xcode.
- Add smoke tests for production/staging health.
- Add release checklist.
- Add rollback and incident response runbook.

Acceptance criteria:

- Every PR runs required checks.
- Admin can resolve common issues without database access.
- Release manager has a checklist and rollback path.

### Phase 7: Final UI and Performance Polish

Goal: make the app feel ready for real users.

Tasks:

- Fix text overlap across notifications, checkout/place-order pricing, cards, profile, orders, and admin surfaces.
- Clean buyer home.
- Improve profile to match expected social-commerce patterns.
- Make reels tab Instagram-like while preserving marketplace actions.
- Optimize reels playback and scrolling.
- Stop reels playback when leaving reels tab.
- Fix Continue Shopping navigation.
- Remove placeholder and empty-state bugs.
- Confirm responsive layout on supported iPhones.
- Verify product image galleries and video thumbnails.

Acceptance criteria:

- No obvious text overlap on common iPhone sizes.
- Reels do not keep playing off-tab.
- Empty states are professional and never look broken.
- Buyer, seller, and admin flows feel complete.

## 7. Business Model Decisions Needed

The engineering team needs these decisions before final implementation:

- Platform commission percentage.
- Bargain commission percentage.
- Whether commission differs by category, seller tier, bargain sale, or subscription.
- Seller subscription tiers.
- Number of free products/reels/uploads per seller.
- Extra upload pricing.
- Storage and bandwidth limits.
- Shipping pricing policy:
  - paid by buyer,
  - paid by seller,
  - split,
  - free over threshold,
  - return-shipping policy.
- Convenience fee policy for returns/payment gateway costs.
- COD availability.
- Payment methods to support at launch.
- Refund window and return eligibility exceptions.
- Payout release timing.
- KYC requirements before selling, before payout, or before listing.

## 8. Recommended Engineering Team

Minimum team for a serious production push:

- Tech lead/full-stack architect: owns system design, money flow, security, and release gating.
- Backend engineer: Node/Express/MongoDB, Razorpay, Shiprocket, finance, admin APIs.
- iOS engineer: SwiftUI, auth, checkout, reels performance, App Store compliance.
- QA automation engineer: backend integration tests, iOS UI tests, regression matrix, CI.
- DevOps/platform engineer: production deploy, HTTPS, logging, monitoring, backups, process manager, secrets.
- Product/UI designer or senior frontend-minded iOS engineer: final screen polish, states, accessibility, App Review screenshots.

Specialist help recommended:

- Payment/Razorpay Route consultant for split payments, refunds, disputes, and KYC.
- Legal/compliance reviewer for privacy policy, terms, seller policy, returns, and DPDP/account deletion.

## 9. Required Provider Accounts and Credentials

The team needs access to:

- Apple Developer account and App Store Connect.
- Razorpay test and live dashboard.
- Razorpay Route/linked-account/KYC settings.
- Shiprocket sandbox/live account.
- Cloudinary account.
- Domain/DNS provider.
- Email provider, preferably Resend or production SMTP.
- MongoDB Atlas.
- Hosting provider for backend.
- GitHub repository and Actions settings.
- Sentry or chosen monitoring platform.

## 10. Environment Variables to Finalize

Backend:

- `NODE_ENV`
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_TOTP_SECRET`
- `ADMIN_OVERWRITE_PASSWORD`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MANUAL_CAPTURE_ENABLED`
- `RAZORPAY_CAPTURE_AFTER_SELLER_ACCEPTANCE`
- `RAZORPAY_AUTHORIZATION_TIMEOUT_MINUTES`
- `RAZORPAY_ENABLE_LIVE_REFUNDS`
- `SHIPROCKET_EMAIL`
- `SHIPROCKET_PASSWORD`
- `SHIPROCKET_WEBHOOK_SECRET`
- `SHIPROCKET_ENABLE_LIVE_PICKUP_SYNC`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- SMTP fallback vars if not using Resend.
- `GOOGLE_IOS_CLIENT_ID`
- `GOOGLE_WEB_CLIENT_ID`
- Future Apple auth variables.

iOS:

- Production API base URL.
- Google client configuration.
- Apple Sign In capability and identifiers.
- Release signing configuration.
- ATS production policy.

## 11. Definition of Done for Launch

The app should not be considered launch-ready until all of these are true:

- Backend tests pass.
- iOS build passes.
- iOS test targets are configured and core UI tests pass.
- Razorpay test mode is proven end to end.
- Shiprocket sandbox is proven end to end.
- No production mock payment paths are available.
- Payment amount verification is active.
- Manual capture and capture failure behavior is proven.
- Seller payout release follows return-window policy.
- Refund and return flows reconcile buyer, seller, admin, order, and finance state.
- Admin can handle orders, payments, refunds, returns, shipments, payouts, KYC, support, and moderation without MongoDB.
- Sign in with Apple works.
- Account deletion works.
- Privacy policy and support pages are live.
- UGC moderation is available.
- Sentry or equivalent monitoring is active.
- Production logs do not leak sensitive data.
- HTTPS is enforced.
- Database backups are configured.
- Demo buyer and seller accounts work in production review build.
- No placeholder/demo content appears in production screenshots unless intentionally seeded as demo content.

## 12. Open Questions for the Team

- Should seller payouts be released by Razorpay transfer hold release, internal payout records, or both?
- Should Route transfers be created at capture time or after return window?
- What exactly should happen to losing bid authorizations, and what should the buyer see?
- Is COD part of launch or a later phase?
- Are subscriptions required at launch or after marketplace validation?
- Is seller KYC required before listing, before shipping, or before payout?
- Should Shiprocket courier selection be automatic or seller-selected?
- Who pays forward shipping and return shipping?
- Should buyers and sellers message each other, or should all communication go through support?
- What minimum iOS versions and device sizes are supported?

## 13. First Two-Week Sprint Recommendation

Week 1:

- Freeze current scope and create staging branch.
- Run tests/builds and fix blockers.
- Remove/guard production mock payment paths.
- Add payout lifecycle design and migration plan.
- Add Sentry/logging/process manager/deploy checklist.
- Verify Razorpay manual capture in test mode.
- Verify Shiprocket sandbox login/serviceability.

Week 2:

- Implement payout eligibility job after return window.
- Correct transfer release timing.
- Add losing-bid authorization status and support/admin visibility.
- Add missing tests for payout and bargain edge cases.
- Wire iOS test targets or add iOS build CI.
- Start Sign in with Apple implementation.
- Start final App Store compliance checklist.

## 14. Hiring Brief

NotWhat needs engineers who can finish a real production marketplace, not only build screens. The team must be comfortable with:

- SwiftUI and iOS App Store submission.
- Node.js, Express, MongoDB, Mongoose.
- Razorpay checkout, webhooks, refunds, Route split payments, manual capture, and linked accounts.
- Shiprocket fulfillment, serviceability, AWB, labels, tracking webhooks, and returns.
- Marketplace security: role ownership, order integrity, payout integrity, account deletion, UGC moderation.
- CI/CD, production logging, monitoring, backups, and release checklists.
- QA for buyer, seller, admin, payment, shipping, returns, refunds, and moderation flows.

Primary objective:

Finish NotWhat so that a buyer can discover products/reels, pay safely, receive shipment/tracking, return/refund when eligible, and a seller can list products/reels, ship orders, complete KYC, and receive correct payouts, with admin able to oversee everything from the app/admin portal.
