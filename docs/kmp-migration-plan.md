# NotWhat KMP Full Migration Plan

This document replaces the earlier Phase 0 plan.

The new target is no longer incremental Swift plus shared logic. The target is a Kotlin Multiplatform client where product logic, state, networking, and feature UI live in `shared/src/commonMain`, Android stays Compose-based, and iOS stops shipping feature-level SwiftUI code.

## Migration Goal

- Move all feature logic and feature UI from `ios/NotWhat` into KMP shared code.
- Make `shared/src/commonMain` the source of truth for app state, navigation, networking, models, and presentation.
- Remove the native SwiftUI feature layer after the shared app is production-ready on iOS.
- Keep only the thinnest possible iOS host layer required for packaging, entitlements, and platform SDK interop.

## Important constraint

Deleting all Swift files is not the same as completing a KMP migration.

With the current repo shape, iOS still needs a host application target for:

- app packaging and signing,
- `Info.plist` and entitlements,
- URL handling,
- platform SDK entry points,
- any unavoidable iOS-only integrations.

So the real cutover target is:

- delete all native feature code under `ios/NotWhat` that duplicates app logic or screens,
- keep only a minimal iOS bootstrap shell unless the repo is restructured into a Kotlin-first iOS app packaging setup.

## Current state

- `shared/` already builds for Android and iOS and exposes `SharedKit`.
- `shared/src/commonMain` already contains a Compose shell, theme, tab state, and a mocked flow.
- `shared/src/iosMain/kotlin/in/notwhat/shared/ui/MainViewController.kt` already exposes an iOS Compose host.
- The production iOS app does not use that shared host yet.
- The iOS app still depends on 103 Swift files under `ios/NotWhat`.
- The current iOS entry point is still native SwiftUI in `ios/NotWhat/App/NotWhatApp.swift`.

## Decision summary

To fully shift to KMP, the repo should move from this:

- SwiftUI app shell and feature UI in `ios/NotWhat`
- KMP shared demo flow in `shared/`

to this:

- shared Compose app in `shared/src/commonMain`
- shared state, repositories, API contracts, and feature flows in `shared/src/commonMain`
- platform-specific adapters only in `shared/src/androidMain` and `shared/src/iosMain`
- a minimal iOS host that mounts `MainViewController()` and forwards platform callbacks

## End-state architecture

### Shared in `commonMain`

- Design tokens and theme
- Navigation graph
- Authentication and session state
- API client abstractions and repositories
- DTOs and domain models
- Buyer flows
- Seller flows
- Admin flows
- Shared view models or state holders
- Shared UI components
- Form validation and error mapping

### Shared in `androidMain`

- Android activity entry point
- Android-specific permissions and intents
- Android SDK integrations if needed

### Shared in `iosMain`

- `MainViewController()`
- iOS-specific wrappers for platform SDKs where Kotlin cannot own the lifecycle directly
- expect/actual implementations for secure storage, URL callbacks, and media/platform helpers

### Minimal native iOS host

- app target
- signing
- `Info.plist`
- entitlements
- URL forwarding
- optional tiny bootstrap file if still required by Xcode packaging

## Migration workstreams

The migration should run in six coordinated workstreams.

### Workstream 1: Shared app foundation

Objective: make the shared app capable of replacing the current native shell.

Deliverables:

- shared navigation system in `commonMain`
- app-wide session container in `commonMain`
- screen-level state ownership in shared code
- repository interfaces and concrete implementations in shared code
- environment/config handling in shared code
- testable dependency graph

Tasks:

1. Replace ad hoc `NotWhatAppState` with a real app state container.
2. Add navigation primitives for auth, buyer, seller, and admin flows.
3. Introduce a shared session manager to replace `AppSession.swift`.
4. Decide the shared state pattern for all screens and keep it consistent.
5. Add common test coverage for app state transitions.

### Workstream 2: Shared data layer

Objective: remove Swift networking, DTO, and service ownership.

Deliverables:

- shared HTTP client layer
- shared repository layer
- shared serialization models
- shared backend mode and mock mode support
- shared error and retry handling

Tasks:

1. Replace `ios/NotWhat/Services/APIClient.swift` with a KMP client.
2. Move auth, search, shopping, cart, checkout, bargain, seller, admin, analytics, content, and upload contracts into shared repositories.
3. Move all request and response models from `ios/NotWhat/Models` into shared Kotlin models.
4. Centralize mock responses in shared code so Android and iOS use identical mock data.
5. Add integration-style shared tests for repository decoding and session behavior.

