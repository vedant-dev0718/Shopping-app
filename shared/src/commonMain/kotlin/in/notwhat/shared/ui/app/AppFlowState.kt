package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

/**
 * App-level navigation state for transient UI routes.
 * This keeps root route state in one place instead of scattered local vars.
 */
internal class AppFlowState {
    var selectedProduct by mutableStateOf<ProductDto?>(null)
    var selectedReel by mutableStateOf<ReelDto?>(null)
    var selectedStore by mutableStateOf<StoreDto?>(null)

    var isCartOpen by mutableStateOf(false)
    var isProfileOpen by mutableStateOf(false)
    var profileRoute by mutableStateOf(ProfileShellRoute.ProfileAddress)

    var isSellerDashboardOpen by mutableStateOf(false)
    var sellerRoute by mutableStateOf(SellerShellRoute.Dashboard)

    var checkoutDraft by mutableStateOf<CheckoutDraft?>(null)
    var checkoutSummary by mutableStateOf<CheckoutOrderSummary?>(null)

    val isInSubScreen: Boolean
        get() =
            selectedProduct != null ||
                selectedReel != null ||
                selectedStore != null ||
                isCartOpen ||
                isProfileOpen ||
                isSellerDashboardOpen ||
                checkoutDraft != null ||
                checkoutSummary != null

    fun openSellerDashboard() {
        isSellerDashboardOpen = true
        sellerRoute = SellerShellRoute.Dashboard
    }

    fun closeSellerDashboard() {
        isSellerDashboardOpen = false
        sellerRoute = SellerShellRoute.Dashboard
    }

    fun openProfile() {
        isProfileOpen = true
        profileRoute = ProfileShellRoute.ProfileAddress
    }

    fun closeProfile() {
        isProfileOpen = false
        profileRoute = ProfileShellRoute.ProfileAddress
    }

    fun openCart() {
        isCartOpen = true
        checkoutDraft = null
        checkoutSummary = null
    }
}
