package com.notwhat.shared.returns

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient
import kotlinx.coroutines.delay
import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

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
    private val retryPolicy: RetryPolicy = RetryPolicy(),
) {
    data class RetryPolicy(
        val maxAttempts: Int = 3,
        val initialDelayMs: Long = 400,
        val maxDelayMs: Long = 4_000,
        val multiplier: Double = 2.0,
        val jitterRatio: Double = 0.2,
    )

    suspend fun send(
        event: ReturnsAnalyticsEvent,
        bearerToken: String?,
    ): NetworkResult<Unit> {
        val attempts = max(1, retryPolicy.maxAttempts)
        var currentDelayMs = max(0, retryPolicy.initialDelayMs)
        var lastFailure: NetworkResult.Failure? = null

        repeat(attempts) { index ->
            when (val result = sendOnce(event, bearerToken)) {
                is NetworkResult.Success -> {
                    return result
                }

                is NetworkResult.Failure -> {
                    lastFailure = result
                    val isLastAttempt = index == attempts - 1
                    if (isLastAttempt || !isRetryable(result.error)) return result

                    val sleepMs = withJitter(currentDelayMs, retryPolicy.jitterRatio)
                    delay(sleepMs)
                    currentDelayMs = nextDelay(currentDelayMs)
                }
            }
        }

        return lastFailure
            ?: NetworkResult.Failure(
                com.notwhat.shared.core.AppError
                    .Unknown(IllegalStateException("Analytics send failed without explicit error.")),
            )
    }

    private suspend fun sendOnce(
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

    private fun nextDelay(currentDelayMs: Long): Long {
        if (currentDelayMs <= 0L) return min(100L, retryPolicy.maxDelayMs)
        val expanded = (currentDelayMs.toDouble() * retryPolicy.multiplier).toLong()
        return min(max(0L, expanded), retryPolicy.maxDelayMs)
    }

    private fun withJitter(
        delayMs: Long,
        jitterRatio: Double,
    ): Long {
        if (delayMs <= 0L) return 0L
        val boundedRatio = jitterRatio.coerceIn(0.0, 0.5)
        if (boundedRatio == 0.0) return delayMs

        val jitterWindow = (delayMs * boundedRatio).toLong().coerceAtLeast(1L)
        val randomOffset = Random.nextLong(-jitterWindow, jitterWindow + 1)
        return (delayMs + randomOffset).coerceAtLeast(0L)
    }

    private fun isRetryable(error: com.notwhat.shared.core.AppError): Boolean =
        when (error) {
            is com.notwhat.shared.core.AppError.NoNetwork,
            is com.notwhat.shared.core.AppError.Timeout,
            -> true

            is com.notwhat.shared.core.AppError.Server -> true

            is com.notwhat.shared.core.AppError.Api -> error.statusCode == 429 || error.statusCode >= 500

            is com.notwhat.shared.core.AppError.Deserialization,
            is com.notwhat.shared.core.AppError.Unknown,
            -> false
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
            ReturnsEventName.returns_payment_methods_fetch_failed,
            ReturnsEventName.returns_payment_methods_retry_tapped,
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
