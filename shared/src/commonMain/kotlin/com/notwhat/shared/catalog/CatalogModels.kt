package com.notwhat.shared.catalog

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

// ---------------------------------------------------------------------------
// Store card (embedded in product/reel responses)
// ---------------------------------------------------------------------------

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class StoreCardDto(
    @JsonNames("id", "_id") val id: String = "",
    val storeName: String = "",
    val profileImageUrl: String? = null,
    val verified: Boolean = false,
    val city: String? = null,
    val state: String? = null,
    val region: String? = null,
    val category: String? = null,
)

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ProductDto(
    @JsonNames("id", "_id") val id: String = "",
    val title: String = "",
    val description: String = "",
    val productLink: String? = null,
    val category: String = "",
    val subcategory: String? = null,
    val region: String = "",
    val price: Double = 0.0,
    val sku: String? = null,
    val stock: Int = 0,
    val tags: List<String> = emptyList(),
    val imageUrls: List<String> = emptyList(),
    val featured: Boolean = false,
    val status: String = "active",
    val isSaved: Boolean = false,
    val saveCount: Int = 0,
    val storeId: StoreCardDto? = null,
    val createdAt: String? = null,
)

@Serializable
data class ProductListResponseDto(val products: List<ProductDto>? = null) {
    // list endpoint returns the array directly, not nested — handled at repo level
}

@Serializable
data class SaveProductResponseDto(val isSaved: Boolean = false)

// ---------------------------------------------------------------------------
// Reel
// ---------------------------------------------------------------------------

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ReelDto(
    @JsonNames("id", "_id") val id: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val caption: String? = null,
    val hashtags: List<String> = emptyList(),
    val region: String = "",
    val category: String = "",
    val subcategory: String? = null,
    val duration: Double = 0.0,
    val processingStatus: String = "ready",
    val status: String = "active",
    val viewCount: Int = 0,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val isLiked: Boolean = false,
    val storeId: StoreCardDto? = null,
    val taggedProductIds: List<String> = emptyList(),
    val createdAt: String? = null,
)

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class StoreDto(
    @JsonNames("id", "_id") val id: String = "",
    val storeName: String = "",
    val description: String? = null,
    val profileImageUrl: String? = null,
    val bannerImageUrl: String? = null,
    val category: String? = null,
    val region: String? = null,
    val city: String? = null,
    val state: String? = null,
    val verified: Boolean = false,
    val isSaved: Boolean = false,
    val followerCount: Int = 0,
    val productCount: Int = 0,
    val reelCount: Int = 0,
    val createdAt: String? = null,
)

// ---------------------------------------------------------------------------
// Seller product/reel request bodies
// ---------------------------------------------------------------------------

@Serializable
data class CreateProductRequestDto(
    val title: String,
    val description: String,
    val category: String,
    val subcategory: String? = null,
    val region: String,
    val price: Double,
    val sku: String? = null,
    val stock: Int,
    val tags: List<String> = emptyList(),
    val imageUrls: List<String> = emptyList(),
    val productLink: String? = null,
)

@Serializable
data class UpdateProductRequestDto(
    val title: String? = null,
    val description: String? = null,
    val category: String? = null,
    val subcategory: String? = null,
    val region: String? = null,
    val price: Double? = null,
    val sku: String? = null,
    val stock: Int? = null,
    val tags: List<String>? = null,
    val imageUrls: List<String>? = null,
    val status: String? = null,
    val productLink: String? = null,
)

@Serializable
data class CreateReelRequestDto(
    val videoUrl: String,
    val thumbnailUrl: String,
    val caption: String? = null,
    val hashtags: List<String> = emptyList(),
    val region: String,
    val category: String,
    val subcategory: String? = null,
    val taggedProductIds: List<String> = emptyList(),
)

@Serializable
data class UpdateReelRequestDto(
    val caption: String? = null,
    val hashtags: List<String>? = null,
    val status: String? = null,
    val taggedProductIds: List<String>? = null,
)

@Serializable
data class UpdateSellerStoreRequestDto(
    val storeName: String? = null,
    val description: String? = null,
    val category: String? = null,
    val region: String? = null,
    val city: String? = null,
    val state: String? = null,
)

