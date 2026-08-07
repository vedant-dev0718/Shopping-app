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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

internal enum class SellerShellRoute {
    Dashboard,
    Insights,
    ProductOnboarding,
    ProductLifecycleStub,
    OrderOperationsStub,
    ReturnsRefunds,
    SellerReelList,
    UploadReel,
    SellerProfile,
}

@Composable
internal fun SellerShellScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    route: SellerShellRoute,
    onRouteChange: (SellerShellRoute) -> Unit,
    onBackToAccount: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    var autoCounterEnabled by remember { mutableStateOf(true) }
    var selectedTimeRange by remember { mutableStateOf("7d") }
    var selectedDrillDownTitle by remember { mutableStateOf<String?>(null) }

    // KPIs derived from live seller content
    val products = state.sellerContent.products
    val orders = state.sellerContent.orders
    val reels = state.sellerContent.reels
    // Revenue: only completed orders with no active return
    val completedRevenue = orders.filter { it.status == "delivered" }.sumOf { it.totalAmount }
    val completedOrderCount = orders.count { it.status == "delivered" }
    val kpis =
        listOf(
            DemoSellerKpi("Revenue", "₹${completedRevenue.toInt()}", if (completedRevenue > 0) "+Live" else "--"),
            DemoSellerKpi("Orders", completedOrderCount.toString(), "${orders.count { it.status == "placed" }} pending"),
            DemoSellerKpi("Products", products.size.toString(), "${products.count { it.stock < 5 }} low stock"),
            DemoSellerKpi("Reels", reels.size.toString(), "active"),
        )
    val orderPulse =
        orders
            .groupBy { it.status }
            .map { (status, list) -> DemoSellerOrderPulse(status, list.size) }
    val insights =
        listOf(
            DemoSellerInsightItem("Low stock", "${products.count { it.stock < 5 }} products need restocking.", "Review"),
            DemoSellerInsightItem("Pending orders", "${orders.count { it.status == "placed" }} orders await acceptance.", "Process"),
        )
    val drillDownCards =
        listOf(
            DemoSellerDrillDownCard("Top product", products.firstOrNull()?.displayTitle ?: "\u2014", "Best performing by views."),
            DemoSellerDrillDownCard(
                "Pending revenue",
                "\u20b9${orders.filter { it.status == "placed" }.sumOf { it.totalAmount }.toInt()}",
                "Orders placed but not shipped.",
            ),
        )

    if (route == SellerShellRoute.ProductOnboarding) {
        ProductOnboardingScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onProductCreated = { onRouteChange(SellerShellRoute.ProductLifecycleStub) },
        )
        return
    }

    if (route == SellerShellRoute.ProductLifecycleStub) {
        ProductLifecycleScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onAddProduct = { onRouteChange(SellerShellRoute.ProductOnboarding) },
        )
        return
    }

    if (route == SellerShellRoute.OrderOperationsStub) {
        OrderOperationsScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
        )
        return
    }

    if (route == SellerShellRoute.ReturnsRefunds) {
        SellerReturnsScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onOpenOrderOperations = { onRouteChange(SellerShellRoute.OrderOperationsStub) },
        )
        return
    }

    if (route == SellerShellRoute.SellerReelList) {
        SellerReelListScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onUploadReel = { onRouteChange(SellerShellRoute.UploadReel) },
        )
        return
    }

    if (route == SellerShellRoute.UploadReel) {
        UploadReelScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.SellerReelList) },
        )
        return
    }

    if (route == SellerShellRoute.SellerProfile) {
        SellerProfileScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onSignOut = onBackToAccount,
        )
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // UE avatar — opens seller profile
                    Surface(
                        color = surfaceHigh,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(2.dp, accent.copy(alpha = 0.7f)),
                        modifier = Modifier.size(40.dp).clickable { onRouteChange(SellerShellRoute.SellerProfile) },
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text("UE", color = text, fontWeight = FontWeight.Black, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("SELLER PORTAL", color = muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        Text(
                            "Hello, ${state.currentSession?.name ?: "Urban Edge"}",
                            color = text,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                Row(
                    modifier = Modifier.padding(start = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                }
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap)) {
                item {
                    SellerRouteChip(
                        label = "Dashboard",
                        selected = route == SellerShellRoute.Dashboard,
                        onClick = { onRouteChange(SellerShellRoute.Dashboard) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Insights",
                        selected = route == SellerShellRoute.Insights,
                        onClick = { onRouteChange(SellerShellRoute.Insights) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Products",
                        selected = route == SellerShellRoute.ProductLifecycleStub,
                        onClick = { onRouteChange(SellerShellRoute.ProductLifecycleStub) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Orders",
                        selected = route == SellerShellRoute.OrderOperationsStub,
                        onClick = { onRouteChange(SellerShellRoute.OrderOperationsStub) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Returns",
                        selected = route == SellerShellRoute.ReturnsRefunds,
                        onClick = { onRouteChange(SellerShellRoute.ReturnsRefunds) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Reels",
                        selected = route == SellerShellRoute.SellerReelList || route == SellerShellRoute.UploadReel,
                        onClick = { onRouteChange(SellerShellRoute.SellerReelList) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
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
                        "${state.currentSession?.name ?: "Your store"} performance",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap)) {
                        items(listOf("7d", "30d", "90d")) { label ->
                            SellerRouteChip(
                                label = label,
                                selected = selectedTimeRange == label,
                                onClick = {
                                    selectedTimeRange = label
                                    selectedDrillDownTitle = null
                                },
                                accent = accent,
                                surface = surfaceHigh,
                                text = text,
                            )
                        }
                    }
                }
            }
        }

        if (route == SellerShellRoute.Dashboard) {
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(kpis) { kpi ->
                        Surface(
                            color = surface,
                            shape = SellerUiTokens.radiusChip,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
                            modifier = Modifier.width(154.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(SellerUiTokens.cardPadding),
                                verticalArrangement = Arrangement.spacedBy(5.dp),
                            ) {
                                Text(kpi.label.uppercase(), color = muted, style = MaterialTheme.typography.labelSmall)
                                Text(kpi.value, color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                                Text(
                                    kpi.trend,
                                    color = accent,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }

            item {
                Surface(
                    color = surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Auto-counter bids", color = text, fontWeight = FontWeight.Bold)
                            Text(
                                "Accept bids above reserve threshold automatically.",
                                color = muted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Button(
                            onClick = { autoCounterEnabled = !autoCounterEnabled },
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = if (autoCounterEnabled) accent else surfaceHigh),
                        ) {
                            Text(if (autoCounterEnabled) "ON" else "OFF", color = if (autoCounterEnabled) NotWhatColors.onPrimary else text)
                        }
                    }
                }
            }
        } else if (route == SellerShellRoute.Insights) {
            items(insights) { insight ->
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(SellerUiTokens.cardPadding),
                        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                    ) {
                        Text(insight.title, color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(insight.detail, color = muted, style = MaterialTheme.typography.bodySmall)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            Button(
                                onClick = {
                                    selectedDrillDownTitle = insight.title
                                    if (insight.title.contains("bargain", ignoreCase = true) ||
                                        insight.title.contains("fulfillment", ignoreCase = true)
                                    ) {
                                        onRouteChange(SellerShellRoute.OrderOperationsStub)
                                    } else {
                                        onRouteChange(SellerShellRoute.ProductLifecycleStub)
                                    }
                                },
                                shape = SellerUiTokens.radiusButton,
                                colors = ButtonDefaults.buttonColors(containerColor = accent),
                            ) {
                                Text(insight.action, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        } else if (route == SellerShellRoute.ProductLifecycleStub) {
            item {
                SellerStubScreenCard(
                    title = "Product Lifecycle",
                    summary = "This stub anchors the next slice for product list, inventory state, pricing controls, and edit flows.",
                    bullets =
                        listOf(
                            "Top products, low-stock states, and draft listings",
                            "Edit pricing and activate campaign windows",
                            "Jump from insights into specific SKUs",
                        ),
                    backLabel = "Return to Dashboard",
                    onBack = { onRouteChange(SellerShellRoute.Dashboard) },
                    accent = accent,
                    surface = surface,
                    text = text,
                    muted = muted,
                )
            }
        } else if (route == SellerShellRoute.OrderOperationsStub) {
            item {
                SellerStubScreenCard(
                    title = "Order Operations",
                    summary = "This stub anchors pick-pack-ship workflows, courier events, and exception handling for seller operations.",
                    bullets =
                        listOf(
                            "Order queue by state and SLA",
                            "Shipping label and pickup actions",
                            "Delay, return, and refund exception surfaces",
                        ),
                    backLabel = "Return to Dashboard",
                    onBack = { onRouteChange(SellerShellRoute.Dashboard) },
                    accent = accent,
                    surface = surface,
                    text = text,
                    muted = muted,
                )
            }
        }
    }
}

@Composable
private fun SellerRouteChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    accent: Color,
    surface: Color,
    text: Color,
) {
    Surface(
        modifier = Modifier.clickable { onClick() },
        shape = SellerUiTokens.radiusChip,
        color = if (selected) accent.copy(alpha = 0.2f) else surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) accent else Color.White.copy(alpha = 0.12f)),
    ) {
        Text(
            label,
            color = if (selected) accent else text,
            modifier = Modifier.padding(horizontal = SellerUiTokens.chipHorizontalPadding, vertical = SellerUiTokens.chipVerticalPadding),
            maxLines = 1,
            textAlign = TextAlign.Center,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ProfileActionRow(
    title: String,
    subtitle: String,
    cta: String,
    onClick: () -> Unit,
    accent: Color,
    text: Color,
    muted: Color,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = text, fontWeight = FontWeight.Bold)
            Text(subtitle, color = muted, style = MaterialTheme.typography.bodySmall)
        }
        Text(cta, color = accent, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SellerStubScreenCard(
    title: String,
    summary: String,
    bullets: List<String>,
    backLabel: String,
    onBack: () -> Unit,
    accent: Color,
    surface: Color,
    text: Color,
    muted: Color,
) {
    Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
        ) {
            Text(title, color = text, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
            Text(summary, color = muted, style = MaterialTheme.typography.bodySmall)
            bullets.forEachIndexed { index, bullet ->
                Text("${index + 1}. $bullet", color = text, style = MaterialTheme.typography.bodySmall)
            }
            Button(
                onClick = onBack,
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
            ) {
                Text(backLabel, color = Color.White)
            }
        }
    }
}

@Composable
private fun SellerProfileScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onSignOut: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val name = state.currentSession?.name ?: "Urban Edge"
    val email = state.currentSession?.email ?: ""
    val initials =
        name
            .split(" ")
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .take(2)
            .joinToString("")
    val products = state.sellerContent.products.size
    val reels = state.sellerContent.reels.size
    val orders = state.sellerContent.orders.count { it.status == "delivered" }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("← Back", color = accent, fontWeight = FontWeight.SemiBold) }
                Text("Profile", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Box(modifier = Modifier.width(72.dp))
            }
        }

        // Avatar + store name + email
        item {
            Surface(color = surface, shape = SellerUiTokens.radiusCard, modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        color = accent.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(40.dp),
                        modifier = Modifier.size(80.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text(
                                initials.ifEmpty { "S" },
                                fontWeight = FontWeight.Black,
                                color = accent,
                                style = MaterialTheme.typography.headlineMedium,
                            )
                        }
                    }
                    Text(name, color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    if (email.isNotBlank()) {
                        Text(email, color = muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        // Store stats
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                listOf(
                    "Products" to products.toString(),
                    "Reels" to reels.toString(),
                    "Completed" to orders.toString(),
                ).forEach { (label, value) ->
                    Surface(color = surface, shape = SellerUiTokens.radiusChip, modifier = Modifier.weight(1f)) {
                        Column(
                            modifier = Modifier.padding(vertical = 14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(value, color = accent, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                            Text(label, color = muted, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }

        // Options
        item {
            Surface(color = surface, shape = SellerUiTokens.radiusCard, modifier = Modifier.fillMaxWidth()) {
                Column {
                    SellerProfileTile("Store Settings", "Edit store name, region, and category", accent, text, muted) {}
                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                    SellerProfileTile("Payout & Banking", "Manage your payout account details", accent, text, muted) {}
                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                    SellerProfileTile("Notifications", "Configure order and bargain alerts", accent, text, muted) {}
                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                    SellerProfileTile("Help & Support", "Contact seller support team", accent, text, muted) {}
                }
            }
        }

        // Sign Out
        item {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onSignOut() },
                shape = SellerUiTokens.radiusCard,
                color = surfaceHigh,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Sign Out", fontWeight = FontWeight.Bold, color = accent)
                    Text("→", color = accent, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@Composable
private fun SellerProfileTile(
    label: String,
    subtitle: String,
    accent: Color,
    text: Color,
    muted: Color,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, fontWeight = FontWeight.SemiBold, color = text)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = muted)
        }
        Text("›", color = accent, style = MaterialTheme.typography.titleLarge)
    }
}
