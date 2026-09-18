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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.util.toIso8601
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

internal enum class SellerShellRoute {
    Dashboard,
    Insights,
    ProductOnboarding,
    ProductLifecycleStub,
    OrderOperationsStub,
    SellerOrderList,
    ReturnsRefunds,
    SellerReelList,
    UploadReel,
    SellerProfile,
    SellerBargainCreate,
    SellerAcceptedBidsQueue,
    LowStockRestock,
}

internal data class SellerReelPreviewRoute(
    val reel: com.notwhat.shared.catalog.ReelDto,
)

@Composable
internal fun SellerShellScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    route: SellerShellRoute,
    onRouteChange: (SellerShellRoute) -> Unit,
    onOpenProduct: (ProductDto) -> Unit,
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
    var previewRoute by remember { mutableStateOf<SellerReelPreviewRoute?>(null) }

    // Phase 2: use the real buyer ReelDetailScreen so preview matches exactly what buyer sees
    previewRoute?.let { preview ->
        ReelDetailScreen(
            modifier = modifier,
            state = state,
            reel = preview.reel,
            onBack = { previewRoute = null },
            onOpenProduct = { /* seller preview — no-op */ },
            onOpenStore = { /* seller preview — no-op */ },
        )
        return
    }

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

    if (route == SellerShellRoute.LowStockRestock) {
        SellerLowStockScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Insights) },
        )
        return
    }

    if (route == SellerShellRoute.SellerOrderList) {
        OrderOperationsScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onOpenProduct = { productId ->
                val product =
                    state.sellerContent.products.firstOrNull { it.id == productId }
                        ?: state.content.products.firstOrNull { it.id == productId }
                        ?: ProductDto(id = productId)
                onOpenProduct(product)
            },
        )
        return
    }

    if (route == SellerShellRoute.SellerBargainCreate) {
        SellerBargainCreateScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
        )
        return
    }

    if (route == SellerShellRoute.SellerAcceptedBidsQueue) {
        SellerAcceptedBidsQueueScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onOpenProduct = onOpenProduct,
        )
        return
    }

    if (route == SellerShellRoute.OrderOperationsStub) {
        OrderOperationsScreen(
            modifier = modifier,
            state = state,
            onBack = { onRouteChange(SellerShellRoute.Dashboard) },
            onOpenProduct = { productId ->
                val product =
                    state.sellerContent.products.firstOrNull { it.id == productId }
                        ?: state.content.products.firstOrNull { it.id == productId }
                        ?: ProductDto(id = productId)
                onOpenProduct(product)
            },
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
            onPreviewReel = { previewRoute = it },
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
                item {
                    SellerRouteChip(
                        label = "Accepted Bids",
                        selected = route == SellerShellRoute.SellerAcceptedBidsQueue,
                        onClick = { onRouteChange(SellerShellRoute.SellerAcceptedBidsQueue) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
                item {
                    SellerRouteChip(
                        label = "Bargain Day",
                        selected = route == SellerShellRoute.SellerBargainCreate,
                        onClick = { onRouteChange(SellerShellRoute.SellerBargainCreate) },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
            }
        }

        // Performance time-range picker shown only on Dashboard
        if (route == SellerShellRoute.Dashboard) {
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
        } // end performance card if-Dashboard

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
                                    if (insight.title.contains("stock", ignoreCase = true)) {
                                        onRouteChange(SellerShellRoute.LowStockRestock)
                                    } else {
                                        onRouteChange(SellerShellRoute.SellerOrderList)
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
    val products = state.sellerContent.products
    val orders = state.sellerContent.orders
    val reels = state.sellerContent.reels

    val name = state.currentSession?.name ?: "Urban Edge"
    val email = state.currentSession?.email ?: ""
    val initials =
        name
            .split(" ")
            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
            .take(2)
            .joinToString("")

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
                                initials.ifBlank { "S" },
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

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                listOf(
                    "Products" to products.size.toString(),
                    "Reels" to reels.size.toString(),
                    "Completed" to orders.count { it.status == "delivered" }.toString(),
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

@Composable
internal fun SellerBargainCreateScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val danger = Color(0xFFD32F2F)
    val scope = rememberCoroutineScope()

    val products = state.sellerContent.products.filter { it.status == "active" }
    // Step 1 = product select, Step 2 = auction settings
    var step by remember { mutableStateOf(1) }
    var selectedProductId by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var reservePrice by remember { mutableStateOf("") }
    var durationHours by remember { mutableStateOf("24") }
    var buyWindowHours by remember { mutableStateOf("24") }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var submitSuccess by remember { mutableStateOf(false) }
    var activeSchedulesByProductId by remember { mutableStateOf<Map<String, BargainScheduleDto>>(emptyMap()) }
    var activeBidSummaryByProductId by remember { mutableStateOf<Map<String, SellerActiveBidSummary>>(emptyMap()) }
    var isBidMetadataLoading by remember { mutableStateOf(false) }
    var bidMetadataError by remember { mutableStateOf<String?>(null) }
    var nowMs by remember { mutableLongStateOf(Clock.System.now().toEpochMilliseconds()) }
    var bargainRefreshTrigger by remember { androidx.compose.runtime.mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        while (true) {
            nowMs = Clock.System.now().toEpochMilliseconds()
            delay(1000)
        }
    }

    // Poll every 30 seconds so bid counts stay current after seller queue actions
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            bargainRefreshTrigger++
        }
    }

    LaunchedEffect(state.currentSession?.authToken, products.map { it.id }.joinToString("|"), bargainRefreshTrigger) {
        val token = state.currentSession?.authToken
        isBidMetadataLoading = true
        bidMetadataError = null

        val scheduleMap = mutableMapOf<String, BargainScheduleDto>()
        when (val schedulesResult = state.bargainUseCase.getActiveBargains()) {
            is NetworkResult.Success -> {
                scheduleMap.putAll(
                    schedulesResult.data
                        .filter { it.status.lowercase() == "active" }
                        .associateBy { it.productId },
                )
            }

            is NetworkResult.Failure -> {
                bidMetadataError = schedulesResult.error.userMessage()
            }
        }

        val activeStatuses = setOf("active", "pending_seller_decision")
        val bidSummaryMap = mutableMapOf<String, SellerActiveBidSummary>()

        if (!token.isNullOrBlank()) {
            for (productId in scheduleMap.keys) {
                when (val bidsResult = state.sellerContent.getProductBids(productId, token)) {
                    is NetworkResult.Success -> {
                        val liveBids = bidsResult.data.filter { it.status.lowercase() in activeStatuses }
                        bidSummaryMap[productId] =
                            SellerActiveBidSummary(
                                activeBidCount = liveBids.size,
                                highestActiveBidAmount = liveBids.maxOfOrNull { it.amount },
                            )
                    }

                    is NetworkResult.Failure -> {
                        if (bidMetadataError == null) {
                            bidMetadataError = bidsResult.error.userMessage()
                        }
                    }
                }
            }
        }

        activeSchedulesByProductId = scheduleMap
        activeBidSummaryByProductId = bidSummaryMap
        isBidMetadataLoading = false
    }

    val selectedProduct = products.firstOrNull { it.id == selectedProductId }
    val filteredProducts =
        if (searchQuery.isBlank()) {
            products
        } else {
            products.filter { p ->
                p.displayTitle.contains(searchQuery, ignoreCase = true) ||
                    p.displayPrice.contains(searchQuery, ignoreCase = true)
            }
        }

    // ── Step 2: Auction settings ──────────────────────────────────────
    if (step == 2 && selectedProduct != null) {
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
                    TextButton(onClick = {
                        step = 1
                        submitError = null
                    }) { Text("← Back", color = accent) }
                    Text("Auction Settings", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.width(56.dp))
                }
            }

            // Selected product summary card
            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        DemoImage(
                            url = selectedProduct.displayImageUrl,
                            contentDescription = selectedProduct.displayTitle,
                            modifier = Modifier.size(56.dp),
                            shape = RoundedCornerShape(10.dp),
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                selectedProduct.displayTitle,
                                color = text,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(selectedProduct.displayPrice, color = accent, style = MaterialTheme.typography.labelMedium)
                        }
                        TextButton(onClick = { step = 1 }) { Text("Change", color = muted, style = MaterialTheme.typography.labelSmall) }
                    }
                }
            }

            if (submitSuccess) {
                item {
                    Surface(color = Color(0xFF1A3A28), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "✓ Bargain Day is now live! Buyers can start bidding.",
                            color = Color(0xFF4CAF50),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            }
            submitError?.let { err ->
                item {
                    Surface(color = danger.copy(alpha = 0.1f), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(err, color = danger, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = reservePrice,
                            onValueChange = { v ->
                                reservePrice = v.filter { it.isDigit() || it == '.' }
                            },
                            label = { Text("Reserve Price (₹)") },
                            placeholder = { Text("Minimum bid amount") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = durationHours,
                            onValueChange = { v -> durationHours = v.filter { it.isDigit() } },
                            label = { Text("Auction Duration (hours)") },
                            placeholder = { Text("e.g. 24, 48, 72") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = buyWindowHours,
                            onValueChange = { v -> buyWindowHours = v.filter { it.isDigit() } },
                            label = { Text("Winner Buy Window (hours)") },
                            placeholder = { Text("Time the winner has to pay") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            "If the winner doesn't pay in time, the next highest bidder gets the opportunity — and so on.",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                Button(
                    onClick = {
                        val token = state.currentSession?.authToken
                        if (token.isNullOrBlank()) {
                            submitError = "Please sign in again."
                            return@Button
                        }
                        val reserve = reservePrice.toDoubleOrNull() ?: 0.0
                        val durationH = durationHours.toLongOrNull() ?: 24L
                        scope.launch {
                            isSubmitting = true
                            submitError = null
                            // Compute ISO-8601 timestamps
                            val currentNowMs = Clock.System.now().toEpochMilliseconds()
                            val endMs = currentNowMs + (durationH * 3_600_000)
                            val startDate = toIso8601(currentNowMs)
                            val endDate = toIso8601(endMs)
                            val errorMsg =
                                state.sellerContent.scheduleBargain(
                                    productId = selectedProductId!!,
                                    startDate = startDate,
                                    endDate = endDate,
                                    reservePrice = reserve,
                                    bearerToken = token,
                                )
                            isSubmitting = false
                            if (errorMsg.isBlank()) {
                                submitSuccess = true
                            } else {
                                submitError = errorMsg
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = SellerUiTokens.radiusButton,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                    enabled = !isSubmitting && !submitSuccess,
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("🏷  Launch Bargain Day", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        return
    }

    // ── Step 1: Product selection ─────────────────────────────────────
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
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Bargain Day", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(56.dp))
            }
        }

        item {
            Text(
                "Select a product to run a Bargain Day auction",
                color = muted,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }

        item {
                        submitSuccess = false
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search products") },
                placeholder = { Text("By title or price") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }

        item {
            Button(
                onClick = {
                    if (selectedProductId != null) {
                        submitError = null
                        step = 2
                    } else {
                        submitError = "Please select a product first."
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
                enabled = selectedProductId != null,
            ) {
                Text("Next →", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        if (isBidMetadataLoading) {
            item {
                Text(
                    "Loading active bid configuration...",
                    color = muted,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }

        bidMetadataError?.let { err ->
            item {
                Text(
                    err,
                    color = danger,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }

        if (products.isEmpty()) {
            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "No live products. Publish a product first.",
                        color = muted,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        } else {
            items(filteredProducts) { product ->
                val selected = product.id == selectedProductId
                Surface(
                    color = if (selected) accent.copy(alpha = 0.15f) else surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    modifier = Modifier.fillMaxWidth().clickable {
                        selectedProductId = product.id
                        submitSuccess = false
                        submitError = null
                    },
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        DemoImage(
                            url = product.displayImageUrl,
                            contentDescription = product.displayTitle,
                            modifier = Modifier.size(56.dp),
                            shape = RoundedCornerShape(10.dp),
                        )
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                product.displayTitle,
                                color = text,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(product.displayPrice, color = accent, style = MaterialTheme.typography.labelMedium)
                            Text(
                                "Stock: ${product.stock}",
                                color =
                                    if (product.stock <
                                        5
                                    ) {
                                        danger
                                    } else {
                                        muted
                                    },
                                style = MaterialTheme.typography.labelSmall,
                            )

                            val activeSchedule = activeSchedulesByProductId[product.id]
                            if (activeSchedule != null) {
                                val bidSummary = activeBidSummaryByProductId[product.id]
                                Text(
                                    "Active bids: ${bidSummary?.activeBidCount ?: 0}",
                                    color = text,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                bidSummary?.highestActiveBidAmount?.let { highest ->
                                    Text(
                                        "Highest active: ${formatSellerMoney(highest)}",
                                        color = accent,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                                Text(
                                    "Config: Reserve ${formatSellerMoney(activeSchedule.reservePrice)}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                                Text(
                                    "Time remaining: ${formatSellerTimerLabel(activeSchedule.endDate, nowMs)}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            }
                        }
                        if (selected) Text("✓", color = accent, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }

        submitError?.let { err ->
            item { Text(err, color = danger, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(horizontal = 4.dp)) }
        }
    }
}

private data class SellerActiveBidSummary(
    val activeBidCount: Int,
    val highestActiveBidAmount: Double?,
)

private fun formatSellerMoney(value: Double): String {
    val rounded = kotlin.math.round(value * 100.0) / 100.0
    val isWhole = kotlin.math.abs(rounded - rounded.toInt()) < 0.0001
    return if (isWhole) "₹${rounded.toInt()}" else "₹$rounded"
}

private fun formatSellerTimerLabel(
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

private data class SellerAcceptedBidQueueItem(
    val product: ProductDto,
    val bid: BidDto,
)

@Composable
internal fun SellerAcceptedBidsQueueScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenProduct: (ProductDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var actionNote by remember { mutableStateOf<String?>(null) }
    var actingBidId by remember { mutableStateOf<String?>(null) }
    var queueItems by remember { mutableStateOf<List<SellerAcceptedBidQueueItem>>(emptyList()) }

    suspend fun refreshQueue() {
        val token = state.currentSession?.authToken
        if (token.isNullOrBlank()) {
            queueItems = emptyList()
            loadError = "Please sign in again to load bid queue."
            isLoading = false
            return
        }

        isLoading = true
        loadError = null
        val queue = mutableListOf<SellerAcceptedBidQueueItem>()

        for (product in state.sellerContent.products) {
            when (val result = state.sellerContent.getProductBids(product.id, token)) {
                is NetworkResult.Success -> {
                    result.data
                        .filter { it.status in setOf("accepted", "won", "pending_seller_decision", "expired", "rejected") }
                        .forEach { bid -> queue += SellerAcceptedBidQueueItem(product = product, bid = bid) }
                }

                is NetworkResult.Failure -> {
                    if (loadError == null) {
                        loadError = result.error.userMessage()
                    }
                }
            }
        }

        queueItems = queue.sortedByDescending { it.bid.createdAt ?: "" }
        isLoading = false
    }

    LaunchedEffect(state.currentSession?.authToken, state.sellerContent.products) {
        refreshQueue()
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
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Bid Queue", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Surface(color = surface, shape = RoundedCornerShape(10.dp)) {
                    Text(
                        queueItems.size.toString(),
                        color = text,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        item {
            Text(
                "Manage accepted and pending bargain bids directly from this queue.",
                color = muted,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        actionNote?.let { note ->
            item {
                Surface(color = Color(0xFFF0F6FF), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(note, color = Color(0xFF1F4B8F), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
                }
            }
        }

        loadError?.let { message ->
            item {
                Surface(color = Color(0xFFFFF0E6), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        message,
                        color = Color(0xFF8B4513),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }

        if (isLoading) {
            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CircularProgressIndicator(color = accent, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        Text("Loading bid queue...", color = muted)
                    }
                }
            }
        }

        if (!isLoading && queueItems.isEmpty()) {
            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text("No queue bids yet", color = text, fontWeight = FontWeight.Bold)
                        Text(
                            "Accepted and pending bids will appear here once buyers place offers.",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }

        items(queueItems) { queueItem ->
            val canCloseWindow =
                queueItem.bid.status in setOf("accepted", "won") &&
                    queueItem.bid.paymentStatus.lowercase() !in setOf("captured", "refunded", "cancelled")
            val canReopen =
                queueItem.bid.status in setOf("accepted", "expired", "rejected", "pending_seller_decision") &&
                    queueItem.bid.paymentStatus.lowercase() !in setOf("captured", "refunded", "cancelled")
            val isActing = actingBidId == queueItem.bid.id

            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(
                                queueItem.product.displayTitle,
                                color = text,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(queueItem.product.displayPrice, color = accent, style = MaterialTheme.typography.labelMedium)
                        }
                        Surface(color = accent.copy(alpha = 0.16f), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                queueItem.bid.status
                                    .replace('_', ' ')
                                    .uppercase(),
                                color = accent,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                        }
                    }

                    Text(
                        "Bid price: ₹${queueItem.bid.amount.toInt()} x ${queueItem.bid.quantity}",
                        color = text,
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val token = state.currentSession?.authToken
                                if (token.isNullOrBlank()) {
                                    actionNote = "Sign in again to update queue actions."
                                    return@Button
                                }
                                scope.launch {
                                    actingBidId = queueItem.bid.id
                                    val result = state.sellerContent.closeBidPaymentWindow(queueItem.product.id, queueItem.bid.id, token)
                                    actionNote =
                                        when (result) {
                                            is NetworkResult.Success -> "Closed payment window for ${queueItem.product.displayTitle}."
                                            is NetworkResult.Failure -> result.error.userMessage()
                                        }
                                    refreshQueue()
                                    actingBidId = null
                                }
                            },
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7A251C)),
                            enabled = canCloseWindow && !isActing,
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(
                                if (isActing &&
                                    canCloseWindow
                                ) {
                                    "Closing..."
                                } else {
                                    "Close Window"
                                },
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        Button(
                            onClick = {
                                val token = state.currentSession?.authToken
                                if (token.isNullOrBlank()) {
                                    actionNote = "Sign in again to update queue actions."
                                    return@Button
                                }
                                scope.launch {
                                    actingBidId = queueItem.bid.id
                                    val result = state.sellerContent.reopenBidNegotiation(queueItem.product.id, queueItem.bid.id, token)
                                    actionNote =
                                        when (result) {
                                            is NetworkResult.Success -> "Re-opened negotiation for ${queueItem.product.displayTitle}."
                                            is NetworkResult.Failure -> result.error.userMessage()
                                        }
                                    refreshQueue()
                                    actingBidId = null
                                }
                            },
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0B8A7A)),
                            enabled = canReopen && !isActing,
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(
                                if (isActing &&
                                    canReopen
                                ) {
                                    "Re-opening..."
                                } else {
                                    "Re-open"
                                },
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        Button(
                            onClick = { onOpenProduct(queueItem.product) },
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Open Product", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SellerLowStockScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val danger = Color(0xFFD32F2F)
    val scope = rememberCoroutineScope()

    val lowStockProducts = state.sellerContent.products.filter { it.stock < 5 }
    var editingProductId by remember { mutableStateOf<String?>(null) }
    var newStock by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var saveError by remember { mutableStateOf<String?>(null) }
    var saveSuccess by remember { mutableStateOf<String?>(null) }

    val editingProduct = lowStockProducts.firstOrNull { it.id == editingProductId }

    // Restock detail screen
    if (editingProduct != null) {
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
                    TextButton(onClick = {
                        editingProductId = null
                        saveError = null
                        saveSuccess = null
                        newStock = ""
                    }) { Text("← Back", color = accent) }
                    Text("Restock", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.width(56.dp))
                }
            }

            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        DemoImage(
                            url = editingProduct.displayImageUrl,
                            contentDescription = editingProduct.displayTitle,
                            modifier = Modifier.size(64.dp),
                            shape = RoundedCornerShape(10.dp),
                        )
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                editingProduct.displayTitle,
                                color = text,
                                fontWeight = FontWeight.Bold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(editingProduct.displayPrice, color = accent, style = MaterialTheme.typography.labelMedium)
                            Surface(color = danger.copy(alpha = 0.12f), shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    "Current stock: ${editingProduct.stock}",
                                    color = danger,
                                    fontWeight = FontWeight.SemiBold,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                )
                            }
                        }
                    }
                }
            }

            saveSuccess?.let { msg ->
                item {
                    Surface(color = Color(0xFF1A3A28), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(msg, color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold, modifier = Modifier.padding(16.dp))
                    }
                }
            }
            saveError?.let { err ->
                item {
                    Surface(color = danger.copy(alpha = 0.1f), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(err, color = danger, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            item {
                Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Update Stock Quantity", color = text, fontWeight = FontWeight.Bold)
                        OutlinedTextField(
                            value = newStock,
                            onValueChange = { v -> newStock = v.filter { it.isDigit() } },
                            label = { Text("New stock quantity") },
                            placeholder = { Text("Enter new total stock") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            item {
                Button(
                    onClick = {
                        val token = state.currentSession?.authToken
                        val qty = newStock.toIntOrNull()
                        if (token.isNullOrBlank()) {
                            saveError = "Please sign in again."
                            return@Button
                        }
                        if (qty == null || qty < 0) {
                            saveError = "Enter a valid stock quantity."
                            return@Button
                        }
                        scope.launch {
                            isSaving = true
                            saveError = null
                            val request =
                                com.notwhat.shared.catalog
                                    .UpdateProductRequestDto(stock = qty)
                            state.sellerContent.updateProduct(editingProduct.id, request, token)
                            isSaving = false
                            saveSuccess = "✓ Stock updated to $qty units."
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = SellerUiTokens.radiusButton,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                    enabled = !isSaving,
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Save Stock Update", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        return
    }

    // Low-stock product list
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
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Low Stock", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(56.dp))
            }
        }

        if (lowStockProducts.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
                    Text("All products are well stocked! 🎉", color = muted, style = MaterialTheme.typography.titleMedium)
                }
            }
        } else {
            item {
                Text(
                    "${lowStockProducts.size} product(s) need restocking. Tap any to update stock.",
                    color = muted,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
            items(lowStockProducts) { product ->
                Surface(
                    color = surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    modifier =
                        Modifier.fillMaxWidth().clickable {
                            editingProductId = product.id
                            newStock = product.stock.toString()
                        },
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        DemoImage(
                            url = product.displayImageUrl,
                            contentDescription = product.displayTitle,
                            modifier = Modifier.size(56.dp),
                            shape = RoundedCornerShape(10.dp),
                        )
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                product.displayTitle,
                                color = text,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(product.displayPrice, color = accent, style = MaterialTheme.typography.labelMedium)
                            Surface(color = danger.copy(alpha = 0.12f), shape = RoundedCornerShape(6.dp)) {
                                Text(
                                    "Only ${product.stock} left",
                                    color = danger,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                            }
                        }
                        Text("Restock →", color = accent, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}
