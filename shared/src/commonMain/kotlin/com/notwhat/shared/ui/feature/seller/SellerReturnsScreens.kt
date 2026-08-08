package com.notwhat.shared.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.returns.ReturnRequestResponseDto
import kotlinx.coroutines.launch

@Composable
internal fun SellerReturnsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenOrderOperations: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val requestedTone = Color(0xFF7A251C)
    val approvedTone = Color(0xFF1F6A38)
    val listGap = 14.dp
    val cardInnerGap = 10.dp
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf("Requested") }
    val returnRequests = state.sellerReturns
    var selectedRequestId by remember { mutableStateOf<String?>(null) }
    val requestStatusById = remember { mutableStateMapOf<String, String>() }
    var actionMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(state.currentSession?.authToken) {
        state.loadSellerReturns()
    }

    LaunchedEffect(returnRequests.map { it.id }.joinToString("|")) {
        if (selectedRequestId == null && returnRequests.isNotEmpty()) {
            selectedRequestId = returnRequests.first().id
        }
        if (selectedRequestId != null && returnRequests.none { it.id == selectedRequestId }) {
            selectedRequestId = returnRequests.firstOrNull()?.id
        }
    }

    val tabs = listOf("Requested", "Approved", "Completed")

    fun bucketStatus(request: ReturnRequestResponseDto): String {
        val local = requestStatusById[request.id]
        if (local != null) return local
        return when (request.status.lowercase()) {
            "requested", "return_requested", "seller_review", "under_review" -> "Requested"
            "approved", "return_approved", "pickup_scheduled", "reverse_pickup", "reverse_pickup_scheduled", "picked_up", "reverse_in_transit", "in_transit" -> "Approved"
            else -> "Completed"
        }
    }

    val countsByStatus =
        mapOf(
            "Requested" to returnRequests.count { bucketStatus(it) == "Requested" },
            "Approved" to returnRequests.count { bucketStatus(it) == "Approved" },
            "Completed" to returnRequests.count { bucketStatus(it) == "Completed" },
        )

    val filteredRequests =
        returnRequests.filter { request ->
            val status = bucketStatus(request)
            when (selectedTab) {
                "Requested" -> status == "Requested"
                "Approved" -> status == "Approved"
                "Completed" -> status == "Completed"
                else -> true
            }
        }

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding =
                PaddingValues(
                    start = SellerUiTokens.screenPadding,
                    end = SellerUiTokens.screenPadding,
                    top = SellerUiTokens.screenPadding,
                    bottom = 20.dp,
                ),
            verticalArrangement = Arrangement.spacedBy(listGap),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Returns & Refunds", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                        Text("Seller operations", color = muted, style = MaterialTheme.typography.labelSmall)
                    }
                    Surface(shape = RoundedCornerShape(10.dp), color = surfaceHigh) {
                        Text(
                            "${filteredRequests.size}",
                            color = text,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }
            }

            actionMessage?.let { msg ->
                item {
                    Surface(
                        color = surfaceHigh,
                        shape = RoundedCornerShape(12.dp),
                        tonalElevation = 1.dp,
                        shadowElevation = 1.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(msg, color = text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                            Text(
                                "Dismiss",
                                color = accent,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable { actionMessage = null },
                            )
                        }
                    }
                }
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap), modifier = Modifier.fillMaxWidth()) {
                    items(tabs) { tab ->
                        val active = selectedTab == tab
                        val count = countsByStatus[tab] ?: 0
                        val chipInteraction = remember { MutableInteractionSource() }
                        val chipPressed by chipInteraction.collectIsPressedAsState()
                        val chipScale by animateFloatAsState(if (chipPressed) 0.98f else 1f)
                        Surface(
                            modifier =
                                Modifier
                                    .graphicsLayer {
                                        scaleX = chipScale
                                        scaleY = chipScale
                                    }.clickable(
                                        interactionSource = chipInteraction,
                                        indication = LocalIndication.current,
                                    ) { selectedTab = tab },
                            shape = SellerUiTokens.radiusChip,
                            color = if (active) accent else NotWhatColors.surfaceContainer,
                            border = BorderStroke(1.dp, if (active) accent else NotWhatColors.outline),
                            shadowElevation = if (active) 2.dp else 0.dp,
                        ) {
                            Row(
                                modifier =
                                    Modifier.padding(
                                        horizontal = SellerUiTokens.chipHorizontalPadding,
                                        vertical = SellerUiTokens.chipVerticalPadding,
                                    ),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    tab,
                                    color = if (active) Color.White else muted,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                )
                                Surface(
                                    shape = RoundedCornerShape(999.dp),
                                    color = if (active) Color.White.copy(alpha = 0.2f) else surface,
                                ) {
                                    Text(
                                        "$count",
                                        color = if (active) Color.White else text,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                Surface(
                    color = surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    border = BorderStroke(1.dp, NotWhatColors.surfaceVariant),
                    tonalElevation = 1.dp,
                    shadowElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(cardInnerGap),
                    ) {
                        Text("Returns queue", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            "Manage return requests, suggested refunds, and approval flow from the seller inventory context.",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            QueueMetricPill(
                                label = "Pending",
                                value = countsByStatus["Requested"] ?: 0,
                                tone = requestedTone,
                                modifier = Modifier.weight(1f),
                            )
                            QueueMetricPill(
                                label = "Approved",
                                value = countsByStatus["Approved"] ?: 0,
                                tone = approvedTone,
                                modifier = Modifier.weight(1f),
                            )
                            QueueMetricPill(
                                label = "Completed",
                                value = countsByStatus["Completed"] ?: 0,
                                tone = muted,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            items(filteredRequests) { request ->
                val status = bucketStatus(request)
                val statusTone =
                    when (status) {
                        "Requested" -> requestedTone
                        "Approved" -> approvedTone
                        else -> muted
                    }
                val isSelected = selectedRequestId == request.id
                val cardInteraction = remember { MutableInteractionSource() }
                val cardPressed by cardInteraction.collectIsPressedAsState()
                val cardScale by animateFloatAsState(if (cardPressed) 0.992f else 1f)

                Surface(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .graphicsLayer {
                                scaleX = cardScale
                                scaleY = cardScale
                            }.clickable(
                                interactionSource = cardInteraction,
                                indication = LocalIndication.current,
                            ) { selectedRequestId = request.id },
                    color = surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    border = BorderStroke(1.dp, statusTone.copy(alpha = 0.28f)),
                    tonalElevation = if (isSelected) 2.dp else 1.dp,
                    shadowElevation = if (isSelected) 6.dp else 2.dp,
                ) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(cardInnerGap),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        "ORDER #${request.orderId}",
                                        color = accent,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.weight(1f, fill = false),
                                    )
                                    if (isSelected) {
                                        Surface(shape = RoundedCornerShape(999.dp), color = NotWhatColors.secondaryContainer) {
                                            Text(
                                                "Selected",
                                                color = text,
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                            )
                                        }
                                    }
                                }
                                Text(
                                    request.description?.takeIf { it.isNotBlank() } ?: "Return request",
                                    color = text,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("Status source: ${request.status}", color = muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Surface(
                                shape = RoundedCornerShape(999.dp),
                                color = statusTone.copy(alpha = 0.15f),
                                border = BorderStroke(1.dp, statusTone.copy(alpha = 0.35f)),
                            ) {
                                Text(
                                    status,
                                    color = statusTone,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        Surface(
                            color = NotWhatColors.surfaceContainer,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, NotWhatColors.surfaceVariant.copy(alpha = 0.8f)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Reason", color = text, fontWeight = FontWeight.Bold, modifier = Modifier.width(56.dp))
                                    Text(
                                        request.reason.replace('_', ' ').ifBlank { "No reason supplied." },
                                        color = text,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Note", color = text, fontWeight = FontWeight.Bold, modifier = Modifier.width(56.dp))
                                    Text(
                                        request.description?.ifBlank { "No buyer note yet." } ?: "No buyer note yet.",
                                        color = muted,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Buyer photos (0)", color = muted, style = MaterialTheme.typography.labelMedium)
                            Text("Suggested \u20b9${request.refundAmount.toInt()}", color = accent, fontWeight = FontWeight.Bold)
                        }

                        if (isSelected) {
                            Surface(
                                color = surfaceHigh,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, NotWhatColors.surfaceVariant),
                                tonalElevation = 1.dp,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Request details", color = text, fontWeight = FontWeight.Bold)
                                    Text(
                                        "Open this request to approve the return, reject it, or hand it back to order operations for exception handling.",
                                        color = muted,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }

                        HorizontalDivider(color = NotWhatColors.surfaceVariant.copy(alpha = 0.8f), thickness = 1.dp)

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            if (status == "Requested") {
                                Button(
                                    onClick = {
                                        scope.launch {
                                            when (val result = state.approveSellerReturn(request.id)) {
                                                is NetworkResult.Success -> {
                                                    requestStatusById[request.id] = "Approved"
                                                    actionMessage = "${request.orderId} approved for return."
                                                    selectedTab = "Approved"
                                                }

                                                is NetworkResult.Failure -> {
                                                    actionMessage = result.error.userMessage()
                                                }
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(50.dp),
                                    shape = SellerUiTokens.radiusButton,
                                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                                ) {
                                    Text("Approve Return", color = Color.White, fontWeight = FontWeight.Black)
                                }
                            }
                            Button(
                                onClick = {
                                    scope.launch {
                                        when (
                                            val result =
                                                state.rejectSellerReturn(
                                                    returnId = request.id,
                                                    reason =
                                                        if (status ==
                                                            "Approved"
                                                        ) {
                                                            "Approval reversed by seller"
                                                        } else {
                                                            "Rejected by seller"
                                                        },
                                                )
                                        ) {
                                            is NetworkResult.Success -> {
                                                requestStatusById[request.id] = "Completed"
                                                actionMessage =
                                                    if (status == "Approved") {
                                                        "${request.orderId} return approval reversed."
                                                    } else {
                                                        "${request.orderId} return request rejected."
                                                    }
                                                selectedTab = "Completed"
                                            }

                                            is NetworkResult.Failure -> {
                                                actionMessage = result.error.userMessage()
                                            }
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f).height(50.dp),
                                shape = SellerUiTokens.radiusButton,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFF4D9)),
                                border = BorderStroke(1.dp, Color(0xFFD4B47A)),
                            ) {
                                Text("Reject", color = text, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            if (filteredRequests.isEmpty()) {
                item {
                    Surface(
                        color = surface,
                        shape = SellerUiTokens.radiusInnerCard,
                        border = BorderStroke(1.dp, NotWhatColors.surfaceVariant),
                        tonalElevation = 1.dp,
                        shadowElevation = 2.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(SellerUiTokens.cardPadding),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("No ${selectedTab.lowercase()} returns", color = text, fontWeight = FontWeight.Bold)
                            Text(
                                "Return requests will appear here as buyers submit and your team takes action.",
                                color = muted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                            TextButton(onClick = onOpenOrderOperations) { Text("Open order operations", color = accent) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QueueMetricPill(
    label: String,
    value: Int,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = tone.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, tone.copy(alpha = 0.25f)),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(label, color = tone, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            Text(
                value.toString(),
                color = NotWhatColors.onSurface,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Black,
            )
        }
    }
}
