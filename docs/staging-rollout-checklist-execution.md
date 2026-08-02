# Staging Rollout Checklist Execution

## Purpose

Execute the rollout checklist for backend hardening changes before production cutover:
- Shiprocket webhook fail-closed behavior in production
- Centralized Shiprocket env usage
- Reset-flow limiter hardening
- Webhook response policy alignment

## Scope Of This Execution

This run captures:
- Local and CI-verifiable checks completed now
- Staging-only checks queued for environment execution

---

## A. Completed Now (Local/Repository Checks)

1. Backend regression suite
- Command: `cd backend && npm test -- --runInBand`
- Result: PASS
- Evidence: 30/30 suites, 96/96 tests passed

2. New hardening tests added and passing
- Shiprocket webhook returns 503 when production mode + missing secret
- verify-reset-otp route limiter throttles repeated attempts
- Evidence files:
  - `backend/tests/integration/shiprocketWebhook.test.js`
  - `backend/tests/integration/auth.test.js`

3. Frontend/shared verification for reset and order-tracking code paths
- Command:
  - `./shared/gradlew -p shared testBuyerDebugUnitTest --tests com.notwhat.shared.auth.AuthStateTest.forgotPassword_inMockModeNavigatesToResetDestination --tests com.notwhat.shared.auth.AuthStateTest.resetPassword_inMockModeReturnsToLogin --tests com.notwhat.shared.order.OrderUseCaseTest.* --tests com.notwhat.shared.cart.CartOrderDtoDecodingTest.*`
- Result: PASS
- Evidence in test result XML:
  - `shared/build/test-results/testBuyerDebugUnitTest/TEST-com.notwhat.shared.auth.AuthStateTest.xml`
  - `shared/build/test-results/testBuyerDebugUnitTest/TEST-com.notwhat.shared.order.OrderUseCaseTest.xml`
  - `shared/build/test-results/testBuyerDebugUnitTest/TEST-com.notwhat.shared.cart.CartOrderDtoDecodingTest.xml`

4. Documentation policy alignment
- Webhook response policy documented in README
- Production Shiprocket webhook secret requirement documented in env template and checklist

---

## B. Staging Environment Checklist (Run In Staging)

Execution status (2026-08-02 UTC): BLOCKED in this workspace pending staging base URL, runtime credentials, and deployment access. Use `backend/scripts/staging-checklist-smoke.sh` in staging and then mark each checkbox.

## 1. Configuration Verification
- [ ] `NODE_ENV=production` (blocked: no staging host access in this workspace)
- [ ] `SHIPROCKET_WEBHOOK_SECRET` set and non-empty (blocked: no staging secret access)
- [ ] `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` set (blocked: no staging secret access)
- [ ] `RAZORPAY_WEBHOOK_SECRET` set (blocked: no staging secret access)
- [ ] `JWT_SECRET` production-grade random secret (blocked: no staging secret access)
- [ ] `CLIENT_URL` points to staging frontend domain (blocked: no staging config access)

## 2. Endpoint Smoke Checks
- [ ] `GET /api/health` returns 200 (blocked: staging URL not provided)
- [ ] `POST /api/auth/forgot-password` works for valid test user (blocked: staging URL/test account not provided)
- [ ] `POST /api/auth/verify-reset-otp` returns 429 after threshold (blocked: staging URL not provided)
- [ ] `POST /webhooks/shiprocket` returns 503 when secret intentionally unset in staging test run (blocked: requires controlled staging config toggle)
- [ ] `POST /webhooks/shiprocket` returns 400 for bad signature when secret is set (blocked: staging URL not provided)

## 3. End-To-End Journey Checks
- [ ] Buyer reset-password flow from UI shows backend error messages for rate limits (blocked: staging iOS test session required)
- [ ] Buyer order detail/tracking remains functional (blocked: staging iOS test session required)
- [ ] Seller order status updates reflect Shiprocket callbacks (blocked: staging courier callback run required)

## 4. Operational Checks
- [ ] Logs include webhook signature mismatch events (blocked: staging log access not available)
- [ ] Logs include reset limiter 429 events (blocked: staging log access not available)
- [ ] No elevated 5xx spike after deployment (blocked: staging observability access not available)

---

## C. Go/No-Go Gate For Production

Release only when all are true:
- [ ] Staging checklist section B fully green
- [ ] No critical/high bugs from staging UAT
- [ ] On-call owner assigned for first 24h monitoring window
- [ ] Rollback artifact and last-known-good version identified

---

## D. Rollback Trigger Conditions

Rollback immediately if any occur post deploy:
- Shiprocket valid webhooks rejected at high rate due to configuration mismatch
- Password reset flow blocks legitimate users beyond acceptable threshold
- Significant unexpected increase in auth or order-tracking support incidents

