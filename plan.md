# NotWhat Backend Hardening + Frontend Integration Plan

## 1. Objective

Deliver a production-safe, end-to-end implementation for:
- Shiprocket webhook hardening (fail closed in production)
- Centralized shipping config usage via `backend/src/config/env.js`
- Password reset abuse protection improvements (rate-limit ordering + additional limiters)
- Explicit webhook response contract policy

And integrate these backend changes with iOS/frontend flows so the full user journey remains functional locally and in staging.

---

## 2. Scope

### In scope
- Backend:
  - `backend/src/modules/shipping/shiprocketWebhook.controller.js`
  - `backend/src/utils/shiprocket.js`
  - `backend/src/modules/auth/auth.routes.js`
  - `backend/src/config/env.js`
  - `backend/.env.example`
  - `README.md` (policy + production checklist updates)
- Frontend integration touchpoints:
  - iOS behavior expectations for auth reset flows and webhook-driven status updates
  - QA paths for buyer/seller lifecycle after backend hardening
- Local runbook:
  - Full bootstrapping and verification commands
  - Validation checklist and rollback gates

### Out of scope
- Re-architecting auth, checkout, or shipping modules
- New UI feature development
- API contract breaking changes for app clients

---

## 3. Contract And Policy Decisions

### 3.1 Webhook response standard policy (decided)
- User-facing API endpoints continue using `successResponse/errorResponse` shape.
- Provider callbacks (`/webhooks/razorpay`, `/webhooks/shiprocket`) intentionally use minimal raw JSON acknowledgements.
- Rationale:
  - Reduces provider compatibility risk
  - Keeps webhook handlers lightweight
  - Avoids unnecessary coupling with user-facing response envelope

### 3.2 Security decision
- In production, Shiprocket webhook processing must fail closed when `SHIPROCKET_WEBHOOK_SECRET` is missing.
- In non-production, missing secret is allowed for developer velocity with explicit warning logs.

### 3.3 Password reset protection decision
- Apply rate limiting before validation on reset-intent endpoints to count malformed abuse attempts.
- Add dedicated limiter on `verify-reset-otp`.
- Add dedicated limiter on `reset-password` to reduce token brute-force automation.

---

## 4. Phased Delivery Journey

## Phase 0: Baseline And Safety Net

### Goals
- Freeze baseline behavior before changes.
- Ensure fast rollback if regressions appear.

### Tasks
- Run backend tests: `cd backend && npm test -- --runInBand`
- Capture baseline API smoke checks:
  - `GET /api/health`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/verify-reset-otp`
  - `POST /api/auth/reset-password`
- Verify current iOS login and checkout still start successfully against local backend.

### Exit criteria
- Tests are green.
- Baseline smoke request/response snapshots recorded.

---

## Phase 1: Backend Hardening Implementation

### Goals
- Implement all four requested backend improvements.

### Tasks
1. Shiprocket verification hardening
- Update shipping webhook controller to:
  - Return `503` in production when `SHIPROCKET_WEBHOOK_SECRET` is absent.
  - Verify signature when secret exists.
  - Permit non-production bypass with warning when secret is absent.

2. Centralized env consumption
- Refactor Shiprocket utility to read credentials from `env.js` object only.
- Add explicit exported fields in env config:
  - `shiprocketEmail`
  - `shiprocketPassword`

3. Reset-flow rate-limit improvements
- Move forgot-password limiter before validation middleware.
- Add `verify-reset-otp` limiter.
- Add `reset-password` limiter.

4. Webhook policy documentation
- Add a dedicated policy section in README.
- Update deployment checklist to include Shiprocket webhook registration + secret setup.
- Clarify production requirements in `.env.example`.

### Exit criteria
- All changed files lint/test clean.
- No route contract breaks for app clients.

---

## Phase 2: Frontend Integration Mapping

### Goals
- Ensure backend hardening is reflected in frontend behaviors and error handling expectations.

### iOS touchpoints
1. Auth reset UX
- Confirm app handles rate-limited responses from:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/verify-reset-otp`
  - `POST /api/auth/reset-password`
- Confirm UI shows actionable message for HTTP 429.

2. Checkout + shipping status UX
- Confirm order detail/tracking screens behave correctly when Shiprocket webhook is accepted/rejected.
- Validate no UI break when webhook endpoint returns `503` due to missing production secret (should surface operational alert in backend logs, not user flow).

3. Session continuity
- Verify no regressions to login/session restore after auth route middleware order adjustments.

### Shared/KMP touchpoints
- If shared module consumes auth error strings/codes, verify no assumptions break on rate-limit responses.
- Ensure mock data and local previews remain unaffected.

### Exit criteria
- iOS happy paths still functional.
- Reset flow handles 429/400/401 consistently.

---

## Phase 3: Local End-To-End Working Plan

### Goals
- Provide repeatable local setup proving complete journey works.

### Environment setup
1. Backend env
- `cd backend`
- `cp .env.example .env`
- Set required minimum values:
  - `NODE_ENV=development`
  - `MONGO_URI=mongodb://127.0.0.1:27017/notwhat`
  - `JWT_SECRET=<dev-secret>`
  - `CLIENT_URL=http://localhost:3000`
