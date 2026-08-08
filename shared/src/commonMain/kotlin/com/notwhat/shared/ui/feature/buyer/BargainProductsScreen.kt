package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BuyerBidDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.util.getCurrentTimeMillis
import kotlin.math.absoluteValue
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.Instant

@Composable
internal fun BargainProductsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onOpenProduct: (ProductDto) -> Unit,
    onOpenCart: () -> Unit,
    previewActiveSchedules: List<BargainScheduleDto>? = null,
    previewMyBids: List<BuyerBidDto>? = null,
    debugNowMs: Long? = null,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()
    val isBuyer = state.uiRole == UserRole.Buyer

    var activeSchedules by remember { mutableStateOf<List<BargainScheduleDto>>(emptyList()) }
    var myBids by remember { mutableStateOf<List<BuyerBidDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var paymentActionNote by remember { mutableStateOf<String?>(null) }
    var nowMs by remember { mutableLongStateOf(debugNowMs ?: getCurrentTimeMillis()) }

    LaunchedEffect(debugNowMs) {
        if (debugNowMs != null) {
            nowMs = debugNowMs
        } else {
            while (true) {
                nowMs = getCurrentTimeMillis()
                delay(1000)
            }
        }
    }

    LaunchedEffect(state.currentSession?.authToken, state.uiRole) {
        if (previewActiveSchedules != null) {
            activeSchedules = previewActiveSchedules
            myBids = previewMyBids.orEmpty()
            isLoading = false
            loadError = null
            return@LaunchedEffect
        }

        isLoading = true
        loadError = null

        val activeResult = state.bargainUseCase.getActiveBargains()
        when (activeResult) {
            is NetworkResult.Success -> {
                activeSchedules = activeResult.data
            }

            is NetworkResult.Failure -> {
                activeSchedules = emptyList()
                loadError = activeResult.error.userMessage()
            }
        }

        if (isBuyer) {
            val token = state.currentSession?.authToken
            if (!token.isNullOrBlank()) {
                when (val myBidsResult = state.bargainUseCase.getMyBids(token)) {
                    is NetworkResult.Success -> {
                        myBids = myBidsResult.data
                    }

                    is NetworkResult.Failure -> {
                        myBids = emptyList()
                        if (loadError == null) {
                            loadError = myBidsResult.error.userMessage()
                        }
                    }
                }
            } else {
                myBids = emptyList()
            }
        } else {
            myBids = emptyList()
        }

        isLoading = false
    }

    val scheduleByProductId =
        activeSchedules
            .filter { it.status.equals("active", ignoreCase = true) }
            .associateBy { it.productId }
    val bargainProducts =
        state.content.products
            .filter { product ->
                product.bargainEnabled &&
                    product.status.equals("active", ignoreCase = true) &&
                    product.stock > 0 &&
                    scheduleByProductId.containsKey(product.id)
            }
            .sortedBy { scheduleByProductId[it.id]?.endDate ?: "9999-12-31T23:59:59.000Z" }
    val acceptedBids = myBids.filter { it.canProceedToPayment && it.product != null }
    val pendingBids = myBids.filter { it.status.lowercase() in setOf("active", "pending_seller_decision") }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Bargain Deals",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = text,
                )
                Surface(color = accent.copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp)) {
                    Text(
                        "${bargainProducts.size} Active",
                        color = accent,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
            }
        }

        if (loadError != null) {
            item {
                Surface(color = Color(0xFFFFF0E6), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        loadError ?: "",
                        color = Color(0xFF8B4513),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }

        if (isBuyer && acceptedBids.isNotEmpty()) {
            item {
                SectionTitle(title = "Accepted Bids", subtitle = "Pay with your accepted bid quantity and price")
            }

            items(acceptedBids) { bid ->
                val product = bid.product ?: return@items
                val countdownLabel = formatTimerLabel(bid.paymentWindowEndsAt ?: bid.scheduleEndDate, nowMs)

                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(product.displayTitle, color = text, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(product.displayStoreName, color = muted, style = MaterialTheme.typography.labelSmall)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(color = accent.copy(alpha = 0.15f), shape = RoundedCornerShape(10.dp)) {
                                Text(
                                    countdownLabel,
                                    color = accent,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                )
                            }
                        }

                        Text("Accepted: ${formatMoney(bid.amount)} x ${bid.quantity}", color = text, style = MaterialTheme.typography.bodyMedium)

                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = { onOpenProduct(product) },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF455A64)),
                            ) {
                                Text("VIEW", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Button(
                                onClick = {
                                    val token = state.currentSession?.authToken
                                    if (token.isNullOrBlank()) {
                                        paymentActionNote = "Sign in again to continue payment."
                                        return@Button
                                    }

                                    scope.launch {
                                        val result =
                                            state.transaction.addCartItem(
                                                productId = product.id,
                                                quantity = bid.quantity,
                                                bargainBidId = bid.id,
                                                bearerToken = token,
                                            )
                                        if (result is NetworkResult.Success) {
                                            state.transaction.refreshCart(token)
                                            paymentActionNote = "Accepted bid added to cart. Continue payment in cart."
                                            onOpenCart()
                                        } else if (result is NetworkResult.Failure) {
                                            paymentActionNote = result.error.userMessage()
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = accent),
                                enabled = !isLoading,
                            ) {
                                Text(
                                    "PAY NOW",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.testTag("accepted_bid_pay_now_${bid.id}"),
                                )
                            }
                        }
                    }
                }
            }
        }

        if (isBuyer && pendingBids.isNotEmpty()) {
            item {
                SectionTitle(title = "Your Pending Bids", subtitle = "You can revise your bid until seller decision")
            }
            items(pendingBids.take(4)) { bid ->
                val title = bid.product?.displayTitle ?: "Product"
                Surface(color = surface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(title, color = text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("Bid: ${formatMoney(bid.amount)} x ${bid.quantity}", color = muted, style = MaterialTheme.typography.bodySmall)
                        }
                        Surface(color = Color(0xFFFFF6E6), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                bid.status.replace('_', ' ').uppercase(),
                                color = Color(0xFF8A5A00),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                            )
                        }
                    }
                }
            }
        }

        paymentActionNote?.let { note ->
            item {
                Surface(color = Color(0xFFF0F6FF), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(note, color = Color(0xFF1F4B8F), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
                }
            }
        }

        if (bargainProducts.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("No bargain products yet", style = MaterialTheme.typography.titleMedium, color = muted)
                        Text("Sellers can enable bargain on individual products", color = muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        } else {
            items(bargainProducts.chunked(2)) { rowProducts ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    rowProducts.forEach { product ->
                        ElevatedCard(
                            modifier = Modifier.weight(1f).clickable { onOpenProduct(product) },
                            colors = CardDefaults.elevatedCardColors(containerColor = surface),
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Box {
                                    DemoImage(
                                        url = product.displayImageUrl,
                                        contentDescription = product.displayTitle,
                                        modifier = Modifier.fillMaxWidth().height(180.dp),
                                        shape = RoundedCornerShape(14.dp),
                                    )
                                    val schedule = scheduleByProductId[product.id]
                                    val timerLabel = formatTimerLabel(schedule?.endDate, nowMs)
                                    // Bargain badge
                                    Text(
                                        "BARGAIN",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier =
                                            Modifier
                                                .align(Alignment.TopStart)
                                                .padding(8.dp)
                                                .background(accent, RoundedCornerShape(8.dp))
                                                .padding(horizontal = 8.dp, vertical = 4.dp),
                                    )
                                    Surface(
                                        color = Color.Black.copy(alpha = 0.55f),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                                    ) {
                                        Text(
                                            timerLabel,
                                            color = Color.White,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp).testTag("bargain_timer_${product.id}"),
                                        )
                                    }
                                }
                                Column(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(product.displayStoreName, color = muted, style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        product.displayTitle,
                                        color = text,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(product.displayPrice, color = accent, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    if (rowProducts.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        if (isLoading) {
            item {
                Text("Loading bargain updates...", color = muted, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun SectionTitle(
    title: String,
    subtitle: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = NotWhatColors.onSurface)
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = NotWhatColors.onSurfaceVariant)
    }
}

private fun formatMoney(value: Double): String {
    val rounded = kotlin.math.round(value * 100.0) / 100.0
    val isWhole = (rounded - rounded.toInt()).absoluteValue < 0.0001
    return if (isWhole) "₹${rounded.toInt()}" else "₹$rounded"
}

private fun formatTimerLabel(
    endDateIso: String?,
    nowMs: Long,
): String {
    if (endDateIso.isNullOrBlank()) {
        return "No timer"
    }

    val endMs = runCatching { Instant.parse(endDateIso).toEpochMilliseconds() }.getOrNull() ?: return "No timer"
    val remainingMs = endMs - nowMs

    if (remainingMs <= 0L) {
        return "Ended"
    }

    val remainingSec = remainingMs / 1000
    val hours = remainingSec / 3600
    val minutes = (remainingSec % 3600) / 60
    val seconds = remainingSec % 60

    return "${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}"
}