@Serializable
data class DeleteResponseDto(val deleted: Boolean = true)

// ---------------------------------------------------------------------------
// Seed data — used by CatalogUseCase in mock mode
// ---------------------------------------------------------------------------

fun seedProducts(): List<ProductDto> = listOf(
    ProductDto(
        id = "seed-product-1",
        title = "Block-Print Kurta Set",
        description = "Handcrafted Jaipur block-print cotton kurta with matching dupatta.",
        category = "Kurtas",
        region = "Rajasthan",
        price = 1899.0,
        stock = 12,
        imageUrls = listOf("https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400"),
        tags = listOf("block-print", "cotton", "handcraft"),
        storeId = StoreCardDto(id = "seed-store-1", storeName = "Jaipur Looms", city = "Jaipur", state = "Rajasthan"),
    ),
    ProductDto(
        id = "seed-product-2",
        title = "Banarasi Silk Saree",
        description = "Pure Banarasi silk with gold zari weave. Comes with blouse piece.",
        category = "Sarees",
        region = "Uttar Pradesh",
        price = 6499.0,
        stock = 5,
        imageUrls = listOf("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400"),
        tags = listOf("silk", "banarasi", "zari"),
        storeId = StoreCardDto(id = "seed-store-2", storeName = "Varanasi Weavers", city = "Varanasi", state = "Uttar Pradesh"),
    ),
    ProductDto(
        id = "seed-product-3",
        title = "Kalamkari Tote Bag",
        description = "Hand-painted kalamkari cotton tote. Vibrant Andhra folk motifs.",
        category = "Accessories",
        region = "Andhra Pradesh",
        price = 799.0,
        stock = 30,
        imageUrls = listOf("https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400"),
        tags = listOf("kalamkari", "handpainted", "cotton"),
        storeId = StoreCardDto(id = "seed-store-3", storeName = "Andhra Crafts", city = "Vijayawada", state = "Andhra Pradesh"),
    ),
)

fun seedReels(): List<ReelDto> = listOf(
    ReelDto(
        id = "seed-reel-1",
        videoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400",
        caption = "New block-print collection just dropped 🎨 #JaipurFashion",
        region = "Rajasthan",
        category = "Kurtas",
        viewCount = 1240,
        likeCount = 340,
        storeId = StoreCardDto(id = "seed-store-1", storeName = "Jaipur Looms"),
        taggedProductIds = listOf("seed-product-1"),
    ),
    ReelDto(
        id = "seed-reel-2",
        videoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnailUrl = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
        caption = "Draping a 6-yard Banarasi silk — step by step 🌸",
        region = "Uttar Pradesh",
        category = "Sarees",
        viewCount = 3870,
        likeCount = 820,
        storeId = StoreCardDto(id = "seed-store-2", storeName = "Varanasi Weavers"),
        taggedProductIds = listOf("seed-product-2"),
    ),
)

fun seedStores(): List<StoreDto> = listOf(
    StoreDto(
        id = "seed-store-1",
        storeName = "Jaipur Looms",
        description = "Handcrafted block-print kurtas and dupattas from Jaipur artisans.",
        category = "Kurtas",
        region = "Rajasthan",
        city = "Jaipur",
        state = "Rajasthan",
        verified = true,
        followerCount = 3200,
        productCount = 48,
        reelCount = 12,
    ),
    StoreDto(
        id = "seed-store-2",
        storeName = "Varanasi Weavers",
        description = "Authentic Banarasi silk sarees direct from the loom.",
        category = "Sarees",
        region = "Uttar Pradesh",
        city = "Varanasi",
        state = "Uttar Pradesh",
        verified = true,
        followerCount = 5100,
        productCount = 62,
        reelCount = 21,
    ),
    StoreDto(
        id = "seed-store-3",
        storeName = "Andhra Crafts",
        description = "Kalamkari and Kondapalli toys celebrating Andhra heritage.",
        category = "Accessories",
        region = "Andhra Pradesh",
        city = "Vijayawada",
        state = "Andhra Pradesh",
        verified = false,
        followerCount = 880,
        productCount = 24,
        reelCount = 6,
    ),
)
