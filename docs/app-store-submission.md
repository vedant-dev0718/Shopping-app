# NotWhat App Store Submission Package

This package is a working draft for App Store Connect. Confirm production URLs, legal contact details, and live review credentials before submission.

## App Metadata

### App Name

NotWhat

### Subtitle

Shop culture-led fashion from reels

### Promotional Text

Discover regional fashion, handmade goods, and boutique seller collections through shoppable reels, searchable stores, and secure checkout.

### App Description

NotWhat is a marketplace for discovering culture-led fashion, accessories, and handmade products from independent sellers. Buyers can browse curated stores, watch shoppable reels, search by category or region, save items, add products to cart, and place orders through secure checkout.

For sellers, NotWhat provides tools to create a store profile, list products, upload shoppable reel videos, manage order fulfillment, and track store activity. The app is built for buyers who want a more visual shopping experience and for sellers who want a simple way to present products through short-form video.

Key features:

- Shoppable reels with tagged products
- Buyer discovery, search, recommendations, trending products, and saved stores
- Product detail pages with store context, pricing, stock, category, and region
- Cart, shipping details, Razorpay test checkout, order confirmation, and order history
- Seller storefronts, product listings, reel uploads, order management, and analytics
- Support, reporting, moderation, legal content pages, returns, and safety workflows

### Keywords

marketplace,shopping,reels,fashion,boutique,handmade,ethnic wear,regional wear,artisans,sarees,streetwear,bridal,stores,checkout

### Primary Category

Shopping

### Secondary Category

Lifestyle

### Content Rights

NotWhat includes seller-uploaded product images and reel videos. Sellers must only upload content and product media they own or are authorized to use. App Review should use the provided demo seller account, which contains demo products only.

## Age Rating Answers

Use these draft answers in App Store Connect. Reconfirm before final submission if the production content policy changes.

| Question | Suggested Answer | Notes |
| --- | --- | --- |
| Cartoon or fantasy violence | None | The app is a shopping marketplace. |
| Realistic violence | None | Not part of the product experience. |
| Sexual content or nudity | None | Seller content policy should prohibit nudity. Reporting supports nudity reports. |
| Profanity or crude humor | None/Infrequent | NotWhat does not create this content, but seller captions/comments are user-generated. Use "Infrequent/Mild" if App Store Connect treats UGC captions/comments conservatively. |
| Alcohol, tobacco, or drug references | None | Do not permit these categories unless policy changes. |
| Mature or suggestive themes | None | Marketplace is focused on fashion and goods. |
| Horror/fear themes | None | Not applicable. |
| Medical/treatment information | None | Not applicable. |
| Gambling or contests | None | Not applicable. |
| User-generated content | Yes | Sellers can upload product images/reels and captions; users can comment/report. |
| Unrestricted web access | No | The app calls NotWhat APIs and Razorpay checkout; it does not provide a general browser. |
| Purchases | Yes | Physical goods checkout through Razorpay. |
| In-app purchases | No | No Apple IAP; purchases are physical goods. |
| Location | No precise location | Shipping address is manually entered or selected for delivery; no Core Location permission is shown in the current plist. |
| Kids category | No | Not intended for children. |

Expected rating: likely 4+ or 12+ depending on Apple's interpretation of user-generated content and comments. If comments/reels are available to all users at launch, expect Apple to evaluate the UGC controls carefully.

## Privacy Label Data Mapping

This mapping is based on the current iOS and backend implementation.

| App Store Data Type | Collected? | Linked to User? | Used for Tracking? | Purpose | Repo Evidence / Source |
| --- | --- | --- | --- | --- | --- |
| Name | Yes | Yes | No | Account creation, checkout shipping, support | `User.name`, order `shippingInfo.name`, support request name |
| Email Address | Yes | Yes | No | Login, account communication, checkout, support | `User.email`, order `shippingInfo.email`, support request email |
| Phone Number | Yes | Yes | No | Signup and shipping contact | `User.phone`, order `shippingInfo.phone` |
| Physical Address | Yes | Yes | No | Buyer profile and order shipping | `User.address`, order `shippingInfo.address/city/state/postalCode` |
| User ID | Yes | Yes | No | Authentication, orders, analytics, moderation, saved/cart state | Mongo `_id`, JWT-authenticated APIs |
| Purchase History | Yes | Yes | No | Orders, seller fulfillment, returns, support | `Order`, `ReturnRequest`, seller order routes |
| Payment Information | Limited | Yes | No | Payment processing and reconciliation | Razorpay order/payment IDs and payment method are stored; full card/bank credentials are handled by Razorpay, not by NotWhat. |
| Photos or Videos | Yes | Yes | No | Seller product images and shoppable reels | Cloudinary upload service for product images and reel videos |
| Customer Support | Yes | Yes/No | No | Responding to support requests | `SupportRequest` supports logged-in and unauthenticated requests |
| User Content | Yes | Yes | No | Product listings, reel captions, hashtags, comments, reports | Product, Reel, Comment, Report models |
| Search History | No explicit stored search history | No | No | Search requests are served by API; no durable search history model found | Search routes exist, but no search-history model was found. |
| Product Interaction Data | Yes | Yes | No | Recommendations, seller analytics, trending, saved state | `AnalyticsEvent`, likes, comments, saves, cart events |
| Diagnostics | Not in current app code | No | No | Not currently mapped | Add if crash/analytics SDK is introduced. |
| Location | Not precise device location | Yes, if shipping address is considered location | No | Shipping and seller store geography | Address fields and store city/state/region are collected manually. |

