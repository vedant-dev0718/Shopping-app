# NotWhat Manual Real-Device QA Checklist

## Install And Launch

- Install on a real iPhone from Xcode or TestFlight.
- Confirm app opens from a cold launch.
- Confirm app restart preserves logged-in session.
- Confirm logout, relaunch, and login again.
- Confirm App Store privacy/legal links open.

## Permissions And Media

- Trigger photo permission prompt.
- Trigger video/gallery picker.
- Upload a product image to Cloudinary.
- Upload a reel video to Cloudinary.
- Test slow network upload.
- Test invalid image/video format.
- Test large image and large video.
- Confirm returned Cloudinary image/video URLs open in Safari.

## Buyer Flow

- Login as seeded buyer.
- Browse home products.
- Search product, store, and reel.
- Filter by category, region, city/state, and price.
- Open a product.
- Add to cart.
- Change quantity.
- Remove item.
- Checkout with Razorpay test payment.
- Confirm order confirmation screen.
- Open profile.
- Open orders.
- Open order detail.
- Cancel an eligible order.
- Request return on a delivered seeded order.

## Seller Flow

- Login as seeded seller.
- Open dashboard.
- Add product with real test image.
- Create reel with real test video.
- Tag in-stock product.
- Confirm all-sold-out tagged reels are hidden where expected.
- Open orders.
- Mark order processing.
- Mark order shipped.
- Enter tracking number, carrier, and tracking URL.
- Confirm buyer sees updated order status.
- Open returns.
- Approve return.
- Reject return with reason.
- Mark return received.
- Open analytics.
- Confirm sales, commission, payouts, top products, and top reels cards.

## Payments And Refunds

- Run Razorpay test success payment.
- Run Razorpay test failed payment.
- Confirm Razorpay webhook arrives in backend logs or ngrok logs.
- Confirm duplicate webhook does not duplicate order updates.
- Test refund only in Razorpay test mode.
- Confirm refund status appears in buyer order detail.
- Confirm refund adjusts seller earnings and platform commission.

## Shipping

- Test Shiprocket serviceability with valid pincode.
- Test Shiprocket serviceability with unsupported pincode.
- Create shipment for a paid, uncancelled order.
- Confirm AWB, courier, tracking URL, and label URL are saved.
- Test Shiprocket tracking webhook with valid secret.
- Confirm delivered webhook marks order delivered.
- Confirm delivered order sets return window.

## Safety And Moderation

- Report a product.
- Report a reel.
- Report a comment.
- Report a store.
- Report a user.
- Confirm reported content hides from reporter.
- Block a seller.
- Confirm seller products, reels, stores, and comments hide.
- Unblock seller.
- Confirm content reappears unless it is also reported/removed.
- Resolve report as admin if admin UI is available.

## Network And Failure Modes

- Toggle airplane mode after login.
- Attempt browse/search while offline.
- Attempt checkout on bad network.
- Attempt upload on bad network.
- Confirm retry/error messages are understandable.
- Kill and relaunch app during checkout.
- Kill and relaunch app during upload.

## Release Readiness

- Verify TestFlight install.
- Verify production build uses production API URL.
- Verify debug build uses local/test API URL.
- Verify no production Razorpay, Cloudinary, Shiprocket, or Mongo credentials are used during QA automation.
