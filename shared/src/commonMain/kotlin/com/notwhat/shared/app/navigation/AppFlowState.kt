package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * App-level flow state driven by AppRoute/AppNavEvent contract.
 */
internal class AppFlowState {
    var route by mutableStateOf<AppRoute>(AppRoute.None)

    var profileRoute by mutableStateOf(ProfileShellRoute.ProfileAddress)
    var sellerRoute by mutableStateOf(SellerShellRoute.Dashboard)

    val isInSubScreen: Boolean
        get() = route !is AppRoute.None

    fun onEvent(event: AppNavEvent) {
        when (event) {
            is AppNavEvent.OpenProduct -> {
                route = AppRoute.ProductDetail(event.product)
            }

            is AppNavEvent.OpenReel -> {
                route = AppRoute.ReelDetail(event.reel)
            }

            is AppNavEvent.OpenStore -> {
                route = AppRoute.StoreProfile(event.store)
            }

            AppNavEvent.OpenCart -> {
                route = AppRoute.Cart
            }

            AppNavEvent.OpenBuyerOrders -> {
                route = AppRoute.BuyerOrders
            }

            AppNavEvent.OpenBuyerReturns -> {
                route = AppRoute.BuyerReturns
            }

            is AppNavEvent.OpenOrderDetail -> {
                route = AppRoute.OrderDetail(event.order)
            }

            is AppNavEvent.ProceedToCheckout -> {
                route = AppRoute.CheckoutDraftRoute(event.draft)
            }

            is AppNavEvent.PlaceOrder -> {
                route = AppRoute.CheckoutSummaryRoute(event.summary)
            }

            is AppNavEvent.OpenAddressSelector -> {
                route = AppRoute.AddressSelectorRoute(event.draft)
            }

            is AppNavEvent.AddressSelected -> {
                route = AppRoute.CheckoutDraftRoute(event.draft)
            }

            AppNavEvent.OpenProfile -> {
                profileRoute = ProfileShellRoute.ProfileAddress
                route = AppRoute.ProfileShellRouteEntry(profileRoute)
            }

            AppNavEvent.OpenAddresses -> {
                profileRoute = ProfileShellRoute.AddressOnly
                route = AppRoute.ProfileShellRouteEntry(profileRoute)
            }

            is AppNavEvent.ChangeProfileRoute -> {
                profileRoute = event.route
                route = AppRoute.ProfileShellRouteEntry(profileRoute)
            }

            AppNavEvent.OpenSellerDashboard -> {
                sellerRoute = SellerShellRoute.Dashboard
                route = AppRoute.SellerShellRouteEntry(sellerRoute)
            }

            is AppNavEvent.ChangeSellerRoute -> {
                sellerRoute = event.route
                if (route is AppRoute.SellerShellRouteEntry) {
                    route = AppRoute.SellerShellRouteEntry(sellerRoute)
                }
            }

            AppNavEvent.CloseCurrent,
            AppNavEvent.ResetToTabs,
            -> {
                route = AppRoute.None
            }
        }
    }
}
