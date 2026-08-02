package com.notwhat.shared.seller

import com.notwhat.shared.catalog.StoreCardDto
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.order.OrderItemDto
import com.notwhat.shared.order.seedOrders
import kotlinx.serialization.Serializable

@Serializable
data class ShipOrderRequestDto(
    val trackingNumber: String,
    val courier: String? = null,
    val trackingUrl: String? = null,
)

@Serializable
data class UpdateStatusRequestDto(val status: String)

@Serializable
data class RejectOrderRequestDto(val reason: String)

fun seedSellerOrders(): List<OrderDto> = seedOrders().map { it.copy(status = "placed") } +
    listOf(
        OrderDto(
            id = "seed-seller-order-2",
            buyerId = "seed-buyer-2",
            items = listOf(
                OrderItemDto(
                    id = "seed-si-2",
                    productId = "seed-product-2",
                    storeId = StoreCardDto(id = "seed-store-1", storeName = "Jaipur Looms"),
                    titleSnapshot = "Banarasi Silk Saree",
                    quantity = 1,
                    priceSnapshot = 6499.0,
                    itemTotal = 6499.0,
                    status = "placed",
                ),
            ),
            subtotal = 6499.0,
            shippingAmount = 0.0,
            totalAmount = 6499.0,
            status = "placed",
            createdAt = "2026-08-01T14:00:00.000Z",
        ),
    )
