package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.lazy.LazyColumn
import com.notwhat.shared.catalog.ProductDto

@Composable
internal fun ProductDetailScreen(modifier: Modifier, product: ProductDto, onBack: () -> Unit) {
    val detailBg = Color(0xFF0A0A0A)
    val detailSurface = Color(0xFF2D1B16)
    val detailSurfaceHigh = Color(0xFF382620)
    val detailText = Color(0xFFFCDCD3)
    val detailMuted = Color(0xFFE6BEB2)
    val detailAccent = NotWhatAuthTokens.accent
    val bargainScenario = BargainFixtures.forProduct(product)

    var selectedSize by remember { mutableStateOf("M") }
    var selectedDelivery by remember { mutableStateOf("Standard") }
    var showBidSheet by remember { mutableStateOf(false) }
    var bidInput by remember(product.id) { mutableStateOf(bargainScenario.defaultBidInput) }
    var addedToCart by remember(product.id) { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize().background(detailBg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onBack) { Text("Back", color = detailAccent) }
                }
            }

            item {
                Box(modifier = Modifier.fillMaxWidth().height(360.dp)) {
                    DemoImage(
                        url = product.displayImageUrl,
                        contentDescription = product.displayTitle,
                        modifier = Modifier.fillMaxSize(),
                        shape = RoundedCornerShape(16.dp),
                    )
                    Row(
                        modifier = Modifier.align(Alignment.BottomCenter).padding(8.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        repeat(3) { dot ->
                            Box(
                                modifier = Modifier
                                    .width(if (dot == 0) 24.dp else 8.dp)
                                    .height(4.dp)
                                    .background(if (dot == 0) detailAccent else Color.White.copy(alpha = 0.35f), RoundedCornerShape(4.dp)),
                            )
                        }
                    }
                }
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                            Text(product.displayTitle, style = MaterialTheme.typography.headlineSmall, color = detailText, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Surface(color = detailSurfaceHigh, shape = RoundedCornerShape(16.dp)) {
                                Text("4.8", color = detailAccent, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), fontWeight = FontWeight.Bold)
                            }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(color = detailSurfaceHigh, shape = RoundedCornerShape(16.dp)) {
                                Text(product.displayStoreName, color = detailText, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), style = MaterialTheme.typography.labelMedium)
                            }
                            Text("Visit Store", color = detailAccent, style = MaterialTheme.typography.labelMedium)
                        }

                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(product.displayPrice, color = detailAccent, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                            Text("₹4,999", color = detailMuted)
                            Surface(color = Color(0xFF93000A), shape = RoundedCornerShape(8.dp)) {
                                Text("50% OFF", color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Select Size", color = detailMuted, style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("S", "M", "L", "XL").forEach { size ->
                                val active = selectedSize == size
                                Surface(
                                    modifier = Modifier.clickable { selectedSize = size },
                                    color = if (active) detailAccent.copy(alpha = 0.2f) else detailSurfaceHigh,
                                    shape = RoundedCornerShape(12.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (active) detailAccent else Color(0xFF5C4037)),
                                ) {
                                    Text(size, color = if (active) detailAccent else detailText, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        Text("Delivery", color = detailMuted, style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("Standard", "Express").forEach { mode ->
                                val active = selectedDelivery == mode
                                Surface(
                                    modifier = Modifier.clickable { selectedDelivery = mode },
                                    color = if (active) detailAccent.copy(alpha = 0.2f) else detailSurfaceHigh,
                                    shape = RoundedCornerShape(12.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (active) detailAccent else Color(0xFF5C4037)),
                                ) {
                                    Text(mode, color = if (active) detailAccent else detailText, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp), style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                    }
                }
            }

            item {
                MakeOfferCard(
                    modifier = Modifier.fillMaxWidth().testTag("product_offer_card"),
                    title = bargainScenario.headline,
                    subtitle = bargainScenario.subheadline,
                    stats = "${bargainScenario.recentBidEvents.size} Bids",
                    badge = bargainScenario.state.label,
                    textColor = detailText,
                    mutedColor = detailMuted,
                    accentColor = detailAccent,
                    surfaceColor = detailSurface,
                    chipColor = detailSurfaceHigh,
                    onClick = { showBidSheet = true },
                )
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Description & Features", color = detailText, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Heavyweight cotton, puff print details, and distressed ribbing built for an urban fit. Machine wash cold, hang dry.", color = detailMuted)
                    }
                }
            }
        }

        Surface(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(), color = detailBg.copy(alpha = 0.94f)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Total", color = detailMuted, style = MaterialTheme.typography.labelSmall)
                    Text(product.displayPrice, color = detailText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { addedToCart = true },
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = if (addedToCart) Color(0xFF2E7D32) else detailAccent),
                ) {
                    Text(if (addedToCart) "✓ ADDED TO CART" else "ADD TO CART", color = Color.White, fontWeight = FontWeight.Black)
                }
            }
        }

        BidBottomSheet(
            isVisible = showBidSheet,
            onDismiss = { showBidSheet = false },
            product = product,
            scenario = bargainScenario,
            bidInput = bidInput,
            onBidInputChange = { bidInput = it },
            backgroundColor = detailBg,
            surfaceColor = detailSurface,
            textColor = detailText,
            mutedColor = detailMuted,
            accentColor = detailAccent,
            tagPrefix = "product_bid",
        )
    }
}

