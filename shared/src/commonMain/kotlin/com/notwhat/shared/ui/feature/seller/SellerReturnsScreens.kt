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
import androidx.compose.foundation.layout.size
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

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

    var selectedTab by remember { mutableStateOf("Requested (12)") }
    // Build return request display items from real orders with return/cancellation status
    val liveReturnRequests =
        state.sellerContent.orders
            .filter { it.status in listOf("return_requested", "cancelled", "refunded") }
            .map { order ->
                DemoSellerReturnRequest(
                    orderId = order.id,
                    productName = order.items.firstOrNull()?.titleSnapshot ?: "—",
                    size = "-",
                    color = "-",
                    status = "Requested",
                    reason = order.cancelReason ?: "Return requested by buyer",
                    buyerNote = "",
                    suggestedRefund = "\u20b9${order.totalAmount.toInt()}",
                    buyerPhotoCount = 0,
                )
            }
    val returnRequests = liveReturnRequests
    var selectedRequest by remember { mutableStateOf<DemoSellerReturnRequest?>(returnRequests.firstOrNull()) }
    val requestStatusById = remember { mutableStateMapOf<String, String>() }
    var actionMessage by remember { mutableStateOf<String?>(null) }

    val tabs = listOf("Requested (12)", "Approved (8)", "Completed (45)")
    val filteredRequests =
        returnRequests.filter { request ->
            val status = requestStatusById[request.orderId] ?: request.status
            when (selectedTab) {
                "Requested (12)" -> status == "Requested"
                "Approved (8)" -> status == "Approved"
                "Completed (45)" -> status == "Completed"
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
                    bottom = 24.dp,
                ),
            verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Text("Returns & Refunds", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    TextButton(onClick = onOpenOrderOperations) { Text("Orders", color = accent) }
                }
            }

            actionMessage?.let { msg ->
                item {
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
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
                                modifier =
                                    Modifier.clickable {
                                        actionMessage =
                                            null
                                    },
                            )
                        }
                    }
                }
            }

            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap), modifier = Modifier.fillMaxWidth()) {
                    items(tabs) { tab ->
                        val active = selectedTab == tab
                        Surface(
                            modifier = Modifier.clickable { selectedTab = tab },
                            shape = SellerUiTokens.radiusChip,
                            color = if (active) accent else NotWhatColors.surfaceContainer,
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (active) accent else NotWhatColors.outline),
                        ) {
                            Text(
                                tab,
                                color = if (active) Color.White else muted,
                                modifier =
                                    Modifier.padding(
                                        horizontal = SellerUiTokens.chipHorizontalPadding,
                                        vertical = SellerUiTokens.chipVerticalPadding,
                                    ),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                    ) {
                        Text("Returns queue", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            "Manage return requests, suggested refunds, and approval flow from the seller inventory context.",
                            color = muted,
                        )
                    }
                }
            }

            items(filteredRequests) { request ->
                val status = requestStatusById[request.orderId] ?: request.status
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable { selectedRequest = request },
                    color = surface,
                    shape = SellerUiTokens.radiusInnerCard,
                ) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    "ORDER #${request.orderId}",
                                    color = accent,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    request.productName,
                                    color = text,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("Size ${request.size} • ${request.color}", color = muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (status == "Requested") Color(0xFF6B1D17) else surfaceHigh,
                            ) {
                                Text(
                                    status,
                                    color = if (status == "Requested") Color(0xFFFFB4A8) else text,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        Surface(
                            color = NotWhatColors.surfaceContainer,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Reason:", color = text, fontWeight = FontWeight.Bold)
                                    Text(request.reason, color = text)
                                }
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Note:", color = text, fontWeight = FontWeight.Bold)
                                    Text(request.buyerNote, color = muted)
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Buyer Photos (${request.buyerPhotoCount})", color = muted, style = MaterialTheme.typography.labelMedium)
                            Text("Suggested: ${request.suggestedRefund}", color = accent, fontWeight = FontWeight.Bold)
                        }

                        if (selectedRequest?.orderId == request.orderId) {
                            Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
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

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    requestStatusById[request.orderId] = "Approved"
                                    actionMessage = "${request.orderId} approved for return."
                                },
                                modifier = Modifier.weight(1f).height(50.dp),
                                shape = SellerUiTokens.radiusButton,
                                colors = ButtonDefaults.buttonColors(containerColor = accent),
                            ) {
                                Text("Approve Return", color = Color.White, fontWeight = FontWeight.Black)
                            }
                            Button(
                                onClick = {
                                    requestStatusById[request.orderId] = "Completed"
                                    actionMessage = "${request.orderId} marked completed after rejection review."
                                },
                                modifier = Modifier.weight(1f).height(50.dp),
                                shape = SellerUiTokens.radiusButton,
                                colors = ButtonDefaults.buttonColors(containerColor = surfaceHigh),
                            ) {
                                Text("Reject", color = text, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                    ) {
                        Text(
                            "Refund policy reminders",
                            color = text,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "Approve returns when product condition is consistent with the buyer note and supported photos.",
                            color = muted,
                        )
                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                        Text("Rejected requests should be routed back to order operations for exception review.", color = muted)
                    }
                }
            }
        }
    }
}
