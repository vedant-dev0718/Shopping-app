# KMP Deletion Matrix

This matrix maps each native Swift file to its planned shared destination before deletion.

Legend:

- `Retire` means delete after the shared replacement is live on both iOS and Android.
- `Bridge` means keep only as a thin iOS adapter if a platform boundary still exists.

| Native file | Future shared destination | End state |
| --- | --- | --- |
| `ios/NotWhat/App/AppRouter.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/app/navigation/AppNavHost.kt` | Retire |
| `ios/NotWhat/App/AppSession.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/session/AppSessionState.kt` | Retire |
| `ios/NotWhat/App/NotWhatApp.swift` | `shared/src/iosMain/kotlin/in/notwhat/shared/ui/MainViewController.kt` plus minimal iOS bootstrap | Bridge |
| `ios/NotWhat/Components/AddressSearch.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/address/AddressSearchField.kt` | Retire |
| `ios/NotWhat/Components/AppDesignComponents.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/SystemComponents.kt` | Retire |
| `ios/NotWhat/Components/BuyerShoppingComponents.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/buyer/BuyerShoppingComponents.kt` | Retire |
| `ios/NotWhat/Components/CategoryPickerField.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/catalog/CategoryPickerField.kt` | Retire |
| `ios/NotWhat/Components/ContentComponents.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/content/ContentComponents.kt` | Retire |
| `ios/NotWhat/Components/EmptyStateView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/feedback/EmptyState.kt` | Retire |
| `ios/NotWhat/Components/ErrorView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/feedback/ErrorState.kt` | Retire |
| `ios/NotWhat/Components/FormTextField.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/form/FormTextField.kt` | Retire |
| `ios/NotWhat/Components/GoogleAuthButton.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/auth/GoogleAuthButton.kt` | Retire |
| `ios/NotWhat/Components/InlineErrorMessage.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/feedback/InlineErrorMessage.kt` | Retire |
| `ios/NotWhat/Components/LoadingView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/feedback/LoadingState.kt` | Retire |
| `ios/NotWhat/Components/MetricCard.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/metrics/MetricCard.kt` | Retire |
| `ios/NotWhat/Components/PincodeDrivenAddressFields.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/address/PincodeAddressFields.kt` | Retire |
| `ios/NotWhat/Components/PriceLabel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/commerce/PriceLabel.kt` | Retire |
| `ios/NotWhat/Components/PrimaryButton.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/button/PrimaryButton.kt` | Retire |
| `ios/NotWhat/Components/RazorpayWebView.swift` | `shared/src/iosMain/kotlin/in/notwhat/shared/platform/payments/RazorpayWebViewBridge.kt` | Bridge |
| `ios/NotWhat/Components/SearchBar.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/search/SearchBar.kt` | Retire |
| `ios/NotWhat/Components/SellerOrderComponents.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/seller/SellerOrderComponents.kt` | Retire |
| `ios/NotWhat/Components/SpecialtyRegionPicker.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/catalog/SpecialtyRegionPicker.kt` | Retire |
| `ios/NotWhat/Components/VerifiedBadge.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/components/commerce/VerifiedBadge.kt` | Retire |
| `ios/NotWhat/Models/APIResponse.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/APIResponse.kt` | Retire |
| `ios/NotWhat/Models/AnalyticsModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/analytics/AnalyticsModels.kt` | Retire |
| `ios/NotWhat/Models/AuthResponse.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/auth/AuthModels.kt` | Retire |
| `ios/NotWhat/Models/BargainModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/bargain/BargainModels.kt` | Retire |
| `ios/NotWhat/Models/BuyerProfile.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/profile/BuyerProfile.kt` | Retire |
| `ios/NotWhat/Models/CartModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/cart/CartModels.kt` | Retire |
| `ios/NotWhat/Models/CategoryData.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/catalog/CategoryData.kt` | Retire |
| `ios/NotWhat/Models/ContentModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/content/ContentModels.kt` | Retire |
| `ios/NotWhat/Models/ReelModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/reels/ReelModels.kt` | Retire |
| `ios/NotWhat/Models/SearchModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/search/SearchModels.kt` | Retire |
| `ios/NotWhat/Models/SellerModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/seller/SellerModels.kt` | Retire |
| `ios/NotWhat/Models/SellerOrderModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/orders/SellerOrderModels.kt` | Retire |
| `ios/NotWhat/Models/SellerProfile.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/profile/SellerProfile.kt` | Retire |
| `ios/NotWhat/Models/ShoppingModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/shopping/ShoppingModels.kt` | Retire |
| `ios/NotWhat/Models/Store.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/store/Store.kt` | Retire |
| `ios/NotWhat/Models/User.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/model/user/UserModels.kt` | Retire |
| `ios/NotWhat/RazorpayWebView.swift` | `shared/src/iosMain/kotlin/in/notwhat/shared/platform/payments/RazorpayWebViewBridge.kt` | Bridge |
| `ios/NotWhat/Services/APIClient.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/network/NotWhatApiClient.kt` | Retire |
| `ios/NotWhat/Services/APIError.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/network/APIError.kt` | Retire |
| `ios/NotWhat/Services/AnalyticsService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/analytics/AnalyticsRepository.kt` | Retire |
| `ios/NotWhat/Services/AuthService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/auth/AuthRepository.kt` | Retire |
| `ios/NotWhat/Services/BargainService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/bargain/BargainRepository.kt` | Retire |
| `ios/NotWhat/Services/CartService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/cart/CartRepository.kt` | Retire |
| `ios/NotWhat/Services/CheckoutService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/checkout/CheckoutRepository.kt` | Retire |
| `ios/NotWhat/Services/ContentService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/content/ContentRepository.kt` | Retire |
| `ios/NotWhat/Services/GoogleSignInManager.swift` | `shared/src/iosMain/kotlin/in/notwhat/shared/platform/auth/GoogleSignInBridge.kt` | Bridge |
| `ios/NotWhat/Services/OrderService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/orders/OrderRepository.kt` | Retire |
| `ios/NotWhat/Services/PincodeService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/address/PincodeRepository.kt` | Retire |
| `ios/NotWhat/Services/ReelService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/reels/ReelRepository.kt` | Retire |
| `ios/NotWhat/Services/SearchService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/search/SearchRepository.kt` | Retire |
| `ios/NotWhat/Services/SellerOrderService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/orders/SellerOrderRepository.kt` | Retire |
| `ios/NotWhat/Services/SellerService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/seller/SellerRepository.kt` | Retire |
| `ios/NotWhat/Services/ShoppingServices.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/shopping/ShoppingRepository.kt` | Retire |
| `ios/NotWhat/Services/UploadService.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/data/repository/upload/UploadRepository.kt` | Retire |
| `ios/NotWhat/Utilities/AppAnimations.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppAnimations.kt` | Retire |
| `ios/NotWhat/Utilities/AppColors.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppColors.kt` | Retire |
| `ios/NotWhat/Utilities/AppRadius.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppRadius.kt` | Retire |
| `ios/NotWhat/Utilities/AppShadows.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppShadows.kt` | Retire |
| `ios/NotWhat/Utilities/AppSpacing.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppSpacing.kt` | Retire |
| `ios/NotWhat/Utilities/AppTheme.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppTheme.kt` | Retire |
| `ios/NotWhat/Utilities/AppTypography.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/AppTypography.kt` | Retire |
| `ios/NotWhat/Utilities/Constants.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/config/Constants.kt` | Retire |
| `ios/NotWhat/Utilities/KeychainHelper.swift` | `shared/src/iosMain/kotlin/in/notwhat/shared/platform/storage/KeychainBridge.kt` | Bridge |
| `ios/NotWhat/Utilities/NotWhatTheme.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/design/NotWhatTheme.kt` | Retire |
| `ios/NotWhat/Utilities/String+Trimmed.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/util/StringExtensions.kt` | Retire |
| `ios/NotWhat/ViewModels/AuthViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/auth/AuthState.kt` | Retire |
| `ios/NotWhat/ViewModels/BargainViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/bargain/BargainState.kt` | Retire |
| `ios/NotWhat/ViewModels/BuyerDiscoveryViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/buyer/discovery/BuyerDiscoveryState.kt` | Retire |
| `ios/NotWhat/ViewModels/BuyerSignupViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/auth/BuyerSignupState.kt` | Retire |
| `ios/NotWhat/ViewModels/CartCheckoutViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/checkout/CheckoutState.kt` | Retire |
| `ios/NotWhat/ViewModels/ContentViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/content/ContentState.kt` | Retire |
| `ios/NotWhat/ViewModels/ForgotPasswordViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/auth/ForgotPasswordState.kt` | Retire |
| `ios/NotWhat/ViewModels/ReelsViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/reels/ReelsState.kt` | Retire |
| `ios/NotWhat/ViewModels/SearchViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/search/SearchState.kt` | Retire |
| `ios/NotWhat/ViewModels/SellerAnalyticsViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/seller/analytics/SellerAnalyticsState.kt` | Retire |
| `ios/NotWhat/ViewModels/SellerDashboardViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/seller/dashboard/SellerDashboardState.kt` | Retire |
| `ios/NotWhat/ViewModels/SellerManagementViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/seller/management/SellerManagementState.kt` | Retire |
| `ios/NotWhat/ViewModels/SellerOrderViewModels.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/seller/orders/SellerOrderState.kt` | Retire |
| `ios/NotWhat/ViewModels/SellerSignupViewModel.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/feature/auth/SellerSignupState.kt` | Retire |
| `ios/NotWhat/Views/BargainScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/bargain/BargainScreens.kt` | Retire |
| `ios/NotWhat/Views/Buyer/Profile/BuyerProfileScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/buyer/profile/BuyerProfileScreen.kt` | Retire |
| `ios/NotWhat/Views/BuyerShoppingScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/buyer/shopping/BuyerShoppingScreens.kt` | Retire |
| `ios/NotWhat/Views/BuyerSignupScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/BuyerSignupScreen.kt` | Retire |
| `ios/NotWhat/Views/BuyerTabView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/navigation/BuyerTabScaffold.kt` | Retire |
| `ios/NotWhat/Views/CartCheckoutScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/checkout/CartCheckoutScreens.kt` | Retire |
| `ios/NotWhat/Views/ChangePasswordScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/ChangePasswordScreen.kt` | Retire |
| `ios/NotWhat/Views/ContentScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/content/ContentScreens.kt` | Retire |
| `ios/NotWhat/Views/ForgotPasswordScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/ForgotPasswordScreen.kt` | Retire |
| `ios/NotWhat/Views/LoginScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/LoginScreen.kt` | Retire |
| `ios/NotWhat/Views/ReelsScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/reels/ReelsScreens.kt` | Retire |
| `ios/NotWhat/Views/RoleSelectionScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/RoleSelectionScreen.kt` | Retire |
| `ios/NotWhat/Views/SearchScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/search/SearchScreens.kt` | Retire |
| `ios/NotWhat/Views/SellerAnalyticsScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/seller/analytics/SellerAnalyticsScreen.kt` | Retire |
| `ios/NotWhat/Views/SellerDashboardScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/seller/dashboard/SellerDashboardScreens.kt` | Retire |
| `ios/NotWhat/Views/SellerManagementScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/seller/management/SellerManagementScreens.kt` | Retire |
| `ios/NotWhat/Views/SellerOrderScreens.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/seller/orders/SellerOrderScreens.kt` | Retire |
| `ios/NotWhat/Views/SellerSignupScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/SellerSignupScreen.kt` | Retire |
| `ios/NotWhat/Views/SellerStoreSetupScreen.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/seller/setup/SellerStoreSetupScreen.kt` | Retire |
| `ios/NotWhat/Views/SellerTabView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/navigation/SellerTabScaffold.kt` | Retire |
| `ios/NotWhat/Views/SignupEmailVerificationView.swift` | `shared/src/commonMain/kotlin/in/notwhat/shared/ui/screen/auth/SignupEmailVerificationScreen.kt` | Retire |

## Phase 1 Deletion Candidate Set

The first slice to target after shared auth/session is live:

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

Retain only as bridges if still required:

- `ios/NotWhat/Services/GoogleSignInManager.swift`
- `ios/NotWhat/Utilities/KeychainHelper.swift`
- `ios/NotWhat/App/NotWhatApp.swift`