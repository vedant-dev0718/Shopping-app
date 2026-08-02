# NotWhat App Store Privacy Nutrition Label Audit

Generated from the current iOS and backend codebase. This is not legal advice; review it against the final production privacy policy, hosting logs, Razorpay account settings, Cloudinary account settings, and any services added after this audit.

Apple's App Privacy Details guidance says to disclose data collected by the app or third-party partners, even if it is only used for app functionality, unless it meets Apple's optional-disclosure rules. Apple also says data is generally linked to the user unless it is de-identified before collection and not later re-linked. Source: https://developer.apple.com/app-store/app-privacy-details/

## Executive Answer

### Data Used To Track You

Answer: No.

Current evidence: no advertising SDK, no AppTrackingTransparency usage, no AdSupport access, no third-party advertising network, and no data broker sharing found in the iOS project or backend dependencies.

Do not change this answer unless NotWhat adds ad attribution, retargeting, third-party ad SDKs, data broker sharing, or cross-company profile matching.

### Data Linked To You

Answer: Yes. Select the data types below.

| Category | Data Type | Select? | Linked to user? | Used for tracking? | Purposes to select | NotWhat mapping |
| --- | --- | --- | --- | --- | --- | --- |
| Contact Info | Name | Yes | Yes | No | App Functionality, Product Personalization, Analytics, Other Purposes | Buyer/seller signup, support requests, checkout shipping, seller dashboard interest signals. |
| Contact Info | Email Address | Yes | Yes | No | App Functionality, Product Personalization, Analytics, Other Purposes | Login, account records, order emails, seller alerts, support, Razorpay checkout prefill/linking. |
| Contact Info | Phone Number | Yes | Yes | No | App Functionality, Other Purposes | Signup, buyer shipping phone, seller contact/KYC context, Razorpay checkout prefill. |
| Contact Info | Physical Address | Yes | Yes | No | App Functionality, Other Purposes | Buyer signup address and order shipping address. |
| Contact Info | Other User Contact Info | No, unless production adds additional contact handles | N/A | No | N/A | No separate social handle/contact channel model found. |
| Financial Info | Payment Info | Yes | Yes | No | App Functionality, Other Purposes | Seller payout bank account, IFSC, account holder name, UPI ID, payment method, Razorpay order/payment/transfer IDs. Buyer card/bank details entered into Razorpay checkout are not stored by NotWhat. |
| Financial Info | Credit Info | No | N/A | No | N/A | No credit score, credit limit, or credit product flow found. |
| Financial Info | Other Financial Info | Yes | Yes | No | App Functionality, Other Purposes | Seller PAN, GST number, commissions, seller payout amounts, earnings, transfer/payout status, refund amounts. |
| Location | Precise Location | No | N/A | No | N/A | No Core Location permission and no latitude/longitude collection found. |
| Location | Coarse Location | No, unless Apple treats manually entered city/state as location in your final policy | N/A | No | N/A | Store city/state/region and shipping city/state are collected as address/store fields, not device location. |
| Sensitive Info | Sensitive Info | No | N/A | No | N/A | No health, biometric, ethnic, religious, political, pregnancy, disability, or similar sensitive category model found. |
| Contacts | Contacts | No | N/A | No | N/A | No address book/social graph access found. |
| User Content | Photos or Videos | Yes | Yes | No | App Functionality, Product Personalization, Analytics | Seller product images and shoppable reel videos uploaded through NotWhat and Cloudinary. |
| User Content | Audio Data | Yes, if seller reel videos can contain audio | Yes | No | App Functionality | Reel videos may include audio tracks; no separate audio-only upload model found. |
| User Content | Customer Support | Yes | Yes | No | App Functionality, Other Purposes | Support request name, email, subject, message, order number, status. |
| User Content | Other User Content | Yes | Yes | No | App Functionality, Product Personalization, Analytics, Other Purposes | Store descriptions/stories, product descriptions, product links/tags, reel captions/hashtags, comments, reports, moderation notes, return descriptions. |
| User Content | Emails or Text Messages | No | N/A | No | N/A | No private user-to-user messaging or email inbox feature found. Order/support emails are sent by NotWhat but not stored as user message threads. |
| User Content | Gameplay Content | No | N/A | No | N/A | Not a game. |
| Browsing History | Browsing History | No | N/A | No | N/A | No open-web browsing history; Razorpay web view is checkout-specific. |
| Search History | Search History | Yes | Yes | No | App Functionality, Product Personalization, Analytics | Search query terms are sent to API search endpoints; no durable search-history model was found, but authenticated requests and logs can link searches to a user/session. |
| Identifiers | User ID | Yes | Yes | No | App Functionality, Product Personalization, Analytics, Other Purposes | Mongo user IDs, seller/buyer/store/product/reel IDs, auth tokens, Razorpay linked account/order/payment/transfer IDs. |
| Identifiers | Device ID | No | N/A | No | N/A | No advertising ID, vendor ID, or device identifier collection found. |
| Purchases | Purchase History | Yes | Yes | No | App Functionality, Product Personalization, Analytics, Other Purposes | Cart, orders, order items, purchase totals, payment status, returns, refunds, seller order views. |
| Usage Data | Product Interaction | Yes | Yes | No | Analytics, Product Personalization, App Functionality | Reel views, product clicks/saves, store views/saves, cart adds, checkout starts, order placed events, comments, likes, watched reels. |
| Usage Data | Advertising Data | No | N/A | No | N/A | No ad impressions/clicks or ad network data found. |
| Usage Data | Other Usage Data | Yes | Yes | No | Analytics, Product Personalization, App Functionality | Cart state, saved products/stores, watched reels, blocked/hidden safety state, seller dashboard activity signals. |
| Diagnostics | Crash Data | No, unless production hosting/app monitoring captures crashes | N/A | No | N/A | No Sentry/Firebase/Crashlytics or iOS crash reporting SDK found. |
| Diagnostics | Performance Data | Yes, if production request logs are retained | Potentially yes | No | App Functionality | `morgan('dev')` logs API request URL/status/response time outside test mode. Hosting platforms may also retain response timing. |
| Diagnostics | Other Diagnostic Data | Yes, if production logs are retained | Potentially yes | No | App Functionality | Backend logs failed analytics, email, payout, webhook, auto-delivery, and other errors; request URLs may include query values. |
| Other Data | Other Data Types | Yes | Yes | No | App Functionality, Other Purposes | Seller KYC/tax identifiers that do not fit cleanly elsewhere, moderation actions, account status/deletion timestamps. |

