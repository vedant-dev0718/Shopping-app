package com.notwhat.shared.returns

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

enum class ReturnReason { wrong_item, damaged, not_as_described, changed_mind }

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
    val rejectionReason: String? = null,
    val requestedAt: String? = null,
    val resolvedAt: String? = null,
)

// Seller-side resolution (PATCH /seller/returns/:id/approve|reject|mark-received)
@Serializable
data class RejectReturnRequestDto(
    val reason: String,
)
