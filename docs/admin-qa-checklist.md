# Admin QA Checklist

Use this checklist for normal admin operations without opening MongoDB.

## Log In As Admin

1. Start the backend and iOS app.
2. Open the admin login flow.
3. Sign in with an admin account.
4. Confirm the dashboard loads and the user role is admin.
5. Confirm a buyer or seller account cannot open `/api/admin/*` routes.

## Search For An Order

1. Open Admin > Search.
2. Search by order number, MongoDB order ID, buyer email, seller ID, Razorpay order ID, Razorpay payment ID, AWB, or tracking number.
3. Open the matching order from Admin > Manage > Orders.
4. Confirm buyer, sellers, products, payment, shipment, refund/return/cancellation, money breakdown, timeline, and action history are visible.

## Search For A User

1. Open Admin > Search or Admin > Manage > Users.
2. Search by name, email, phone, role, or MongoDB object ID.
3. Open the user detail.
4. Confirm account status, role, related profile, orders, activity, created/updated timestamps, and admin action history are visible.

## Find A Razorpay Payment

1. Open Admin > Search.
2. Search by Razorpay payment ID or Razorpay order ID.
3. Open Payments or the related order detail.
4. Confirm provider, method, amount, payment status, order number, buyer, captured/failed state, refund ID if present, and action history.

## Find Shiprocket Tracking

1. Open Admin > Search.
2. Search by AWB/tracking number, Shiprocket order ID, Shiprocket shipment ID, or shipment/order ID.
3. Open Shipments.
4. Confirm courier, tracking URL, current status, label URL, shipped/delivered dates, related order, buyer, sellers, and timeline.

## Suspend Seller

1. Open Admin > Manage > Sellers.
2. Search by seller name, email, phone, store name, region, or seller ID.
3. Open seller detail or use the row action menu.
4. Choose Suspend and confirm.
5. Confirm the seller status changed and an admin action log exists.

## Hide Product

1. Open Admin > Manage > Products.
2. Search by title, SKU, barcode, category, region, store ID, seller ID, or product ID.
3. Open product detail or use the row action menu.
4. Choose Hidden and confirm.
5. Confirm product status changed and the action appears in history.

## Process Refund

1. Open Admin > Manage > Refunds.
2. Search by order number, Razorpay payment ID, Razorpay refund ID, refund ID, buyer ID, or seller ID.
3. Open the refund detail.
4. Mark processing, successful, or failed with a reason.
5. Confirm order money breakdown, net sales, seller earnings, and action history reflect the change.

## Resolve Report

1. Open Admin > Manage > Moderation.
2. Filter by pending/reviewing or search by reason, reporter ID, target ID, target type, or report ID.
3. Open the report detail.
4. Review reporter, target preview, previous reports against target, previous reports by reporter, and admin history.
5. Dismiss, hide/remove content, warn user, suspend user, or ban user.
6. Confirm the report status and admin action log update.

## Reply Support

1. Open Admin > Manage > Support.
2. Search by requester email, subject, message, order number, user ID, or support request ID.
3. Open the support detail.
4. Confirm user, email, message, order context, assignment, status, replies, and created date.
5. Assign to yourself, send a reply, and update status.
6. Confirm the reply and action logs are visible.

## Check Seller Earnings

1. Open Admin Dashboard for seller earnings and payout totals.
2. Open Admin > Analytics for seller analytics.
3. Open the seller detail for commission override and related orders/products.
4. Confirm refunded orders reduce net sales and earnings where applicable.

## Check Platform Commission

1. Open Admin Dashboard.
2. Review GMV, net sales, refunds, platform commission, seller earnings, pending payouts, and paid payouts.
3. Open an order detail and compare item totals, commission, seller earnings, and refunds.
4. Confirm zero-sales states show `0` and do not crash.

## Change Commission Setting

1. Open Admin > Manage > App Settings.
2. Search for `platformCommissionPercentage`.
3. Update the value and save.
4. Confirm the setting row updates.
5. Confirm an admin action log exists for the setting change.

## Review Admin Action Logs

1. Open Admin > Search.
2. Set type to Actions.
3. Search by action type, target type, target ID, admin ID, or reason.
4. Confirm moderation, support, content, settings, featured content, category, region, order, refund, return, cancellation, shipment, user, seller, store, product, reel, and comment actions can be found.
