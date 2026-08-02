package com.notwhat.shared.cart

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreCardDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class CartItemDto(
    @JsonNames("id", "_id") val id: String = "",
    val productId: ProductDto? = null,
    val quantity: Int = 1,
    val priceSnapshot: Double = 0.0,
    val itemTotal: Double = 0.0,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class CartDto(
    @JsonNames("id", "_id") val id: String = "",
    val items: List<CartItemDto> = emptyList(),
    val subtotal: Double = 0.0,
    val shipping: Double = 0.0,
    val finalTotal: Double = 0.0,
)

@Serializable
data class AddCartItemRequestDto(
    val productId: String,
    val quantity: Int = 1,
)

@Serializable
data class UpdateCartItemRequestDto(
    val quantity: Int,
)

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

fun seedCart(): CartDto {
    val seedProduct = com.notwhat.shared.catalog.seedProducts().first()
    val item = CartItemDto(
        id = "seed-item-1",
        productId = seedProduct,
        quantity = 1,
        priceSnapshot = seedProduct.price,
        itemTotal = seedProduct.price,
    )
    return CartDto(
        id = "seed-cart-1",
        items = listOf(item),
        subtotal = seedProduct.price,
        shipping = if (seedProduct.price >= 500) 0.0 else 99.0,
        finalTotal = seedProduct.price + if (seedProduct.price >= 500) 0.0 else 99.0,
    )
}
