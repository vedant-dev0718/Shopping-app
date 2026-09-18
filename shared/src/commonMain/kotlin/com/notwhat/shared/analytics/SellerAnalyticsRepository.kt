package com.notwhat.shared.analytics

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/**
 * Seller analytics endpoints, all under /seller/analytics (requireSeller).
 * Query params (period, interval, etc.) are passed as a map and forwarded to the backend.
 */
class SellerAnalyticsRepository(
    private val client: ApiClient,
) {
    suspend fun getOverview(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<SellerAnalyticsOverviewDto> = runCatchingNetwork { client.get("seller/analytics/overview", bearerToken, params) }

    suspend fun getSalesTrend(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<List<SalesTrendPointDto>> = runCatchingNetwork { client.get("seller/analytics/sales", bearerToken, params) }

    suspend fun getCommission(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<CommissionSummaryDto> = runCatchingNetwork { client.get("seller/analytics/commission", bearerToken, params) }

    suspend fun getPayouts(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<PayoutSummaryDto> = runCatchingNetwork { client.get("seller/analytics/payouts", bearerToken, params) }

    suspend fun getSummary(bearerToken: String): NetworkResult<SellerAnalyticsSummaryResponseDto> =
        runCatchingNetwork { client.get("seller/analytics/summary", bearerToken) }

    suspend fun getReelAnalytics(bearerToken: String): NetworkResult<List<ReelAnalyticsDto>> =
        runCatchingNetwork { client.get("seller/analytics/reels", bearerToken) }

    suspend fun getDashboard(bearerToken: String): NetworkResult<SellerDashboardDto> =
        runCatchingNetwork { client.get("seller/dashboard", bearerToken) }
}
