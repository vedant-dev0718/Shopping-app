package com.notwhat.shared.ui

import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.catalog.seedStores
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AppFlowStateTest {
    private val product = seedProducts().first()
    private val reel = seedReels().first()
    private val store = seedStores().first()

    @Test
    fun openProduct_setsProductDetailRoute() {
        val flow = AppFlowState()

        flow.onEvent(AppNavEvent.OpenProduct(product))

        assertTrue(flow.isInSubScreen)
        assertEquals(AppRoute.ProductDetail(product), flow.route)
    }

    @Test
    fun openReelAndStore_setExpectedRoutes() {
        val flow = AppFlowState()

        flow.onEvent(AppNavEvent.OpenReel(reel))
        assertEquals(AppRoute.ReelDetail(reel), flow.route)

        flow.onEvent(AppNavEvent.OpenStore(store))
        assertEquals(AppRoute.StoreProfile(store), flow.route)
    }

    @Test
    fun checkoutAndClosing_events_resetToTabs() {
        val flow = AppFlowState()
        val draft =
            CheckoutDraft(
                items = emptyList(),
                selectedPayment = PreviewContent.savedPayments.first(),
                subtotal = "₹1,999",
                shipping = "₹0",
                total = "₹1,999",
                shippingAddress = "221B Baker Street",
            )
        val summary =
            CheckoutOrderSummary(
                orderId = "ORD-1",
                items = emptyList(),
                payment = PreviewContent.savedPayments.first(),
                subtotal = "₹1,999",
                shipping = "₹0",
                total = "₹1,999",
                shippingAddress = "221B Baker Street",
                estimatedDelivery = "2-3 days",
                trackingSteps = emptyList(),
            )

        flow.onEvent(AppNavEvent.ProceedToCheckout(draft))
        assertEquals(AppRoute.CheckoutDraftRoute(draft), flow.route)

        flow.onEvent(AppNavEvent.PlaceOrder(summary))
        assertEquals(AppRoute.CheckoutSummaryRoute(summary), flow.route)

        flow.onEvent(AppNavEvent.ResetToTabs)
        assertEquals(AppRoute.None, flow.route)
        assertFalse(flow.isInSubScreen)
    }

    @Test
    fun openProfileAndSellerDashboard_trackNestedRoutes() {
        val flow = AppFlowState()

        flow.onEvent(AppNavEvent.OpenProfile)
        assertEquals(AppRoute.ProfileShellRouteEntry(ProfileShellRoute.ProfileAddress), flow.route)
        assertEquals(ProfileShellRoute.ProfileAddress, flow.profileRoute)

        flow.onEvent(AppNavEvent.ChangeProfileRoute(ProfileShellRoute.ContactSupport))
        assertEquals(ProfileShellRoute.ContactSupport, flow.profileRoute)
        assertEquals(AppRoute.ProfileShellRouteEntry(ProfileShellRoute.ContactSupport), flow.route)

        flow.onEvent(AppNavEvent.OpenSellerDashboard)
        assertEquals(AppRoute.SellerShellRouteEntry(SellerShellRoute.Dashboard), flow.route)
        assertEquals(SellerShellRoute.Dashboard, flow.sellerRoute)

        flow.onEvent(AppNavEvent.ChangeSellerRoute(SellerShellRoute.Insights))
        assertEquals(SellerShellRoute.Insights, flow.sellerRoute)
        assertEquals(AppRoute.SellerShellRouteEntry(SellerShellRoute.Insights), flow.route)
    }

    @Test
    fun openBuyerReturns_setsReturnsRoute() {
        val flow = AppFlowState()

        flow.onEvent(AppNavEvent.OpenBuyerReturns)

        assertEquals(AppRoute.BuyerReturns, flow.route)
        assertTrue(flow.isInSubScreen)
    }
}
