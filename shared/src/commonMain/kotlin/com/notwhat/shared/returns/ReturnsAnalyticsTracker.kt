package com.notwhat.shared.returns

enum class ReturnsEventName {
    returns_screen_viewed,
    returns_request_cta_viewed,
    returns_request_started,
    returns_request_submitted,
    returns_request_failed,
    returns_timeline_viewed,
    returns_rejection_reason_viewed,
    returns_escalation_cta_tapped,
    returns_seller_queue_viewed,
    returns_seller_request_opened,
    returns_seller_approved,
    returns_seller_rejected,
    returns_seller_mark_received,
    returns_qc_outcome_recorded,
    returns_status_transition_rendered,
    returns_status_unmapped,
    returns_action_retry_tapped,
}

data class ReturnsAnalyticsContext(
    val platform: String,
    val appVersion: String,
    val buildNumber: String,
    val environment: String,
    val userId: String,
    val userRole: String,
    val sessionId: String,
    val screenName: String,
    val sourceSurface: String,
    val requestId: String? = null,
)

data class ReturnsAnalyticsEvent(
    val eventName: ReturnsEventName,
    val eventVersion: String = "1.0.0",
    val occurredAt: String = "unknown",
    val platform: String,
    val appVersion: String,
    val buildNumber: String,
    val environment: String,
    val userId: String,
    val userRole: String,
    val sessionId: String,
    val requestId: String? = null,
    val screenName: String,
    val sourceSurface: String,
    val orderId: String? = null,
    val returnId: String? = null,
    val orderItemId: String? = null,
    val paymentMethod: String? = null,
    val returnReason: String? = null,
    val statusFrom: String? = null,
    val statusTo: String? = null,
    val sellerDecisionReason: String? = null,
    val errorCode: String? = null,
    val errorMessage: String? = null,
    val latencyMs: Int? = null,
)

fun interface ReturnsAnalyticsSink {
    fun emit(event: ReturnsAnalyticsEvent)
}

