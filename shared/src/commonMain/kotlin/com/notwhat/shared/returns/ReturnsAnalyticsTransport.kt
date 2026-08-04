package com.notwhat.shared.returns

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient
import kotlinx.serialization.Serializable

@Serializable
private data class AnalyticsEventIngestRequestDto(
    val eventType: String,
    val metadata: Map<String, String>,
)

@Serializable
private data class AnalyticsEventIngestResponseDto(
    val eventType: String = "",
)

class ReturnsAnalyticsTransport(
    private val client: ApiClient,
) {
    suspend fun send(
        event: ReturnsAnalyticsEvent,
        bearerToken: String?,
    ): NetworkResult<Unit> =
        runCatchingNetwork {
            val eventType = mapEventType(event)
            val metadata = event.toMetadataMap()
            client.post<AnalyticsEventIngestResponseDto, AnalyticsEventIngestRequestDto>(
                path = "analytics/events",
                body = AnalyticsEventIngestRequestDto(eventType = eventType, metadata = metadata),
                bearerToken = bearerToken,
            )
            Unit
        }

    private fun mapEventType(event: ReturnsAnalyticsEvent): String =
        when (event.eventName) {
            ReturnsEventName.returns_screen_viewed,
            ReturnsEventName.returns_request_cta_viewed,
            ReturnsEventName.returns_request_started,
            ReturnsEventName.returns_request_submitted,
            -> {
                "return_requested"
            }

            ReturnsEventName.returns_request_failed -> {
                "return_requested"
            }

            ReturnsEventName.returns_timeline_viewed,
            ReturnsEventName.returns_status_unmapped,
            ReturnsEventName.returns_action_retry_tapped,
            ReturnsEventName.returns_seller_request_opened,
            ReturnsEventName.returns_seller_queue_viewed,
            -> {
                "return_requested"
            }

            ReturnsEventName.returns_seller_approved -> {
                "return_approved"
            }

            ReturnsEventName.returns_seller_rejected -> {
                "return_rejected"
            }

            ReturnsEventName.returns_rejection_reason_viewed,
            ReturnsEventName.returns_escalation_cta_tapped,
            -> {
                "return_rejected"
            }

            ReturnsEventName.returns_seller_mark_received -> {
                "return_received"
            }

            ReturnsEventName.returns_qc_outcome_recorded -> {
                "return_received"
            }

            ReturnsEventName.returns_status_transition_rendered -> {
                when (event.statusTo) {
                    "refunded" -> "refund_processed"
                    "qc_failed" -> "refund_failed"
                    else -> "return_requested"
                }
            }
        }
}

private fun ReturnsAnalyticsEvent.toMetadataMap(): Map<String, String> {
    val metadata = linkedMapOf<String, String>()

    metadata["event_name"] = eventName.name
    metadata["event_version"] = eventVersion
    metadata["occurred_at"] = occurredAt
    metadata["platform"] = platform
    metadata["app_version"] = appVersion
    metadata["build_number"] = buildNumber
    metadata["environment"] = environment
    metadata["user_role"] = userRole
    metadata["session_id"] = sessionId
    metadata["screen_name"] = screenName
    metadata["source_surface"] = sourceSurface

    requestId?.let { metadata["request_id"] = it }
    orderId?.let { metadata["order_id"] = it }
    returnId?.let { metadata["return_id"] = it }
    orderItemId?.let { metadata["order_item_id"] = it }
    paymentMethod?.let { metadata["payment_method"] = it }
    returnReason?.let { metadata["return_reason"] = it }
    statusFrom?.let { metadata["status_from"] = it }
    statusTo?.let { metadata["status_to"] = it }
    sellerDecisionReason?.let { metadata["seller_decision_reason"] = it }
    errorCode?.let { metadata["error_code"] = it }
    errorMessage?.let { metadata["error_message"] = it }
    latencyMs?.let { metadata["latency_ms"] = it.toString() }

    return metadata
}
