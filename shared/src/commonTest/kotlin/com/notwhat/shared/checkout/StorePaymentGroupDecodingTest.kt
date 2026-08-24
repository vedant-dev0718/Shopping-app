package com.notwhat.shared.checkout

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalSerializationApi::class)
class StorePaymentGroupDecodingTest {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    // Captured verbatim from a live POST /api/checkout/start with a two-store cart.
    private val twoStoreCheckoutPayload = """
        {
          "razorpayKeyId": "",
          "razorpayOrderId": "mock_order_1",
          "razorpayOrderAmount": 219800,
          "currency": "INR",
          "shippingOptions": [{ "label": "Free shipping", "amount": 0 }],
          "paymentMethods": ["COD"],
          "storePaymentGroups": [
            {
              "storeId": "s1",
              "sellerId": "u1",
              "storeName": "Craft Bazaar Collective",
              "paymentMethods": ["COD"],
              "amount": 699,
              "currency": "INR",
              "items": [
                { "productId": "p1", "title": "Kutch Embroidered Tote Bag", "quantity": 1, "itemTotal": 699 }
              ],
              "upiId": "demoseller2@oksbi",
              "qrCode": "upi://pay?pa=demoseller2%40oksbi&pn=Craft+Bazaar+Collective&am=699.00&cu=INR",
              "qrCodeLabel": "Scan to pay Craft Bazaar Collective"
            },
            {
              "storeId": "s2",
              "sellerId": "u2",
              "storeName": "NotWhat Demo Store",
              "paymentMethods": ["COD"],
              "amount": 1499,
              "currency": "INR",
              "items": [
                { "productId": "p2", "title": "Handwoven Banarasi Silk Scarf", "quantity": 1, "itemTotal": 1499 }
              ],
              "upiId": "demoseller1@okhdfcbank",
              "qrCode": "upi://pay?pa=demoseller1%40okhdfcbank&pn=NotWhat+Demo+Store&am=1499.00&cu=INR",
              "qrCodeLabel": "Scan to pay NotWhat Demo Store"
            }
          ]
        }
    """.trimIndent()

    @Test
    fun checkoutStart_decodesTwoDistinctStoreQrCodes() {
        val dto = json.decodeFromString<CheckoutStartResponseDto>(twoStoreCheckoutPayload)

        assertEquals(listOf("COD"), dto.paymentMethods)
        assertEquals(2, dto.storePaymentGroups.size)

        val scannable = dto.scannableStorePaymentGroups()
        assertEquals(2, scannable.size)
        assertEquals(2, scannable.mapNotNull { it.qrCode }.toSet().size)
        assertTrue(scannable.all { it.qrCode!!.startsWith("upi://pay?") })

        val byStore = scannable.associateBy { it.storeName }
        assertEquals("demoseller2@oksbi", byStore.getValue("Craft Bazaar Collective").upiId)
        assertEquals(699.0, byStore.getValue("Craft Bazaar Collective").amount)
        assertEquals("demoseller1@okhdfcbank", byStore.getValue("NotWhat Demo Store").upiId)
        assertEquals(1499.0, byStore.getValue("NotWhat Demo Store").amount)

        val firstItem = byStore.getValue("NotWhat Demo Store").items.single()
        assertEquals("Handwoven Banarasi Silk Scarf", firstItem.title)
        assertEquals(1, firstItem.quantity)
    }

    @Test
    fun checkoutStart_withoutStoreGroups_yieldsNoScannableCodes() {
        val raw = """{"paymentMethods":["COD"],"storePaymentGroups":[]}"""
        val dto = json.decodeFromString<CheckoutStartResponseDto>(raw)

        assertTrue(dto.storePaymentGroups.isEmpty())
        assertTrue(dto.scannableStorePaymentGroups().isEmpty())
    }

    @Test
    fun storeGroup_withNullQrCode_isNotScannable() {
        val raw = """
            {
              "paymentMethods": ["COD"],
              "storePaymentGroups": [
                { "storeName": "No UPI Store", "amount": 100, "upiId": "", "qrCode": null, "qrCodeLabel": "Pay COD to No UPI Store" }
              ]
            }
        """.trimIndent()
        val dto = json.decodeFromString<CheckoutStartResponseDto>(raw)

        assertEquals(1, dto.storePaymentGroups.size)
        assertTrue(dto.scannableStorePaymentGroups().isEmpty())
    }
}
