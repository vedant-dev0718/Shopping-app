package com.notwhat.shared.catalog

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.catalog.CatalogUseCase
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class CatalogUseCaseTest {
    private fun mockClient() = ApiClient(baseUrl = "http://localhost:5001/api", httpClient = ApiClient.buildDefaultClient())
    private fun mockConfig() = AppConfig(initialBackendMode = BackendFlowMode.MOCK)

    private fun useCase(): CatalogUseCase {
        val config = mockConfig()
        val client = mockClient()
        return CatalogUseCase(
            config = config,
            productRepository = ProductRepository(client),
            reelRepository = ReelRepository(client),
            storeRepository = StoreRepository(client),
        )
    }

    // Products
    @Test
    fun listProducts_inMockModeReturnsSeedProducts() {
        val result = kotlinx.coroutines.runBlocking { useCase().listProducts() }
        assertTrue(result.isSuccess)
        val products = result.getOrNull()!!
        assertTrue(products.isNotEmpty())
        products.forEach { assertFalse(it.id.isBlank()) }
    }

    @Test
    fun getProduct_inMockModeReturnsMatchingProduct() {
        val result = kotlinx.coroutines.runBlocking { useCase().getProduct("seed-product-1") }
        assertTrue(result.isSuccess)
        assertEquals("seed-product-1", result.getOrNull()!!.id)
    }

    @Test
    fun getRelatedProducts_excludesTargetProduct() {
        val result = kotlinx.coroutines.runBlocking { useCase().getRelatedProducts("seed-product-1") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.none { it.id == "seed-product-1" })
    }

    @Test
    fun saveProduct_inMockModeReturnsSaved() {
        val result = kotlinx.coroutines.runBlocking { useCase().saveProduct("seed-product-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.isSaved)
    }

    @Test
    fun listSellerProducts_inMockModeReturnsSeedProducts() {
        val result = kotlinx.coroutines.runBlocking { useCase().listSellerProducts("mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.isNotEmpty())
    }

    @Test
    fun createProduct_inMockModeReflectsTitle() {
        val request = CreateProductRequestDto(
            title = "Kantha Stitch Saree",
            description = "Hand-stitched Kantha saree from West Bengal.",
            category = "Sarees",
            region = "West Bengal",
            price = 3299.0,
            stock = 8,
        )
        val result = kotlinx.coroutines.runBlocking { useCase().createProduct(request, "mock-token") }
        assertTrue(result.isSuccess)
        assertEquals("Kantha Stitch Saree", result.getOrNull()!!.title)
    }

    @Test
    fun deleteProduct_inMockModeReturnsDeleted() {
        val result = kotlinx.coroutines.runBlocking { useCase().deleteProduct("seed-product-1", "mock-token") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.deleted)
    }

    // Reels
    @Test
    fun listReels_inMockModeReturnsSeedReels() {
        val result = kotlinx.coroutines.runBlocking { useCase().listReels() }
        assertTrue(result.isSuccess)
        val reels = result.getOrNull()!!
        assertTrue(reels.isNotEmpty())
        reels.forEach { assertFalse(it.videoUrl.isBlank()) }
    }

    @Test
    fun getReel_inMockModeReturnsMatchingReel() {
        val result = kotlinx.coroutines.runBlocking { useCase().getReel("seed-reel-1") }
        assertTrue(result.isSuccess)
        assertEquals("seed-reel-1", result.getOrNull()!!.id)
    }

    @Test
    fun getTaggedProducts_inMockModeReturnsProducts() {
        val result = kotlinx.coroutines.runBlocking { useCase().getTaggedProducts("seed-reel-1") }
        assertTrue(result.isSuccess)
        assertTrue(result.getOrNull()!!.isNotEmpty())
    }

    // Stores
    @Test
    fun listStores_inMockModeReturnsSeedStores() {
        val result = kotlinx.coroutines.runBlocking { useCase().listStores() }
        assertTrue(result.isSuccess)
        val stores = result.getOrNull()!!
        assertTrue(stores.isNotEmpty())
        stores.forEach { assertFalse(it.storeName.isBlank()) }
    }

    @Test
    fun getStore_inMockModeReturnsMatchingStore() {
        val result = kotlinx.coroutines.runBlocking { useCase().getStore("seed-store-1") }
        assertTrue(result.isSuccess)
        assertEquals("seed-store-1", result.getOrNull()!!.id)
    }

    @Test
    fun getSellerStore_inMockModeReturnsSeedStore() {
        val result = kotlinx.coroutines.runBlocking { useCase().getSellerStore("mock-token") }
        assertTrue(result.isSuccess)
        assertFalse(result.getOrNull()!!.storeName.isBlank())
    }
}
