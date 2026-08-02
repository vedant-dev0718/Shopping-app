# NotWhat Testing Guide

## Backend

The backend test runner is Jest.

```sh
cd backend
npm test
npm run test:watch
npm run test:coverage
```

Tests run with `NODE_ENV=test` and use `mongodb-memory-server`; they do not use `MONGO_URI` from local or production environments.

External services are mocked:

- Razorpay SDK is mocked in `backend/tests/setup.js`.
- Razorpay webhook signatures are tested with local HMAC helpers.
- Shiprocket HTTP calls are intercepted with `nock`.
- Cloudinary uploads are mocked through the `cloudinary` module mock.

Coverage areas currently included:

- Auth signup, login, logout, `/me`, invalid/expired tokens, role guards.
- Product create/edit/delete, product views, save, click analytics, validation, seller ownership.
- Reels create/list/view/like/unlike/comment and validation.
- Cart add/update/remove, sold-out/inactive/over-stock protection.
- Checkout start and dev order placement with mocked Razorpay.
- Razorpay webhook raw body handling and idempotent payment capture.
- Shiprocket shipment creation with mocked token, serviceability, AWB, and label calls.
- Seller order list/detail/status/ship/cancel edge cases.
- Cancellation, return, and refund guardrails.
- Seller analytics, commission, payouts, admin platform analytics, commission settings.
- Reports, blocks, moderation actions, search safety filtering.
- Legal content and support submission.
- Security role and ownership access control.

## iOS

The repo now includes target-ready test files in:

- `ios/NotWhatTests`
- `ios/NotWhatUITests`

The current `.xcodeproj` did not already include test targets. Add `NotWhatTests` and `NotWhatUITests` in Xcode, include these source files, and then run:

```sh
xcodebuild test \
  -project ios/NotWhat.xcodeproj \
  -scheme NotWhat \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

The UI tests assume a seeded test backend with:

- `buyer@example.com / Password1!`
- `seller@example.com / Password1!`

Use only test payment, test upload, and mock-media data for automated UI runs.
