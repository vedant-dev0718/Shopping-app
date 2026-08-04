package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.address.AddressDto
import com.notwhat.shared.auth.AuthState
import com.notwhat.shared.checkout.CheckoutPaymentMethod
import com.notwhat.shared.checkout.CheckoutPlaceCodRequestDto
import com.notwhat.shared.checkout.CheckoutShippingInfoDto
import com.notwhat.shared.checkout.CheckoutStartResponseDto
import com.notwhat.shared.checkout.CheckoutVerifyRequestDto
import com.notwhat.shared.checkout.CheckoutVerifyResponseDto
import com.notwhat.shared.checkout.normalizedPaymentMethods
import com.notwhat.shared.checkout.toRawValue
import com.notwhat.shared.checkout.trackingOrderStatus
import com.notwhat.shared.checkout.trackingPaymentStatus
import com.notwhat.shared.core.AppError
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.order.ReturnRequestDto
import com.notwhat.shared.returns.ReturnReason
import com.notwhat.shared.returns.ReturnRequestResponseDto
import com.notwhat.shared.returns.ReturnsAnalyticsContext
import com.notwhat.shared.returns.ReturnsAnalyticsSink
import com.notwhat.shared.returns.ReturnsAnalyticsTracker
import com.notwhat.shared.search.RecentSearchesUseCase
import com.notwhat.shared.search.SearchFilterKind
import com.notwhat.shared.search.SearchFilters
import com.notwhat.shared.search.SearchResults
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class NotWhatAppState(
    private val serviceLocator: ServiceLocator = ServiceLocator(),
) {
    private var lockedRole: UserRole? = null

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val searchUseCase = serviceLocator.searchUseCase
    internal val bargainUseCase = serviceLocator.bargainUseCase

    var entryStage by mutableStateOf(AppEntryStage.Splash)
        private set

    var activeTab by mutableStateOf(NotWhatTab.Home)
        private set

    val authState =
        AuthState(
            useCase = serviceLocator.authUseCase,
            persistence = serviceLocator.authPersistence,
            config = serviceLocator.config,
        )

    internal val content =
        BuyerContentState(
            catalogUseCase = serviceLocator.catalogUseCase,
            discoveryRepository = serviceLocator.discoveryRepository,
        )

    internal val transaction =
        BuyerTransactionState(
            cartUseCase = serviceLocator.cartUseCase,
            orderUseCase = serviceLocator.orderUseCase,
            addressRepository = serviceLocator.addressRepository,
        )

    internal val sellerContent =
        SellerContentState(
            sellerUseCase = serviceLocator.sellerUseCase,
            uploadRepository = serviceLocator.uploadRepository,
        )

    val selectedRole: UserRole
        get() = authState.selectedMockRole

    val currentSession: UserSession?
        get() = authState.currentSession

    var query by mutableStateOf("")
        private set

    var filters by mutableStateOf(SearchFilters())
        private set

    var recentSearches by mutableStateOf(listOf<String>())
        private set

    var searchResults by mutableStateOf<SearchResults?>(null)
        private set
    var isSearching by mutableStateOf(false)
        private set

    var selectedCategory by mutableStateOf<String?>(null)
        private set

    var isCheckoutSubmitting by mutableStateOf(false)
        private set
    var checkoutSubmitErrorMessage by mutableStateOf<String?>(null)
        private set

    var buyerReturns by mutableStateOf<List<ReturnRequestResponseDto>>(emptyList())
        private set
    var isBuyerReturnsLoading by mutableStateOf(false)
        private set
    var buyerReturnsErrorMessage by mutableStateOf<String?>(null)
        private set

    private val recentSearchesUseCase = RecentSearchesUseCase()
    private val analyticsSessionId = "returns-${kotlin.random.Random.nextInt(100000, 999999)}"
    internal val returnsAnalyticsTracker =
        ReturnsAnalyticsTracker(
            sink =
                ReturnsAnalyticsSink { event ->
                    scope.launch {
                        serviceLocator.returnsAnalyticsTransport.send(event, authState.currentSession?.authToken)
                    }
                },
        )

    val isAuthenticated: Boolean
        get() = authState.isAuthenticated

    val isRoleLocked: Boolean
        get() = lockedRole != null

    val uiRole: UserRole
        get() = lockedRole ?: currentSession?.role ?: authState.selectedMockRole

    fun completeSplash() {
        if (entryStage == AppEntryStage.Splash) {
            entryStage = AppEntryStage.Auth
        }
    }

    fun continueFromRoleSelection() {
        entryStage = AppEntryStage.Auth
    }

    fun configureRoleApp(role: UserRole) {
        lockedRole = role
        authState.selectedMockRole = role
        authState.loginAsAdmin = role == UserRole.Admin
        if (!isAuthenticated) {
            entryStage = AppEntryStage.Auth
        }
    }

    fun selectTab(tab: NotWhatTab) {
        activeTab = tab
    }

    fun selectRole(role: UserRole) {
        authState.selectedMockRole = role
    }

    fun continueWithSelectedRole() {
        authState.selectedMockRole = selectedRole
        entryStage = AppEntryStage.Auth
    }

    fun routeAuthenticatedUser(role: UserRole) {
        activeTab =
            when (role) {
                UserRole.Buyer -> NotWhatTab.Home
                UserRole.Seller -> NotWhatTab.Bargains
                UserRole.Admin -> NotWhatTab.Account
            }
    }

    fun signOut() {
        authState.signOut()
        authState.selectedMockRole = lockedRole ?: UserRole.Buyer
        authState.loginAsAdmin = lockedRole == UserRole.Admin
        entryStage = AppEntryStage.Auth
        activeTab = NotWhatTab.Home
        query = ""
        filters = SearchFilters()
        selectedCategory = null
        searchResults = null
        recentSearches = recentSearchesUseCase.clear()
    }

    fun updateQuery(value: String) {
        query = value
    }

    fun updateFilters(newFilters: SearchFilters) {
        filters = newFilters
    }

    fun selectCategory(category: String?) {
        selectedCategory = category
        filters = filters.copy(category = category)
    }

    fun clearFilters() {
        filters = SearchFilters()
        selectedCategory = null
    }

    fun submitSearch() {
        val term = query.trim()
        if (term.isNotEmpty()) {
            recentSearches = recentSearchesUseCase.remember(recentSearches, term)
            isSearching = true
            scope.launch {
                searchResults = searchUseCase.search(term, selectedCategory)
                isSearching = false
            }
        } else {
            searchResults = null
        }
    }

    fun removeFilter(kind: SearchFilterKind) {
        filters = filters.remove(kind)
        if (kind == SearchFilterKind.CATEGORY) {
            selectedCategory = null
        }
    }

    fun clearRecentSearches() {
        recentSearches = recentSearchesUseCase.clear()
    }

    suspend fun fetchCheckoutPaymentMethods(): List<CheckoutPaymentMethod>? {
        val token = authState.currentSession?.authToken ?: return null
        val result = serviceLocator.checkoutRepository.startCheckout(token).getOrNull() ?: return null
        return result.normalizedPaymentMethods()
    }

    internal suspend fun startOnlineCheckoutSession(): NetworkResult<CheckoutStartResponseDto> {
        val token = authState.currentSession?.authToken
        if (token.isNullOrBlank()) return NetworkResult.Failure(AppError.Api(401, "Sign in again to continue checkout."))

        val result = serviceLocator.checkoutRepository.startCheckout(token)
        val session = result.getOrNull()
        if (session != null) {
            val missing = session.razorpayKeyId.isBlank() || session.razorpayOrderId.isBlank() || session.razorpayOrderAmount <= 0
            if (missing) {
                return NetworkResult.Failure(AppError.Api(400, "Unable to initialize Razorpay checkout. Try again."))
            }
        }
        return result
    }

    internal suspend fun submitCheckoutOrder(
        draft: CheckoutDraft,
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
    ): NetworkResult<CheckoutOrderSummary> {
        val token = authState.currentSession?.authToken
        if (token.isNullOrBlank()) return NetworkResult.Failure(AppError.Api(401, "Sign in again to place your order."))

        isCheckoutSubmitting = true
        checkoutSubmitErrorMessage = null

        val address = selectedDeliveryAddress()
        val deliveryAddressId = address?.id?.ifBlank { null }
        val shippingInfo = if (deliveryAddressId == null) address?.toCheckoutShippingInfo(currentSession?.email.orEmpty()) else null
        val method = draft.selectedPayment.method

        val networkResult =
            when (method) {
                CheckoutPaymentMethod.COD -> {
                    serviceLocator.checkoutRepository.placeCodOrder(
                        CheckoutPlaceCodRequestDto(
                            paymentMethod = method.toRawValue(),
                            deliveryAddressId = deliveryAddressId,
                            shippingInfo = shippingInfo,
                        ),
                        bearerToken = token,
                    )
                }

                CheckoutPaymentMethod.UNKNOWN -> {
                    NetworkResult.Failure(AppError.Api(400, "Unsupported payment method selected."))
                }

                else -> {
                    val fallbackOrderId =
                        serviceLocator.checkoutRepository
                            .startCheckout(token)
                            .getOrNull()
                            ?.razorpayOrderId
                            .orEmpty()

                    val effectiveRazorpayOrderId = if (razorpayOrderId.isNotBlank()) razorpayOrderId else fallbackOrderId

                    if (effectiveRazorpayOrderId.isBlank() || razorpayPaymentId.isBlank() || razorpaySignature.isBlank()) {
                        NetworkResult.Failure(
                            AppError.Api(
                                400,
                                "Complete Razorpay verification fields to place online orders.",
                            ),
                        )
                    } else {
                        serviceLocator.checkoutRepository.verifyAndPlaceOrder(
                            CheckoutVerifyRequestDto(
                                paymentMethod = method.toRawValue(),
                                razorpayOrderId = effectiveRazorpayOrderId,
                                razorpayPaymentId = razorpayPaymentId,
                                razorpaySignature = razorpaySignature,
                                deliveryAddressId = deliveryAddressId,
                                shippingInfo = shippingInfo,
                            ),
                            bearerToken = token,
                        )
                    }
                }
            }

        val mappedResult = networkResult.map { response -> response.toCheckoutSummary(draft) }

        when (mappedResult) {
            is NetworkResult.Success -> {
                transaction.refreshCart(token)
                transaction.loadOrders(token)
            }

            is NetworkResult.Failure -> {
                checkoutSubmitErrorMessage = mappedResult.error.userMessage()
            }
        }

        isCheckoutSubmitting = false
        return mappedResult
    }

    suspend fun loadBuyerReturns(): NetworkResult<List<ReturnRequestResponseDto>> {
        val token = authState.currentSession?.authToken
        if (token.isNullOrBlank()) return NetworkResult.Failure(AppError.Api(401, "Sign in again to view returns."))

        isBuyerReturnsLoading = true
        buyerReturnsErrorMessage = null

        val result = serviceLocator.returnRepository.listMyReturns(token)

        when (result) {
            is NetworkResult.Success -> buyerReturns = result.data
            is NetworkResult.Failure -> buyerReturnsErrorMessage = result.error.userMessage()
        }

        isBuyerReturnsLoading = false
        return result
    }

    suspend fun submitBuyerReturnRequest(
        orderId: String,
        reason: ReturnReason,
        description: String,
    ): NetworkResult<Unit> {
        val token = authState.currentSession?.authToken
        if (token.isNullOrBlank()) return NetworkResult.Failure(AppError.Api(401, "Sign in again to request a return."))

        val result =
            serviceLocator.orderUseCase
                .requestReturn(
                    id = orderId,
                    request = ReturnRequestDto(reason = reason.name, description = description.ifBlank { null }),
                    bearerToken = token,
                ).map { Unit }

        when (result) {
            is NetworkResult.Success -> {
                transaction.loadOrders(token)
                loadBuyerReturns()
            }

            is NetworkResult.Failure -> {
                buyerReturnsErrorMessage = result.error.userMessage()
            }
        }

        return result
    }

    fun returnsAnalyticsContext(
        screenName: String,
        sourceSurface: String,
    ): ReturnsAnalyticsContext {
        val role =
            when (uiRole) {
                UserRole.Seller -> "seller"
                else -> "buyer"
            }
        val environment = if (serviceLocator.config.isMock) "dev" else "staging"
        return ReturnsAnalyticsContext(
            platform = "ios",
            appVersion = "0.0.0",
            buildNumber = "0",
            environment = environment,
            userId = "unknown_user",
            userRole = role,
            sessionId = analyticsSessionId,
            screenName = screenName,
            sourceSurface = sourceSurface,
        )
    }

    private fun selectedDeliveryAddress(): AddressDto? =
        transaction.addresses.firstOrNull { it.isDefault } ?: transaction.addresses.firstOrNull()
}

