package com.notwhat.shared.returns

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

enum class ReturnReason { wrong_item, damaged, not_as_described, changed_mind }

enum class ReturnCanonicalStatus {
    requested,
    seller_review,
    approved,
    rejected,
    reverse_pickup,
    in_transit,
    delivered_to_seller,
    qc_passed,
    qc_failed,
    refunded,
    closed,
    unknown,
}

fun mapRawReturnStatus(raw: String?): ReturnCanonicalStatus =
    when (raw?.trim()?.lowercase()) {
        "requested", "return_requested" -> ReturnCanonicalStatus.requested
        "seller_review", "under_review" -> ReturnCanonicalStatus.seller_review
        "approved", "return_approved" -> ReturnCanonicalStatus.approved
        "rejected", "return_rejected" -> ReturnCanonicalStatus.rejected
        "pickup_scheduled", "reverse_pickup_scheduled", "reverse_pickup" -> ReturnCanonicalStatus.reverse_pickup
        "picked_up", "reverse_in_transit", "in_transit" -> ReturnCanonicalStatus.in_transit
        "delivered_to_seller", "reverse_delivered", "received" -> ReturnCanonicalStatus.delivered_to_seller
        "qc_passed", "received_intact" -> ReturnCanonicalStatus.qc_passed
        "qc_failed", "received_damaged", "received_mismatch", "received_incomplete" -> ReturnCanonicalStatus.qc_failed
        "refunded", "refund_processed", "completed" -> ReturnCanonicalStatus.refunded
        "closed", "return_closed", "resolved" -> ReturnCanonicalStatus.closed
        else -> ReturnCanonicalStatus.unknown
    }

@Serializable
data class CreateReturnRequestDto(
    val orderId: String,
    val itemId: String,
    val reason: String,
    val description: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ReturnRequestResponseDto(
    @JsonNames("id", "_id") val id: String = "",
    val orderId: String = "",
    val itemId: String? = null,
    val reason: String = "",
    val description: String? = null,
    val status: String = "requested", // requested | approved | rejected | in_transit | received | completed
    val refundAmount: Double = 0.0,
    val refundStatus: String = "pending", // pending | initiated | completed | failed
    @JsonNames("rejectionReason", "sellerDecisionReason") val rejectionReason: String? = null,
    @JsonNames("requestedAt", "createdAt") val requestedAt: String? = null,
    val resolvedAt: String? = null,
) {
    val canonicalStatus: ReturnCanonicalStatus
        get() = mapRawReturnStatus(status)
}

// Seller-side resolution (PATCH /seller/returns/:id/approve|reject|mark-received)
@Serializable
data class RejectReturnRequestDto(
    val reason: String,
)
