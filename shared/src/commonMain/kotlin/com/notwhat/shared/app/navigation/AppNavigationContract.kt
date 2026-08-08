package com.notwhat.shared.ui

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

/** Sealed navigation contract for app-level transient routes. */
internal sealed interface AppRoute {
    data object None : AppRoute

    data class ProductDetail(
        val product: ProductDto,
    ) : AppRoute

    data class ReelDetail(
        val reel: ReelDto,
    ) : AppRoute

    data class StoreProfile(
        val store: StoreDto,
    ) : AppRoute

    data object Cart : AppRoute

    data object BuyerOrders : AppRoute

    data object BuyerReturns : AppRoute

    data class OrderDetail(
        val order: com.notwhat.shared.order.OrderDto,
    ) : AppRoute

    data class CheckoutDraftRoute(
        val draft: CheckoutDraft,
    ) : AppRoute

    data class CheckoutSummaryRoute(
        val summary: CheckoutOrderSummary,
    ) : AppRoute

    data class AddressSelectorRoute(
        val draft: CheckoutDraft,
    ) : AppRoute

    data class ProfileShellRouteEntry(
        val route: ProfileShellRoute,
    ) : AppRoute

    data class SellerShellRouteEntry(
        val route: SellerShellRoute,
    ) : AppRoute
}

/** Events consumed by AppFlowState to mutate app-level route state. */
internal sealed interface AppNavEvent {
    data class OpenProduct(
        val product: ProductDto,
    ) : AppNavEvent

    data class OpenReel(
        val reel: ReelDto,
    ) : AppNavEvent

    data class OpenStore(
        val store: StoreDto,
    ) : AppNavEvent

    data object OpenCart : AppNavEvent

    data object OpenBuyerOrders : AppNavEvent

    data object OpenBuyerReturns : AppNavEvent

    data class OpenOrderDetail(
        val order: com.notwhat.shared.order.OrderDto,
    ) : AppNavEvent

    data class ProceedToCheckout(
        val draft: CheckoutDraft,
    ) : AppNavEvent

    data class PlaceOrder(
        val summary: CheckoutOrderSummary,
    ) : AppNavEvent

    data class OpenAddressSelector(
        val draft: CheckoutDraft,
    ) : AppNavEvent

    data class AddressSelected(
        val draft: CheckoutDraft,
    ) : AppNavEvent

    data object OpenProfile : AppNavEvent

    data object OpenAddresses : AppNavEvent

    data class ChangeProfileRoute(
        val route: ProfileShellRoute,
    ) : AppNavEvent

    data object OpenSellerDashboard : AppNavEvent

    data class ChangeSellerRoute(
        val route: SellerShellRoute,
    ) : AppNavEvent

    data object CloseCurrent : AppNavEvent

    data object ResetToTabs : AppNavEvent
}