### Data Not Linked To You

Answer: likely No for the current implementation.

Most stored records include user IDs, seller IDs, buyer IDs, order IDs, or account context. If production infrastructure stores aggregate, de-identified metrics separately, add those specific data types here only after confirming they cannot be linked back to a user.

## Third-Party Service Mapping

| Service | Where used | Data sent/collected | Privacy label impact |
| --- | --- | --- | --- |
| Razorpay | `backend/src/utils/razorpay.js`, checkout web view, webhook route, seller payout onboarding | Buyer checkout order amount, Razorpay order/payment/signature IDs, payment status, seller linked account IDs, seller PAN/GST, seller bank account/IFSC/account holder name, transfer IDs. Full buyer card/UPI/netbanking details are entered into Razorpay checkout and are not stored by NotWhat. | Purchases, Payment Info, Other Financial Info, User ID/Identifiers. No tracking based on current code. |
| Cloudinary | `backend/src/modules/uploads/upload.service.js` | Seller product images, reel videos, generated thumbnails, public IDs, file size, MIME type, duration. | Photos or Videos, Audio Data if videos contain audio, User ID/Identifiers because uploads are stored under seller-specific folders and linked to seller records. |
| MongoDB/API database | Backend models under `backend/src/modules` | All account, marketplace, order, analytics, support, moderation, safety, KYC, cart, and purchase records. | Primary source for most linked data types. |
| Email provider via Nodemailer | `backend/src/utils/email.js` and order/support flows | Recipient email address, order confirmation email content, seller order alert content. | Email Address, Purchase History, Other User Content/Customer Support depending on email type. |
| Apple MapKit / MKLocalSearchCompleter | `ios/NotWhat/Components/AddressSearch.swift` | Address query fragments and selected address resolution are handled through Apple APIs. NotWhat stores/sends the selected or typed shipping address. | You are not responsible for data Apple collects through Apple frameworks, but NotWhat must disclose the Physical Address it stores/sends. |

## Code Evidence By Data Type