### Workstream 3: Shared presentation layer

Objective: remove Swift view models and screen orchestration.

Deliverables:

- shared screen state classes
- shared intent handlers
- shared validation and formatting helpers
- shared loading, error, and success surfaces

Tasks:

1. Migrate all `ios/NotWhat/ViewModels/*.swift` into feature-level shared state holders.
2. Move formatter and validation utilities from Swift helpers into shared Kotlin utilities.
3. Unify role-based flow handling in shared code.
4. Add common tests for auth, search, cart, checkout, bargains, and seller/admin state transitions.

### Workstream 4: Shared Compose UI

Objective: replace every SwiftUI screen with Compose Multiplatform UI in `commonMain`.

Deliverables:

- shared auth screens
- shared buyer tab flows
- shared seller tab flows
- shared admin flows
- shared design system and reusable components

Tasks:

1. Port all shared design tokens from `ios/NotWhat/Utilities` into a formal Compose design system.
2. Port all reusable components from `ios/NotWhat/Components` into Compose components.
3. Port all screens from `ios/NotWhat/Views` into feature-specific Compose packages.
4. Match routing and behavior, not just visual structure.
5. Run side-by-side QA against the current SwiftUI behavior until parity is complete.

### Workstream 5: iOS host cutover

Objective: stop shipping SwiftUI features and mount the shared Compose app on iOS.

Deliverables:

- iOS app entry point wired to `MainViewController()`
- platform callback bridge for URL/open auth flows
- secure storage abstraction owned by KMP
- native iOS feature files removed from the Xcode target

Tasks:

1. Replace `NotWhatApp.swift` and `AppRouter.swift` usage with the shared iOS host.
2. Introduce expect/actual bridges for Google Sign-In, keychain access, and any remaining iOS-only SDK hooks.
3. Verify auth callback handling from the minimal iOS host into shared state.
4. Remove feature-level Swift files from Xcode once parity is confirmed.
5. Keep only bootstrap-level iOS files that are still technically required.

### Workstream 6: deletion and cleanup

Objective: remove dead native code safely after the KMP path is proven.

Deliverables:

- Xcode target cleaned of obsolete sources
- docs updated to describe KMP-first client architecture
- build scripts simplified
- regression suite updated to the new structure

Tasks:

1. Delete replaced Swift feature files in controlled batches.
2. Remove Swift-only services, models, and view models after the shared equivalents ship.
3. Remove SwiftUI-only dependencies once no longer used.
4. Update README and developer setup to reflect KMP-first client development.
5. Lock the repo against adding new feature logic in Swift.

## Swift-to-KMP migration map

The current 103 Swift files should be migrated in this order.

### Group A: App shell and session

Current files:

- `ios/NotWhat/App/AppRouter.swift`
- `ios/NotWhat/App/AppSession.swift`
- `ios/NotWhat/App/NotWhatApp.swift`

Target:

- shared app root
- shared session manager
- minimal iOS bootstrap only

Deletion condition:

- all navigation and auth state owned in shared code
- iOS launches shared app directly

### Group B: Models

Current files:

- all files in `ios/NotWhat/Models/`

Target:

- `shared/src/commonMain/kotlin/.../models`

Deletion condition:

- no Swift service or SwiftUI screen depends on Swift DTOs

### Group C: Services

Current files:

- all files in `ios/NotWhat/Services/`

Target:

- shared repositories and data sources
- expect/actual platform adapters only where unavoidable

Deletion condition:

- all network calls originate from shared code
- mock and live modes are shared

### Group D: View models

Current files:

- all files in `ios/NotWhat/ViewModels/`

Target:

- shared state holders in `commonMain`

Deletion condition:

- no screen state is owned by Swift

### Group E: UI components

Current files:

- all files in `ios/NotWhat/Components/`

Target:

- shared Compose components and design primitives

Deletion condition:

- no feature screen imports Swift components

### Group F: Screens

Current files:

- all files in `ios/NotWhat/Views/`

Target:

- shared Compose screens grouped by feature

Deletion condition:

- all iOS runtime paths render through the shared app only

### Group G: Utilities and platform helpers

Current files:

- `ios/NotWhat/Utilities/*`
- `ios/NotWhat/RazorpayWebView.swift`
- `ios/NotWhat/Components/RazorpayWebView.swift`