### Third Parties / Processors

- Razorpay: payment checkout, test payment processing, payment IDs, webhook verification.
- Cloudinary: seller product image and reel video uploads/storage.
- MongoDB-backed API: account, marketplace, order, support, moderation, and analytics data.
- Email provider through `nodemailer`: transactional/support email if configured.

### Tracking

Draft answer: No tracking.

NotWhat does not currently include advertising identifiers, cross-app tracking SDKs, or data sharing for third-party advertising. Revisit this if analytics, ads, attribution, or social pixels are added.

## App Review Notes

### Reviewer Overview

NotWhat is a two-sided shopping marketplace. Please test both buyer and seller flows using the demo credentials below. The buyer can browse products and reels, add an item to cart, complete checkout through Razorpay test mode, and view the resulting order. The seller can view dashboard/order surfaces and manage demo store content.

### Backend Availability

Production API expected by release builds:

`https://api.notwhat.in/api`

Debug builds use a local network API. Submit only a build configured for the production API and confirm `/api/health` is reachable before uploading for review.

### Demo Buyer Credentials

Use these credentials from `backend/scripts/seed-demo.js`:

- Email: `buyer@notwhat.test`
- Password: `Test@1234`

Alternate full demo seed credentials, if the production review database was seeded with `backend/src/database/seed.js` instead:

- Email: `buyer@example.com`
- Password: `Password123!`

### Demo Seller Credentials

Use these credentials from `backend/scripts/seed-demo.js`:

- Email: `seller@notwhat.test`
- Password: `Test@1234`

Alternate full demo seed credentials:

- Email: `seller@example.com`
- Password: `Password123!`

### Buyer Test Path

1. Log in as `buyer@notwhat.test`.
2. Browse Home/Search/Reels.
3. Open a product and add it to cart.
4. Go to Cart.
5. Tap Proceed to Checkout.
6. Confirm or enter shipping fields.
7. Keep payment method as UPI, card, netbanking, or wallet.
8. Tap Place Order.
9. Complete Razorpay test checkout.
10. Confirm the app shows Order Confirmed and that the order appears in Orders.

### Seller Test Path

1. Log in as `seller@notwhat.test`.
2. View the seller dashboard/store area.
3. Review listed products and order management surfaces.
4. If testing uploads, use a small product image or short reel video from the photo library. The app requests photo library access only for seller media upload.

## Test Payment Instructions

Razorpay must be configured in test mode for App Review.

### Recommended Review Payment

Use Razorpay's test card in the web checkout:

- Card number: `4111 1111 1111 1111`
- Expiry: any future month/year
- CVV: any 3 digits
- Name: any reviewer name
- OTP/password: use Razorpay's test success value shown in the Razorpay checkout prompt

If Razorpay asks for UPI in test mode, use Razorpay's documented test UPI ID from the active Razorpay test dashboard. Confirm the exact UPI value before submission because Razorpay may change documented test handles.

### Expected Payment Behavior

- Checkout starts by creating a Razorpay order from the cart.
- The app opens a Razorpay web checkout sheet.
- On success, the app sends Razorpay order ID, payment ID, and signature to `checkout/verify`.
- The backend verifies the payment and places the order.
- The app displays order confirmation and clears the cart.

### Failure / Cancel Behavior

- Closing the Razorpay sheet should return to Checkout without placing an order.
- Failed payment should show a payment failure message.
- No physical shipment should be sent for App Review test orders.

## Screenshot Checklist

Prepare screenshots for 6.7-inch, 6.5-inch, and 5.5-inch iPhone sizes if App Store Connect requires them for the selected build target.

### Buyer Screens

- Login or buyer onboarding entry screen
- Buyer home/discovery with product sections
- Shoppable reels screen with tagged product chip
- Product detail screen with price, region/category, and add-to-cart action
- Cart with populated items and order summary
- Checkout screen with shipping and payment method
- Order confirmation screen
- Buyer profile or order history screen

### Seller Screens

- Seller dashboard overview
- Seller product management/listing screen
- Seller order management screen
- Seller analytics screen
- Reel upload or seller reel management screen

### Screenshot Quality Checks

- Use seeded demo data with polished product names and images.
- Avoid localhost URLs, debug banners, placeholder images, and empty states unless the screenshot is intentionally showing a state.
- Confirm all images load from production-accessible URLs.
- Use a successful demo order for order screenshots.
- Keep no private customer data visible beyond demo credentials/demo orders.
- Capture at least one screenshot that clearly communicates the reels-shopping experience.

## Pre-Submission Checklist

- Confirm production API URL is reachable from a clean network.
- Confirm demo buyer and seller credentials work in the exact build submitted.
- Confirm Razorpay test mode is enabled and checkout succeeds.
- Confirm photo library permission copy is acceptable: "NotWhat lets sellers choose videos from their library to upload shoppable reels."
- Confirm privacy policy and terms pages are live and match the privacy label.
- Confirm support contact route/email is monitored.
- Confirm UGC moderation controls are available: report content, block/safety flows, admin moderation, and removal process.
- Confirm no seed-only demo URLs or `example.com` image URLs appear in production screenshots.
