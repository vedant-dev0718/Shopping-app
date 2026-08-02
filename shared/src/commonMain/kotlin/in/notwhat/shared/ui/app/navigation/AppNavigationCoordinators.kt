package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

/** Coordinates home navigation and actions. */
internal class HomeNavigationCoordinator(
    private val onSearchTap: () -> Unit,
    private val onOpenProduct: (ProductDto) -> Unit,
    private val onOpenStore: (StoreDto) -> Unit,
) {
    @Composable
    fun Screen(
        modifier: Modifier,
        state: NotWhatAppState,
    ) {
        HomeScreen(
            modifier = modifier,
            state = state,
            actions =
                HomeScreenActions(
                    onSearchTap = onSearchTap,
                    onOpenProduct = onOpenProduct,
                    onOpenStore = onOpenStore,
                ),
        )
    }
}

/** Coordinates search navigation and actions. */
internal class SearchNavigationCoordinator(
    private val onOpenProduct: (ProductDto) -> Unit,
    private val onOpenStore: (StoreDto) -> Unit,
) {
    @Composable
    fun Screen(
        modifier: Modifier,
        state: NotWhatAppState,
    ) {
        SearchScreen(
            modifier = modifier,
            state = state,
            actions =
                SearchScreenActions(
                    onOpenProduct = onOpenProduct,
                    onOpenStore = onOpenStore,
                ),
        )
    }
}

/** Coordinates reels navigation and actions. */
internal class ReelsNavigationCoordinator(
    private val onOpenReel: (ReelDto) -> Unit,
    private val onOpenProduct: (ProductDto) -> Unit,
    private val onOpenStore: (StoreDto) -> Unit,
) {
    @Composable
    fun FeedScreen(
        modifier: Modifier,
        state: NotWhatAppState,
    ) {
        BargainsScreen(
            modifier = modifier,
            state = state,
            onOpenReel = onOpenReel,
            onOpenStore = onOpenStore,
        )
    }

    @Composable
    fun DetailScreen(
        modifier: Modifier,
        state: NotWhatAppState,
        reel: ReelDto,
        onBack: () -> Unit,
    ) {
        ReelDetailScreen(
            modifier = modifier,
            state = state,
            reel = reel,
            onBack = onBack,
            onOpenProduct = onOpenProduct,
            onOpenStore = onOpenStore,
        )
    }
}

/** Coordinates product navigation. */
internal class ProductNavigationCoordinator {
    @Composable
    fun DetailScreen(
        modifier: Modifier,
        product: ProductDto,
        onBack: () -> Unit,
    ) {
        ProductDetailScreen(
            modifier = modifier,
            product = product,
            onBack = onBack,
        )
    }
}

/** Coordinates seller shell navigation. */
internal class SellerNavigationCoordinator {
    @Composable
    fun ShellScreen(
        modifier: Modifier,
        state: NotWhatAppState,
        route: SellerShellRoute,
        onRouteChange: (SellerShellRoute) -> Unit,
        onBackToAccount: () -> Unit,
    ) {
        SellerShellScreen(
            modifier = modifier,
            state = state,
            route = route,
            onRouteChange = onRouteChange,
            onBackToAccount = onBackToAccount,
        )
    }
}

/** Coordinates admin navigation. */
internal class AdminNavigationCoordinator {
    @Composable
    fun ConsoleScreen(
        modifier: Modifier,
        state: NotWhatAppState,
    ) {
        AdminConsoleScreen(
            modifier = modifier,
            state = state,
        )
    }
}
