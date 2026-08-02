package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notwhat.shared.session.UserRole
import kotlinx.coroutines.delay

@Composable
internal fun AppContentRouter(
    padding: PaddingValues,
    state: NotWhatAppState,
    appRole: UserRole,
    requiresSellerSetup: Boolean,
    flow: AppFlowState,
    homeCoordinator: HomeFeatureCoordinator,
    searchCoordinator: SearchFeatureCoordinator,
    reelsCoordinator: ReelsFeatureCoordinator,
    productCoordinator: ProductFeatureCoordinator,
    sellerCoordinator: SellerFeatureCoordinator,
    adminCoordinator: AdminFeatureCoordinator,
) {
    if (!state.isAuthenticated) {
        when (state.entryStage) {
            AppEntryStage.Splash -> {
                SplashEntryScreen(
                    modifier = Modifier.padding(padding),
                    onComplete = state::completeSplash,
                )
            }

            AppEntryStage.RoleSelection,
            AppEntryStage.Auth,
            -> {
                AuthRootScreen(
                    modifier = Modifier.padding(padding),
                    state = state,
                )
            }
        }
        return
    }

    if (requiresSellerSetup) {
        SellerProfileSetupRequiredScreen(
            modifier = Modifier.padding(padding),
            authState = state.authState,
        )
        return
    }

    if (appRole == UserRole.Seller) {
        if (flow.selectedProduct != null) {
            productCoordinator.DetailScreen(
                modifier = Modifier.padding(padding),
                product = flow.selectedProduct!!,
                onBack = { flow.selectedProduct = null },
            )
        } else {
            sellerCoordinator.ShellScreen(
                modifier = Modifier.padding(padding),
                state = state,
                route = flow.sellerRoute,
                onRouteChange = { flow.sellerRoute = it },
                onBackToAccount = state::signOut,
            )
        }
        return
    }

    if (appRole == UserRole.Admin) {
        adminCoordinator.ConsoleScreen(
            modifier = Modifier.padding(padding),
            state = state,
        )
        return
    }

    if (flow.isSellerDashboardOpen) {
        sellerCoordinator.ShellScreen(
            modifier = Modifier.padding(padding),
            state = state,
            route = flow.sellerRoute,
            onRouteChange = { flow.sellerRoute = it },
            onBackToAccount = flow::closeSellerDashboard,
        )
        return
    }

    if (flow.isProfileOpen) {
        ProfileShellScreen(
            modifier = Modifier.padding(padding),
            state = state,
            route = flow.profileRoute,
            onBackToAccount = flow::closeProfile,
            onRouteChange = { flow.profileRoute = it },
        )
        return
    }

    if (flow.checkoutSummary != null) {
        CheckoutSummaryHandoffScreen(
            modifier = Modifier.padding(padding),
            summary = flow.checkoutSummary!!,
            onDone = {
                flow.checkoutSummary = null
                flow.isCartOpen = false
            },
            onOpenProduct = { flow.selectedProduct = it },
        )
        return
    }

    if (flow.checkoutDraft != null) {
        CheckoutConfirmationScreen(
            modifier = Modifier.padding(padding),
            draft = flow.checkoutDraft!!,
            onBack = { flow.checkoutDraft = null },
            onPlaceOrder = { summary ->
                flow.checkoutSummary = summary
                flow.checkoutDraft = null
            },
        )
        return
    }

    if (flow.isCartOpen) {
        CartSavedPaymentsScreen(
            modifier = Modifier.padding(padding),
            state = state,
            onBack = { flow.isCartOpen = false },
            onOpenProduct = { flow.selectedProduct = it },
            onProceedToCheckout = { draft -> flow.checkoutDraft = draft },
        )
        return
    }

    if (flow.selectedProduct != null) {
        productCoordinator.DetailScreen(
            modifier = Modifier.padding(padding),
            product = flow.selectedProduct!!,
            onBack = { flow.selectedProduct = null },
        )
        return
    }

    if (flow.selectedReel != null) {
        reelsCoordinator.DetailScreen(
            modifier = Modifier.padding(padding),
            state = state,
            reel = flow.selectedReel!!,
            onBack = { flow.selectedReel = null },
        )
        return
    }

    if (flow.selectedStore != null) {
        StoreProfileScreen(
            modifier = Modifier.padding(padding),
            state = state,
            store = flow.selectedStore!!,
            onBack = { flow.selectedStore = null },
            onOpenProduct = { flow.selectedProduct = it },
        )
        return
    }

    when (state.activeTab) {
        NotWhatTab.Home -> {
            homeCoordinator.Screen(
                modifier = Modifier.padding(padding),
                state = state,
            )
        }

        NotWhatTab.Search -> {
            searchCoordinator.Screen(
                modifier = Modifier.padding(padding),
                state = state,
            )
        }

        NotWhatTab.Bargains -> {
            reelsCoordinator.FeedScreen(
                modifier = Modifier.padding(padding),
                state = state,
            )
        }

        NotWhatTab.Account -> {
            AccountScreen(
                modifier = Modifier.padding(padding),
                state = state,
                onOpenProduct = { flow.selectedProduct = it },
                onOpenSellerDashboard = flow::openSellerDashboard,
                onOpenProfile = flow::openProfile,
                onOpenCart = flow::openCart,
            )
        }
    }
}

@Composable
private fun SplashEntryScreen(
    modifier: Modifier,
    onComplete: () -> Unit,
) {
    LaunchedEffect(Unit) {
        delay(1000)
        onComplete()
    }

    Box(
        modifier =
            modifier
                .fillMaxSize()
                .background(NotWhatColors.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("NOTWHAT", style = MaterialTheme.typography.displaySmall, color = NotWhatColors.primary, fontWeight = FontWeight.Black)
            Text("Discover. Bargain. Buy.", color = NotWhatColors.onSurfaceVariant)
        }
    }
}
