package com.notwhat.shared.order

import com.notwhat.shared.catalog.StoreCardDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class OrderItemDto(
    @JsonNames("id", "_id") val id: String = "",
    val productId: String = "",
    val storeId: StoreCardDto? = null,
    val titleSnapshot: String = "",
    val imageSnapshot: String? = null,
    val quantity: Int = 1,
    val priceSnapshot: Double = 0.0,
    val itemTotal: Double = 0.0,
    val status: String = "placed",
    val trackingNumber: String? = null,
    val trackingUrl: String? = null,
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
    val buyerId: String = "",
    val items: List<OrderItemDto> = emptyList(),
    val subtotal: Double = 0.0,
    val shippingAmount: Double = 0.0,
    val totalAmount: Double = 0.0,
    val status: String = "placed",
    val paymentId: String? = null,
    val razorpayOrderId: String? = null,
    val deliveryAddress: DeliveryAddressSnapshotDto? = null,
    val cancelReason: String? = null,
    val refundAmount: Double? = null,
    val refundStatus: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class CancelOrderRequestDto(val reason: String)

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
    val seedProduct = com.notwhat.shared.catalog.seedProducts().first()
    val item = OrderItemDto(
        id = "seed-order-item-1",
        productId = seedProduct.id,
        storeId = seedProduct.storeId,
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
            deliveryAddress = DeliveryAddressSnapshotDto(
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
