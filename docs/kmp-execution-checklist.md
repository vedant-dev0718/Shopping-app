# KMP Execution Checklist

This checklist turns the migration strategy into an execution order.

## Phase 1: Shared Host Enablement

Goal: let iOS launch the shared Compose root behind a flag while preserving the native fallback.

- Build and stabilize `SharedKit` output from `shared/`.
- Link the iOS target to `SharedKit.framework` for simulator and device builds.
- Add a Swift host wrapper that mounts `MainViewController()`.
- Add a launch flag such as `NOTWHAT_USE_SHARED_APP=1`.
- Keep native SwiftUI as fallback until parity is proven.
- Validate: `xcodebuild` iOS build, simulator launch, Android build, Android launch.

Owner map:

- Shared host and framework wiring: `shared/src/iosMain`, `ios/NotWhat.xcodeproj`, `ios/NotWhat/App`
- Validation: `shared/build.gradle.kts`, Xcode target build

## Phase 2: Auth And Session Migration

Goal: remove native ownership of login, signup, password reset, session, and backend mode.

- Move session model from `ios/NotWhat/App/AppSession.swift` into shared state.
- Move backend mode state from Swift mirror to shared config.
- Create shared auth repositories and auth state holders.
- Port login, signup, verification, forgot password, and role selection flows to Compose.
- Bridge Google Sign-In and keychain with thin platform adapters only.
- Remove Swift auth view models once both platforms run the shared auth flow.

Primary native files to eliminate:

- `ios/NotWhat/App/AppSession.swift`
- `ios/NotWhat/ViewModels/AuthViewModel.swift`
- `ios/NotWhat/ViewModels/ForgotPasswordViewModel.swift`
- `ios/NotWhat/ViewModels/BuyerSignupViewModel.swift`
- `ios/NotWhat/ViewModels/SellerSignupViewModel.swift`
- `ios/NotWhat/Views/LoginScreen.swift`
- `ios/NotWhat/Views/BuyerSignupScreen.swift`
- `ios/NotWhat/Views/SellerSignupScreen.swift`
- `ios/NotWhat/Views/ForgotPasswordScreen.swift`
- `ios/NotWhat/Views/ChangePasswordScreen.swift`
- `ios/NotWhat/Views/SignupEmailVerificationView.swift`
- `ios/NotWhat/Views/RoleSelectionScreen.swift`
- `ios/NotWhat/Services/AuthService.swift`
- `ios/NotWhat/Services/GoogleSignInManager.swift`
- `ios/NotWhat/Utilities/KeychainHelper.swift`

Validation gates:

- Shared auth state tests in `shared`
- iOS simulator auth smoke flow through shared host
- Android auth smoke flow through shared host

## Phase 3: Shared Data And Models

Goal: stop owning API contracts and repositories in Swift.

- Move DTOs from `ios/NotWhat/Models` into shared Kotlin models.
- Move API error handling into shared Kotlin abstractions.
- Replace `APIClient.swift` and per-feature Swift services with shared repositories.
- Keep only expect/actual bridges where platform APIs are unavoidable.

Files primarily affected:

- `ios/NotWhat/Models/*.swift`
- `ios/NotWhat/Services/APIClient.swift`
- `ios/NotWhat/Services/APIError.swift`
- remaining files in `ios/NotWhat/Services/`

Validation gates:

- shared decoding tests
- shared repository tests
- end-to-end smoke on iOS and Android in mock mode, then live mode

## Phase 4: Buyer Discovery And Search

Goal: migrate buyer browsing flows to shared Compose.

- Port home, search, product detail, store profile, reels, saved items, and buyer profile.
- Migrate native buyer discovery view models into shared state holders.
- Move search logic fully into shared state.
- Port shared components needed by buyer flows.

Primary native files to eliminate:

- `ios/NotWhat/ViewModels/BuyerDiscoveryViewModels.swift`
- `ios/NotWhat/ViewModels/SearchViewModel.swift`
- `ios/NotWhat/ViewModels/ReelsViewModels.swift`
- `ios/NotWhat/Views/BuyerShoppingScreens.swift`
- `ios/NotWhat/Views/SearchScreens.swift`
- `ios/NotWhat/Views/ReelsScreens.swift`
- `ios/NotWhat/Views/Buyer/Profile/BuyerProfileScreen.swift`
- buyer-facing components under `ios/NotWhat/Components`

## Phase 5: Cart, Checkout, Orders, Returns

Goal: migrate transaction flows to shared code.

- Port cart, address selection, serviceability, checkout, order history, order detail, returns, and refunds.
- Define payment boundary between shared flow and platform WebView/payment adapter.
- Move address and pincode helpers to shared state where possible.

Primary native files to eliminate:

- `ios/NotWhat/ViewModels/CartCheckoutViewModels.swift`
- `ios/NotWhat/Views/CartCheckoutScreens.swift`
- `ios/NotWhat/Services/CartService.swift`
- `ios/NotWhat/Services/CheckoutService.swift`
- `ios/NotWhat/Services/OrderService.swift`
- payment helper wrappers after shared flow owns orchestration

## Phase 6: Seller Surface Migration

Goal: migrate seller management, store setup, orders, uploads, dashboard, and analytics.

- Port seller dashboard and store setup.
- Port seller product/reel/store management.
- Port seller order flows and shipping label steps.
- Port seller analytics and earnings views.

Primary native files to eliminate:

- `ios/NotWhat/ViewModels/SellerDashboardViewModel.swift`
- `ios/NotWhat/ViewModels/SellerManagementViewModels.swift`
- `ios/NotWhat/ViewModels/SellerOrderViewModels.swift`
- `ios/NotWhat/ViewModels/SellerAnalyticsViewModel.swift`
- `ios/NotWhat/Views/SellerDashboardScreens.swift`
- `ios/NotWhat/Views/SellerManagementScreens.swift`
- `ios/NotWhat/Views/SellerOrderScreens.swift`
- `ios/NotWhat/Views/SellerAnalyticsScreen.swift`
- `ios/NotWhat/Views/SellerStoreSetupScreen.swift`

## Phase 7: Bargains, Content, Admin

Goal: migrate the remaining role-specific and operational flows.

- Port bargain flows.
- Port static/content/help/settings flows.
- Port admin dashboard, search, management, moderation, and content.

Primary native files to eliminate:

- `ios/NotWhat/ViewModels/BargainViewModels.swift`
- `ios/NotWhat/ViewModels/ContentViewModels.swift`
- `ios/NotWhat/Views/BargainScreens.swift`
- `ios/NotWhat/Views/ContentScreens.swift`
- admin screens nested in `AppRouter.swift` and supporting services

## Phase 8: Native iOS Feature Deletion

Goal: remove obsolete native feature code once the shared path fully owns runtime behavior.

- Remove all feature-level Swift files from Xcode target membership.
- Delete native service, view model, view, and component files batch by batch.
- Reduce `ios/NotWhat/App/NotWhatApp.swift` to minimal bootstrap or replace it with the smallest host possible.
- Keep only packaging, callback, and bridge code that still must exist for iOS.
- Update docs so client development is KMP-first.

## Batch Deletion Order

1. Auth and session files
2. Shared models and service contracts
3. Buyer discovery and search files
4. Cart, checkout, and order files
5. Seller files
6. Bargain, content, and admin files
7. Shared UI components no longer used
8. App shell files last

## Validation Checklist For Every Batch

- `cd shared && ./gradlew test`
- `cd shared && ./gradlew assembleDebug`
- iOS `xcodebuild` simulator build
- Android install and launch
- iOS install and launch
- smoke test the migrated slice in mock mode
- smoke test the migrated slice in live mode when supported