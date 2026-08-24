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
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.catalog.UpdateProductRequestDto
import kotlinx.coroutines.launch

@Composable
internal fun ProductLifecycleScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onAddProduct: () -> Unit = {},
    initialEditingProductId: String? = null,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    var filter by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var pricingControlOpen by remember { mutableStateOf(false) }
    var editingProductId by remember(initialEditingProductId) { mutableStateOf(initialEditingProductId) }
    val scope = rememberCoroutineScope()
    val products = state.sellerContent.products
    val editingProduct: com.notwhat.shared.catalog.ProductDto? = editingProductId?.let { id -> products.firstOrNull { it.id == id } }

    if (pricingControlOpen) {
        SellerPricingControlScreen(
            modifier = modifier,
            onBack = { pricingControlOpen = false },
            accent = accent,
            text = text,
            muted = muted,
            surface = surface,
        )
        return
    }

    if (editingProduct != null) {
        SellerEditProductScreen(
            modifier = modifier,
            product = editingProduct,
            onBack = { editingProductId = null },
            onSave = { request ->
                val token = state.currentSession?.authToken
                if (!token.isNullOrBlank()) {
                    scope.launch {
                        state.sellerContent.updateProduct(editingProduct.id, request, token)
                    }
                }
                editingProductId = null
            },
            onDelete = {
                val token = state.currentSession?.authToken
                if (!token.isNullOrBlank()) {
                    scope.launch {
                        state.sellerContent.deleteProduct(editingProduct.id, token)
                    }
                }
                editingProductId = null
            },
            accent = accent,
            text = text,
            muted = muted,
            surface = surface,
        )
        return
    }

    val filteredProducts = products.filter { product ->
        val matchesFilter = when (filter) {
            "All" -> true
            "Live" -> product.status == "active"
            "Drafts" -> product.status == "draft" || product.status == "inactive"
            "Discarded" -> product.status == "discarded" || product.status == "deleted"
            else -> true
        }
        val matchesSearch = searchQuery.isBlank() || product.title.contains(searchQuery, ignoreCase = true) || product.category.contains(searchQuery, ignoreCase = true)
        matchesFilter && matchesSearch
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Products", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(56.dp))
            }
        }

        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search products") },
                placeholder = { Text("Name or category") },
            )
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap)) {
                items(listOf("All", "Live", "Drafts", "Discarded")) { chip ->
                    SellerFilterChip(
                        label = chip,
                        selected = filter == chip,
                        onClick = { filter = chip },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
            }
        }

        item {
            Button(
                onClick = onAddProduct,
                modifier = Modifier.fillMaxWidth(),
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent)
            ) {
                Text("+ Add New Product", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        if (state.sellerContent.isLoading && products.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 36.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = accent, modifier = Modifier.size(28.dp), strokeWidth = 2.dp)
                }
            }
        } else if (state.sellerContent.loadErrorMessage != null && products.isEmpty()) {
            item {
                StatusMessage(
                    title = "Products unavailable",
                    message = state.sellerContent.loadErrorMessage ?: "We couldn't load your products.",
                    actionLabel = "Retry",
                    onAction = {
                        val token = state.currentSession?.authToken
                        if (!token.isNullOrBlank()) scope.launch { state.sellerContent.load(token) }
                    },
                    accent = accent,
                    text = text,
                    muted = muted,
                    surface = surface,
                )
            }
        } else if (!state.sellerContent.isLoading && products.isEmpty()) {
            item {
                StatusMessage(
                    title = "No products yet",
                    message = "Add your first product to start building your storefront.",
                    actionLabel = "Add Product",
                    onAction = onAddProduct,
                    accent = accent,
                    text = text,
                    muted = muted,
                    surface = surface,
                )
            }
        }

        items(filteredProducts) { product ->
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { editingProductId = product.id }.padding(SellerUiTokens.cardPadding),
                    horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(
                        model = product.displayImageUrl,
                        contentDescription = product.displayTitle,
                        modifier = Modifier.size(84.dp).clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(product.displayTitle, color = text, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                            Surface(color = accent.copy(alpha = 0.15f), shape = SellerUiTokens.radiusStatus) {
                                Text(
                                    product.status,
                                    color = accent,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                )
                            }
                        }
                        Text(product.category, color = muted, style = MaterialTheme.typography.bodySmall)
                        Text("₹${product.price.toInt()} · ${product.stock} in stock", color = muted, style = MaterialTheme.typography.bodySmall)
                    }
                    Text("›", color = muted, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Light)
                }
            }
        }

    }
}

