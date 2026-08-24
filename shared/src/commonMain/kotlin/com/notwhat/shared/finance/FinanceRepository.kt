package com.notwhat.shared.finance

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Seller payout / earnings — /sellers/me/... (requireSeller). */
class FinanceRepository(
    private val client: ApiClient,
) {
    suspend fun getEarnings(bearerToken: String): NetworkResult<SellerEarningsSummaryDto> =
        runCatchingNetwork { client.get("sellers/me/earnings", bearerToken = bearerToken) }

    suspend fun getTransfers(bearerToken: String): NetworkResult<List<SellerTransferDto>> =
        runCatchingNetwork { client.get("sellers/me/transfers", bearerToken = bearerToken) }

    suspend fun startRazorpayOnboarding(bearerToken: String): NetworkResult<RazorpayOnboardingStatusDto> =
        runCatchingNetwork { client.post("sellers/me/razorpay/onboard", emptyMap<String, String>(), bearerToken) }

    suspend fun getRazorpayOnboardingStatus(bearerToken: String): NetworkResult<RazorpayOnboardingStatusDto> =
        runCatchingNetwork { client.get("sellers/me/razorpay/status", bearerToken = bearerToken) }

    suspend fun getStoreUpi(bearerToken: String): NetworkResult<StoreUpiDto> =
        runCatchingNetwork { client.get("sellers/me/payment", bearerToken = bearerToken) }

    suspend fun updateStoreUpi(
        upiId: String,
        bearerToken: String,
    ): NetworkResult<StoreUpiDto> = runCatchingNetwork { client.patch("sellers/me/payment", UpdateStoreUpiRequestDto(upiId), bearerToken) }
}
