package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@Composable
internal fun BuyerOrdersContentScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenOrder: (com.notwhat.shared.order.OrderDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    val ordersErrorMessage = state.transaction.ordersErrorMessage
    val orders = state.transaction.orders
    val isLoading = state.transaction.isOrdersLoading

    LaunchedEffect(state.currentSession?.authToken) {
        val token = state.currentSession?.authToken ?: return@LaunchedEffect
        state.transaction.loadOrders(token)

        while (currentCoroutineContext().isActive) {
            delay(15_000)
            state.transaction.loadOrders(token)
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
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
                Text("My Orders", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text("${orders.size}", color = muted, style = MaterialTheme.typography.labelSmall)
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
                            Text("Retry", color = accent)
                        }
                    }
                }
            }
        }

        if (orders.isEmpty() && !isLoading) {
            item {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("No orders yet", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Start shopping to place your first order", color = muted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        items(orders) { order ->
            OrderCard(
                order = order,
                surface = surface,
                text = text,
                muted = muted,
                accent = accent,
                onOpenOrder = { onOpenOrder(order) },
            )
        }

        if (isLoading) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(24.dp), color = accent)
                }
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: com.notwhat.shared.order.OrderDto,
    surface: Color,
    text: Color,
    muted: Color,
    accent: Color,
    onOpenOrder: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onOpenOrder() },
        color = surface,
        shape = RoundedCornerShape(14.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Order ${order.id.take(8)}", color = text, fontWeight = FontWeight.Bold)
                Surface(color = getOrderStatusColor(order.status).copy(alpha = 0.18f), shape = RoundedCornerShape(8.dp)) {
                    Text(
                        order.status.uppercase(),
                        color = getOrderStatusColor(order.status),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            // Show first item preview
            if (order.items.isNotEmpty()) {
                val firstItem = order.items.first()
                OrderItemPreview(
                    item = firstItem,
                    text = text,
                    muted = muted,
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Total", color = muted, style = MaterialTheme.typography.labelSmall)
                    Text("₹${order.totalAmount}", color = text, fontWeight = FontWeight.Bold)
                }
                Text("›", style = MaterialTheme.typography.titleLarge, color = accent)
            }
        }
    }
}

@Composable
private fun OrderItemPreview(
    item: com.notwhat.shared.order.OrderItemDto,
    text: Color,
    muted: Color,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (!item.imageSnapshot.isNullOrBlank()) {
            AsyncImage(
                model = item.imageSnapshot,
                contentDescription = item.titleSnapshot,
                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop,
            )
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(item.titleSnapshot, color = text, fontWeight = FontWeight.SemiBold, maxLines = 1)
            Text("Qty: ${item.quantity} × ₹${item.priceSnapshot}", color = muted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

private fun getOrderStatusColor(status: String): Color {
    return when (status.lowercase()) {
        "placed" -> NotWhatColors.primary
        "confirmed" -> NotWhatColors.primary
        "shipped" -> Color(0xFF4CAF50) // Green
        "delivered" -> Color(0xFF4CAF50) // Green
        "cancelled" -> Color(0xFFFF6B6B) // Red
        "returned" -> Color(0xFFFF9800) // Orange
        else -> NotWhatColors.onSurfaceVariant
    }
}
