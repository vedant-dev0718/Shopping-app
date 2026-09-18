package com.notwhat.shared.domain.cart

import com.notwhat.shared.cart.AddCartItemRequestDto
import com.notwhat.shared.cart.CartDto
import com.notwhat.shared.cart.CartRepository
import com.notwhat.shared.cart.UpdateCartItemRequestDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class CartUseCase(
    private val config: AppConfig,
    private val repository: CartRepository,
) {
    suspend fun getCart(bearerToken: String): NetworkResult<CartDto> = repository.getCart(bearerToken)

    suspend fun addItem(
        request: AddCartItemRequestDto,
        bearerToken: String,
    ): NetworkResult<CartDto> = repository.addItem(request, bearerToken)

    suspend fun updateItem(
        itemId: String,
        quantity: Int,
        bearerToken: String,
    ): NetworkResult<CartDto> = repository.updateItem(itemId, UpdateCartItemRequestDto(quantity), bearerToken)

    suspend fun removeItem(
        itemId: String,
        bearerToken: String,
    ): NetworkResult<CartDto> = repository.removeItem(itemId, bearerToken)
}
