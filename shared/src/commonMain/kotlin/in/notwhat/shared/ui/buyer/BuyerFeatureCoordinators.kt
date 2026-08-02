package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

/** Coordinates Home feature routing and actions. */
internal class HomeFeatureCoordinator(
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

/** Coordinates Search feature routing and actions. */
internal class SearchFeatureCoordinator(
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

/** Coordinates Reels list/detail routing and actions. */
internal class ReelsFeatureCoordinator(
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

/** Coordinates Product detail routing. */
internal class ProductFeatureCoordinator {
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

/** Coordinates Seller shell routing. */
internal class SellerFeatureCoordinator {
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

/** Coordinates Admin console routing. */
internal class AdminFeatureCoordinator {
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
