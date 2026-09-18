package com.notwhat.shared.seller

import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.ProductRepository
import com.notwhat.shared.catalog.ReelRepository
import com.notwhat.shared.catalog.StoreRepository
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
import com.notwhat.shared.catalog.taggedProductIds
import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.catalog.CatalogUseCase
import com.notwhat.shared.domain.seller.SellerUseCase
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SellerUseCaseTest {
    private fun useCase(): SellerUseCase {
        val config = AppConfig(initialBackendMode = BackendFlowMode.MOCK)
        val client = ApiClient("http://localhost:5001/api", ApiClient.buildDefaultClient())
        val catalogUseCase =
            CatalogUseCase(
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
    fun createProduct_inMockModeReflectsRequestFields() {
        val result =
            kotlinx.coroutines.runBlocking {
                useCase().createProduct(
                    CreateProductRequestDto(
                        title = "Festive Brocade Kurta",
                        description = "Hand-finished festive kurta.",
                        category = "Kurtas",
                        region = "North India",
                        price = 2499.0,
                        stock = 6,
                    ),
                    "mock-token",
                )
            }
        assertTrue(result.isSuccess)
        assertEquals("Festive Brocade Kurta", result.getOrNull()!!.title)
        assertEquals(2499.0, result.getOrNull()!!.price)
    }

    @Test
    fun updateProduct_inMockModeReturnsRequestedId() {
        val result =
            kotlinx.coroutines.runBlocking {
                useCase().updateProduct(
                    id = "seller-product-42",
                    request = UpdateProductRequestDto(title = "Edited Product", stock = 4),
                    bearerToken = "mock-token",
                )
            }
        assertTrue(result.isSuccess)
        assertEquals("seller-product-42", result.getOrNull()!!.id)
    }

    @Test
    fun deleteProduct_inMockModeReturnsDeletedFlag() {
        val result = kotlinx.coroutines.runBlocking { useCase().deleteProduct("seller-product-42", "mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.deleted)
    }

    @Test
    fun createReel_inMockModeMapsTaggedProductIdsIntoProducts() {
        val result =
            kotlinx.coroutines.runBlocking {
                useCase().createReel(
                    CreateReelRequestDto(
                        videoUrl = "https://example.com/reel.mp4",
                        thumbnailUrl = "https://example.com/reel.jpg",
                        caption = "Fresh reel",
                        region = "North India",
                        category = "Sarees",
                        taggedProductIds = listOf("seed-product-1", "seed-product-2"),
                    ),
                    "mock-token",
                )
            }
        assertTrue(result.isSuccess)
        assertEquals(listOf("seed-product-1", "seed-product-2"), result.getOrNull()!!.taggedProductIds)
    }

    @Test
    fun updateReel_inMockModeUpdatesCaptionAndTaggedProducts() {
        val result =
            kotlinx.coroutines.runBlocking {
                useCase().updateReel(
                    id = "seller-reel-99",
                    request = UpdateReelRequestDto(caption = "Edited reel", taggedProductIds = listOf("seed-product-3")),
                    bearerToken = "mock-token",
                )
            }
        assertTrue(result.isSuccess)
        val reel = result.getOrNull()!!
        assertEquals("seller-reel-99", reel.id)
        assertEquals("Edited reel", reel.caption)
        assertEquals(listOf("seed-product-3"), reel.taggedProductIds)
    }

    @Test
    fun deleteReel_inMockModeReturnsDeletedFlag() {
        val result = kotlinx.coroutines.runBlocking { useCase().deleteReel("seller-reel-99", "mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.deleted)
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
