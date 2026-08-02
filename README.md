# NotWhat

NotWhat is a native iOS marketplace app for regional Indian fashion. Buyers discover products and shoppable video reels from regional sellers. Sellers manage their storefront, upload reels, run Bargain Days, and track analytics — all from the same app.

The repo has three parts: **`backend/`** (Node/Express + MongoDB REST API), **`ios/`** (the SwiftUI app), and **`shared/`** (Kotlin Multiplatform shared domain logic under migration). Start the backend, point the app at it, run in the simulator.

---

## Quick start (≈5 minutes)

```sh
# 1. Backend
cd backend
cp .env.example .env          # edit MONGO_URI if not using the local default
npm install
brew services start mongodb-community   # or run mongod yourself
npm run seed                  # demo buyers, sellers, products, reels
npm run dev                   # API on http://localhost:5001

# 2. Health check (new terminal)
curl http://localhost:5001/api/health

# 3. iOS app
open ../ios/NotWhat.xcodeproj # pick the NotWhat scheme + an iPhone simulator, ⌘R
```

Log in with a demo account: **`buyer@example.com` / `Password123!`** (see
[Seed data and demo accounts](#seed-data-and-demo-accounts)). The simulator
reaches the backend at `localhost` automatically — no config needed. For a
**physical device**, see [iOS setup](#ios-setup).

New to the codebase? Read [Project structure](#project-structure) →
[iOS architecture](#ios-architecture) → [Backend architecture](#backend-architecture),
then keep [All API endpoints](#all-api-endpoints) handy.

---

## Table of Contents

1. [Quick start](#quick-start-5-minutes)
2. [What the app does](#what-the-app-does)
3. [Tech stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Project structure](#project-structure)
6. [Backend setup](#backend-setup)
7. [Testing](#testing)
8. [iOS setup](#ios-setup)
9. [Environment variables](#environment-variables)
10. [Seed data and demo accounts](#seed-data-and-demo-accounts)
11. [iOS architecture](#ios-architecture)
12. [Buyer features](#buyer-features)
13. [Seller features](#seller-features)
14. [Backend architecture](#backend-architecture)
15. [All API endpoints](#all-api-endpoints)
16. [Background jobs](#background-jobs)
17. [Payment integration (Razorpay)](#payment-integration-razorpay)
18. [Email integration](#email-integration)
19. [Known limitations](#known-limitations)
20. [Deployment checklist](#deployment-checklist)

---

## What the app does

**Buyers** can:
- Browse a homepage feed of products and shoppable reels filtered by category and region
- Watch full-screen vertical video reels, like, comment, and share them
- Tap tagged products directly from a reel and add to cart
- Search globally across products, stores, and reels with filters (region, category, city, state, price range)
- View store profiles with a product catalog and the store's shoppable reels
- Save favourite products and stores
- Add products to cart, checkout with Razorpay (UPI, card, netbanking), and track orders
- Bid on Bargain Day products where sellers offer time-limited lower bids

**Sellers** can:
- Dashboard with views, product clicks, saves, cart adds, and recent uploads
- Create, edit, and delete products with images, pricing, stock, region, category, and tags
- Upload and manage shoppable reels with tagged products
- Edit their public store profile (banner, logo, description, featured categories)
- View orders placed through their store and update order status
- Schedule Bargain Days on products, review bids, and close to the winning bidder
- View analytics: top-performing reels, top-clicked products, buyer intent signals

---

## Tech stack

| Layer | Technology |
|---|---|
| iOS app | SwiftUI, MVVM, URLSession, AVKit |
| Shared client logic | Kotlin Multiplatform (KMP), Kotlin Coroutines, Kotlin Serialization |
| Backend | Node.js 20+, Express 4 |
| Database | MongoDB 7+ with Mongoose 8 |
| Auth | JWT (jsonwebtoken), bcrypt, Google Sign-In (google-auth-library), email OTP signup/reset |
| Payments | Razorpay (orders API + webhook verification, authorize/capture/refund flows) |
| Shipping | Shiprocket (label + pickup sync, tracking webhook) |
| Email | Resend (preferred) or Nodemailer SMTP (SendGrid, AWS SES, Gmail) |
| File uploads | Multer + Cloudinary (streamifier) |
| HTTP client | axios (Shiprocket / external calls) |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize |
| Logging | Morgan |
| Dev tooling | Nodemon |
| Testing | Jest, Supertest, mongodb-memory-server, nock |

---

## Prerequisites

Before starting, make sure you have:

- **macOS** with Xcode 15 or later
- **Node.js** 20 or later — `node -v` to check
- **npm** 10 or later — `npm -v` to check
- **MongoDB** 7 running locally — `mongod --version` to check
- **Xcode Command Line Tools** — `xcode-select --install` if missing
- An iOS Simulator (comes with Xcode) or a physical iPhone on the same WiFi network

Optional for payments and uploads:
- Razorpay account (test keys work for development)
- Cloudinary account (for real image/video upload)
- SMTP credentials (for order confirmation emails)

---

## Project structure

```
NotWhat-ios/
├── shared/
│   ├── src/commonMain/           ← Shared KMP domain/use-case logic
│   ├── src/commonTest/           ← Shared KMP tests
│   ├── src/commonMain/.../ui     ← Compose UI shell, tabs, and shared state
│   ├── src/iosMain/...           ← iOS Compose host entry point
│   └── build.gradle.kts          ← KMP module config (iOS framework target)
│
├── backend/
│   ├── src/
│   │   ├── app.js                  ← Express app factory (middleware, routes, jobs)
│   │   ├── server.js               ← Starts the HTTP server
│   │   ├── config/
│   │   │   ├── db.js               ← MongoDB connection
│   │   │   ├── env.js              ← Validated environment variables
│   │   │   └── commissionConfig.js ← Platform commission rates
│   │   ├── database/
│   │   │   └── seed.js             ← Seed script for demo data
│   │   ├── jobs/
│   │   │   ├── bargainAutoClose.job.js  ← Auto-closes expired bargains
│   │   │   └── autoDelivery.job.js     ← Auto-marks shipped orders delivered
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   ← JWT verification, attaches req.user
│   │   │   ├── role.middleware.js   ← requireBuyer / requireSeller guards
│   │   │   ├── validate.middleware.js ← express-validator error handler
│   │   │   └── error.middleware.js  ← Global error handler
│   │   ├── modules/                 ← One folder per domain (see below)
│   │   ├── services/
│   │   │   └── googleAuth.service.js ← Verifies Google ID tokens
│   │   ├── routes/
│   │   │   └── index.js            ← Mounts all module routers under /api
│   │   └── utils/
│   │       ├── apiResponse.js      ← successResponse / errorResponse helpers
│   │       ├── AppError.js         ← Operational error class
│   │       ├── resendEmail.js      ← Resend email backend
│   │       ├── email.js            ← Nodemailer SMTP fallback
│   │       └── shiprocket.js       ← Shiprocket API client
│   ├── scripts/                    ← seed-admin, backfill-pickup-addresses, etc.
│   ├── tests/                      ← Jest unit/integration/security suites
│   ├── .env                        ← Your local secrets (not committed)
│   ├── .env.example                ← Fully-commented template for all variables
│   └── package.json
│
└── ios/
    └── NotWhat/
        ├── App/
        │   ├── NotWhatApp.swift     ← @main entry, injects AppSession + APIClient
        │   ├── AppRouter.swift      ← Switches between LoginScreen, BuyerTabView, SellerTabView
        │   └── AppSession.swift     ← Auth state (token in Keychain, profiles in UserDefaults)
        ├── Models/                  ← All Codable API/domain models
        ├── Services/                ← APIClient + one service file per feature
        ├── ViewModels/              ← @MainActor ObservableObject view models
        ├── Views/                   ← All SwiftUI screens
        ├── Components/              ← Reusable UI components
        └── Utilities/
            ├── Constants.swift      ← API base URL (change this for device testing)
            ├── NotWhatTheme.swift   ← All colours, typography, spacing, animations
            └── KeychainHelper.swift ← Keychain read/write/delete
```

---

## Backend setup

### 1. Install dependencies

```sh
cd backend
npm install
```

### 2. Create your `.env` file

```sh
cp .env.example .env
```

Edit `backend/.env` with your values (see [Environment variables](#environment-variables) below).

### 3. Start MongoDB

```sh
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --dbpath /usr/local/var/mongodb
```

Confirm MongoDB is running:
```sh
mongosh --eval "db.runCommand({ ping: 1 })"
```

### 4. Seed demo data

```sh
cd backend
npm run seed
```

This creates demo buyers, sellers, stores, products, reels, and one active Bargain Day. Safe to re-run — it clears only its own demo data each time.

Optional seed/maintenance scripts (all run from `backend/`):

| Command | What it does |
|---|---|
| `npm run seed` | Demo buyers, sellers, stores, products, reels, a Bargain Day, a cart and order |
| `npm run seed:admin` | Creates the admin account from `ADMIN_*` env vars; prints a TOTP setup URL if `ADMIN_TOTP_SECRET` is blank |
| `npm run seed:pickup-addresses` | Backfills seller pickup addresses (needed for shipping) |

### 5. Start the API server

Development (auto-reloads on file changes):
```sh
npm run dev
```

Production-style:
```sh
npm start
```

Health check:
```sh
curl http://localhost:5001/api/health
```

Expected response:
```json
{ "success": true, "data": { "status": "ok", "uptime": 12.3 } }
```

---

## Testing

Backend automated tests use Jest, Supertest, mongodb-memory-server, and nock. They run with `NODE_ENV=test`, create an isolated in-memory MongoDB, and mock Razorpay, Shiprocket, and Cloudinary.

```sh
cd backend
npm test
npm run test:watch
npm run test:coverage
```

The backend test structure is:

```text
backend/tests/
├── helpers/       # auth, mock data, DB, mocked external providers
├── unit/          # service and calculation tests
├── integration/   # API, webhook, payment, upload, shipping, safety tests
└── security/      # role and ownership access-control tests
```

iOS XCTest and XCUITest source files live in `ios/NotWhatTests` and `ios/NotWhatUITests`. The current Xcode project did not already contain test targets, so add `NotWhatTests` and `NotWhatUITests` targets in Xcode before running them.

```sh
xcodebuild test \
  -project ios/NotWhat.xcodeproj \
  -scheme NotWhat \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

More detail:
- [Testing guide](docs/testing.md)
- [Manual real-device QA checklist](docs/manual-qa-checklist.md)

---

## iOS setup

### 1. Set the correct API base URL

Open `ios/NotWhat/Utilities/Constants.swift`. It already picks the right URL per build:

```swift
enum APIConstants {
    #if DEBUG
    #if targetEnvironment(simulator)
    static let baseURL = URL(string: "http://localhost:5001/api")!
    #else
    static let baseURL = URL(string: "https://stagnant-armhole-broadcast.ngrok-free.dev/api")!
    #endif
    #else
    static let baseURL = URL(string: "https://api.notwhat.in/api")!
    #endif
}
```

- **Simulator** (Debug): uses `http://localhost:5001/api` automatically — the simulator shares the Mac's network stack. Nothing to change.
- **Physical device** (Debug): can't reach `localhost`. Point it at a tunnel to your Mac. Either:
  - Run [ngrok](https://ngrok.com) — `ngrok http 5001` — and paste the HTTPS URL into the device branch above (the checked-in one is an example, replace it), **or**
  - Use your Mac's LAN IP, e.g. `http://192.168.1.X:5001/api`, with the iPhone and Mac on the same WiFi. (Local HTTP needs an ATS exception in `Info.plist`; a tunnel avoids that.)
- **Release**: uses the production API `https://api.notwhat.in/api`.

### Google Sign-In (iOS)

The Google config plist (`ios/GoogleService-Info (1).plist`) and the OAuth client
ID in `ios/NotWhat/Info.plist` configure Google login
(`Services/GoogleSignInManager.swift`). To use your own Google project, replace
that plist (make sure the target's copy is named `GoogleService-Info.plist`) and
set the matching `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_WEB_CLIENT_ID` in `backend/.env`.
Google login is optional — email/password and OTP signup work without it.

### 2. Open and run

```sh
open ios/NotWhat.xcodeproj
```

In Xcode:
1. Select the `NotWhat` scheme
2. Choose an iOS Simulator (iPhone 15 or newer recommended)
3. Press **Run** (⌘R)

### 3. Full startup order

Every session:
1. Start MongoDB
2. `npm run dev` in `backend/`
3. Build and run the iOS app in Xcode
4. Log in with a demo account

---

## Environment variables

All variables live in `backend/.env`. Copy the template and fill it in:

```sh
cd backend
cp .env.example .env
```

**`backend/.env.example` is the authoritative, fully-commented reference** — every
variable, its default, and what happens if you leave it blank is documented there
and mirrors `src/config/env.js`. The table below is a quick map of the groups.

| Group | Variables | Needed for |
|---|---|---|
| **Core / server** | `NODE_ENV`, `PORT` | Always (has defaults) |
| **Database** | `MONGO_URI` | **Required** — nothing works without it |
| **Auth (JWT)** | `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` | **Required in production**; dev has fallbacks |
| **Google Sign-In** | `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_WEB_CLIENT_ID` | Google login (optional) |
| **Email** | `RESEND_API_KEY` **or** `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASSWORD`, plus `EMAIL_FROM` | Signup OTP + order emails (optional in dev) |
| **Signup / reset OTP** | `SIGNUP_OTP_*`, `PASSWORD_RESET_OTP_TEST_CODE` | Tuning OTP flow; test codes let you sign up without real email |
| **Uploads** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Real image/video upload (optional) |
| **Payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_*` flags | Checkout (optional in dev) |
| **Shipping** | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_*` | Live labels/pickup (optional) |
| **Commission & timing** | `PLATFORM_COMMISSION_PERCENTAGE`, `SELLER_ACCEPTANCE_WINDOW_MINUTES`, `BID_ACCEPTANCE_WINDOW_MINUTES` | Business rules (have defaults) |
| **Admin** | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_TOTP_SECRET`, `ADMIN_OVERWRITE_PASSWORD` | Seeding the admin account |

**Minimum to boot locally:** just `MONGO_URI` (the rest have dev fallbacks). To
also sign up and log in with OTP without real email, set `SIGNUP_OTP_TEST_CODE`
(and `PASSWORD_RESET_OTP_TEST_CODE`) to a fixed code like `123456` — these are
only honoured when `NODE_ENV` is `development` or `test`.

Without Razorpay keys, checkout fails at payment start. Without Cloudinary,
enter image/video URLs manually. Without any email backend, OTP and confirmation
emails are skipped silently and the flow still succeeds.

---

## Seed data and demo accounts

Run `npm run seed` from the `backend/` folder. The seed creates:

| Account | Email | Password | Role |
|---|---|---|---|
| Demo buyer | `buyer@example.com` | `Password123!` | Buyer |
| Demo seller (Jaipur Heritage House) | `seller@example.com` | `Password123!` | Seller |
| Demo seller 2 (Mumbai Street Market) | `seller2@example.com` | `Password123!` | Seller |
| Demo seller 3 (Chennai Bridal Atelier) | `seller3@example.com` | `Password123!` | Seller |

The seed also creates:
- 3 demo stores with banners, categories, and regions
- Multiple products per store (sarees, jewelry, bridal, accessories)
- One product marked as sold out
- Demo reels linked to stores with tagged products
- One active Bargain Day schedule
- A demo cart and demo order for the buyer

Re-running the seed is safe — it clears only its own demo accounts and their data, leaving any accounts you created manually untouched.

---

## iOS architecture

### Entry and routing

```
NotWhatApp.swift
  └── AppSession (EnvironmentObject, shared across all views)
  └── APIClient (Environment value, injected via .environment)
  └── AppRouter
        ├── LoginScreen          ← shown when not logged in
        ├── BuyerTabView         ← shown when role == .buyer
        └── SellerTabView        ← shown when role == .seller
```

### Session persistence

`AppSession` holds all auth state. On sign-in it writes:
- **Keychain** → JWT token (via `KeychainHelper`)
- **UserDefaults** → User, BuyerProfile/SellerProfile, Store (JSON-encoded)

On app launch it restores from both. On sign-out it clears both.

### MVVM pattern

Every screen follows: `View → ViewModel → Service → APIClient → Backend`

- **Views** own `@StateObject` view models and inject `apiClient` from environment.
- **ViewModels** are `@MainActor final class : ObservableObject`. They call services and publish state.
- **Services** (e.g. `ReelService`, `CartService`) take `APIClient` in their initialiser and translate API responses to domain models.
- **APIClient** handles auth headers, JSON encode/decode, and error mapping.

### Theme system

All colours, fonts, spacing, and animations live in `NotWhatTheme.swift`:

| Token | Usage |
|---|---|
| `NotWhatTheme.background` | Page backgrounds |
| `NotWhatTheme.card` | Card surfaces (white) |
| `NotWhatTheme.text` | Primary text |
| `NotWhatTheme.secondaryText` | Labels, captions, metadata |
| `NotWhatTheme.accent` | Deep golden — buttons, active states |
| `NotWhatTheme.accentSoft` | Light golden — chip backgrounds |
| `NotWhatTheme.success` | In-stock, confirmed states |
| `NotWhatTheme.error` | Sold out, error states |
| `AppTheme.primaryGradient` | CTA buttons |
| `AppTheme.heroGradient` | Home hero card background |

Use `.notWhatCard()` view modifier for any card surface. Use `PressScaleButtonStyle` for tappable items that need a press animation.

---

## Buyer features

### Tab bar (5 tabs)

| Tab | Screen | What it does |
|---|---|---|
| Home | `BuyerHomeScreen` | Feed, categories, featured stores, regions, product/video discovery toggle |
| Reels | `ReelsFeedScreen` | Full-screen vertical video reels feed |
| Search | `SearchScreen` | Global search with filters |
| Cart | `CartScreen` | Cart management and checkout entry |
| Profile | `BuyerProfileScreen` | Orders, saved items, settings, sign out |

### Home screen

- Personalised greeting using the logged-in user's first name
- Category chips (For You, Sarees, Suits, Jewelry, etc.) — tap to filter the feed
- Active Bargain Days section — horizontal scroll of products with open bids
- Featured Stores — horizontal scroll of verified/trending stores
- Explore Regions — tap a region to see all stores and products from that area
- Products / Videos toggle — switch between a product grid and reel preview list
- Pull to refresh on all sections

### Reels feed

- Full-screen vertical paging feed (one reel per page)
- Thumbnail shown as background while video buffers (no black flash)
- Tap video to pause/play; pause icon visible only when paused
- Mute/unmute via top-right button
- Like (heart) with optimistic update — count adjusts instantly, reverts on API error
- Comment sheet — load comments, post new comment, live count update
- "Shop this reel" panel (bottom sheet) — shows tagged in-stock products as tappable rows
- Tagged product chips appear directly on the reel for quick access (up to 3, then "+N more")
- Store name, logo, verified badge, region · category shown as overlay
- Share button opens iOS native share sheet with caption, store name, and hashtags
- Views tracked once per session per reel
- Reels where ALL tagged products are sold out are hidden automatically
- Demo video URLs used as fallback when backend reels have no video URL

### Product detail

- Image gallery (swipeable tab view, multiple images)
- Title, price, description, category, region, stock status
- Seller store row — tap to open the store profile
- Save/unsave (heart) with API sync
- Add to Cart — posts to cart API, shows confirmation
- Buy Now — adds to cart and immediately opens checkout
- Related products grid below the main content

### Store profile

- Banner image + store avatar (overlapping layout)
- Store name, verified badge, location, description, story
- Product count, video count, view count metrics
- Featured category chips
- Products tab — full catalog with category filter chips
- Reels tab — store's shoppable reels, tap to open full-screen player
- Save/unsave store with heart button
- Store view tracked on open

### Search

- Live search as you type (debounced)
- Filter sheet: region, city, state, category, seller/store name, min/max price
- Active filters shown as removable chips
- Results split into Products, Stores, Reels sections (only sections with results are shown)
- Recent searches saved locally, clearable
- Suggested category browse chips when idle

### Cart and checkout

- Cart items with image, title, store, region, quantity, and item total
- Increase/decrease quantity with stock limit enforcement
- Remove item with trash button
- Order summary card with subtotal, shipping, and total
- Checkout form: name, email, phone, address, city, state, postal code
- Razorpay payment sheet (UPI, card, netbanking)
- Order confirmation screen with order number and tracking status

### Orders

- Orders list with order number, status, item count, and total
- Order detail with line items, payment method, and shipping info
- Accessible from Profile → My Orders and Cart → Orders toolbar button

### Bargain Days

- Browse active bargain schedules on the home screen
- Tap to open the bid screen for any product
- Enter a bid amount lower than the marked price
- Bid is placed as pending; seller picks the highest at close

### Saved items

- Saved Products and Saved Stores in a two-tab hub
- Populated from the buyer's profile (savedProducts and savedStores arrays)
- Accessible from Profile → Saved Items

---

## Seller features

### Tab bar (5 tabs)

| Tab | Screen | What it does |
|---|---|---|
| Dashboard | `SellerDashboardScreen` | Stats overview, recent uploads, buyer intent signals |
| Orders | `SellerOrdersScreen` | Incoming orders, status management |
| Products | `SellerProductsScreen` | Product list, create/edit/delete |
| Content | `ContentScreen` | Reels and Bargain Days management |
| Store | `SellerStoreScreen` | Edit store profile; Analytics via toolbar |

### Dashboard

- Total views, clicks, saves, cart adds at a glance
- Recent product uploads (last 5)
- Quick action buttons: Add Product, Upload Reel, Edit Storefront
- Buyer intent signals: which products are getting clicks, saves, and cart adds

### Product management

- Full product list with stock status badges
- Create product form: title, description, product link, category, region, price, stock, tags, image URLs, featured toggle
- Edit any existing product
- Delete product (with confirmation)
- Products marked inactive or sold-out are shown with appropriate badges

### Reel management

- Reel list with thumbnail, caption, view/like/comment counts
- Upload new reel: video URL, thumbnail URL, caption, hashtags, region, category, tagged product IDs
- Edit existing reel metadata
- Delete reel

### Store profile editing

- Edit store name, city, state, specialty region, description, story
- Upload profile image and banner image
- Select featured categories from a multi-select picker
- Changes propagate to the public store profile immediately

### Order management

- Incoming orders list ordered by date
- View order details: buyer name, items, payment method, amounts
- Update order status: Confirmed → Shipped → Delivered → Cancelled
- Filter or sort orders (seller-specific view)

### Bargain Days

- Schedule a Bargain Day on any product (1–2 days, start/end datetime)
- View all bids placed during the bargain period
- Close the bargain — system awards the sale to the highest bidder
- Closed bargains create a confirmed order automatically

### Analytics

- Total views, product clicks, saves, and cart adds
- Top-performing reels by view count
- Top-clicked and top-saved products
- Accessible from the Store tab via the chart toolbar button

---

## Backend architecture

### Module structure

Each module in `backend/src/modules/` contains:
- `*.model.js` — Mongoose schema and model
- `*.routes.js` — Express router
- `*.controller.js` — Route handler functions
- `*.service.js` — Business logic (optional, for complex modules)
- `*.validation.js` — express-validator rule sets

### Modules

| Module | What it owns |
|---|---|
| `auth` | Signup (buyer/seller), login, `/me` endpoint, JWT issuing |
| `users` | User model shared by both roles |
| `buyers` | BuyerProfile model (savedProducts, savedStores) |
| `sellers` | SellerProfile model, seller profile routes |
| `stores` | Store model, store discovery, save/unsave, view tracking |
| `products` | Product model, CRUD for sellers, buyer browse, save/unsave, click tracking |
| `reels` | Reel model, feed endpoint, like/unlike, comments, view tracking, tagged products |
| `comments` | Comment model (used by reels) |
| `likes` | Like model (used by reels) |
| `addresses` | Buyer/seller saved addresses (shipping, pickup) |
| `cart` | Cart model, add/update/remove items |
| `checkout` | Razorpay order creation, order placement, webhook verification, payout tracking |
| `orders` | Order model, buyer order history, order detail |
| `sellerOrders` | Seller-facing order list, status updates |
| `cancellations` | Order cancellation requests and processing |
| `returns` | Return request model and routes |
| `refunds` | Refund records and Razorpay refund execution |
| `finance` | Seller payouts, commission accounting, statements |
| `shipping` | Shiprocket integration — labels, pickup sync, tracking webhook |
| `bargain` | BargainSchedule + Bid models, schedule, bid, close, auto-close job |
| `discovery` | Home feed (mixed products + reels), categories list, regions list, featured stores |
| `search` | Global search, product search, store search, reel search |
| `analytics` | AnalyticsEvent model, event tracking, seller summary endpoint |
| `recommendations` | Recommendation engine (region/category-based) |
| `trending` | Trending stores, products, regions, hashtags |
| `uploads` | Multer + Cloudinary image/video upload |
| `media` | Media asset management |
| `safety` | Content/user safety reports and moderation |
| `content` | Static content (Privacy Policy, Terms, Return Policy, Shipping Policy, About) |
| `contact` | Support request submission |
| `admin` | Admin auth + TOTP 2FA |
| `adminDashboard` / `adminAnalytics` | Admin overview stats and analytics |
| `adminManagement` / `adminOperations` | Admin user/store/order management and operational actions |
| `adminSearch` / `adminTools` | Admin-side search and maintenance tools |

### Middleware

| Middleware | What it does |
|---|---|
| `auth.middleware.js` | Verifies JWT, attaches `req.user` |
| `role.middleware.js` | `requireBuyer` and `requireSeller` guards — returns 403 if role doesn't match |
| `validate.middleware.js` | Runs express-validator checks, returns 400 with field errors on failure |
| `error.middleware.js` | Global error handler — formats all thrown errors as `{ success: false, message }` |

### API response format

All endpoints return:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

Errors:

```json
{
  "success": false,
  "message": "Human-readable error"
}
```

The iOS `APIClient` decodes these via `APIResponse<T>` and throws `APIError` on `success: false`.

### Webhook response policy

Webhook endpoints intentionally use provider-focused raw JSON acknowledgements instead of the standard `apiResponse` envelope:
- `POST /webhooks/razorpay`
- `POST /webhooks/shiprocket`

This is deliberate for compatibility with payment/logistics providers that only require clear HTTP status + minimal body semantics.

Policy:
- Use strict signature verification in production (fail closed).
- Keep response payloads minimal and stable (`{ received: true }` or `{ success: true/false, message }`).
- Do not route webhook responses through user-facing API response wrappers.

---

## All API endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup/buyer` | None | Create buyer account directly |
| `POST` | `/api/auth/signup/seller` | None | Create seller account directly |
| `POST` | `/api/auth/signup/buyer/start` | None | Start buyer signup — emails an OTP |
| `POST` | `/api/auth/signup/seller/start` | None | Start seller signup — emails an OTP |
| `POST` | `/api/auth/signup/resend-code` | None | Resend the signup OTP |
| `POST` | `/api/auth/signup/verify-email` | None | Verify OTP, finalize account, return JWT |
| `POST` | `/api/auth/google` | None | Sign in / up with a Google ID token |
| `POST` | `/api/auth/google/complete-profile` | Any | Fill role/profile after first Google sign-in |
| `POST` | `/api/auth/login` | None | Login, returns JWT + user + profiles |
| `POST` | `/api/auth/forgot-password` | None | Email a password-reset OTP |
| `POST` | `/api/auth/verify-reset-otp` | None | Verify the reset OTP |
| `POST` | `/api/auth/reset-password` | None | Set a new password after OTP verify |
| `POST` | `/api/auth/change-password` | Any | Change password while logged in |
| `POST` | `/api/auth/logout` | Any | Log out |
| `GET` | `/api/auth/me` | Any | Current authenticated user |
| `PATCH` | `/api/auth/me` | Any | Update profile fields |
| `DELETE` | `/api/auth/account` | Any | Delete own account |

### Discovery

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/discovery/feed` | Optional | Home feed (mixed products + reels) |
| `GET` | `/api/discovery/categories` | None | Category list with counts |
| `GET` | `/api/discovery/regions` | None | Region list with counts |
| `GET` | `/api/discovery/featured-stores` | None | Verified/trending stores |

### Products

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products` | None | Product list with filters |
| `GET` | `/api/products/:id` | None | Product detail |
| `GET` | `/api/products/:id/related` | None | Related products |
| `POST` | `/api/products/:id/save` | Buyer | Save product |
| `DELETE` | `/api/products/:id/save` | Buyer | Unsave product |
| `POST` | `/api/products/:id/click` | Buyer | Track product click |
| `GET` | `/api/seller/products` | Seller | Seller's product list |
| `POST` | `/api/seller/products` | Seller | Create product |
| `PUT` | `/api/seller/products/:id` | Seller | Update product |
| `DELETE` | `/api/seller/products/:id` | Seller | Delete product |

### Stores

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stores` | None | Store discovery with filters |
| `GET` | `/api/stores/:id` | None | Store profile |
| `GET` | `/api/stores/:id/products` | None | Store product catalog |
| `GET` | `/api/stores/:id/reels` | None | Store shoppable reels |
| `POST` | `/api/stores/:id/save` | Buyer | Follow/save store |
| `DELETE` | `/api/stores/:id/save` | Buyer | Unfollow/unsave store |
| `POST` | `/api/stores/:id/view` | None | Track store view |
| `GET` | `/api/sellers/profile` | Seller | Seller's own store profile |
| `PUT` | `/api/sellers/profile` | Seller | Update store profile |

### Reels

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reels` | None | Reels feed (supports category, region, store, seller filters) |
| `GET` | `/api/reels/:id` | None | Single reel detail |
| `GET` | `/api/reels/:id/products` | None | Tagged products for a reel |
| `POST` | `/api/reels/:id/view` | None | Track reel view |
| `POST` | `/api/reels/:id/like` | Buyer | Like reel |
| `DELETE` | `/api/reels/:id/like` | Buyer | Unlike reel |
| `GET` | `/api/reels/:id/comments` | None | Reel comments |
| `POST` | `/api/reels/:id/comments` | Buyer | Post comment on reel |
| `GET` | `/api/seller/reels` | Seller | Seller's reel list |
| `POST` | `/api/seller/reels` | Seller | Upload reel |
| `PUT` | `/api/seller/reels/:id` | Seller | Update reel |
| `DELETE` | `/api/seller/reels/:id` | Seller | Delete reel |

### Cart

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Buyer | Get buyer's cart |
| `POST` | `/api/cart/items` | Buyer | Add item to cart |
| `PUT` | `/api/cart/items/:productId` | Buyer | Update quantity |
| `DELETE` | `/api/cart/items/:productId` | Buyer | Remove item |

### Checkout and orders

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/checkout/start` | Buyer | Create Razorpay order, returns order ID + amount |
| `POST` | `/api/checkout/place-order` | Buyer | Verify Razorpay signature, place order |
| `POST` | `/api/webhooks/razorpay` | Webhook | Razorpay payment event handler |
| `GET` | `/api/orders` | Buyer | Buyer order history |
| `GET` | `/api/orders/:id` | Buyer | Order detail |
| `GET` | `/api/seller/orders` | Seller | Seller incoming orders |
| `PUT` | `/api/seller/orders/:id/status` | Seller | Update order status |

### Bargain Days

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bargain/active` | None | Active bargain schedules with products |
| `POST` | `/api/bargain/products/:productId/schedule` | Seller | Create bargain schedule |
| `GET` | `/api/bargain/products/:productId/bids` | Seller | View all bids for a product |
| `POST` | `/api/bargain/products/:productId/bids` | Buyer | Place a bid |
| `POST` | `/api/bargain/products/:productId/close` | Seller | Close bargain, select winner |

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search/global` | None | Search products + stores + reels |
| `GET` | `/api/search/products` | None | Product search with filters |
| `GET` | `/api/search/stores` | None | Store search with filters |
| `GET` | `/api/search/reels` | None | Reel search |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/analytics/events` | Optional | Track any analytics event |
| `GET` | `/api/seller/analytics/summary` | Seller | Views, clicks, saves, cart adds summary |
| `GET` | `/api/seller/analytics/top-reels` | Seller | Top reels by views |
| `GET` | `/api/seller/analytics/top-products` | Seller | Top products by clicks |
| `GET` | `/api/seller/dashboard` | Seller | Dashboard stats + recent activity |

### Uploads

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/uploads/image` | Seller | Upload image to Cloudinary |
| `POST` | `/api/uploads/video` | Seller | Upload video to Cloudinary |

### Trending and recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/trending/stores` | None | Trending stores by view count |
| `GET` | `/api/trending/products` | None | Trending products by click count |
| `GET` | `/api/trending/hashtags` | None | Trending reel hashtags |
| `GET` | `/api/recommendations` | Optional | Personalised product recommendations |

### Content and support

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/content/privacy-policy` | None | Privacy Policy text |
| `GET` | `/api/content/terms-of-service` | None | Terms of Service text |
| `GET` | `/api/content/return-policy` | None | Return Policy text |
| `GET` | `/api/content/shipping-policy` | None | Shipping Policy text |
| `GET` | `/api/content/about` | None | About NotWhat text |
| `POST` | `/api/contact/support` | Optional | Submit support request |

### Returns and admin

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/returns` | Buyer | Submit return request |
| `GET` | `/api/returns` | Buyer | Buyer return requests |
| `GET` | `/api/admin/users` | Admin | All users |
| `GET` | `/api/admin/orders` | Admin | All orders |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | API health check |

---

## Background jobs

Two recurring jobs run inside the API server process:

### Bargain auto-close job
- Runs every **5 minutes**
- Finds any `BargainSchedule` whose `endDate` has passed and status is still `active`
- Automatically closes it: picks the highest bid, creates a confirmed order for the winning buyer, marks the schedule as `closed`

### Auto-delivery job
- Runs every **6 hours**
- Finds orders in `shipped` status older than a threshold (default 5 days)
- Marks them as `delivered` automatically

Both jobs are started in `app.js` when `NODE_ENV !== 'test'`. They use `.unref()` so they don't keep the process alive if everything else exits.

---

## Payment integration (Razorpay)

### How checkout works

1. Buyer taps "Place Order" → iOS calls `POST /api/checkout/start`
2. Backend creates a Razorpay order (`razorpay.orders.create`) and returns `orderId + amount`
3. iOS opens `RazorpayWebView` — a WKWebView loading the Razorpay checkout JS
4. User completes payment (UPI, card, netbanking)
5. Razorpay calls the iOS callback with `paymentId`, `orderId`, `signature`
6. iOS calls `POST /api/checkout/place-order` with those three values
7. Backend verifies the HMAC signature (`razorpay_order_id|razorpay_payment_id` signed with `RAZORPAY_KEY_SECRET`)
8. On success: cart is cleared, order is created, confirmation email is sent
9. iOS navigates to `OrderConfirmationScreen`

### Webhook

`POST /webhooks/razorpay` (mounted before `express.json` so it receives raw body) handles:
- `payment.captured` — marks order as paid if not already done
- `payment.failed` — marks order as failed

Set this URL in the Razorpay dashboard under Webhooks.

`POST /webhooks/shiprocket` (mounted before `express.json` so it receives raw body) handles tracking status callbacks used for delivery updates.

Production requirement:
- `SHIPROCKET_WEBHOOK_SECRET` must be configured, otherwise the endpoint returns `503` and rejects processing.

### Test keys

Use Razorpay test keys from your dashboard. Test card: `4111 1111 1111 1111`, any future expiry, any CVV.

---

## Email integration

Two backends are supported, in priority order:

1. **Resend** (preferred) — set `RESEND_API_KEY`:
   ```
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=NotWhat <noreply@notwhat.in>
   ```
2. **Nodemailer SMTP** (fallback) — any SMTP provider (SendGrid, AWS SES, Gmail):
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=NotWhat <noreply@notwhat.in>
   ```

Emails sent:
- **Signup OTP** — the code that verifies a new account's email
- **Password-reset OTP** — the code for the forgot-password flow
- **Order confirmation** — to the buyer after a successful checkout

If no backend is configured, emails fail silently and the flow still completes.
In dev/test you can skip email entirely by setting `SIGNUP_OTP_TEST_CODE` /
`PASSWORD_RESET_OTP_TEST_CODE` to a fixed code.

---

## Known limitations

- **Payments**: Razorpay test keys work end-to-end in development. Live keys require domain verification with Razorpay.
- **Uploads**: Cloudinary credentials are needed for real image/video uploads. Without them, product and reel image URLs must be entered manually as public URLs.
- **Product images and reel videos**: The demo seed uses placeholder URLs. Real images must be uploaded via the upload endpoint or entered as full public URLs in the product/reel form.
- **iOS session**: JWT is stored in Keychain, profiles in UserDefaults — this is solid for production but the buyer profile update endpoint is not yet wired to a dedicated profile-edit API call.
- **Admin panel**: Admin routes exist in the backend but there is no iOS UI for admin functions.
- **Returns**: Return request submission is available via API, but the iOS return flow is a placeholder screen.
- **Legal content**: Privacy Policy, Terms of Service, Return Policy, and Shipping Policy text served by the backend are placeholder copy. Replace with counsel-reviewed text before public launch.
- **Physical device network**: `localhost` in `Constants.swift` does not work on a real iPhone. Change it to your Mac's LAN IP.

---

## Deployment checklist

Before going to production:

- [ ] Replace `JWT_SECRET` with a long cryptographically random string
- [ ] Set `CLIENT_URL` to your production frontend domain
- [ ] Switch Razorpay from test keys to live keys
- [ ] Set up a real MongoDB instance (MongoDB Atlas recommended)
- [ ] Configure a real SMTP provider for order emails
- [ ] Set up Cloudinary for image/video uploads
- [ ] Register the Razorpay webhook URL pointing to your server's `/webhooks/razorpay`
- [ ] Register the Shiprocket webhook URL pointing to your server's `/webhooks/shiprocket`
- [ ] Set `SHIPROCKET_WEBHOOK_SECRET` to the exact shared secret configured in Shiprocket
- [ ] Change `Constants.swift` `#else` branch to your production API URL (`https://api.notwhat.in/api`)
- [ ] Replace all placeholder legal content (Privacy Policy, Terms, etc.)
- [ ] Add a Privacy Policy URL to the App Store listing (required by Apple)
- [ ] Set `NODE_ENV=production` on the server
- [ ] Use a process manager (PM2 or similar) to keep the Node process alive
- [ ] Test the full buyer flow end-to-end: signup → browse → cart → checkout → order confirmation
- [ ] Test the full seller flow end-to-end: signup → add product → upload reel → view analytics
