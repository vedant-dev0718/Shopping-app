package com.notwhat.shared.finance

import kotlinx.serialization.Serializable

@Serializable
data class SellerEarningsSummaryDto(
    val totalSold: Double = 0.0,
    val totalCommissionPaid: Double = 0.0,
    val totalEarned: Double = 0.0,
    val released: Double = 0.0,
    val onHold: Double = 0.0,
)

@Serializable
data class SellerTransferDto(
    val orderNumber: String = "",
    val orderDate: String? = null,
    val sellerEarning: Double = 0.0,
    val razorpayTransferId: String? = null,
    val status: String = "",
)

@Serializable
data class RazorpayOnboardingStatusDto(
    val linkedAccountId: String = "",
    val status: String = "not_created", // not_created | pending | active | suspended
)
