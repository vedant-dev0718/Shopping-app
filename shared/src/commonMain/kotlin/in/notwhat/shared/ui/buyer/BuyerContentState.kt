package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreCardDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.discovery.CategoryDto
import com.notwhat.shared.discovery.DiscoveryRepository
import com.notwhat.shared.domain.catalog.CatalogUseCase

internal class BuyerContentState(
    private val catalogUseCase: CatalogUseCase,
    private val discoveryRepository: DiscoveryRepository,
) {
    var products by mutableStateOf<List<ProductDto>>(emptyList())
    var reels by mutableStateOf<List<ReelDto>>(emptyList())
    var stores by mutableStateOf<List<StoreDto>>(emptyList())
    var categories by mutableStateOf<List<DemoCategory>>(emptyList())
    var isLoading by mutableStateOf(false)

    suspend fun load() {
        isLoading = true
        catalogUseCase.listProducts().getOrNull()?.let { products = it }
        catalogUseCase.listReels().getOrNull()?.let { reels = it }
        catalogUseCase.listStores().getOrNull()?.let { stores = it }
        discoveryRepository.getCategories().getOrNull()?.let { categories = it.map { c -> c.toDemoCategory() } }
        isLoading = false
    }
}

// Reel mapper — DemoReel still used by BargainsScreen / ReelDetailScreen
internal fun ReelDto.toDemoReel() = DemoReel(
    creator = storeId?.storeName ?: "@${id.take(6)}",
    price = "",
    label = when {
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

private val categoryImageUrls = mapOf(
    "kurtas" to "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200",
    "sarees" to "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200",
    "accessories" to "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=200",
    "lehengas" to "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200",
    "jewellery" to "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200",
    "footwear" to "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200",
)

internal fun CategoryDto.toDemoCategory() = DemoCategory(
    name = name,
    label = slug,
    imageUrl = categoryImageUrls[slug.lowercase()]
        ?: categoryImageUrls[name.lowercase()]
        ?: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200",
)

// Bridge stubs — used when navigating to ProductDetailScreen from non-migrated screens
internal fun ReelDto.toProductDtoStub() = ProductDto(
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

internal fun DemoReel.toProductDtoStub() = ProductDto(
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

internal fun DemoProduct.toProductDtoStub() = ProductDto(
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
