package com.notwhat.shared.checkout

import com.notwhat.shared.cart.CartDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

enum class CheckoutPaymentMethod {
    UPI,
    CARD,
    NETBANKING,
    WALLET,
    COD,
    UNKNOWN,
    ;

    companion object {
        fun fromRaw(value: String?): CheckoutPaymentMethod =
            when (value?.trim()?.lowercase()) {
                "upi" -> UPI
                "card" -> CARD
                "netbanking" -> NETBANKING
                "wallet" -> WALLET
                "cod" -> COD
                else -> UNKNOWN
            }
    }
}

@Serializable
data class CheckoutShippingOptionDto(
    val label: String = "",
    val amount: Int = 0,
)

@Serializable
data class CheckoutStartResponseDto(
    val cart: CartDto? = null,
    @JsonNames("keyId", "razorpayKeyId") val razorpayKeyId: String = "",
    @JsonNames("amount", "razorpayOrderAmount") val razorpayOrderAmount: Int = 0, // paise
    val currency: String = "INR",
    val razorpayOrderId: String = "",
    val shippingOptions: List<CheckoutShippingOptionDto> = emptyList(),
    val paymentMethods: List<String> = emptyList(),
)

@Serializable
data class CheckoutShippingInfoDto(
    val name: String,
    val email: String,
    val phone: String,
    val address: String,
    val city: String,
    val state: String,
    val postalCode: String,
)

@Serializable
data class CheckoutVerifyRequestDto(
    val paymentMethod: String,
    val razorpayOrderId: String,
    val razorpayPaymentId: String,
    val razorpaySignature: String,
    val deliveryAddressId: String? = null,
    val shippingInfo: CheckoutShippingInfoDto? = null,
)

@Serializable
data class CheckoutPlaceCodRequestDto(
    val paymentMethod: String = "COD",
    val deliveryAddressId: String? = null,
    val shippingInfo: CheckoutShippingInfoDto? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class CheckoutVerifyResponseDto(
    @JsonNames("id", "_id", "orderId") val orderId: String = "",
    val orderNumber: String = "",
    val paymentStatus: String = "",
    @JsonNames("status", "orderStatus") val orderStatus: String = "placed",
    val trackingStatus: String = "",
    @JsonNames("finalTotal", "totalAmount") val finalTotal: Double = 0.0,
    val emailSent: Boolean = false,
)

fun CheckoutStartResponseDto.normalizedPaymentMethods(): List<CheckoutPaymentMethod> =
    paymentMethods
        .map { CheckoutPaymentMethod.fromRaw(it) }
        .filter { it != CheckoutPaymentMethod.UNKNOWN }
        .distinct()

fun CheckoutPaymentMethod.toRawValue(): String =
    when (this) {
        CheckoutPaymentMethod.UPI -> "UPI"
        CheckoutPaymentMethod.CARD -> "card"
        CheckoutPaymentMethod.NETBANKING -> "netbanking"
        CheckoutPaymentMethod.WALLET -> "wallet"
        CheckoutPaymentMethod.COD -> "COD"
        CheckoutPaymentMethod.UNKNOWN -> "unknown"
    }

fun CheckoutPaymentMethod.displayLabel(): String =
    when (this) {
        CheckoutPaymentMethod.UPI -> "UPI"
        CheckoutPaymentMethod.CARD -> "Card"
        CheckoutPaymentMethod.NETBANKING -> "Netbanking"
        CheckoutPaymentMethod.WALLET -> "Wallet"
        CheckoutPaymentMethod.COD -> "Cash on Delivery"
        CheckoutPaymentMethod.UNKNOWN -> "Unknown"
    }

fun CheckoutPaymentMethod.defaultSubtitle(): String =
    when (this) {
        CheckoutPaymentMethod.UPI -> "Pay via UPI"
        CheckoutPaymentMethod.CARD -> "Saved card"
        CheckoutPaymentMethod.NETBANKING -> "Bank transfer"
        CheckoutPaymentMethod.WALLET -> "Wallet balance"
        CheckoutPaymentMethod.COD -> "Pay when delivered"
        CheckoutPaymentMethod.UNKNOWN -> "Unsupported method"
    }

fun CheckoutPaymentMethod.defaultMaskedText(): String =
    when (this) {
        CheckoutPaymentMethod.COD -> "No prepayment"
        CheckoutPaymentMethod.UPI -> "Secure"
        CheckoutPaymentMethod.CARD -> "Saved"
        CheckoutPaymentMethod.NETBANKING -> "Secure"
        CheckoutPaymentMethod.WALLET -> "Available"
        CheckoutPaymentMethod.UNKNOWN -> ""
    }

fun CheckoutVerifyResponseDto.trackingOrderStatus(): String = if (orderStatus.isNotBlank()) orderStatus else "placed"

fun CheckoutVerifyResponseDto.trackingPaymentStatus(): String = if (paymentStatus.isNotBlank()) paymentStatus else "pending"

@Deprecated("Use finalTotal", ReplaceWith("finalTotal"))
val CheckoutVerifyResponseDto.totalAmount: Double
    get() = finalTotal

@Deprecated("Use orderStatus", ReplaceWith("orderStatus"))
val CheckoutVerifyResponseDto.status: String
    get() = orderStatus

@Deprecated("Use razorpayOrderAmount", ReplaceWith("razorpayOrderAmount"))
val CheckoutStartResponseDto.amount: Int
    get() = razorpayOrderAmount

@Deprecated("Use razorpayKeyId", ReplaceWith("razorpayKeyId"))
val CheckoutStartResponseDto.keyId: String
    get() = razorpayKeyId
