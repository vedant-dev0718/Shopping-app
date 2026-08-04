package com.notwhat.shared.discovery

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.descriptors.element
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNames
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonPrimitive

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
@Serializable(with = FeedItemDtoSerializer::class)
data class FeedItemDto(
    @JsonNames("id", "_id") val id: String = "",
    val type: String = "product", // "product" | "reel"
    val product: ProductDto? = null,
    val reel: ReelDto? = null,
    val createdAt: String? = null,
)

object FeedItemDtoSerializer : KSerializer<FeedItemDto> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("FeedItemDto") {
            element<String>("id")
            element<String>("type")
            element<String?>("createdAt", isOptional = true)
        }

    override fun deserialize(decoder: Decoder): FeedItemDto {
        val jsonDecoder = decoder as? JsonDecoder ?: error("FeedItemDtoSerializer only supports JSON")
        val obj = jsonDecoder.decodeJsonElement() as? JsonObject ?: return FeedItemDto()
        val type = obj["type"]?.jsonPrimitive?.content ?: "product"
        val createdAt = obj["createdAt"]?.jsonPrimitive?.contentOrNull
        val dataElement = obj["data"]
        val product =
            if (type == "product" && dataElement != null) {
                jsonDecoder.json.decodeFromJsonElement<ProductDto>(dataElement)
            } else {
                obj["product"]?.let { jsonDecoder.json.decodeFromJsonElement<ProductDto>(it) }
            }
        val reel =
            if (type == "reel" && dataElement != null) {
                jsonDecoder.json.decodeFromJsonElement<ReelDto>(dataElement)
            } else {
                obj["reel"]?.let { jsonDecoder.json.decodeFromJsonElement<ReelDto>(it) }
            }
        val resolvedId =
            product?.id ?: reel?.id ?: obj["id"]?.jsonPrimitive?.contentOrNull ?: obj["_id"]?.jsonPrimitive?.contentOrNull.orEmpty()

        return FeedItemDto(
            id = resolvedId,
            type = type,
            product = product,
            reel = reel,
            createdAt = createdAt,
        )
    }

    override fun serialize(
        encoder: Encoder,
        value: FeedItemDto,
    ) {
        val jsonEncoder = encoder as? JsonEncoder ?: error("FeedItemDtoSerializer only supports JSON")
        val payload =
            when (value.type) {
                "reel" -> value.reel?.let { jsonEncoder.json.encodeToJsonElement(ReelDto.serializer(), it) }
                else -> value.product?.let { jsonEncoder.json.encodeToJsonElement(ProductDto.serializer(), it) }
            }

        jsonEncoder.encodeJsonElement(
            buildJsonObject {
                put("type", JsonPrimitive(value.type))
                value.createdAt?.let { put("createdAt", JsonPrimitive(it)) }
                payload?.let { put("data", it) }
            },
        )
    }
}

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
    val products =
        com.notwhat.shared.catalog
            .seedProducts()
    val reels =
        com.notwhat.shared.catalog
            .seedReels()
    return buildList {
        reels.forEach { add(FeedItemDto(id = it.id, type = "reel", reel = it, createdAt = it.createdAt)) }
        products.forEach { add(FeedItemDto(id = it.id, type = "product", product = it, createdAt = it.createdAt)) }
    }
}

fun seedCategories(): List<CategoryDto> =
    listOf(
        CategoryDto("Kurtas", "kurtas", 840),
        CategoryDto("Sarees", "sarees", 1200),
        CategoryDto("Accessories", "accessories", 430),
        CategoryDto("Lehengas", "lehengas", 310),
        CategoryDto("Jewellery", "jewellery", 560),
        CategoryDto("Footwear", "footwear", 290),
    )

fun seedRegions(): List<RegionDto> =
    listOf(
        RegionDto("Rajasthan", "rajasthan", 320),
        RegionDto("Uttar Pradesh", "uttar-pradesh", 410),
        RegionDto("West Bengal", "west-bengal", 180),
        RegionDto("Andhra Pradesh", "andhra-pradesh", 140),
        RegionDto("Gujarat", "gujarat", 260),
        RegionDto("Tamil Nadu", "tamil-nadu", 200),
    )

fun seedFeaturedStores(): List<FeaturedStoreDto> =
    listOf(
        FeaturedStoreDto("seed-store-1", "Jaipur Looms", category = "Kurtas", region = "Rajasthan", city = "Jaipur", verified = true),
        FeaturedStoreDto(
            "seed-store-2",
            "Varanasi Weavers",
            category = "Sarees",
            region = "Uttar Pradesh",
            city = "Varanasi",
            verified = true,
        ),
        FeaturedStoreDto(
            "seed-store-3",
            "Andhra Crafts",
            category = "Accessories",
            region = "Andhra Pradesh",
            city = "Vijayawada",
            verified = false,
        ),
    )