private fun AddressDto.toCheckoutShippingInfo(email: String): CheckoutShippingInfoDto =
    CheckoutShippingInfoDto(
        name = fullName,
        email = email,
        phone = phone,
        address = listOfNotNull(addressLine1, addressLine2).joinToString(", "),
        city = city,
        state = state,
        postalCode = pincode,
    )

private fun CheckoutVerifyResponseDto.toCheckoutSummary(draft: CheckoutDraft): CheckoutOrderSummary {
    val resolvedTotal = if (finalTotal > 0.0) "\u20b9${finalTotal.toInt()}" else draft.total
    val orderReference = orderId.ifBlank { orderNumber.ifBlank { "pending-order" } }
    return CheckoutOrderSummary(
        orderId = orderReference,
        orderNumber = orderNumber,
        paymentStatus = trackingPaymentStatus(),
        orderStatus = trackingOrderStatus(),
        items = draft.items,
        payment = draft.selectedPayment,
        subtotal = draft.subtotal,
        shipping = draft.shipping,
        total = resolvedTotal,
        shippingAddress = draft.shippingAddress,
        estimatedDelivery = "3-5 business days",
        trackingSteps =
            listOf(
                OrderTrackingStep(
                    title = "Order Confirmed",
                    detail = "Your order is now waiting for seller acceptance.",
                    timestamp = "Just now",
                    isComplete = true,
                ),
                OrderTrackingStep(
                    title = "Seller Acceptance",
                    detail = "Seller will accept and prepare the package.",
                    timestamp = "Pending",
                    isComplete = false,
                ),
                OrderTrackingStep(
                    title = "Shipped",
                    detail = "Courier pickup and dispatch updates appear here.",
                    timestamp = "Pending",
                    isComplete = false,
                ),
                OrderTrackingStep(
                    title = "Delivered",
                    detail = "Delivery attempt at your selected address.",
                    timestamp = "Pending",
                    isComplete = false,
                ),
            ),
    )
}

enum class AppEntryStage {
    Splash,
    RoleSelection,
    Auth,
}
