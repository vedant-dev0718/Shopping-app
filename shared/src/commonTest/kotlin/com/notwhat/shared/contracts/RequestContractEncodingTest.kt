package com.notwhat.shared.contracts

import com.notwhat.shared.checkout.CheckoutPlaceCodRequestDto
import com.notwhat.shared.checkout.CheckoutVerifyRequestDto
import com.notwhat.shared.seller.RejectOrderRequestDto
import com.notwhat.shared.seller.ShipOrderRequestDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@OptIn(ExperimentalSerializationApi::class)
class RequestContractEncodingTest {
    private val json = Json { explicitNulls = false }

    @Test
    fun checkoutVerifyRequest_usesDeliveryAddressIdKey() {
        val payload =
            CheckoutVerifyRequestDto(
                paymentMethod = "UPI",
                razorpayOrderId = "order_123",
                razorpayPaymentId = "payment_123",
                razorpaySignature = "sig_123",
                deliveryAddressId = "66b0e2b1a3f31ecbe0a12345",
            )

        val encoded = json.encodeToString(payload)

        assertTrue(encoded.contains("\"deliveryAddressId\""))
        assertFalse(encoded.contains("\"addressId\""))
    }

    @Test
    fun checkoutPlaceCodRequest_usesCodAndOmitsRazorpayFields() {
        val payload =
            CheckoutPlaceCodRequestDto(
                paymentMethod = "COD",
                deliveryAddressId = "66b0e2b1a3f31ecbe0a12345",
            )

        val encoded = json.encodeToString(payload)

        assertTrue(encoded.contains("\"paymentMethod\":\"COD\""))
        assertTrue(encoded.contains("\"deliveryAddressId\""))
        assertFalse(encoded.contains("razorpayOrderId"))
        assertFalse(encoded.contains("razorpayPaymentId"))
        assertFalse(encoded.contains("razorpaySignature"))
    }

    @Test
    fun shipOrderRequest_usesTrackingCarrierKey_notCourier() {
        val payload =
            ShipOrderRequestDto(
                trackingNumber = "SR123456",
                trackingCarrier = "Shiprocket",
                trackingUrl = "https://tracking.example/sr123456",
            )

        val encoded = json.encodeToString(payload)

        assertTrue(encoded.contains("\"trackingCarrier\""))
        assertFalse(encoded.contains("\"courier\""))
    }

    @Test
    fun rejectOrderRequest_includesMessageToBuyerKey() {
        val payload =
            RejectOrderRequestDto(
                reason = "Out of stock",
                messageToBuyer = "This item is currently unavailable. Please try a similar style.",
            )

        val encoded = json.encodeToString(payload)

        assertTrue(encoded.contains("\"reason\""))
        assertTrue(encoded.contains("\"messageToBuyer\""))
    }
}
