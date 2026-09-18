package com.notwhat.shared.cart

import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.order.OrderItemDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@OptIn(ExperimentalSerializationApi::class)
class CartOrderDtoDecodingTest {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Test
    fun cartDto_decodesWithItems() {
        val raw = """{"_id":"cart1","items":[{"_id":"i1","quantity":2,"priceSnapshot":999.0,"itemTotal":1998.0}],"subtotal":1998.0,"shipping":0,"finalTotal":1998.0}"""
        val dto = json.decodeFromString<CartDto>(raw)
        assertEquals("cart1", dto.id)
        assertEquals(1, dto.items.size)
        assertEquals(2, dto.items.first().quantity)
        assertEquals(1998.0, dto.finalTotal)
    }

    @Test
    fun cartDto_decodesEmptyCart() {
        val raw = """{"_id":"cart2","items":[],"subtotal":0,"shipping":0,"finalTotal":0}"""
        val dto = json.decodeFromString<CartDto>(raw)
        assertTrue(dto.items.isEmpty())
        assertEquals(0.0, dto.subtotal)
    }

    @Test
    fun orderDto_decodesStatus() {
        val raw = """{"_id":"o1","buyerId":"b1","items":[],"subtotal":2000,"shippingAmount":99,"totalAmount":2099,"status":"shipped"}"""
        val dto = json.decodeFromString<OrderDto>(raw)
        assertEquals("o1", dto.id)
        assertEquals("shipped", dto.status)
        assertEquals(2099.0, dto.totalAmount)
    }

    @Test
    fun orderItemDto_decodesSnapshots() {
        val raw = """{"_id":"oi1","productId":"p1","titleSnapshot":"Block Print Kurta","quantity":1,"priceSnapshot":1899.0,"itemTotal":1899.0,"status":"placed","payoutStatus":"pending"}"""
        val dto = json.decodeFromString<OrderItemDto>(raw)
        assertEquals("Block Print Kurta", dto.titleSnapshot)
        assertEquals(1899.0, dto.priceSnapshot)
        assertFalse(dto.status.isBlank())
    }
}
