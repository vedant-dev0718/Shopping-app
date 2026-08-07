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
    homeCoordinator: HomeNavigationCoordinator,
    searchCoordinator: SearchNavigationCoordinator,
    reelsCoordinator: ReelsNavigationCoordinator,
    productCoordinator: ProductNavigationCoordinator,
    sellerCoordinator: SellerNavigationCoordinator,
    adminCoordinator: AdminNavigationCoordinator,
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
        if (flow.route is AppRoute.ProductDetail) {
            val route = flow.route as AppRoute.ProductDetail
            productCoordinator.DetailScreen(
                modifier = Modifier.padding(padding),
                state = state,
                product = route.product,
                onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
            )
        } else {
            sellerCoordinator.ShellScreen(
                modifier = Modifier.padding(padding),
                state = state,
                route = flow.sellerRoute,
                onRouteChange = { sellerRoute -> flow.onEvent(AppNavEvent.ChangeSellerRoute(sellerRoute)) },
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

    if (flow.route is AppRoute.SellerShellRouteEntry) {
        sellerCoordinator.ShellScreen(
            modifier = Modifier.padding(padding),
            state = state,
            route = flow.sellerRoute,
            onRouteChange = { sellerRoute -> flow.onEvent(AppNavEvent.ChangeSellerRoute(sellerRoute)) },
            onBackToAccount = { flow.onEvent(AppNavEvent.CloseCurrent) },
        )
        return
    }

    if (flow.route is AppRoute.ProfileShellRouteEntry) {
        ProfileShellScreen(
            modifier = Modifier.padding(padding),
            state = state,
            route = flow.profileRoute,
            onBackToAccount = { flow.onEvent(AppNavEvent.CloseCurrent) },
            onRouteChange = { profileRoute -> flow.onEvent(AppNavEvent.ChangeProfileRoute(profileRoute)) },
            onSignOut = state::signOut,
        )
        return
    }

    if (flow.route is AppRoute.CheckoutSummaryRoute) {
        val route = flow.route as AppRoute.CheckoutSummaryRoute
        CheckoutSummaryHandoffScreen(
            modifier = Modifier.padding(padding),
            summary = route.summary,
            onDone = { flow.onEvent(AppNavEvent.ResetToTabs) },
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
        )
        return
    }

    if (flow.route is AppRoute.CheckoutDraftRoute) {
        val route = flow.route as AppRoute.CheckoutDraftRoute
        CheckoutConfirmationScreen(
            modifier = Modifier.padding(padding),
            state = state,
            draft = route.draft,
            onBack = { flow.onEvent(AppNavEvent.OpenCart) },
            onPlaceOrder = { summary -> flow.onEvent(AppNavEvent.PlaceOrder(summary)) },
        )
        return
    }

    if (flow.route is AppRoute.Cart) {
        CartSavedPaymentsScreen(
            modifier = Modifier.padding(padding),
            state = state,
            onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            onProceedToCheckout = { draft -> flow.onEvent(AppNavEvent.ProceedToCheckout(draft)) },
        )
        return
    }

    if (flow.route is AppRoute.BuyerReturns) {
        BuyerReturnsScreen(
            modifier = Modifier.padding(padding),
            state = state,
            onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
        )
        return
    }

    if (flow.route is AppRoute.ProductDetail) {
        val route = flow.route as AppRoute.ProductDetail
        productCoordinator.DetailScreen(
            modifier = Modifier.padding(padding),
            state = state,
            product = route.product,
            onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
        )
        return
    }

    if (flow.route is AppRoute.ReelDetail) {
        val route = flow.route as AppRoute.ReelDetail
        reelsCoordinator.DetailScreen(
            modifier = Modifier.padding(padding),
            state = state,
            reel = route.reel,
            onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
        )
        return
    }

    if (flow.route is AppRoute.StoreProfile) {
        val route = flow.route as AppRoute.StoreProfile
        StoreProfileScreen(
            modifier = Modifier.padding(padding),
            state = state,
            store = route.store,
            onBack = { flow.onEvent(AppNavEvent.CloseCurrent) },
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            onOpenReel = { flow.onEvent(AppNavEvent.OpenReel(it)) },
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

        NotWhatTab.Reels -> {
            reelsCoordinator.FeedScreen(
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
            BargainProductsScreen(
                modifier = Modifier.padding(padding),
                state = state,
                onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            )
        }

        NotWhatTab.Account -> {
            AccountScreen(
                modifier = Modifier.padding(padding),
                state = state,
                onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
                onOpenSellerDashboard = { flow.onEvent(AppNavEvent.OpenSellerDashboard) },
                onOpenProfile = { flow.onEvent(AppNavEvent.OpenProfile) },
                onOpenAddresses = { flow.onEvent(AppNavEvent.OpenAddresses) },
                onOpenCart = { flow.onEvent(AppNavEvent.OpenCart) },
                onOpenBuyerReturns = { flow.onEvent(AppNavEvent.OpenBuyerReturns) },
                onSignOut = state::signOut,
            )
        }
    }
}

@Composable
private fun BuyerReturnsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    BuyerReturnsContentScreen(
        modifier = modifier,
        state = state,
        onBack = onBack,
    )
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
