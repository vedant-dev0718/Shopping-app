package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.address.AddressDto
import com.notwhat.shared.address.AddressRepository
import com.notwhat.shared.address.AddressRequestDto
import com.notwhat.shared.cart.CartDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.domain.cart.CartUseCase
import com.notwhat.shared.domain.order.OrderUseCase
import com.notwhat.shared.order.OrderDto

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
    var selectedDeliveryAddressId by mutableStateOf<String?>(null)
        private set
    var isCartLoading by mutableStateOf(false)
        private set
    var cartErrorMessage by mutableStateOf<String?>(null)
        private set
    var isOrdersLoading by mutableStateOf(false)
        private set
    var ordersErrorMessage by mutableStateOf<String?>(null)
        private set
    var addressesErrorMessage by mutableStateOf<String?>(null)
        private set

    suspend fun loadCart(bearerToken: String) {
        isCartLoading = true
        cartErrorMessage = null
        when (val result = cartUseCase.getCart(bearerToken)) {
            is NetworkResult.Success -> {
                cart = result.data
            }

            is NetworkResult.Failure -> {
                cart = null
                cartErrorMessage = result.error.userMessage()
            }
        }
        isCartLoading = false
    }

    suspend fun loadOrders(bearerToken: String) {
        isOrdersLoading = true
        ordersErrorMessage = null
        when (val result = orderUseCase.listOrders(bearerToken)) {
            is NetworkResult.Success -> {
                orders = result.data
            }

            is NetworkResult.Failure -> {
                orders = emptyList()
                ordersErrorMessage = result.error.userMessage()
            }
        }
        isOrdersLoading = false
    }

    suspend fun loadAddresses(bearerToken: String) {
        addressesErrorMessage = null
        when (val result = addressRepository.listDeliveryAddresses(bearerToken)) {
            is NetworkResult.Success -> {
                addresses = result.data
                syncSelectedDeliveryAddress()
            }

            is NetworkResult.Failure -> {
                addresses = emptyList()
                addressesErrorMessage = result.error.userMessage()
                selectedDeliveryAddressId = null
            }
        }
    }

    suspend fun createDeliveryAddress(
        request: AddressRequestDto,
        bearerToken: String,
    ): NetworkResult<AddressDto> {
        addressesErrorMessage = null
        return when (val result = addressRepository.createDeliveryAddress(request, bearerToken)) {
            is NetworkResult.Success -> {
                loadAddresses(bearerToken)
                selectDeliveryAddress(result.data.id)
                result
            }

            is NetworkResult.Failure -> {
                addressesErrorMessage = result.error.userMessage()
                result
            }
        }
    }

    suspend fun setDefaultDeliveryAddress(
        addressId: String,
        bearerToken: String,
    ): NetworkResult<AddressDto> {
        addressesErrorMessage = null
        return when (val result = addressRepository.setDefaultDeliveryAddress(addressId, bearerToken)) {
            is NetworkResult.Success -> {
                loadAddresses(bearerToken)
                selectDeliveryAddress(addressId)
                result
            }

            is NetworkResult.Failure -> {
                addressesErrorMessage = result.error.userMessage()
                result
            }
        }
    }

    suspend fun updateDeliveryAddress(
        addressId: String,
        request: AddressRequestDto,
        bearerToken: String,
    ): NetworkResult<AddressDto> {
        addressesErrorMessage = null
        return when (val result = addressRepository.updateDeliveryAddress(addressId, request, bearerToken)) {
            is NetworkResult.Success -> {
                loadAddresses(bearerToken)
                selectDeliveryAddress(addressId)
                result
            }

            is NetworkResult.Failure -> {
                addressesErrorMessage = result.error.userMessage()
                result
            }
        }
    }

    suspend fun deleteDeliveryAddress(
        addressId: String,
        bearerToken: String,
    ): NetworkResult<Unit> {
        addressesErrorMessage = null
        val wasDefault = addresses.firstOrNull { it.id == addressId }?.isDefault == true
        return when (val result = addressRepository.deleteDeliveryAddress(addressId, bearerToken)) {
            is NetworkResult.Success -> {
                if (selectedDeliveryAddressId == addressId) {
                    clearSelectedDeliveryAddress()
                }
                loadAddresses(bearerToken)
                if (wasDefault && addresses.isNotEmpty() && addresses.none { it.isDefault }) {
                    setDefaultDeliveryAddress(addresses.first().id, bearerToken)
                }
                result.map { Unit }
            }

            is NetworkResult.Failure -> {
                addressesErrorMessage = result.error.userMessage()
                NetworkResult.Failure(result.error)
            }
        }
    }

    suspend fun load(bearerToken: String) {
        loadCart(bearerToken)
        loadOrders(bearerToken)
        loadAddresses(bearerToken)
    }

    /** Re-fetches cart after a mutation (add/remove/update). */
    suspend fun refreshCart(bearerToken: String) {
        cartErrorMessage = null
        when (val result = cartUseCase.getCart(bearerToken)) {
            is NetworkResult.Success -> {
                cart = result.data
            }

            is NetworkResult.Failure -> {
                cartErrorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun addCartItem(
        productId: String,
        quantity: Int = 1,
        bargainBidId: String? = null,
        bearerToken: String,
    ): NetworkResult<CartDto> =
        cartUseCase.addItem(
            com.notwhat.shared.cart
                .AddCartItemRequestDto(productId = productId, quantity = quantity, bargainBidId = bargainBidId),
            bearerToken,
        )

    /** Quantity below 1 removes the line instead of sending an invalid update. */
    suspend fun updateCartItemQuantity(
        itemId: String,
        quantity: Int,
        bearerToken: String,
    ): NetworkResult<CartDto> {
        if (quantity < 1) return removeCartItem(itemId, bearerToken)

        cartErrorMessage = null
        return when (val result = cartUseCase.updateItem(itemId, quantity, bearerToken)) {
            is NetworkResult.Success -> {
                cart = result.data
                result
            }

            is NetworkResult.Failure -> {
                cartErrorMessage = result.error.userMessage()
                result
            }
        }
    }

    suspend fun removeCartItem(
        itemId: String,
        bearerToken: String,
    ): NetworkResult<CartDto> {
        cartErrorMessage = null
        return when (val result = cartUseCase.removeItem(itemId, bearerToken)) {
            is NetworkResult.Success -> {
                cart = result.data
                result
            }

            is NetworkResult.Failure -> {
                cartErrorMessage = result.error.userMessage()
                result
            }
        }
    }

    fun selectDeliveryAddress(addressId: String) {
        selectedDeliveryAddressId = addressId
    }

    fun clearSelectedDeliveryAddress() {
        selectedDeliveryAddressId = null
    }

    private fun syncSelectedDeliveryAddress() {
        val currentSelection = selectedDeliveryAddressId
        if (!currentSelection.isNullOrBlank() && addresses.any { it.id == currentSelection }) {
            return
        }

        selectedDeliveryAddressId = addresses.firstOrNull { it.isDefault }?.id ?: addresses.firstOrNull()?.id
    }
}
