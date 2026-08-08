package com.notwhat.shared.order

import com.notwhat.shared.catalog.ProductDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNames
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement

// Handles productId being either a plain string ID or a populated object from different endpoints
private object FlexibleProductDtoSerializer : KSerializer<ProductDto?> {
    override val descriptor = buildClassSerialDescriptor("FlexibleProductDto")

    override fun deserialize(decoder: Decoder): ProductDto? {
        val jsonDecoder = decoder as? JsonDecoder ?: return null
        return when (val el = jsonDecoder.decodeJsonElement()) {
            is JsonNull -> null

            is JsonPrimitive -> null

            // string ID only — no product data to deserialize
            is JsonObject -> jsonDecoder.json.decodeFromJsonElement(el)

            else -> null
        }
    }

    override fun serialize(
        encoder: Encoder,
        value: ProductDto?,
    ) {
        val jsonEncoder = encoder as? JsonEncoder ?: return
        jsonEncoder.encodeJsonElement(if (value == null) JsonNull else jsonEncoder.json.encodeToJsonElement(value))
    }
}

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class OrderItemDto(
    @JsonNames("id", "_id") val id: String = "",
    @Serializable(with = FlexibleProductDtoSerializer::class) val productId: ProductDto? = null,
    // storeId omitted: buyer orders return it as a string, seller orders as an object;
    // ignoreUnknownKeys handles both since no screen reads this field
    val titleSnapshot: String = "",
    val imageSnapshot: String? = null,
    val quantity: Int = 1,
    val priceSnapshot: Double = 0.0,
    val itemTotal: Double = 0.0,
    @JsonNames("status", "itemStatus") val status: String = "placed",
    val trackingNumber: String? = null,
    val trackingUrl: String? = null,
    val itemDeliveredAt: String? = null,
    val payoutStatus: String = "pending",
    val returnStatus: String? = null,
    val returnAcceptanceStatus: String? = null,
)

@Serializable
data class DeliveryAddressSnapshotDto(
    val fullName: String = "",
    val phone: String = "",
    val addressLine1: String = "",
    val addressLine2: String? = null,
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val country: String = "India",
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class OrderDto(
    @JsonNames("id", "_id") val id: String = "",
    val orderNumber: String? = null,
    val buyerId: String = "",
    val items: List<OrderItemDto> = emptyList(),
    val subtotal: Double = 0.0,
    @JsonNames("shippingAmount", "shipping") val shippingAmount: Double = 0.0,
    @JsonNames("totalAmount", "finalTotal") val totalAmount: Double = 0.0,
    // backend schema uses orderStatus; some views return status
    @JsonNames("status", "orderStatus") val status: String = "placed",
    val paymentStatus: String? = null,
    val paymentId: String? = null,
    val paymentMethod: String? = null,
    val razorpayOrderId: String? = null,
    @JsonNames("deliveryAddress", "shippingAddressSnapshot") val deliveryAddress: DeliveryAddressSnapshotDto? = null,
    val cancelReason: String? = null,
    val refundAmount: Double? = null,
    val refundStatus: String? = null,
    val trackingNumber: String? = null,
    val trackingCarrier: String? = null,
    val trackingUrl: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class CancelOrderRequestDto(
    val reason: String,
)

@Serializable
data class ReturnRequestDto(
    val reason: String,
    val description: String? = null,
    val imageUrls: List<String> = emptyList(),
)

@Serializable
data class RefundStatusDto(
    val refundStatus: String? = null,
    val refundAmount: Double? = null,
)

@Serializable
data class ReturnStatusDto(
    val returnStatus: String? = null,
    val acceptanceStatus: String? = null,
)

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

fun seedOrders(): List<OrderDto> {
    val seedProduct =
        com.notwhat.shared.catalog
            .seedProducts()
            .first()
    val item =
        OrderItemDto(
            id = "seed-order-item-1",
            productId = seedProduct,
            titleSnapshot = seedProduct.title,
            imageSnapshot = seedProduct.imageUrls.firstOrNull(),
            quantity = 1,
            priceSnapshot = seedProduct.price,
            itemTotal = seedProduct.price,
            status = "shipped",
            trackingNumber = "SR123456789IN",
        )
    return listOf(
        OrderDto(
            id = "seed-order-1",
            buyerId = "seed-buyer",
            items = listOf(item),
            subtotal = seedProduct.price,
            shippingAmount = 99.0,
            totalAmount = seedProduct.price + 99.0,
            status = "shipped",
            deliveryAddress =
                DeliveryAddressSnapshotDto(
                    fullName = "Aryan Sharma",
                    phone = "9999999999",
                    addressLine1 = "12 MG Road",
                    city = "Jaipur",
                    state = "Rajasthan",
                    pincode = "302001",
                ),
            createdAt = "2026-07-28T10:30:00.000Z",
        ),
    )
}