Target:

- shared theme tokens and formatters in `commonMain`
- expect/actual secure storage and platform helpers
- evaluate payments and webview flow for platform adapter boundaries

Deletion condition:

- utility logic moved to Kotlin
- any remaining iOS helper is reduced to bridge-only code

## Recommended phase plan

### Phase 1: Foundation and parity scaffolding

Exit criteria:

- shared navigation exists
- shared session exists
- shared repository interfaces exist
- iOS can render the shared root in a dev-only host path

### Phase 2: Auth and app shell

Scope:

- login
- signup
- forgot password
- role selection
- session persistence
- backend mode switching

Exit criteria:

- auth flow works on Android and iOS from shared code
- `AppSession.swift`, `AuthViewModel.swift`, `LoginScreen.swift`, and related auth Swift files are removable

### Phase 3: Buyer discovery and search

Scope:

- home feed
- search
- product detail
- store profile
- reels browsing
- saved items

Exit criteria:

- buyer browsing path is fully shared
- search and discovery Swift files are removable

### Phase 4: Cart, checkout, and orders

Scope:

- cart
- addresses
- serviceability
- checkout
- payment handoff
- order list and detail
- returns and refunds

Exit criteria:

- shared checkout path verified on both platforms
- Swift shopping and order files are removable

### Phase 5: Seller flows

Scope:

- seller dashboard
- products
- reels upload and management
- store setup and editing
- order management
- shipping label flow
- earnings and analytics

Exit criteria:

- seller path is fully shared
- seller-specific Swift files are removable

### Phase 6: Admin flows

Scope:

- dashboard
- search
- moderation
- management sections
- settings and content pages

Exit criteria:

- admin path is fully shared
- admin Swift screens and services are removable

### Phase 7: iOS cutover and deletion

Scope:

- switch iOS launch path to shared Compose host
- remove SwiftUI feature code from the target
- clean project references
- update docs and CI

Exit criteria:

- iOS runtime no longer depends on feature-level Swift code
- Android and iOS use the same shared feature code
- obsolete Swift files are deleted

## Deletion policy

Do not delete native iOS files by folder alone.

Delete only after each migrated slice passes all three checks:

1. The feature works from shared code on Android.
2. The same feature works from shared code on iOS.
3. The Xcode target no longer references the replaced Swift files.

Recommended deletion order:

1. auth Swift files
2. search and discovery Swift files
3. buyer shopping Swift files
4. seller Swift files
5. admin Swift files
6. obsolete utilities and components
7. app shell Swift files, last

## Testing and validation plan

Each phase should include all of the following:

- `./gradlew test` in `shared/`
- `./gradlew assembleDebug` in `shared/`
- iOS shared-host build from Xcode or `xcodebuild`
- Android emulator smoke flow
- iOS simulator smoke flow
- focused regression checks for the migrated slice

Before deleting any Swift batch:

- run platform builds,
- confirm runtime launch on both platforms,
- remove Xcode references cleanly,
- verify no imports or symbols remain.

## Risks to manage explicitly

### Platform SDK boundaries

Google Sign-In, keychain access, payment/webview flows, media pickers, file uploads, and deep links may still need thin `iosMain` or native bridge code.

### Behavioral drift

The current SwiftUI app has substantial feature coverage. The shared Compose app must not stop at visual parity; it must match request timing, validation, role gating, loading states, and edge-case behavior.

### Repo structure debt

The Xcode project still references a large Swift source graph. Removing those references safely is part of the migration, not an afterthought.

## Definition of done

The migration is complete when all of the following are true:

- feature behavior is implemented in `shared/src/commonMain`
- Android and iOS both run the shared client for all major flows
- iOS no longer ships SwiftUI feature screens, Swift view models, or Swift services
- the Xcode target contains only the minimal bootstrap files still required for platform packaging and SDK bridging
- all obsolete Swift feature files are deleted from the repo
- docs and build instructions describe the client as KMP-first, not SwiftUI-first

## Immediate next execution plan

If execution starts now, the first three implementation steps should be:

1. Wire the iOS app to a shared-root host path behind a development flag so the shared app can be exercised in Xcode immediately.
2. Migrate auth and session from `ios/NotWhat/App` plus `ios/NotWhat/ViewModels/AuthViewModel.swift` and related auth screens into shared code.
3. Replace Swift DTO and service ownership with shared Kotlin contracts so future screen ports do not keep depending on Swift networking.
