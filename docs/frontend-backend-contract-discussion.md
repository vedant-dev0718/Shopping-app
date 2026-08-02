# Frontend-Backend Contract Discussion Brief

## Goal

Align frontend and backend teams on behavior contracts introduced by hardening changes so UX remains predictable and production-safe.

## Audience
- Backend API owners
- iOS app owners
- Shared/KMP module owners
- QA lead

## Meeting Length
- 45 minutes

---

## 1. What Changed

1. Shiprocket webhook hardening
- In production, missing `SHIPROCKET_WEBHOOK_SECRET` now causes webhook endpoint to return 503 and reject processing.
- With secret configured, invalid signatures return 400.

2. Auth reset route hardening
- `forgot-password` is rate-limited before validation.
- `verify-reset-otp` now has dedicated limiter.
- `reset-password` now has dedicated limiter.

3. Response policy clarification
- User-facing APIs: standard `{ success, message, data }` envelope.
- Webhooks: minimal provider-focused JSON acknowledgements.

---

## 2. Contract Decisions To Confirm

## A. Error messaging contract for auth reset routes
- Backend will return meaningful `message` for 429.
- Frontend displays backend `message` directly for reset flows.

Expected user-facing examples:
- `Too many password reset codes requested. Try again after 1 hour.`
- `Too many reset code verification attempts. Try again after 15 minutes.`
- `Too many reset password attempts. Try again after 15 minutes.`

## B. HTTP status handling
- 400: validation or invalid OTP format/code
- 401: invalid/expired reset token
- 429: rate limit exceeded
- 500: unexpected server error

Frontend expected behavior:
- 429: show inline warning and keep user on same screen
- 400/401: show actionable retry guidance
- 500: generic retry message

## C. Order tracking expectations
- Buyer order status remains sourced from `/api/orders/*`.
- Shiprocket webhook effects are asynchronous backend updates.
- Frontend should tolerate short eventual-consistency windows after shipment events.

---

## 3. API Scenarios For Joint QA

1. Forgot password throttling
- Trigger 4th request within an hour for same email.
- Expect 429 + message.

2. Verify reset OTP throttling
- Repeated invalid attempts hit 429 threshold.
- Expect UI warning with backend message.

3. Reset token misuse
- Reuse consumed token.
- Expect 401 + message.

4. Webhook negative tests
- Shiprocket bad signature -> 400.
- Shiprocket missing secret in production -> 503.

5. Tracking visibility
- Shiprocket delivered event updates order status path consumed by buyer/seller views.

---

## 4. Action Items

## Backend
- Provide sample response payloads for 400/401/429 reset-flow cases.
- Share staging test webhook payload + signature generation guide.

## Frontend
- Confirm reset screens surface backend `message` unchanged.
- Confirm no generic masking of 429 responses in auth flows.
- Validate order detail views correctly reflect updated status strings.

## QA
- Add rate-limit and webhook-negative-path scripts to regression pack.
- Capture evidence screenshots and API traces.

---

## 5. 24-Hour Post-Deploy Monitoring Plan

## Metrics to watch
- Count of 429 on:
  - `/api/auth/forgot-password`
  - `/api/auth/verify-reset-otp`
  - `/api/auth/reset-password`
- Count of Shiprocket webhook 400 responses (invalid signature)
- Count of Shiprocket webhook 503 responses (misconfiguration)
- Order status lag from shipped to delivered confirmations

## Alert thresholds (initial)
- 429 rate > 2x baseline for consecutive 30-minute windows
- Shiprocket webhook 503 > 0 in production
- Shiprocket webhook 400 spikes > normal provider retry baseline

## Tuning levers
- Increase/decrease rate-limit windows/limits in auth routes
- Validate webhook secret rotation and provider-side signature config
- Add targeted exemptions only with security review

---

## 6. Ready-To-Send Message To Frontend Team

Subject: Backend hardening contract sync for reset flow + tracking

We completed backend hardening for auth reset abuse protection and Shiprocket webhook verification. We need a quick contract sync on 429 handling and order-tracking consistency. Please review:
- Rate-limit behaviors on forgot/verify/reset endpoints
- UI display of backend `message` for 429/400/401
- Tracking update expectations after webhook events

Proposed 45-minute session agenda is in this document. Please add owners for iOS, shared/KMP, and QA.

---

## 7. Sharing And Scheduling Checklist

- [ ] Send this document link to frontend owners (iOS + shared/KMP + QA).
- [ ] Include target attendees:
  - Backend API owner
  - iOS lead
  - Shared/KMP lead
  - QA lead
- [ ] Schedule a 45-minute meeting titled: `NotWhat backend hardening contract sync (reset flow + webhook tracking)`.
- [ ] Attach this brief and request pre-read before the meeting.
- [ ] Capture decisions in meeting notes:
  - 429 UX copy (final wording)
  - status-code handling expectations
  - webhook eventual-consistency tolerance window
  - QA ownership and test evidence format

Execution status (2026-08-02 UTC): Draft prepared in repo; external sharing and calendar scheduling must be executed by a human owner with communication/calendar access.