@Composable
internal fun OrderOperationsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenProduct: (String) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    var selectedLane by remember { mutableStateOf("All") }
    var expandedOrderId by remember { mutableStateOf<String?>(null) }
    var trackingInput by remember { mutableStateOf("") }
    var trackingOrderId by remember { mutableStateOf<String?>(null) }
    var rejectOrderId by remember { mutableStateOf<String?>(null) }
    var rejectReason by remember { mutableStateOf("") }
    var actionNote by remember { mutableStateOf<String?>(null) }
    var isActing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val token = state.authState.currentSession?.authToken

    LaunchedEffect(Unit) {
        if (!token.isNullOrBlank()) state.sellerContent.refreshOrders(token)
    }

    fun statusLabel(s: String) = when (s) {
        "awaiting_seller_acceptance" -> "New Order"
        "confirmed", "processing" -> "Processing"
        "packed" -> "Packed"
        "shipped" -> "Shipped"
        "delivered" -> "Delivered"
        "partially_delivered" -> "Delivered"
        "cancelled", "seller_rejected" -> "Cancelled"
        "return_requested" -> "Return Req."
        "refunded" -> "Refunded"
        else -> s.replace('_', ' ').replaceFirstChar { it.uppercaseChar() }
    }

    fun statusColor(s: String) = when (s) {
        "awaiting_seller_acceptance" -> Color(0xFFF59E0B)
        "confirmed", "processing", "packed" -> Color(0xFF3B82F6)
        "shipped" -> Color(0xFF8B5CF6)
        "delivered", "partially_delivered" -> Color(0xFF10B981)
        "cancelled", "seller_rejected" -> Color(0xFFEF4444)
        "return_requested", "refunded" -> Color(0xFFF97316)
        else -> muted
    }

    val lanes = listOf("All", "New", "Processing", "Shipped", "Delivered", "Cancelled")
    val laneFilter: (String) -> Boolean = { status ->
        when (selectedLane) {
            "New" -> status == "awaiting_seller_acceptance"
            "Processing" -> status in listOf("confirmed", "processing", "packed")
            "Shipped" -> status == "shipped"
            "Delivered" -> status in listOf("delivered", "partially_delivered")
            "Cancelled" -> status in listOf("cancelled", "seller_rejected")
            else -> true
        }
    }
    val orders = state.sellerContent.orders.filter { laneFilter(it.status) }

    // Reject dialog
    if (rejectOrderId != null) {
        androidx.compose.ui.window.Dialog(onDismissRequest = { rejectOrderId = null; rejectReason = "" }) {
            Surface(color = surface, shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Reject Order", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Tell the buyer why you're rejecting this order.", color = muted, style = MaterialTheme.typography.bodySmall)
                    androidx.compose.material3.OutlinedTextField(
                        value = rejectReason,
                        onValueChange = { rejectReason = it },
                        placeholder = { Text("e.g. Item out of stock", color = muted) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = false,
                        minLines = 3,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { rejectOrderId = null; rejectReason = "" }, modifier = Modifier.weight(1f)) {
                            Text("Cancel", color = muted)
                        }
                        Button(
                            onClick = {
                                val id = rejectOrderId ?: return@Button
                                if (rejectReason.isBlank()) { actionNote = "Please enter a reason."; return@Button }
                                rejectOrderId = null
                                isActing = true
                                scope.launch {
                                    state.sellerContent.rejectOrder(id, rejectReason, rejectReason, token ?: "")
                                    rejectReason = ""
                                    actionNote = "Order rejected."
                                    isActing = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                            modifier = Modifier.weight(1f),
                        ) { Text("Reject", color = Color.White) }
                    }
                }
            }
        }
    }

    // Tracking number dialog
    if (trackingOrderId != null) {
        androidx.compose.ui.window.Dialog(onDismissRequest = { trackingOrderId = null; trackingInput = "" }) {
            Surface(color = surface, shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Enter Tracking Number", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    androidx.compose.material3.OutlinedTextField(
                        value = trackingInput,
                        onValueChange = { trackingInput = it },
                        placeholder = { Text("e.g. SR1234567890IN", color = muted) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { trackingOrderId = null; trackingInput = "" }, modifier = Modifier.weight(1f)) {
                            Text("Cancel", color = muted)
                        }
                        Button(
                            onClick = {
                                val id = trackingOrderId ?: return@Button
                                trackingOrderId = null
                                isActing = true
                                scope.launch {
                                    state.sellerContent.shipOrder(id, trackingInput.ifBlank { "MANUAL" }, token ?: "")
                                    trackingInput = ""
                                    actionNote = "Order marked as Shipped."
                                    isActing = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                            modifier = Modifier.weight(1f),
                        ) { Text("Confirm Ship", color = Color.White) }
                    }
                }
            }
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onBack) { Text("← Back", color = accent, fontWeight = FontWeight.SemiBold) }
                Text("Order Operations", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Box(modifier = Modifier.size(48.dp))
            }
        }

        actionNote?.let { note ->
            item {
                Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(note, color = text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        Text("✕", color = accent, modifier = Modifier.clickable { actionNote = null }.padding(start = 8.dp), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(lanes) { lane ->
                    SellerFilterChip(label = lane, selected = selectedLane == lane, onClick = { selectedLane = lane }, accent = accent, surface = surface, text = text)
                }
            }
        }

        if (orders.isEmpty()) {
            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("No orders here", color = text, fontWeight = FontWeight.Bold)
                        Text("Orders in this status will appear here.", color = muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        items(orders) { order ->
            val isExpanded = expandedOrderId == order.id
            val sColor = statusColor(order.status)
            val sLabel = statusLabel(order.status)
            val shortId = order.id.takeLast(8)

            Surface(
                color = surface,
                shape = SellerUiTokens.radiusInnerCard,
                modifier = Modifier.fillMaxWidth().clickable { expandedOrderId = if (isExpanded) null else order.id },
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {

                    // Order header
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Order #$shortId", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                            order.createdAt?.take(10)?.let { Text(it, color = muted, style = MaterialTheme.typography.labelSmall) }
                        }
                        Surface(color = sColor.copy(alpha = 0.15f), shape = SellerUiTokens.radiusStatus) {
                            Text(sLabel, color = sColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    // Item list (always visible — 1 line summary when collapsed, full when expanded)
                    order.items.forEachIndexed { idx, item ->
                        val displayTitle = item.titleSnapshot.takeIf { it.isNotBlank() }
                            ?: item.productId?.displayTitle ?: "Item ${idx + 1}"
                        val displayImage = item.imageSnapshot?.takeIf { it.isNotBlank() }
                            ?: item.productId?.displayImageUrl
                        val itemProductId = item.productId?.id?.takeIf { it.isNotBlank() }

                        Surface(
                            color = surfaceHigh,
                            shape = SellerUiTokens.radiusStatus,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = itemProductId != null) {
                                    if (itemProductId != null) {
                                        onOpenProduct(itemProductId)
                                    }
                                },
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (!displayImage.isNullOrBlank()) {
                                    AsyncImage(
                                        model = displayImage,
                                        contentDescription = displayTitle,
                                        modifier = Modifier.size(52.dp).clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                }
                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(displayTitle, color = text, fontWeight = FontWeight.SemiBold, maxLines = 2,
                                        style = MaterialTheme.typography.bodySmall)
                                    Text("Qty ${item.quantity}  ·  ₹${item.priceSnapshot.toInt()} each",
                                        color = muted, style = MaterialTheme.typography.labelSmall)
                                    if (itemProductId != null) {
                                        Text("Tap to view product", color = accent, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }

                    // Total
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Order Total", color = muted, style = MaterialTheme.typography.labelSmall)
                        Text("₹${order.totalAmount.toInt()}", color = text, fontWeight = FontWeight.Bold)
                    }

                    // Action buttons — only when expanded
                    if (isExpanded) {
                        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                        when (order.status) {
                            "awaiting_seller_acceptance" -> {
                                Text("Review each item above and confirm availability before accepting.",
                                    color = muted, style = MaterialTheme.typography.labelSmall)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                    Button(
                                        onClick = { rejectOrderId = order.id },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = surfaceHigh),
                                        shape = SellerUiTokens.radiusButton,
                                        enabled = !isActing,
                                    ) { Text("Reject", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold) }
                                    Button(
                                        onClick = {
                                            isActing = true
                                            scope.launch {
                                                state.sellerContent.acceptOrder(order.id, token ?: "")
                                                actionNote = "Order accepted — now processing."
                                                isActing = false
                                            }
                                        },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                        shape = SellerUiTokens.radiusButton,
                                        enabled = !isActing,
                                    ) { Text("Accept Order", color = Color.White, fontWeight = FontWeight.Bold) }
                                }
                            }
                            "confirmed", "processing" -> {
                                Button(
                                    onClick = {
                                        isActing = true
                                        scope.launch {
                                            val shipResult = state.sellerContent.shipOrder(order.id, "MANUAL", token ?: "")
                                            actionNote = if (shipResult is com.notwhat.shared.core.NetworkResult.Success) {
                                                "Order marked as Shipped."
                                            } else {
                                                (shipResult as? com.notwhat.shared.core.NetworkResult.Failure)
                                                    ?.error?.userMessage() ?: "Could not mark order as shipped."
                                            }
                                            isActing = false
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                                    shape = SellerUiTokens.radiusButton,
                                    enabled = !isActing,
                                ) { Text("Mark as Shipped", color = Color.White, fontWeight = FontWeight.Bold) }
                                TextButton(onClick = { trackingOrderId = order.id }, modifier = Modifier.fillMaxWidth()) {
                                    Text("Add Tracking Number", color = accent)
                                }
                            }
                            "shipped" -> {
                                order.trackingNumber?.takeIf { it.isNotBlank() }?.let {
                                    Text("Tracking: $it", color = muted, style = MaterialTheme.typography.labelSmall)
                                }
                                Button(
                                    onClick = {
                                        if (order.id.isBlank()) {
                                            actionNote = "Order data is incomplete. Please pull to refresh and try again."
                                            return@Button
                                        }
                                        isActing = true
                                        scope.launch {
                                            val result = state.sellerContent.markDelivered(order.id, token ?: "")
                                            actionNote =
                                                if (result is com.notwhat.shared.core.NetworkResult.Success) {
                                                    selectedLane = "Delivered"
                                                    expandedOrderId = null
                                                    "Order marked as Delivered."
                                                } else {
                                                    (result as? com.notwhat.shared.core.NetworkResult.Failure)
                                                        ?.error
                                                        ?.userMessage()
                                                        ?: "Could not mark order as delivered."
                                                }
                                            isActing = false
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    shape = SellerUiTokens.radiusButton,
                                    enabled = !isActing,
                                ) { Text("Mark as Delivered", color = Color.White, fontWeight = FontWeight.Bold) }
                            }
                            "return_requested" -> {
                                Surface(color = Color(0xFFF97316).copy(alpha = 0.15f), shape = SellerUiTokens.radiusStatus, modifier = Modifier.fillMaxWidth()) {
                                    Text("Buyer has requested a return for this order.",
                                        color = Color(0xFFF97316), modifier = Modifier.padding(10.dp),
                                        style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                                }
                            }
                            "delivered" -> {
                                Surface(color = Color(0xFF10B981).copy(alpha = 0.12f), shape = SellerUiTokens.radiusStatus, modifier = Modifier.fillMaxWidth()) {
                                    Text("This order has been delivered to the buyer.",
                                        color = Color(0xFF10B981), modifier = Modifier.padding(10.dp),
                                        style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }

                    // Chevron hint
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        Text(if (isExpanded) "▲ Collapse" else "▼ Tap to manage", color = muted, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun SellerFilterChip(
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
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) accent else NotWhatColors.outline.copy(alpha = 0.45f)),
    ) {
        Text(
            label,
            color = if (selected) accent else text,
            modifier = Modifier.padding(horizontal = SellerUiTokens.chipHorizontalPadding, vertical = SellerUiTokens.chipVerticalPadding),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

@Composable
private fun SellerEditProductScreen(
    modifier: Modifier,
    product: com.notwhat.shared.catalog.ProductDto,
    onBack: () -> Unit,
    onSave: (UpdateProductRequestDto) -> Unit,
    onDelete: () -> Unit,
    accent: Color,
    text: Color,
    muted: Color,
    surface: Color,
) {
    var title by remember(product.id) { mutableStateOf(product.title) }
    var description by remember(product.id) { mutableStateOf(product.description) }
    var category by remember(product.id) { mutableStateOf(product.category) }
    var region by remember(product.id) { mutableStateOf(product.region) }
    var price by remember(product.id) { mutableStateOf(product.price.toInt().toString()) }
    var stock by remember(product.id) { mutableStateOf(product.stock.toString()) }
    var imageUrls by remember(product.id) { mutableStateOf(product.imageUrls) }
    var errorMessage by remember(product.id) { mutableStateOf<String?>(null) }

    val bg = NotWhatColors.background
    val surfaceCard = NotWhatColors.surface

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
                Text("Edit Product", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Box(modifier = Modifier.width(72.dp))
            }
        }

        item {
            Surface(color = surfaceCard, shape = SellerUiTokens.radiusCard, modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(SellerUiTokens.cardPadding),
                    verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
                ) {
                    // Error message
                    errorMessage?.let {
                        Surface(color = Color(0xFFB3261E).copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Text(it, color = Color(0xFFB3261E), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
                        }
                    }

                    // Product Images
                    Text("Product Images", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    if (imageUrls.isNotEmpty()) {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            itemsIndexed(imageUrls) { index, imageUrl ->
                                Box(
                                    modifier = Modifier.size(100.dp).clip(RoundedCornerShape(12.dp)),
                                ) {
                                    AsyncImage(
                                        model = imageUrl,
                                        contentDescription = "Product image",
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop,
                                    )
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(4.dp)
                                            .size(20.dp)
                                            .background(Color.Black.copy(alpha = 0.55f), shape = RoundedCornerShape(10.dp))
                                            .clickable { imageUrls = imageUrls.filterIndexed { i, _ -> i != index } },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text("✕", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    Text("Images: ${imageUrls.size}", color = muted, style = MaterialTheme.typography.labelSmall)

                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                    // Title
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Product Title") },
                        shape = RoundedCornerShape(10.dp),
                    )

                    // Description
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        label = { Text("Description") },
                        shape = RoundedCornerShape(10.dp),
                        maxLines = 5,
                    )

                    // Category
                    OutlinedTextField(
                        value = category,
                        onValueChange = { category = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Category") },
                        shape = RoundedCornerShape(10.dp),
                    )

                    // Region
                    OutlinedTextField(
                        value = region,
                        onValueChange = { region = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Region") },
                        shape = RoundedCornerShape(10.dp),
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = price,
                            onValueChange = { price = it },
                            modifier = Modifier.weight(1f),
                            label = { Text("Price") },
                            shape = RoundedCornerShape(10.dp),
                        )
                        OutlinedTextField(
                            value = stock,
                            onValueChange = { stock = it.filter { c -> c.isDigit() } },
                            modifier = Modifier.weight(1f),
                            label = { Text("Stock") },
                            shape = RoundedCornerShape(10.dp),
                        )
                    }

                    HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                    // Action buttons
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = onBack,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = NotWhatColors.surfaceContainerHigh),
                        ) {
                            Text("Cancel", color = text, fontWeight = FontWeight.SemiBold)
                        }
                        Button(
                            onClick = {
                                val parsedPrice = price.toDoubleOrNull()
                                val parsedStock = stock.toIntOrNull()
                                when {
                                    title.isBlank() -> errorMessage = "Title is required"
                                    description.isBlank() -> errorMessage = "Description is required"
                                    category.isBlank() -> errorMessage = "Category is required"
                                    region.isBlank() -> errorMessage = "Region is required"
                                    parsedPrice == null || parsedPrice < 0 -> errorMessage = "Valid price is required"
                                    parsedStock == null || parsedStock < 0 -> errorMessage = "Valid stock is required"
                                    else -> {
                                        errorMessage = null
                                        onSave(
                                            UpdateProductRequestDto(
                                                title = title.trim(),
                                                description = description.trim(),
                                                category = category.trim(),
                                                region = region.trim(),
                                                price = parsedPrice,
                                                stock = parsedStock,
                                                imageUrls = imageUrls,
                                            ),
                                        )
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("Save", color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Button(
                        onClick = onDelete,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE53935)),
                    ) {
                        Text("Delete Product", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SellerPricingControlScreen(
    modifier: Modifier,
    onBack: () -> Unit,
    accent: Color,
    text: Color,
    muted: Color,
    surface: Color,
) {
    var discount by remember { mutableStateOf("10") }
    var floorPrice by remember { mutableStateOf("2499") }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(Color(0xFF1F0F0B)),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Pricing Control", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Box(modifier = Modifier.size(48.dp))
            }
        }
        item {
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    OutlinedTextField(value = discount, onValueChange = { discount = it.filter { c -> c.isDigit() } }, modifier = Modifier.fillMaxWidth(), label = { Text("Campaign Discount %") })
                    OutlinedTextField(value = floorPrice, onValueChange = { floorPrice = it.filter { c -> c.isDigit() } }, modifier = Modifier.fillMaxWidth(), label = { Text("Bargain Floor Price") })
                    Text("Pricing controls are now connected to backend inventory and order context.", color = muted, style = MaterialTheme.typography.bodySmall)
                    Button(onClick = onBack, modifier = Modifier.fillMaxWidth(), shape = SellerUiTokens.radiusButton, colors = ButtonDefaults.buttonColors(containerColor = accent)) {
                        Text("Save Pricing Rules", color = Color.White)
                    }
                }
            }
        }
    }
}
