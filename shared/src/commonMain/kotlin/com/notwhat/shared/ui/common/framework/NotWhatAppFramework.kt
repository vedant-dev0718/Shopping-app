package com.notwhat.shared.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.text.font.FontWeight
import com.notwhat.shared.session.UserRole

@Composable
@OptIn(ExperimentalMaterial3Api::class)
internal fun NotWhatAppFramework(
    state: NotWhatAppState,
    forcedRole: UserRole?,
) {
    val flow = remember { AppFlowState() }

    LaunchedEffect(forcedRole, state.isAuthenticated) {
        if (forcedRole != null && !state.isAuthenticated) {
            state.configureRoleApp(forcedRole)
        }
    }

    LaunchedEffect(state.isAuthenticated) {
        if (state.isAuthenticated) {
            val token = state.authState.currentSession?.authToken ?: return@LaunchedEffect
            state.content.load(token)
            state.transaction.load(token)
            if (state.uiRole == UserRole.Seller) {
                state.sellerContent.load(token)
            }
        }
    }

    val appRole = state.uiRole
    val requiresSellerSetup = state.currentSession?.requiresSellerProfileSetup == true && appRole == UserRole.Seller

    val homeCoordinator =
        HomeNavigationCoordinator(
            onSearchTap = { state.selectTab(NotWhatTab.Search) },
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            onOpenStore = { flow.onEvent(AppNavEvent.OpenStore(it)) },
        )
    val searchCoordinator =
        SearchNavigationCoordinator(
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            onOpenStore = { flow.onEvent(AppNavEvent.OpenStore(it)) },
        )
    val reelsCoordinator =
        ReelsNavigationCoordinator(
            onOpenReel = { flow.onEvent(AppNavEvent.OpenReel(it)) },
            onOpenProduct = { flow.onEvent(AppNavEvent.OpenProduct(it)) },
            onOpenStore = { flow.onEvent(AppNavEvent.OpenStore(it)) },
        )
    val productCoordinator =
        ProductNavigationCoordinator(
            onOpenStore = { flow.onEvent(AppNavEvent.OpenStore(it)) },
        )
    val sellerCoordinator = SellerNavigationCoordinator()
    val adminCoordinator = AdminNavigationCoordinator()

    NotWhatTheme {
        Scaffold(
            containerColor = NotWhatColors.background,
            topBar = {
                if (state.isAuthenticated && appRole != UserRole.Seller && !flow.isInSubScreen) {
                    TopAppBar(
                        title = {
                            Text(
                                text = titleForTab(state.activeTab, appRole),
                                color = NotWhatColors.primary,
                                fontWeight = FontWeight.Bold,
                            )
                        },
                        actions = {
                            if (appRole == UserRole.Buyer) {
                                IconButton(onClick = { flow.onEvent(AppNavEvent.OpenCart) }) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = "Cart",
                                        tint = NotWhatColors.primary,
                                    )
                                }
                            }
                        },
                    )
                }
            },
            bottomBar = {
                if (state.isAuthenticated && appRole == UserRole.Buyer && !flow.isInSubScreen) {
                    NavigationBar(containerColor = NotWhatColors.surfaceContainerHigh) {
                        NavigationBarItem(
                            selected = state.activeTab == NotWhatTab.Home,
                            onClick = { state.selectTab(NotWhatTab.Home) },
                            icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                            label = { Text("Home") },
                        )
                        NavigationBarItem(
                            selected = state.activeTab == NotWhatTab.Reels,
                            onClick = { state.selectTab(NotWhatTab.Reels) },
                            icon = { Icon(Icons.Default.PlayArrow, contentDescription = "Reels") },
                            label = { Text("Reels") },
                        )
                        NavigationBarItem(
                            selected = state.activeTab == NotWhatTab.Search,
                            onClick = { state.selectTab(NotWhatTab.Search) },
                            icon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                            label = { Text("Search") },
                        )
                        NavigationBarItem(
                            selected = state.activeTab == NotWhatTab.Bargains,
                            onClick = { state.selectTab(NotWhatTab.Bargains) },
                            icon = { Icon(Icons.Default.Star, contentDescription = "Bargains") },
                            label = { Text("Bargains") },
                        )
                        NavigationBarItem(
                            selected = state.activeTab == NotWhatTab.Account,
                            onClick = { state.selectTab(NotWhatTab.Account) },
                            icon = { Icon(Icons.Default.Person, contentDescription = "Account") },
                            label = { Text("Account") },
                        )
                    }
                }
            },
        ) { padding ->
            AppContentRouter(
                padding = padding,
                state = state,
                appRole = appRole,
                requiresSellerSetup = requiresSellerSetup,
                flow = flow,
                homeCoordinator = homeCoordinator,
                searchCoordinator = searchCoordinator,
                reelsCoordinator = reelsCoordinator,
                productCoordinator = productCoordinator,
                sellerCoordinator = sellerCoordinator,
                adminCoordinator = adminCoordinator,
            )
        }
    }
}

private fun titleForTab(
    tab: NotWhatTab,
    appRole: UserRole,
): String =
    when (tab) {
        NotWhatTab.Home -> if (appRole == UserRole.Buyer) "NotWhat" else consoleTitle(appRole)
        NotWhatTab.Reels -> if (appRole == UserRole.Buyer) "Reels" else consoleTitle(appRole)
        NotWhatTab.Search -> if (appRole == UserRole.Buyer) "Search" else consoleTitle(appRole)
        NotWhatTab.Bargains -> if (appRole == UserRole.Buyer) "Bargains" else consoleTitle(appRole)
        NotWhatTab.Account -> if (appRole == UserRole.Buyer) "Account" else consoleTitle(appRole)
    }

private fun consoleTitle(appRole: UserRole): String =
    when (appRole) {
        UserRole.Buyer -> "NotWhat"
        UserRole.Seller -> "Seller Console"
        UserRole.Admin -> "Admin Console"
    }
