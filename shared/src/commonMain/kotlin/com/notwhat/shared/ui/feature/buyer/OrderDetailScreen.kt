package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.order.OrderDto

@Composable
internal fun OrderDetailScreen(
    modifier: Modifier,
    order: OrderDto,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val canShowTracking = order.status.lowercase() in setOf("shipped", "delivered")
    val statusColor = getOrderStatusColor(order.status)

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Text("Order Details", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("", modifier = Modifier.size(56.dp)) // Spacer for alignment
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Order ${order.id.take(8)}", color = text, fontWeight = FontWeight.Bold)
                                Text(order.createdAt ?: "", color = muted, style = MaterialTheme.typography.labelSmall)
                            }
                            Surface(color = statusColor.copy(alpha = 0.18f), shape = RoundedCornerShape(8.dp)) {
                                Text(
                                    order.status.uppercase(),
                                    color = statusColor,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

                        Text("Delivery Address", color = text, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            val addr = order.deliveryAddress
                            if (addr != null) {
                                Text(addr.fullName, color = text, fontWeight = FontWeight.SemiBold)
                                Text(addr.phone, color = muted, style = MaterialTheme.typography.labelSmall)
                                Text(
                                    "${addr.addressLine1}${addr.addressLine2?.let { ", $it" } ?: ""}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                                Text(
                                    "${addr.city}, ${addr.state} ${addr.pincode}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            } else {
                                Text("Address not available", color = muted)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Order Items", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                        order.items.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (!item.imageSnapshot.isNullOrBlank()) {
                                    AsyncImage(
                                        model = item.imageSnapshot,
                                        contentDescription = item.titleSnapshot,
                                        modifier = Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                }

                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(item.titleSnapshot, color = text, fontWeight = FontWeight.SemiBold, maxLines = 2)
                                    Text("Qty: ${item.quantity}", color = muted, style = MaterialTheme.typography.labelSmall)
                                    Text("₹${item.priceSnapshot.toInt()} × ${item.quantity}", color = accent, fontWeight = FontWeight.Bold)
                                }
                            }

                            if (order.items.indexOf(item) < order.items.size - 1) {
                                HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Order Summary", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Subtotal", color = muted)
                            Text("₹${order.subtotal.toInt()}", color = text)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Shipping", color = muted)
                            Text("₹${order.shippingAmount.toInt()}", color = text)
                        }

                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Total", color = text, fontWeight = FontWeight.Bold)
                            Text("₹${order.totalAmount.toInt()}", color = accent, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Tracking section temporarily disabled - trackingNumber and trackingUrl not in OrderDto
            /*
            // Only show tracking section if order is shipped or delivered
            if (canShowTracking && !order.trackingNumber.isNullOrBlank()) {
                item {
                    Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Tracking Details", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("Tracking Number", color = muted)
                                    Text(order.trackingNumber ?: "N/A", color = text, fontWeight = FontWeight.SemiBold)
                                }

                                if (!order.trackingUrl.isNullOrBlank()) {
                                    Button(
                                        onClick = {
                                            // TODO: Open tracking URL
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(containerColor = accent),
                                        shape = RoundedCornerShape(12.dp),
                                    ) {
                                        Text("TRACK PACKAGE", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
             */
        }
    }
}

private fun getOrderStatusColor(status: String): Color =
    when (status.lowercase()) {
        "placed" -> NotWhatColors.primary

        "confirmed" -> NotWhatColors.primary

        "shipped" -> Color(0xFF4CAF50)

        // Green
        "delivered" -> Color(0xFF4CAF50)

        // Green
        "cancelled" -> Color(0xFFFF6B6B)

        // Red
        "returned" -> Color(0xFFFF9800)

        // Orange
        else -> NotWhatColors.onSurfaceVariant
    }
