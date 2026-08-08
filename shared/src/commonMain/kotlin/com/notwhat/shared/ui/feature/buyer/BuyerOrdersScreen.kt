package com.notwhat.shared.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
    val outline = NotWhatColors.outline
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
                Surface(
                    color = surface,
                    shape = RoundedCornerShape(999.dp),
                    border = BorderStroke(1.dp, outline.copy(alpha = 0.5f)),
                ) {
                    Text(
                        "${orders.size}",
                        color = muted,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    )
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
                outline = outline,
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
    outline: Color,
    text: Color,
    muted: Color,
    accent: Color,
    onOpenOrder: () -> Unit,
) {
    val statusStyle = orderStatusStyle(order.status)
    val itemCount = order.items.sumOf { it.quantity }

    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onOpenOrder() },
        color = surface,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Order ${order.id.take(8)}", color = text, fontWeight = FontWeight.Bold)
                    Text("$itemCount item${if (itemCount == 1) "" else "s"}", color = muted, style = MaterialTheme.typography.labelSmall)
                }

                Surface(
                    color = statusStyle.color.copy(alpha = 0.14f),
                    shape = RoundedCornerShape(999.dp),
                    border = BorderStroke(1.dp, statusStyle.color.copy(alpha = 0.28f)),
                ) {
                    Text(
                        statusStyle.label,
                        color = statusStyle.color,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
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
                    accent = accent,
                )
            }

            HorizontalDivider(color = outline.copy(alpha = 0.35f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Total", color = muted, style = MaterialTheme.typography.labelSmall)
                    Text(
                        "₹${formatOrderAmount(order.totalAmount)}",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                    )
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
    accent: Color,
) {
    val displayImage =
        item.imageSnapshot?.takeIf { it.isNotBlank() }
            ?: item.productId?.displayImageUrl
    val displayTitle =
        item.titleSnapshot.takeIf { it.isNotBlank() }
            ?: item.productId?.displayTitle ?: "Product"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (!displayImage.isNullOrBlank()) {
            AsyncImage(
                model = displayImage,
                contentDescription = displayTitle,
                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop,
            )
        } else {
            Surface(
                color = accent.copy(alpha = 0.08f),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(48.dp).border(BorderStroke(1.dp, accent.copy(alpha = 0.25f)), RoundedCornerShape(8.dp)),
            ) {}
        }

        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(displayTitle, color = text, fontWeight = FontWeight.SemiBold, maxLines = 1)
            Text(
                "Qty: ${item.quantity} x ₹${formatOrderAmount(item.priceSnapshot)}",
                color = muted,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}

private data class OrderStatusStyle(
    val label: String,
    val color: Color,
)

private fun orderStatusStyle(status: String): OrderStatusStyle {
    val normalized = status.lowercase()
    val color =
        when (normalized) {
            "awaiting_seller_acceptance" -> Color(0xFF9A6700)
            "processing", "confirmed", "placed" -> NotWhatColors.primary
            "shipped", "delivered" -> Color(0xFF1E7A43)
            "return_requested", "return_approved", "return_rejected", "returned", "refunded" -> Color(0xFFD97706)
            "cancelled", "rejected" -> Color(0xFFB42318)
            else -> NotWhatColors.onSurfaceVariant
        }

    val label =
        normalized.replace('_', ' ').split(' ').joinToString(" ") { token ->
            token.replaceFirstChar { ch -> ch.uppercase() }
        }

    return OrderStatusStyle(label = label, color = color)
}

private fun formatOrderAmount(amount: Double): String {
    val whole = amount.toLong()
    return if (amount == whole.toDouble()) {
        whole.toString()
    } else {
        amount.toString()
    }
}
