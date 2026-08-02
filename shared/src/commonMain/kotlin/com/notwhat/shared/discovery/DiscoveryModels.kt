package com.notwhat.shared.discovery

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreCardDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@Serializable
data class CategoryDto(
    val name: String = "",
    val slug: String = "",
    val productCount: Int = 0,
)

@Serializable
data class RegionDto(
    val name: String = "",
    val slug: String = "",
    val storeCount: Int = 0,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class FeedItemDto(
    @JsonNames("id", "_id") val id: String = "",
    val type: String = "product",   // "product" | "reel"
    val product: ProductDto? = null,
    val reel: ReelDto? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class FeaturedStoreDto(
    @JsonNames("id", "_id") val id: String = "",
    val storeName: String = "",
    val profileImageUrl: String? = null,
    val category: String? = null,
    val region: String? = null,
    val city: String? = null,
    val verified: Boolean = false,
)

// ---------------------------------------------------------------------------
// Seed data — used by DiscoveryUseCase in mock mode
// ---------------------------------------------------------------------------

fun seedFeedItems(): List<FeedItemDto> {
    val products = com.notwhat.shared.catalog.seedProducts()
    val reels = com.notwhat.shared.catalog.seedReels()
    return buildList {
        reels.forEach { add(FeedItemDto(id = it.id, type = "reel", reel = it)) }
        products.forEach { add(FeedItemDto(id = it.id, type = "product", product = it)) }
    }
}

fun seedCategories(): List<CategoryDto> = listOf(
    CategoryDto("Kurtas", "kurtas", 840),
    CategoryDto("Sarees", "sarees", 1200),
    CategoryDto("Accessories", "accessories", 430),
    CategoryDto("Lehengas", "lehengas", 310),
    CategoryDto("Jewellery", "jewellery", 560),
    CategoryDto("Footwear", "footwear", 290),
)

fun seedRegions(): List<RegionDto> = listOf(
    RegionDto("Rajasthan", "rajasthan", 320),
    RegionDto("Uttar Pradesh", "uttar-pradesh", 410),
    RegionDto("West Bengal", "west-bengal", 180),
    RegionDto("Andhra Pradesh", "andhra-pradesh", 140),
    RegionDto("Gujarat", "gujarat", 260),
    RegionDto("Tamil Nadu", "tamil-nadu", 200),
)

fun seedFeaturedStores(): List<FeaturedStoreDto> = listOf(
    FeaturedStoreDto("seed-store-1", "Jaipur Looms", category = "Kurtas", region = "Rajasthan", city = "Jaipur", verified = true),
    FeaturedStoreDto("seed-store-2", "Varanasi Weavers", category = "Sarees", region = "Uttar Pradesh", city = "Varanasi", verified = true),
    FeaturedStoreDto("seed-store-3", "Andhra Crafts", category = "Accessories", region = "Andhra Pradesh", city = "Vijayawada", verified = false),
)
