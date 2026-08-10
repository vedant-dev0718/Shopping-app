package com.notwhat.shared.bargain

import com.notwhat.shared.catalog.ProductDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonNames
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private object FlexibleBidderIdSerializer : KSerializer<String> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("FlexibleBidderId", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): String {
        val jsonDecoder = decoder as? JsonDecoder ?: return ""
        return when (val element = jsonDecoder.decodeJsonElement()) {
            is JsonPrimitive -> {
                element.content
            }

            is JsonObject -> {
                val id = element["_id"] ?: element["id"]
                (id as? JsonPrimitive)?.content ?: ""
            }

            else -> {
                ""
            }
        }
    }

    override fun serialize(
        encoder: Encoder,
        value: String,
    ) {
        encoder.encodeString(value)
    }
}

private object FlexibleObjectIdSerializer : KSerializer<String> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("FlexibleObjectId", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): String {
        val jsonDecoder = decoder as? JsonDecoder ?: return ""
        return when (val element = jsonDecoder.decodeJsonElement()) {
            is JsonPrimitive -> {
                element.content
            }

            is JsonObject -> {
                val id = element["_id"] ?: element["id"]
                (id as? JsonPrimitive)?.content ?: ""
            }

            else -> {
                ""
            }
        }
    }

    override fun serialize(
        encoder: Encoder,
        value: String,
    ) {
        encoder.encodeString(value)
    }
}

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BargainScheduleDto(
    @JsonNames("id", "_id") val id: String = "",
    @Serializable(with = FlexibleObjectIdSerializer::class) val productId: String = "",
    @Serializable(with = FlexibleObjectIdSerializer::class) val sellerId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reservePrice: Double = 0.0,
    val status: String = "active", // active | closed | cancelled
    val winningBidId: String? = null,
    val product: ProductDto? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BidDto(
    @JsonNames("id", "_id") val id: String = "",
    @Serializable(with = FlexibleObjectIdSerializer::class) val productId: String = "",
    @JsonNames("bidderId", "buyerId") @Serializable(with = FlexibleBidderIdSerializer::class) val bidderId: String = "",
    val amount: Double = 0.0,
    val quantity: Int = 1,
    @JsonNames("status", "bidStatus") val status: String = "active",
    val paymentStatus: String = "pending",
    val paymentWindowEndsAt: String? = null,
    val canProceedToPayment: Boolean = false,
    val createdAt: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BuyerBidDto(
    @JsonNames("id", "_id") val id: String = "",
    @Serializable(with = FlexibleObjectIdSerializer::class) val productId: String = "",
    val product: ProductDto? = null,
    val amount: Double = 0.0,
    val quantity: Int = 1,
    @JsonNames("status", "bidStatus") val status: String = "active",
    val paymentStatus: String = "pending",
    val createdAt: String? = null,
    val scheduleEndDate: String? = null,
    val scheduleStatus: String? = null,
    val paymentWindowEndsAt: String? = null,
    val canProceedToPayment: Boolean = false,
)

@Serializable
data class PublicBidEventDto(
    val amount: Double = 0.0,
    val quantity: Int = 1,
    val status: String = "",
    val createdAt: String? = null,
    val bidderLabel: String = "",
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ProductBidSummaryDto(
    @Serializable(with = FlexibleObjectIdSerializer::class) val productId: String = "",
    val totalBids: Int = 0,
    val highestBidAmount: Double? = null,
    val highestBidQuantity: Int? = null,
    val highestBidAt: String? = null,
    val recentBids: List<PublicBidEventDto> = emptyList(),
    val isBargainOpen: Boolean = false,
    val scheduleStatus: String = "inactive",
    val scheduleEndDate: String? = null,
)

@Serializable
data class PlaceBidRequestDto(
    val amount: Double,
    val quantity: Int = 1,
    val shippingInfo: BidShippingInfoDto,
)

@Serializable
data class BidShippingInfoDto(
    val name: String,
    val email: String,
    val phone: String,
    val address: String,
    val city: String,
    val state: String,
    val postalCode: String,
)

@Serializable
data class ScheduleBargainRequestDto(
    val startDate: String,
    val endDate: String,
    val reservePrice: Double = 0.0,
)

@Serializable
data class CloseBargainRequestDto(
    val force: Boolean = false,
)

fun seedActiveBargains(): List<BargainScheduleDto> {
    val products =
        com.notwhat.shared.catalog
            .seedProducts()
    return products.take(2).mapIndexed { idx, p ->
        BargainScheduleDto(
            id = "seed-bargain-$idx",
            productId = p.id,
            startDate = "2026-08-01T10:00:00.000Z",
            endDate = "2026-08-03T10:00:00.000Z",
            reservePrice = p.price * 0.7,
            status = "active",
        )
    }
}