@Composable
internal fun MakeOfferCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    stats: String,
    badge: String,
    textColor: Color,
    mutedColor: Color,
    accentColor: Color,
    surfaceColor: Color,
    chipColor: Color,
    onClick: () -> Unit,
) {
    Surface(color = surfaceColor, shape = RoundedCornerShape(16.dp), modifier = modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, color = textColor, fontWeight = FontWeight.Bold)
                Text(subtitle, color = mutedColor, style = MaterialTheme.typography.bodySmall)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stats, color = accentColor, style = MaterialTheme.typography.labelMedium)
                Surface(color = chipColor, shape = RoundedCornerShape(8.dp)) {
                    Text(badge, color = textColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
internal fun BoxScope.BidBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    product: ProductDto,
    scenario: BargainScenario,
    bidInput: String,
    onBidInputChange: (String) -> Unit,
    backgroundColor: Color,
    surfaceColor: Color,
    textColor: Color,
    mutedColor: Color,
    accentColor: Color,
    tagPrefix: String,
) {
    if (!isVisible) return

    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.68f)).clickable { onDismiss() })

    Surface(
        modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(520.dp).testTag("${tagPrefix}_sheet"),
        color = backgroundColor.copy(alpha = 0.98f),
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Place Bid", color = textColor, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                TextButton(onClick = onDismiss, modifier = Modifier.testTag("${tagPrefix}_close")) { Text("Close", color = accentColor) }
            }

            Surface(color = surfaceColor, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.size(72.dp), shape = RoundedCornerShape(12.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(product.displayTitle, color = textColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("Highest Bid: ${scenario.highestBid}", color = accentColor, fontWeight = FontWeight.Bold)
                    }
                }
            }

            OutlinedTextField(
                value = bidInput,
                onValueChange = { typedValue -> onBidInputChange(sanitizeBidInput(typedValue)) },
                modifier = Modifier.fillMaxWidth().testTag("${tagPrefix}_input"),
                label = { Text("Place Your Bid") },
                prefix = { Text("₹", color = accentColor, fontWeight = FontWeight.Bold) },
                placeholder = { Text("13000") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = surfaceColor,
                    unfocusedContainerColor = surfaceColor,
                    focusedBorderColor = accentColor,
                    unfocusedBorderColor = Color(0xFF5C4037),
                    focusedLabelColor = accentColor,
                    unfocusedLabelColor = mutedColor,
                    focusedTextColor = textColor,
                    unfocusedTextColor = textColor,
                ),
                shape = RoundedCornerShape(16.dp),
            )

            Text("Min. bid increment: +${scenario.minBidIncrement}", color = mutedColor, style = MaterialTheme.typography.bodySmall)
            Text("Recent Bids", color = textColor, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                scenario.recentBidEvents.map { it.displayLine() }.forEach { bid ->
                    Surface(color = surfaceColor, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(bid, color = mutedColor, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().height(52.dp).testTag("${tagPrefix}_confirm"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
            ) {
                Text("CONFIRM BID", color = Color.White, fontWeight = FontWeight.Black)
            }
        }
    }
}
