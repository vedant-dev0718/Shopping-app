package com.notwhat.shared.checkout

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for checkout flow. */
class CheckoutRepository(private val client: ApiClient) {

    suspend fun startCheckout(bearerToken: String): NetworkResult<CheckoutStartResponseDto> =
        runCatchingNetwork { client.post("checkout/start", emptyMap<String, String>(), bearerToken) }

    suspend fun verifyAndPlaceOrder(
        request: CheckoutVerifyRequestDto,
        bearerToken: String,
    ): NetworkResult<CheckoutVerifyResponseDto> =
        runCatchingNetwork { client.post("checkout/verify", request, bearerToken) }
}
