package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.address.AddressDto
import com.notwhat.shared.address.AddressRepository
import com.notwhat.shared.address.seedDeliveryAddresses
import com.notwhat.shared.cart.CartDto
import com.notwhat.shared.cart.seedCart
import com.notwhat.shared.domain.cart.CartUseCase
import com.notwhat.shared.domain.order.OrderUseCase
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.order.seedOrders

internal class BuyerTransactionState(
    private val cartUseCase: CartUseCase,
    private val orderUseCase: OrderUseCase,
    private val addressRepository: AddressRepository,
) {
    var cart by mutableStateOf<CartDto?>(null)
        private set
    var orders by mutableStateOf<List<OrderDto>>(emptyList())
        private set
    var addresses by mutableStateOf<List<AddressDto>>(emptyList())
        private set
    var isCartLoading by mutableStateOf(false)
        private set
    var isOrdersLoading by mutableStateOf(false)
        private set

    suspend fun loadCart(bearerToken: String) {
        isCartLoading = true
        cart = cartUseCase.getCart(bearerToken).getOrNull() ?: seedCart()
        isCartLoading = false
    }

    suspend fun loadOrders(bearerToken: String) {
        isOrdersLoading = true
        orders = orderUseCase.listOrders(bearerToken).getOrNull() ?: seedOrders()
        isOrdersLoading = false
    }

    suspend fun loadAddresses(bearerToken: String) {
        addresses = addressRepository.listDeliveryAddresses(bearerToken).getOrNull() ?: seedDeliveryAddresses()
    }

    suspend fun load(bearerToken: String) {
        loadCart(bearerToken)
        loadOrders(bearerToken)
        loadAddresses(bearerToken)
    }

    /** Re-fetches cart after a mutation (add/remove/update). */
    suspend fun refreshCart(bearerToken: String) {
        cart = cartUseCase.getCart(bearerToken).getOrNull() ?: cart
    }
}
