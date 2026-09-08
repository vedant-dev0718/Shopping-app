package com.notwhat.shared.analytics

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

// ── Summary ─────────────────────────────────────────────────────────────────

@Serializable
data class AnalyticsSummaryDto(
    val reel_view: Int = 0,
    val store_view: Int = 0,
    val product_click: Int = 0,
    val product_save: Int = 0,
    val cart_add: Int = 0,
    val order_awaiting_seller_acceptance: Int = 0,
    val order_seller_accepted: Int = 0,
    val order_seller_rejected: Int = 0,
)

@Serializable
data class SellerAnalyticsSummaryResponseDto(
    val productCount: Int = 0,
    val videoCount: Int = 0,
    val storeViews: Int = 0,
    val storeSaves: Int = 0,
    val buyerInterestSignalCount: Int = 0,
    val summary: AnalyticsSummaryDto? = null,
)

// ── Sales trend ──────────────────────────────────────────────────────────────

/** Mirrors `financeService.getSalesTrend` — one bucket per `interval` (daily by default). */
@Serializable
data class SalesTrendPointDto(
    val period: String = "",
    val grossSales: Double = 0.0,
    val netEarnings: Double = 0.0,
    val platformCommission: Double = 0.0,
    val refundedAmount: Double = 0.0,
    val orderCount: Int = 0,
)

// ── Commission / payouts ─────────────────────────────────────────────────────

@Serializable
data class CommissionSummaryDto(
    val totalRevenue: Double = 0.0,
    val totalCommission: Double = 0.0,
    val netPayout: Double = 0.0,
)

@Serializable
data class PayoutSummaryDto(
    val pendingPayout: Double = 0.0,
    val totalPaidOut: Double = 0.0,
)

// ── Overview ─────────────────────────────────────────────────────────────────

@Serializable
data class SellerAnalyticsOverviewDto(
    val totalRevenue: Double = 0.0,
    val totalOrders: Int = 0,
    val averageOrderValue: Double = 0.0,
    val periodStart: String? = null,
    val periodEnd: String? = null,
)

// ── Reel analytics ───────────────────────────────────────────────────────────

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ReelAnalyticsDto(
    @JsonNames("id", "_id") val id: String = "",
    val title: String = "",
    val viewCount: Int = 0,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val productClicks: Int = 0,
)

// ── Dashboard ────────────────────────────────────────────────────────────────

@Serializable
data class SellerDashboardDto(
    val productCount: Int = 0,
    val videoCount: Int = 0,
    val storeViews: Int = 0,
    val storeSaves: Int = 0,
    val buyerInterestSignalCount: Int = 0,
    val summary: AnalyticsSummaryDto? = null,
)
