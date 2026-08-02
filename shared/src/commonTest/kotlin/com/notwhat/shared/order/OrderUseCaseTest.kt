package com.notwhat.shared.order

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.order.OrderUseCase
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class OrderUseCaseTest {
    private fun useCase(): OrderUseCase {
        val config = AppConfig(initialBackendMode = BackendFlowMode.MOCK)
        val repo = OrderRepository(ApiClient("http://localhost:5001/api", ApiClient.buildDefaultClient()))
        return OrderUseCase(config, repo)
    }

    @Test
    fun listOrders_inMockModeReturnsSeedOrders() {
        val result = kotlinx.coroutines.runBlocking { useCase().listOrders("mock-token") }
        assertTrue(result.isSuccess)
        val orders = result.getOrNull()!!
        assertTrue(orders.isNotEmpty())
        orders.forEach { assertFalse(it.id.isBlank()) }
    }

    @Test
    fun getOrder_inMockModeReturnsSeedOrder() {
        val result = kotlinx.coroutines.runBlocking { useCase().getOrder("seed-order-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertEquals("seed-order-1", result.getOrNull()!!.id)
    }

    @Test
    fun cancelOrder_inMockModeSetsCancelledStatus() {
        val result = kotlinx.coroutines.runBlocking {
            useCase().cancelOrder("seed-order-1", "Changed my mind", "mock-token")
        }
        assertTrue(result.isSuccess)
        assertEquals("cancelled", result.getOrNull()!!.status)
        assertEquals("Changed my mind", result.getOrNull()!!.cancelReason)
    }

    @Test
    fun requestReturn_inMockModeSetsReturnRequestedStatus() {
        val result = kotlinx.coroutines.runBlocking {
            useCase().requestReturn("seed-order-1", ReturnRequestDto("Wrong size"), "mock-token")
        }
        assertTrue(result.isSuccess)
        assertEquals("return_requested", result.getOrNull()!!.status)
    }

    @Test
    fun getRefundStatus_inMockModeReturnsPending() {
        val result = kotlinx.coroutines.runBlocking { useCase().getRefundStatus("seed-order-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertEquals("pending", result.getOrNull()!!.refundStatus)
    }

    @Test
    fun getReturnStatus_inMockModeReturnsPending() {
        val result = kotlinx.coroutines.runBlocking { useCase().getReturnStatus("seed-order-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertEquals("pending", result.getOrNull()!!.returnStatus)
    }

    @Test
    fun seedOrders_hasCorrectStructure() {
        val orders = seedOrders()
        assertTrue(orders.isNotEmpty())
        val first = orders.first()
        assertFalse(first.id.isBlank())
        assertTrue(first.items.isNotEmpty())
        assertNotNull(first.deliveryAddress)
        assertTrue(first.totalAmount > 0)
    }
}
