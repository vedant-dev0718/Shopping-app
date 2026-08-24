package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.catalog.ProductClickResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreCardDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.discovery.CategoryDto
import com.notwhat.shared.discovery.DiscoveryRepository
import com.notwhat.shared.discovery.FeedItemDto
import com.notwhat.shared.domain.catalog.CatalogUseCase

internal class BuyerContentState(
    private val catalogUseCase: CatalogUseCase,
    private val discoveryRepository: DiscoveryRepository,
) {
    var feedItems by mutableStateOf<List<FeedItemDto>>(emptyList())
    var products by mutableStateOf<List<ProductDto>>(emptyList())
    var reels by mutableStateOf<List<ReelDto>>(emptyList())
    var stores by mutableStateOf<List<StoreDto>>(emptyList())
    var categories by mutableStateOf<List<DemoCategory>>(emptyList())
    var isLoading by mutableStateOf(false)
    var loadErrorMessage by mutableStateOf<String?>(null)
        private set

    suspend fun load(bearerToken: String? = null) {
        isLoading = true
        loadErrorMessage = null
        var firstError: String? = null
        try {
            when (val result = discoveryRepository.getFeed(bearerToken = bearerToken)) {
                is NetworkResult.Success -> {
                    feedItems = result.data
                    products = (result.data.mapNotNull { it.product } + products).distinctBy { it.id }
                    reels = (result.data.mapNotNull { it.reel } + reels).distinctBy { it.id }
                }

                is NetworkResult.Failure -> {
                    firstError = result.error.userMessage()
                }
            }
            when (val result = catalogUseCase.listProducts()) {
                is NetworkResult.Success -> products = (products + result.data).distinctBy { it.id }
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            when (val result = catalogUseCase.listReels()) {
                is NetworkResult.Success -> reels = (reels + result.data).distinctBy { it.id }
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            when (val result = catalogUseCase.listStores()) {
                is NetworkResult.Success -> stores = result.data
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            when (val result = discoveryRepository.getCategories()) {
                is NetworkResult.Success -> categories = result.data.map { it.toDemoCategory() }
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            loadErrorMessage = firstError
        } finally {
            isLoading = false
        }
    }

    suspend fun recordReelView(
        reelId: String,
        bearerToken: String? = null,
    ) {
        catalogUseCase.recordReelView(reelId, bearerToken)
    }

    suspend fun fetchProductsByCategory(category: String): NetworkResult<List<ProductDto>> =
        catalogUseCase.listProducts(category = category)

    suspend fun recordProductClick(
        productId: String,
        bearerToken: String? = null,
    ) {
        catalogUseCase.recordProductClick(productId, bearerToken)
    }

    suspend fun saveProduct(
        productId: String,
        bearerToken: String,
    ): NetworkResult<Boolean> {
        val result = catalogUseCase.saveProduct(productId, bearerToken)
        result.getOrNull()?.let { response ->
            updateProductSavedState(
                productId = response.productId ?: productId,
                isSaved = response.isSaved,
                saveCount = response.saveCount,
            )
        }
        return result.map { it.isSaved }
    }

    suspend fun unsaveProduct(
        productId: String,
        bearerToken: String,
    ): NetworkResult<Boolean> {
        val result = catalogUseCase.unsaveProduct(productId, bearerToken)
        result.getOrNull()?.let { response ->
            updateProductSavedState(
                productId = response.productId ?: productId,
                isSaved = response.isSaved,
                saveCount = response.saveCount,
            )
        }
        return result.map { it.isSaved }
    }

    private fun updateProductSavedState(
        productId: String,
        isSaved: Boolean,
        saveCount: Int,
    ) {
        fun ProductDto.withSavedState(): ProductDto = if (id != productId) this else copy(isSaved = isSaved, saveCount = saveCount)

        fun ReelDto.withTaggedProductState(): ReelDto = copy(taggedProducts = taggedProducts.map { it.withSavedState() })

        products = products.map { it.withSavedState() }
        reels = reels.map { it.withTaggedProductState() }
        feedItems =
            feedItems.map { item ->
                when {
                    item.product != null -> item.copy(product = item.product.withSavedState())
                    item.reel != null -> item.copy(reel = item.reel.withTaggedProductState())
                    else -> item
                }
            }
    }
}

// Reel mapper — DemoReel still used by BargainsScreen / ReelDetailScreen
internal fun ReelDto.toDemoReel() =
    DemoReel(
        creator = storeId?.storeName ?: "@${id.take(6)}",
        price = "",
        label =
            when {
                viewCount > 2000 -> "TRENDING"
                likeCount > 500 -> "HOT"
                else -> "NEW"
            },
        imageUrl = thumbnailUrl,
    )

// StoreDto display helpers (used instead of DemoStore in list/detail rendering)
internal val StoreDto.displayHandle get() = "@${storeName.lowercase().replace(" ", "")}"
internal val StoreDto.displayImageUrl get() = profileImageUrl ?: ""

// ProductDto display helpers
internal val ProductDto.displayTitle get() = title
internal val ProductDto.displayPrice get() = if (price > 0) "₹${price.toInt()}" else "—"
internal val ProductDto.displayImageUrl get() = imageUrls.firstOrNull() ?: ""
internal val ProductDto.displayStoreName get() = storeId?.storeName ?: ""

private val categoryImageUrls =
    mapOf(
        "kurtas" to "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200",
        "sarees" to "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200",
        "accessories" to "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=200",
        "lehengas" to "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200",
        "jewellery" to "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200",
        "footwear" to "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200",
    )

internal fun CategoryDto.toDemoCategory() =
    DemoCategory(
        name = name,
        label = slug,
        imageUrl =
            categoryImageUrls[slug.lowercase()]
                ?: categoryImageUrls[name.lowercase()]
                ?: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200",
    )

// Bridge stubs — used when navigating to ProductDetailScreen from non-migrated screens
internal fun ReelDto.toProductDtoStub() =
    ProductDto(
        id = "reel-$id",
        title = "${storeId?.storeName ?: "Reel"} — Drop",
        description = caption ?: "Discovered via a reel.",
        category = category,
        region = region,
        price = 0.0,
        stock = 1,
        imageUrls = listOf(thumbnailUrl),
        storeId = storeId,
    )

internal fun DemoReel.toProductDtoStub() =
    ProductDto(
        id = "reel-${creator.lowercase().replace(" ", "-")}",
        title = "$creator — Reel Drop",
        description = "Discovered via a reel from $creator.",
        category = "Featured",
        region = "",
        price = 0.0,
        stock = 1,
        imageUrls = listOf(imageUrl),
        storeId = StoreCardDto(storeName = creator),
    )

internal fun DemoProduct.toProductDtoStub() =
    ProductDto(
        id = "demo-${name.lowercase().replace(" ", "-")}",
        title = name,
        description = "",
        category = category,
        region = "",
        price = price.removePrefix("₹").replace(",", "").toDoubleOrNull() ?: 0.0,
        stock = 1,
        imageUrls = listOf(imageUrl),
        storeId = StoreCardDto(storeName = store),
    )
