package com.notwhat.shared.checkout

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

sealed class PaymentBridgeResult {
    data class Success(
        val razorpayOrderId: String,
        val razorpayPaymentId: String,
        val razorpaySignature: String,
    ) : PaymentBridgeResult()

    data class Failure(
        val message: String,
    ) : PaymentBridgeResult()

    data object Cancelled : PaymentBridgeResult()
}

data class RazorpayCheckoutPayload(
    val keyId: String,
    val orderId: String,
    val amount: Int,
    val currency: String,
    val merchantName: String,
    val checkoutDescription: String,
    val prefillEmail: String? = null,
    val prefillPhone: String? = null,
)

data class RazorpayCheckoutCallbackPayload(
    val razorpayOrderId: String,
    val razorpayPaymentId: String,
    val razorpaySignature: String,
)

object PlatformPaymentBridge {
    private var razorpayHandler: (((RazorpayCheckoutPayload, (RazorpayCheckoutCallbackPayload?, String?) -> Unit) -> Unit))? = null

    fun registerRazorpayCheckout(handler: (((RazorpayCheckoutPayload, (RazorpayCheckoutCallbackPayload?, String?) -> Unit) -> Unit))?) {
        razorpayHandler = handler
    }

    fun isRazorpayAvailable(): Boolean = razorpayHandler != null

    suspend fun launchRazorpay(payload: RazorpayCheckoutPayload): PaymentBridgeResult =
        suspendCancellableCoroutine { continuation ->
            val handler = razorpayHandler
            if (handler == null) {
                continuation.resume(PaymentBridgeResult.Failure("Razorpay checkout is currently unavailable on this platform."))
                return@suspendCancellableCoroutine
            }

            handler(payload) { response, errorMessage ->
                if (!errorMessage.isNullOrBlank()) {
                    val normalized = errorMessage.lowercase()
                    val result =
                        if ("cancel" in normalized) {
                            PaymentBridgeResult.Cancelled
                        } else {
                            PaymentBridgeResult.Failure(errorMessage)
                        }
                    continuation.resume(result)
                    return@handler
                }

                if (response == null || response.razorpayPaymentId.isBlank() || response.razorpaySignature.isBlank()) {
                    continuation.resume(PaymentBridgeResult.Failure("Razorpay callback payload was incomplete."))
                    return@handler
                }

                continuation.resume(
                    PaymentBridgeResult.Success(
                        razorpayOrderId = response.razorpayOrderId.ifBlank { payload.orderId },
                        razorpayPaymentId = response.razorpayPaymentId,
                        razorpaySignature = response.razorpaySignature,
                    ),
                )
            }
        }
}
