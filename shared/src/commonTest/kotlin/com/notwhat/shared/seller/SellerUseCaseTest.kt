package com.notwhat.shared.seller

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.seller.SellerUseCase
import com.notwhat.shared.domain.catalog.CatalogUseCase
import com.notwhat.shared.catalog.ProductRepository
import com.notwhat.shared.catalog.ReelRepository
import com.notwhat.shared.catalog.StoreRepository
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SellerUseCaseTest {
    private fun useCase(): SellerUseCase {
        val config = AppConfig(initialBackendMode = BackendFlowMode.MOCK)
        val client = ApiClient("http://localhost:5001/api", ApiClient.buildDefaultClient())
        val catalogUseCase = CatalogUseCase(
            config = config,
            productRepository = ProductRepository(client),
            reelRepository = ReelRepository(client),
            storeRepository = StoreRepository(client),
        )
        val sellerOrderRepo = SellerOrderRepository(client)
        return SellerUseCase(config, catalogUseCase, sellerOrderRepo)
    }

    @Test
    fun listProducts_inMockModeReturnsSeedProducts() {
        val result = kotlinx.coroutines.runBlocking { useCase().listProducts("mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.isNotEmpty())
    }

    @Test
    fun listReels_inMockModeReturnsSeedReels() {
        val result = kotlinx.coroutines.runBlocking { useCase().listReels("mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.isNotEmpty())
    }

    @Test
    fun listOrders_inMockModeReturnsSeedSellerOrders() {
        val result = kotlinx.coroutines.runBlocking { useCase().listOrders("mock-token") }
        assertTrue(result.isSuccess)
        val orders = result.getOrNull()!!
        assertTrue(orders.isNotEmpty())
        orders.forEach { assertFalse(it.id.isBlank()) }
    }

    @Test
    fun acceptOrder_inMockModeSetsAcceptedStatus() {
        val result = kotlinx.coroutines.runBlocking { useCase().acceptOrder("seed-order-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.status == "accepted")
    }
}