class ReturnsAnalyticsTracker(
    private val sink: ReturnsAnalyticsSink = ReturnsAnalyticsSink { _ -> },
) {
    fun returnsScreenViewed(context: ReturnsAnalyticsContext) = emit(context, ReturnsEventName.returns_screen_viewed)

    fun returnsRequestCtaViewed(
        context: ReturnsAnalyticsContext,
        orderId: String,
    ) = emit(context, ReturnsEventName.returns_request_cta_viewed, orderId = orderId)

    fun returnsRequestStarted(
        context: ReturnsAnalyticsContext,
        orderId: String,
    ) = emit(context, ReturnsEventName.returns_request_started, orderId = orderId)

    fun returnsRequestSubmitted(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String?,
        returnReason: String,
        paymentMethod: String,
        latencyMs: Int? = null,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_request_submitted,
        orderId = orderId,
        returnId = returnId,
        returnReason = returnReason,
        paymentMethod = paymentMethod,
        latencyMs = latencyMs,
    )

    fun returnsRequestFailed(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnReason: String,
        errorCode: String,
        errorMessage: String? = null,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_request_failed,
        orderId = orderId,
        returnReason = returnReason,
        errorCode = errorCode,
        errorMessage = errorMessage,
    )

    fun returnsTimelineViewed(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String,
        statusTo: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_timeline_viewed,
        orderId = orderId,
        returnId = returnId,
        statusTo = statusTo,
    )

    fun returnsRejectionReasonViewed(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String,
        sellerDecisionReason: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_rejection_reason_viewed,
        orderId = orderId,
        returnId = returnId,
        sellerDecisionReason = sellerDecisionReason,
    )

    fun returnsEscalationCtaTapped(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String,
        statusTo: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_escalation_cta_tapped,
        orderId = orderId,
        returnId = returnId,
        statusTo = statusTo,
    )

    fun returnsStatusTransitionRendered(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String,
        statusFrom: String?,
        statusTo: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_status_transition_rendered,
        orderId = orderId,
        returnId = returnId,
        statusFrom = statusFrom,
        statusTo = statusTo,
    )

    fun returnsStatusUnmapped(
        context: ReturnsAnalyticsContext,
        orderId: String,
        returnId: String,
        statusTo: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_status_unmapped,
        orderId = orderId,
        returnId = returnId,
        statusTo = statusTo,
    )

    fun returnsActionRetryTapped(
        context: ReturnsAnalyticsContext,
        orderId: String?,
        returnId: String?,
        errorCode: String,
    ) = emit(
        context = context,
        eventName = ReturnsEventName.returns_action_retry_tapped,
        orderId = orderId,
        returnId = returnId,
        errorCode = errorCode,
    )

    private fun emit(
        context: ReturnsAnalyticsContext,
        eventName: ReturnsEventName,
        orderId: String? = null,
        returnId: String? = null,
        orderItemId: String? = null,
        paymentMethod: String? = null,
        returnReason: String? = null,
        statusFrom: String? = null,
        statusTo: String? = null,
        sellerDecisionReason: String? = null,
        errorCode: String? = null,
        errorMessage: String? = null,
        latencyMs: Int? = null,
    ) {
        val normalizedPaymentMethod = normalizePaymentMethod(paymentMethod)
        val normalizedStatusFrom = statusFrom?.ifBlank { "unknown" }
        val normalizedStatusTo = statusTo?.ifBlank { "unknown" }

        val event =
            ReturnsAnalyticsEvent(
                eventName = eventName,
                platform = context.platform,
                appVersion = context.appVersion,
                buildNumber = context.buildNumber,
                environment = context.environment,
                userId = context.userId,
                userRole = context.userRole,
                sessionId = context.sessionId,
                requestId = context.requestId,
                screenName = context.screenName,
                sourceSurface = context.sourceSurface,
                orderId = orderId,
                returnId = returnId,
                orderItemId = orderItemId,
                paymentMethod = normalizedPaymentMethod,
                returnReason = returnReason,
                statusFrom = normalizedStatusFrom,
                statusTo = normalizedStatusTo,
                sellerDecisionReason = sellerDecisionReason,
                errorCode = errorCode,
                errorMessage = errorMessage,
                latencyMs = latencyMs,
            )

        if (!isValid(event)) return
        sink.emit(event)
    }

    private fun isValid(event: ReturnsAnalyticsEvent): Boolean {
        val baseValid =
            event.platform.isNotBlank() &&
                event.appVersion.isNotBlank() &&
                event.buildNumber.isNotBlank() &&
                event.environment.isNotBlank() &&
                event.userId.isNotBlank() &&
                event.userRole.isNotBlank() &&
                event.sessionId.isNotBlank() &&
                event.screenName.isNotBlank() &&
                event.sourceSurface.isNotBlank()

        if (!baseValid) return false

        if (!hasEventSpecificRequiredFields(event)) return false
        if (!hasSafePayload(event)) return false

        return true
    }

    private fun hasEventSpecificRequiredFields(event: ReturnsAnalyticsEvent): Boolean =
        when (event.eventName) {
            ReturnsEventName.returns_request_cta_viewed,
            ReturnsEventName.returns_request_started,
            -> event.orderId.isRequiredField()

            ReturnsEventName.returns_request_submitted ->
                event.orderId.isRequiredField() &&
                    event.returnReason.isRequiredField() &&
                    event.paymentMethod.isRequiredField()

            ReturnsEventName.returns_request_failed ->
                event.orderId.isRequiredField() &&
                    event.returnReason.isRequiredField() &&
                    event.errorCode.isRequiredField()

            ReturnsEventName.returns_timeline_viewed,
            ReturnsEventName.returns_rejection_reason_viewed,
            ReturnsEventName.returns_escalation_cta_tapped,
            ReturnsEventName.returns_status_transition_rendered,
            ReturnsEventName.returns_status_unmapped,
            -> event.orderId.isRequiredField() && event.returnId.isRequiredField()

            ReturnsEventName.returns_action_retry_tapped -> event.errorCode.isRequiredField()

            ReturnsEventName.returns_seller_request_opened,
            ReturnsEventName.returns_seller_approved,
            ReturnsEventName.returns_seller_rejected,
            ReturnsEventName.returns_seller_mark_received,
            ReturnsEventName.returns_qc_outcome_recorded,
            -> event.returnId.isRequiredField()

            ReturnsEventName.returns_screen_viewed,
            ReturnsEventName.returns_seller_queue_viewed,
            -> true
        }

    private fun hasSafePayload(event: ReturnsAnalyticsEvent): Boolean {
        val forbiddenRegex = Regex("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|\\b\\d{10,}\\b", RegexOption.IGNORE_CASE)
        return !forbiddenRegex.containsMatchIn(event.errorMessage.orEmpty()) &&
            !forbiddenRegex.containsMatchIn(event.sellerDecisionReason.orEmpty())
    }

    private fun normalizePaymentMethod(value: String?): String? {
        if (value.isNullOrBlank()) return value
        return when (value.lowercase()) {
            "cod", "upi", "card", "netbanking", "wallet", "unknown" -> value
            else -> "unknown"
        }
    }

    private fun String?.isRequiredField(): Boolean = !this.isNullOrBlank()
}
