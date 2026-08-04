package com.notwhat.shared.catalog

import com.notwhat.shared.discovery.FeedItemDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@OptIn(ExperimentalSerializationApi::class)
class CatalogDtoDecodingTest {
    private val json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

    @Test
    fun productDto_decodesMongoIdField() {
        val raw = """{"_id":"abc123","title":"Test Kurta","description":"desc","category":"Kurtas","region":"Rajasthan","price":999,"stock":5,"imageUrls":[],"status":"active"}"""
        val dto = json.decodeFromString<ProductDto>(raw)
        assertEquals("abc123", dto.id)
        assertEquals("Test Kurta", dto.title)
        assertEquals(999.0, dto.price)
    }

    @Test
    fun productDto_decodesIdField() {
        val raw = """{"id":"xyz789","title":"Silk Saree","description":"desc","category":"Sarees","region":"UP","price":4999,"stock":2,"imageUrls":[],"status":"active"}"""
        val dto = json.decodeFromString<ProductDto>(raw)
        assertEquals("xyz789", dto.id)
    }

    @Test
    fun productDto_decodesStoreCard() {
        val raw = """{"_id":"p1","title":"Top","description":"d","category":"Tops","region":"GJ","price":500,"stock":1,"imageUrls":[],"status":"active","storeId":{"_id":"s1","storeName":"Mumbai Threads","verified":true}}"""
        val dto = json.decodeFromString<ProductDto>(raw)
        assertNotNull(dto.storeId)
        assertEquals("s1", dto.storeId!!.id)
        assertEquals("Mumbai Threads", dto.storeId!!.storeName)
        assertTrue(dto.storeId!!.verified)
    }

    @Test
    fun reelDto_decodesWithOptionalFields() {
        val raw = """{"_id":"r1","videoUrl":"https://video.mp4","thumbnailUrl":"https://thumb.jpg","region":"MH","category":"Tops","status":"active","viewCount":120,"likeCount":30,"processingStatus":"ready"}"""
        val dto = json.decodeFromString<ReelDto>(raw)
        assertEquals("r1", dto.id)
        assertEquals(120, dto.viewCount)
        assertFalse(dto.isLiked)
        assertTrue(dto.hashtags.isEmpty())
    }

    @Test
    fun reelDto_decodesPopulatedTaggedProducts() {
        val raw = """{"_id":"r1","videoUrl":"https://video.mp4","thumbnailUrl":"https://thumb.jpg","region":"MH","category":"Tops","taggedProductIds":[{"_id":"p1","title":"Top","description":"d","category":"Tops","region":"MH","price":500,"stock":1,"imageUrls":[],"status":"active"}],"status":"active"}"""
        val dto = json.decodeFromString<ReelDto>(raw)
        assertEquals(listOf("p1"), dto.taggedProductIds)
        assertEquals("Top", dto.taggedProducts.first().title)
    }

    @Test
    fun reelDto_decodesTaggedProductIdsAsStubProducts() {
        val raw = """{"_id":"r1","videoUrl":"https://video.mp4","thumbnailUrl":"https://thumb.jpg","region":"MH","category":"Tops","taggedProductIds":["p1","p2"],"status":"active"}"""
        val dto = json.decodeFromString<ReelDto>(raw)
        assertEquals(listOf("p1", "p2"), dto.taggedProductIds)
        assertTrue(dto.taggedProducts.all { it.title.isBlank() })
    }

    @Test
    fun saveProductResponseDto_decodesSavedField() {
        val raw = """{"saved":true,"productId":"p1","saveCount":3}"""
        val dto = json.decodeFromString<SaveProductResponseDto>(raw)
        assertTrue(dto.isSaved)
        assertEquals("p1", dto.productId)
        assertEquals(3, dto.saveCount)
    }

    @Test
    fun feedItemDto_decodesTypeAndDataPayload() {
        val raw = """{"type":"reel","createdAt":"2026-08-03T00:00:00.000Z","data":{"_id":"r1","videoUrl":"https://video.mp4","thumbnailUrl":"https://thumb.jpg","region":"MH","category":"Tops","taggedProductIds":[{"_id":"p1","title":"Top","description":"d","category":"Tops","region":"MH","price":500,"stock":1,"imageUrls":[],"status":"active"}],"status":"active"}}"""
        val dto = json.decodeFromString<FeedItemDto>(raw)
        assertEquals("reel", dto.type)
        assertEquals("r1", dto.id)
        assertNotNull(dto.reel)
        assertEquals(listOf("p1"), dto.reel!!.taggedProductIds)
        assertEquals("2026-08-03T00:00:00.000Z", dto.createdAt)
    }

    @Test
    fun storeDto_decodesWithDefaults() {
        val raw = """{"_id":"st1","storeName":"Jaipur Crafts","verified":false,"followerCount":100}"""
        val dto = json.decodeFromString<StoreDto>(raw)
        assertEquals("st1", dto.id)
        assertEquals("Jaipur Crafts", dto.storeName)
        assertFalse(dto.verified)
        assertEquals(100, dto.followerCount)
    }

    @Test
    fun storeCardDto_decodesMongoId() {
        val raw = """{"_id":"sc1","storeName":"Delhi Threads","verified":true,"city":"Delhi"}"""
        val dto = json.decodeFromString<StoreCardDto>(raw)
        assertEquals("sc1", dto.id)
        assertTrue(dto.verified)
    }
}
