package com.notwhat.shared.cart

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer cart endpoints. */
class CartRepository(private val client: ApiClient) {

    suspend fun getCart(bearerToken: String): NetworkResult<CartDto> =
        runCatchingNetwork { client.get("cart", bearerToken = bearerToken) }

    suspend fun addItem(request: AddCartItemRequestDto, bearerToken: String): NetworkResult<CartDto> =
        runCatchingNetwork { client.post("cart/items", request, bearerToken) }

    suspend fun updateItem(itemId: String, request: UpdateCartItemRequestDto, bearerToken: String): NetworkResult<CartDto> =
        runCatchingNetwork { client.patch("cart/items/$itemId", request, bearerToken) }

    suspend fun removeItem(itemId: String, bearerToken: String): NetworkResult<CartDto> =
        runCatchingNetwork { client.delete("cart/items/$itemId", bearerToken) }
}
