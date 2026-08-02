package com.notwhat.shared.checkout

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@Serializable
data class CheckoutStartResponseDto(
    val razorpayOrderId: String = "",
    val amount: Int = 0,       // paise
    val currency: String = "INR",
    val keyId: String = "",
)

@Serializable
data class CheckoutVerifyRequestDto(
    val razorpayOrderId: String,
    val razorpayPaymentId: String,
    val razorpaySignature: String,
    val addressId: String,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class CheckoutVerifyResponseDto(
    @JsonNames("id", "_id", "orderId") val orderId: String = "",
    val status: String = "placed",
    val totalAmount: Double = 0.0,
)
