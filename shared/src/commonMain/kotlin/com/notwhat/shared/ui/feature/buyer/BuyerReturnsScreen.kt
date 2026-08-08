package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.returns.ReturnCanonicalStatus
import com.notwhat.shared.returns.ReturnReason
import com.notwhat.shared.returns.ReturnRequestResponseDto
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyerReturnsContentScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    var selectedReason by remember { mutableStateOf(ReturnReason.damaged) }
    var selectedOrderId by remember { mutableStateOf<String?>(null) }
    var returnNote by remember { mutableStateOf("") }
    var selectedReturnId by remember { mutableStateOf<String?>(null) }
    var localError by remember { mutableStateOf<String?>(null) }
    val previousStatusByReturnId = remember { mutableStateMapOf<String, String>() }
    val previousRawStatusByReturnId = remember { mutableStateMapOf<String, String>() }

    val analytics = state.returnsAnalyticsTracker
    val analyticsContext = state.returnsAnalyticsContext(screenName = "BuyerReturns", sourceSurface = "returns_list")
    val ordersErrorMessage = state.transaction.ordersErrorMessage

    val eligibleOrders = state.transaction.orders.filter { it.status.lowercase() in setOf("delivered", "completed") }
    val selectedReturn = state.buyerReturns.firstOrNull { it.id == selectedReturnId } ?: state.buyerReturns.firstOrNull()
    val pullState = rememberPullToRefreshState()
    if (pullState.isRefreshing) {
        LaunchedEffect(Unit) {
            val result = state.loadBuyerReturns()
            if (result is NetworkResult.Success) {
                emitStatusDiffs(
                    items = result.data,
                    previousStatusByReturnId = previousStatusByReturnId,
                    previousRawStatusByReturnId = previousRawStatusByReturnId,
                    analytics = analytics,
                    analyticsContext = analyticsContext,
                )
            }
            pullState.endRefresh()
        }
    }

    LaunchedEffect(state.currentSession?.authToken) {
        analytics.returnsScreenViewed(analyticsContext)

        while (currentCoroutineContext().isActive) {
            val result = state.loadBuyerReturns()
            if (result is NetworkResult.Success) {
                emitStatusDiffs(
                    items = result.data,
                    previousStatusByReturnId = previousStatusByReturnId,
                    previousRawStatusByReturnId = previousRawStatusByReturnId,
                    analytics = analytics,
                    analyticsContext = analyticsContext,
                )
            }
            delay(15_000)
        }
    }

    LaunchedEffect(eligibleOrders.map { it.id }.joinToString("|")) {
        eligibleOrders.forEach { order ->
            analytics.returnsRequestCtaViewed(analyticsContext, orderId = order.id)
        }
    }

    Box(
        modifier = modifier.fillMaxSize().background(bg).nestedScroll(pullState.nestedScrollConnection),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().background(bg),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Text("My Returns", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("${state.buyerReturns.size}", color = muted, style = MaterialTheme.typography.labelSmall)
                }
            }

            localError?.let { message ->
                item {
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(message, color = text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                            Text(
                                "Retry",
                                color = accent,
                                fontWeight = FontWeight.Bold,
                                modifier =
                                    Modifier.clickable {
                                        analytics.returnsActionRetryTapped(
                                            context = analyticsContext,
                                            orderId = selectedOrderId,
                                            returnId = selectedReturnId,
                                            errorCode = "RETRY_TAPPED",
                                        )
                                        scope.launch { state.loadBuyerReturns() }
                                    },
                            )
                        }
                    }
                }
            }

            if (!ordersErrorMessage.isNullOrBlank()) {
                item {
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Orders unavailable", color = text, fontWeight = FontWeight.Bold)
                            Text(ordersErrorMessage, color = muted, style = MaterialTheme.typography.bodySmall)
                            TextButton(
                                onClick = {
                                    val token = state.currentSession?.authToken ?: return@TextButton
                                    scope.launch { state.transaction.loadOrders(token) }
                                },
                            ) {
                                Text("Retry orders fetch", color = accent)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Request Return", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Select an eligible delivered order and submit your reason.", color = muted)

                        if (eligibleOrders.isEmpty()) {
                            Text("No delivered orders are currently eligible for return.", color = muted)
                        } else {
                            eligibleOrders.forEach { order ->
                                EligibleOrderTile(
                                    order = order,
                                    selected = selectedOrderId == order.id,
                                    accent = accent,
                                    text = text,
                                    muted = muted,
                                    onSelect = {
                                        selectedOrderId = order.id
                                        analytics.returnsRequestStarted(analyticsContext, orderId = order.id)
                                    },
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            ReturnReason.values().forEach { reason ->
                                val active = selectedReason == reason
                                Surface(
                                    modifier = Modifier.clickable { selectedReason = reason },
                                    color = if (active) accent.copy(alpha = 0.2f) else surfaceHigh,
                                    shape = RoundedCornerShape(10.dp),
                                ) {
                                    Text(
                                        text = reason.name.replace('_', ' '),
                                        color = if (active) accent else text,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = returnNote,
                            onValueChange = { returnNote = it },
                            label = { Text("Optional notes") },
                            modifier = Modifier.fillMaxWidth(),
                        )

                        Button(
                            onClick = {
                                val orderId = selectedOrderId
                                if (orderId == null) {
                                    localError = "Select a delivered order before requesting a return."
                                    return@Button
                                }
                                scope.launch {
                                    val result = state.submitBuyerReturnRequest(orderId, selectedReason, returnNote)
                                    when (result) {
                                        is NetworkResult.Success -> {
                                            val created = state.buyerReturns.firstOrNull { it.orderId == orderId }
                                            selectedReturnId = created?.id
                                            localError = null
                                            analytics.returnsRequestSubmitted(
                                                context = analyticsContext,
                                                orderId = orderId,
                                                returnId = created?.id,
                                                returnReason = selectedReason.name,
                                                paymentMethod = "unknown",
                                                latencyMs = null,
                                            )
                                        }

                                        is NetworkResult.Failure -> {
                                            localError = result.error.userMessage()
                                            analytics.returnsRequestFailed(
                                                context = analyticsContext,
                                                orderId = orderId,
                                                returnReason = selectedReason.name,
                                                errorCode = "REQUEST_FAILED",
                                                errorMessage = result.error.userMessage(),
                                            )
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("SUBMIT RETURN REQUEST", color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Return Timeline",
                                color = text,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            if (state.isBuyerReturnsLoading) {
                                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.height(18.dp), color = accent)
                            }
                        }

                        if (state.buyerReturns.isEmpty()) {
                            Text(state.buyerReturnsErrorMessage ?: "No return requests yet.", color = muted)
                        }
                    }
                }
            }

            items(state.buyerReturns) { request ->
                val canonical = request.canonicalStatus
                val statusTone = canonical.badgeColor()
                val isSelected = selectedReturn?.id == request.id

                Surface(
                    modifier =
                        Modifier.fillMaxWidth().clickable {
                            selectedReturnId = request.id
                            analytics.returnsTimelineViewed(
                                context = analyticsContext,
                                orderId = request.orderId,
                                returnId = request.id,
                                statusTo = canonical.name,
                            )
                        },
                    color = surface,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Order ${request.orderId}", color = text, fontWeight = FontWeight.Bold)
                            Surface(color = statusTone.copy(alpha = 0.18f), shape = RoundedCornerShape(8.dp)) {
                                Text(
                                    canonical.readableLabel(),
                                    color = statusTone,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        Text("Reason: ${request.reason.replace('_', ' ')}", color = muted, style = MaterialTheme.typography.bodySmall)

                        if (isSelected) {
                            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                            Surface(
                                color = surfaceHigh,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(
                                    request.canonicalStatus.buyerStatusMessage(),
                                    color = text,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                )
                            }
                            ReturnTimelineBlock(currentStatus = canonical, text = text, muted = muted, accent = accent)

                            if (canonical == ReturnCanonicalStatus.rejected && !request.rejectionReason.isNullOrBlank()) {
                                Surface(color = surfaceHigh, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Seller rejection reason", color = text, fontWeight = FontWeight.Bold)
                                        Text(request.rejectionReason, color = muted, style = MaterialTheme.typography.bodySmall)
                                        TextButton(
                                            onClick = {
                                                analytics.returnsRejectionReasonViewed(
                                                    context = analyticsContext,
                                                    orderId = request.orderId,
                                                    returnId = request.id,
                                                    sellerDecisionReason = request.rejectionReason,
                                                )
                                            },
                                        ) {
                                            Text("Viewed", color = accent)
                                        }
                                    }
                                }

                                Button(
                                    onClick = {
                                        analytics.returnsEscalationCtaTapped(
                                            context = analyticsContext,
                                            orderId = request.orderId,
                                            returnId = request.id,
                                            statusTo = canonical.name,
                                        )
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = surfaceHigh),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text("ESCALATE TO SUPPORT", color = text, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
        PullToRefreshContainer(
            state = pullState,
            modifier = Modifier.align(Alignment.TopCenter),
        )
    }
}

private fun emitStatusDiffs(
    items: List<ReturnRequestResponseDto>,
    previousStatusByReturnId: MutableMap<String, String>,
    previousRawStatusByReturnId: MutableMap<String, String>,
    analytics: com.notwhat.shared.returns.ReturnsAnalyticsTracker,
    analyticsContext: com.notwhat.shared.returns.ReturnsAnalyticsContext,
) {
    items.forEach { request ->
        val current = request.canonicalStatus.name
        val currentRaw = request.status
        val previous = previousStatusByReturnId[request.id]
        val previousRaw = previousRawStatusByReturnId[request.id]

        if (request.canonicalStatus == ReturnCanonicalStatus.unknown && previousRaw != currentRaw) {
            analytics.returnsStatusUnmapped(
                context = analyticsContext,
                orderId = request.orderId,
                returnId = request.id,
                statusTo = request.status,
            )
        }

        if (previous == null) {
            analytics.returnsStatusTransitionRendered(
                context = analyticsContext,
                orderId = request.orderId,
                returnId = request.id,
                statusFrom = "unknown",
                statusTo = current,
            )
        } else if (previous != current) {
            analytics.returnsStatusTransitionRendered(
                context = analyticsContext,
                orderId = request.orderId,
                returnId = request.id,
                statusFrom = previous,
                statusTo = current,
            )
        }

        previousStatusByReturnId[request.id] = current
        previousRawStatusByReturnId[request.id] = currentRaw
    }

    val activeIds = items.map { it.id }.toSet()
    previousStatusByReturnId.keys.retainAll(activeIds)
    previousRawStatusByReturnId.keys.retainAll(activeIds)
}

@Composable
private fun EligibleOrderTile(
    order: OrderDto,
    selected: Boolean,
    accent: Color,
    text: Color,
    muted: Color,
    onSelect: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onSelect() },
        color = if (selected) accent.copy(alpha = 0.14f) else NotWhatColors.surfaceContainerHigh,
        shape = RoundedCornerShape(10.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Order ${order.id}", color = text, fontWeight = FontWeight.SemiBold)
            Text("Total ₹${order.totalAmount.toInt()}", color = muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ReturnTimelineBlock(
    currentStatus: ReturnCanonicalStatus,
    text: Color,
    muted: Color,
    accent: Color,
) {
    val timeline =
        listOf(
            ReturnCanonicalStatus.requested,
            ReturnCanonicalStatus.seller_review,
            ReturnCanonicalStatus.approved,
            ReturnCanonicalStatus.reverse_pickup,
            ReturnCanonicalStatus.in_transit,
            ReturnCanonicalStatus.delivered_to_seller,
            ReturnCanonicalStatus.qc_passed,
            ReturnCanonicalStatus.refunded,
            ReturnCanonicalStatus.closed,
        )

    val activeIndex = timeline.indexOf(currentStatus).let { if (it < 0) 0 else it }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        timeline.forEachIndexed { index, status ->
            val done = index <= activeIndex
            Text(
                text = "${if (done) "•" else "◦"} ${status.readableLabel()}",
                color = if (done) accent else muted,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        if (currentStatus == ReturnCanonicalStatus.qc_failed) {
            Text("Quality check raised a dispute. Support will guide next steps.", color = text, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun ReturnCanonicalStatus.readableLabel(): String = name.replace('_', ' ').replaceFirstChar { it.uppercaseChar() }

private fun ReturnCanonicalStatus.badgeColor(): Color =
    when (this) {
        ReturnCanonicalStatus.requested -> Color(0xFF6DB4FF)
        ReturnCanonicalStatus.seller_review -> Color(0xFFFFC66D)
        ReturnCanonicalStatus.approved -> Color(0xFF7ED97A)
        ReturnCanonicalStatus.rejected -> Color(0xFFFF8A80)
        ReturnCanonicalStatus.reverse_pickup -> Color(0xFF7EC8E3)
        ReturnCanonicalStatus.in_transit -> Color(0xFF8FB3FF)
        ReturnCanonicalStatus.delivered_to_seller -> Color(0xFFFFD280)
        ReturnCanonicalStatus.qc_passed -> Color(0xFF8BE28B)
        ReturnCanonicalStatus.qc_failed -> Color(0xFFFF8A80)
        ReturnCanonicalStatus.refunded -> Color(0xFF9AE6A6)
        ReturnCanonicalStatus.closed -> Color(0xFFB0BEC5)
        ReturnCanonicalStatus.unknown -> Color(0xFFB0BEC5)
    }

private fun ReturnCanonicalStatus.buyerStatusMessage(): String =
    when (this) {
        ReturnCanonicalStatus.requested -> "Return request received. Seller review is pending."
        ReturnCanonicalStatus.seller_review -> "Seller is reviewing your return request."
        ReturnCanonicalStatus.approved -> "Return approved. Your order will be picked up shortly."
        ReturnCanonicalStatus.rejected -> "Return request rejected. Contact support if you want to appeal."
        ReturnCanonicalStatus.reverse_pickup -> "Pickup has been scheduled. Keep the item ready."
        ReturnCanonicalStatus.in_transit -> "Return parcel has been picked up and is on the way to seller."
        ReturnCanonicalStatus.delivered_to_seller -> "Return delivered to seller. Quality check will happen next."
        ReturnCanonicalStatus.qc_passed -> "Quality check passed. Refund will be processed shortly."
        ReturnCanonicalStatus.qc_failed -> "Quality check failed. Support team will share next steps."
        ReturnCanonicalStatus.refunded -> "Refund completed. Amount should reflect in your payment method soon."
        ReturnCanonicalStatus.closed -> "Return flow is complete."
        ReturnCanonicalStatus.unknown -> "Status update received. Please refresh after a short while."
    }