| Data type | Evidence |
| --- | --- |
| Name, email, phone, address | `backend/src/modules/users/user.model.js`, `ios/NotWhat/Models/AuthResponse.swift`, buyer/seller signup validation. |
| Shipping contact info | `backend/src/modules/orders/order.model.js`, `backend/src/modules/checkout/checkout.validation.js`, `ios/NotWhat/ViewModels/CartCheckoutViewModels.swift`. |
| Seller KYC and payout data | `backend/src/modules/sellers/sellerProfile.model.js`, `backend/src/modules/sellers/sellerProfile.routes.js`, `backend/src/modules/sellers/sellerPayout.service.js`. |
| Razorpay payment/order/transfer IDs | `backend/src/modules/orders/order.model.js`, `backend/src/modules/checkout/checkout.service.js`, `backend/src/modules/checkout/webhook.controller.js`, `backend/src/utils/razorpay.js`. |
| Purchases/cart/order history | `backend/src/modules/cart/cart.model.js`, `backend/src/modules/orders/order.model.js`, `backend/src/modules/returns/return.model.js`. |
| Product/store/reel user content | `backend/src/modules/products/product.model.js`, `backend/src/modules/stores/store.model.js`, `backend/src/modules/reels/reel.model.js`. |
| Photos/videos/audio-capable media | `ios/NotWhat/Services/UploadService.swift`, `backend/src/modules/uploads/upload.service.js`, `NSPhotoLibraryUsageDescription` in `ios/NotWhat/Info.plist`. |
| Comments and reports | `backend/src/modules/comments/comment.model.js`, `backend/src/modules/safety/report.model.js`, `ios/NotWhat/Models/ReelModels.swift`. |
| Support requests | `backend/src/modules/contact/supportRequest.model.js`, `backend/src/modules/contact/contact.validation.js`. |
| Search queries | `ios/NotWhat/Services/SearchService.swift`, backend search routes/services. |
| Usage analytics | `backend/src/modules/analytics/analyticsEvent.model.js`, `backend/src/modules/analytics/analytics.service.js`, `ios/NotWhat/Models/AnalyticsModels.swift`, `ios/NotWhat/Services/AnalyticsService.swift`. |
| Likes/saves/watched reels/blocking | `backend/src/modules/likes/like.model.js`, `backend/src/modules/buyers/buyerProfile.model.js`, `backend/src/modules/safety/blockedUser.model.js`, `ios/NotWhat/Models/ReelModels.swift`. |
| Bargain/bid data | `backend/src/modules/bargain/bid.model.js`, `backend/src/modules/bargain/bargainSchedule.model.js`. |
| Diagnostics/logging | `backend/src/app.js`, `backend/src/modules/analytics/analytics.service.js`, `backend/src/utils/email.js`, checkout/webhook/payout job logging. |

## App Store Connect Purpose Selections

Use these purpose selections unless the production privacy policy differs:

- App Functionality: select for every collected data type used to run accounts, checkout, orders, seller tools, uploads, support, moderation, security, payments, delivery, returns, and server reliability.
- Product Personalization: select for saved products/stores, watched reels, preferred categories/regions, search/discovery, recommendations, trending, and buyer-facing shopping personalization.
- Analytics: select for product interactions, seller analytics, event counts, views, clicks, saves, cart adds, checkout starts, order placed events, comments, and likes.
- Other Purposes: select for seller KYC, tax, legal, compliance, fraud prevention, payout reconciliation, refunds, dispute handling, and moderation records.
- Developer's Advertising or Marketing: do not select unless NotWhat starts marketing emails/pushes or first-party ad campaigns using this data.
- Third-Party Advertising: do not select based on the current code.

## Important Submission Notes

- Buyer payment credentials entered directly into Razorpay checkout do not need to be marked as NotWhat-collected Payment Info if NotWhat never receives or stores the card/bank credential values. Apple explicitly notes this payment-service carveout in its Payment Info definition.
- Seller payout/KYC information is different: NotWhat collects and stores seller bank account, IFSC, account holder name, PAN, GST, UPI ID, and Razorpay linked account status, so disclose Financial Info.
- Search History should be disclosed even though no durable search-history model was found, because search terms are transmitted to the API and can be tied to authenticated requests and server logs.
- Diagnostics should be disclosed if production logs are retained. If production is changed so request/error data is immediately discarded and not accessible beyond real-time servicing, revisit Performance Data and Other Diagnostic Data.
- The Razorpay checkout web route receives `name`, `email`, and `phone` in query parameters. Because `morgan('dev')` logs request URLs outside test mode, this can put contact info into logs. Prefer POST/session-backed checkout data or remove contact info from query strings before production.
- `AddressSearchField` uses MapKit address search. Apple says developers are not responsible for disclosing data collected by Apple through Apple frameworks, but any selected/typed address sent to NotWhat is still NotWhat-collected Physical Address.

## Recommended App Store Connect Final Selection

Select these as "Data Linked to You":

- Contact Info: Name, Email Address, Phone Number, Physical Address.
- Financial Info: Payment Info, Other Financial Info.
- User Content: Photos or Videos, Audio Data, Customer Support, Other User Content.
- Search History: Search History.
- Identifiers: User ID.
- Purchases: Purchase History.
- Usage Data: Product Interaction, Other Usage Data.
- Diagnostics: Performance Data and Other Diagnostic Data, if production logs are retained.
- Other Data: Other Data Types.

Do not select these unless production changes:

- Data Used to Track You.
- Device ID.
- Advertising Data.
- Browsing History.
- Contacts.
- Health, Fitness, Sensitive Info.
- Precise Location.
- Crash Data.
- Gameplay Content.
- Emails or Text Messages.
