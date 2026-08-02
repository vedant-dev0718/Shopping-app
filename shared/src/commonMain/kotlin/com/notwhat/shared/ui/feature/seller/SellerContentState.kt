package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.domain.seller.SellerUseCase
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.seller.seedSellerOrders

internal class SellerContentState(
    private val sellerUseCase: SellerUseCase,
) {
    var products by mutableStateOf<List<ProductDto>>(emptyList())
        private set
    var reels by mutableStateOf<List<ReelDto>>(emptyList())
        private set
    var orders by mutableStateOf<List<OrderDto>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set

    suspend fun load(bearerToken: String) {
        isLoading = true
        sellerUseCase.listProducts(bearerToken).getOrNull()?.let { products = it }
        sellerUseCase.listReels(bearerToken).getOrNull()?.let { reels = it }
        sellerUseCase.listOrders(bearerToken).getOrNull()?.let { orders = it }
        isLoading = false
    }

    /** Re-fetches orders after a status change. */
    suspend fun refreshOrders(bearerToken: String) {
        orders = sellerUseCase.listOrders(bearerToken).getOrNull() ?: orders
    }

    /** Removes product optimistically, re-fetches on error. */
    fun removeProductLocally(id: String) {
        products = products.filterNot { it.id == id }
    }

    /** Removes reel optimistically. */
    fun removeReelLocally(id: String) {
        reels = reels.filterNot { it.id == id }
    }
}

// Bridge: DemoSellerReel rendering still used by SellerReelListScreen components
internal fun com.notwhat.shared.catalog.ReelDto.toDemoSellerReel(): DemoSellerReel = DemoSellerReel(
    id = id,
    title = caption ?: "Untitled Reel",
    caption = caption ?: "",
    thumbnailUrl = thumbnailUrl,
    duration = "${duration.toInt()}s",
    viewCount = viewCount.toString(),
    isShared = status == "active",
    taggedProducts = emptyList(),
)
internal val ReelDto.displayCreator: String get() = storeId?.storeName ?: "@${id.take(6)}"
internal val ReelDto.displayThumbnail: String get() = thumbnailUrl
internal val ReelDto.displayLabel: String get() = when {
    viewCount > 2000 -> "TRENDING"
    likeCount > 500 -> "HOT"
    else -> "NEW"
}
