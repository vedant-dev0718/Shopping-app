package com.notwhat.shared.cart

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.cart.CartUseCase
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CartUseCaseTest {
    private fun useCase(): CartUseCase {
        val config = AppConfig(initialBackendMode = BackendFlowMode.MOCK)
        val repo = CartRepository(ApiClient("http://localhost:5001/api", ApiClient.buildDefaultClient()))
        return CartUseCase(config, repo)
    }

    @Test
    fun getCart_inMockModeReturnsSeedCart() {
        val result = kotlinx.coroutines.runBlocking { useCase().getCart("mock-token") }
        assertTrue(result.isSuccess)
        val cart = result.getOrNull()!!
        assertTrue(cart.items.isNotEmpty())
        assertTrue(cart.finalTotal > 0)
    }

    @Test
    fun addItem_inMockModeReturnsSeedCart() {
        val result = kotlinx.coroutines.runBlocking {
            useCase().addItem(AddCartItemRequestDto("seed-product-1", 1), "mock-token")
        }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.items.isNotEmpty())
    }

    @Test
    fun updateItem_inMockModeReturnsSeedCart() {
        val result = kotlinx.coroutines.runBlocking {
            useCase().updateItem("seed-item-1", 2, "mock-token")
        }
        assertTrue(result.isSuccess)
        assertNotNull(result.getOrNull())
    }

    @Test
    fun removeItem_inMockModeClearsItems() {
        val result = kotlinx.coroutines.runBlocking {
            useCase().removeItem("seed-item-1", "mock-token")
        }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.items.isEmpty())
        assertEquals(0.0, result.getOrNull()!!.finalTotal)
    }

    @Test
    fun seedCart_hasCorrectShippingLogic() {
        val cart = seedCart()
        // seed product price is 1899 (>= 500) so shipping should be 0
        assertEquals(0.0, cart.shipping)
        assertEquals(cart.subtotal, cart.finalTotal)
    }

    private fun assertNotNull(value: Any?) = assertTrue(value != null)
}