- Optional integrations:
  - Razorpay keys
  - Shiprocket credentials
  - Cloudinary credentials
  - Resend/SMTP credentials

2. Database
- Start MongoDB locally.
- Seed data: `npm run seed`

3. Backend
- Start server: `npm run dev`
- Health check: `curl http://localhost:5001/api/health`

4. iOS
- Open `ios/NotWhat.xcodeproj`
- Run `NotWhat` scheme in simulator.
- Log in with seeded user credentials.

### Local validation journey (complete path)
1. Buyer path
- Login
- Browse discovery feed
- Add to cart
- Start checkout
- Place order (test mode)
- View order status

2. Seller path
- Login as seller
- Review seller orders
- Validate order status transitions after webhook simulation

3. Security path
- Trigger forgot password repeatedly and confirm limiter behavior.
- Trigger verify-reset-otp repeatedly and confirm limiter behavior.
- Trigger reset-password repeatedly and confirm limiter behavior.

### Exit criteria
- All three paths succeed with expected responses and no app crashes.

---

## Phase 4: Verification And Test Expansion

### Automated checks
- Backend full test suite:
  - `cd backend && npm test -- --runInBand`
- Add/adjust integration tests for:
  - Shiprocket webhook missing secret in production -> `503`
  - verify-reset-otp limiter returns `429` when threshold exceeded
  - forgot-password limiter still active with malformed payloads

### Manual checks
- Confirm webhook routes still parse raw bodies.
- Confirm no regression in Razorpay webhook flow.
- Confirm no direct `process.env` usage reintroduced in shipping utility.

### Exit criteria
- All tests pass.
- Manual checklist complete.

---

## Phase 5: Staging Rollout And Production Readiness

### Pre-release checklist
- Set `NODE_ENV=production` in staging.
- Ensure `SHIPROCKET_WEBHOOK_SECRET` is set and matches Shiprocket dashboard.
- Verify webhook endpoint reachability from external provider.
- Confirm observability:
  - 400 signature mismatch logs
  - 503 misconfiguration logs
  - 429 reset flow throttling metrics

### Rollout strategy
- Deploy in a low-traffic window.
- Monitor for 24 hours:
  - Auth reset endpoint 429 volume
  - Shiprocket webhook rejection rates
  - Delivery state update lag

### Rollback plan
- If webhook processing failures spike unexpectedly:
  - Roll back to previous build
  - Preserve incoming webhook payload logs for replay
- If reset flow throttling is too aggressive:
  - Tune rate-limit thresholds and redeploy

---

## 5. Risks And Mitigations

1. Risk: Over-throttling password reset for legitimate users
- Mitigation: start with moderate thresholds, monitor 429 metrics, tune quickly.

2. Risk: Shiprocket webhook misconfiguration in production
- Mitigation: fail-closed behavior + checklist gate before release + staging verification.

3. Risk: Frontend confusion on new throttling responses
- Mitigation: verify iOS error presentation for 429 and update copy where needed.

4. Risk: Provider retries due to non-2xx responses
- Mitigation: ensure valid webhook requests return 200 quickly and idempotently.

---

## 6. Detailed Task Breakdown

## Backend tasks
- [x] Add `shiprocketEmail` and `shiprocketPassword` to env config.
- [x] Refactor Shiprocket utility to consume env config only.
- [x] Harden Shiprocket webhook verification and production fail-closed behavior.
- [x] Reorder forgot-password limiter before validation.
- [x] Add verify-reset-otp limiter.
- [x] Add reset-password limiter.
- [x] Document webhook response policy in README.
- [x] Update production checklist with Shiprocket webhook requirements.
- [x] Clarify `.env.example` production expectations for webhook secret.

## Frontend integration tasks
- [ ] Validate iOS forgot-password UX under 429.
- [ ] Validate iOS verify-reset-otp UX under 429.
- [ ] Validate iOS reset-password UX under 429.
- [ ] Validate order status presentation after Shiprocket webhook events.

## QA tasks
- [ ] Add regression checklist entries for webhook signature and reset-rate limiting.
- [ ] Capture staging run evidence (logs + API traces).

---

## 7. Success Criteria

- Security hardening complete with no contract-breaking API changes.
- Shiprocket webhook cannot process unsigned requests in production.
- Password reset abuse protection improved with measurable throttling.
- Webhook response behavior documented and understood by backend + frontend teams.
- Local runbook executes end-to-end journey from backend startup to iOS user flows.

---

## 8. Commands Reference

### Backend
- Install: `cd backend && npm install`
- Seed: `npm run seed`
- Dev server: `npm run dev`
- Test: `npm test -- --runInBand`

### Health
- `curl http://localhost:5001/api/health`

### iOS
- `open ios/NotWhat.xcodeproj`

---

## 9. Ownership

- Backend hardening: Backend team
- iOS integration verification: iOS team
- Cross-flow QA and release gating: QA + release owner

This plan is the working source for implementing, validating, and shipping the hardening changes safely across backend and frontend journeys.
