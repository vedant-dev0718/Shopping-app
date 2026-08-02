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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
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

@Composable
internal fun ProductLifecycleScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onAddProduct: () -> Unit = {},
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    var filter by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var pricingControlOpen by remember { mutableStateOf(false) }
    var editingProductId by remember { mutableStateOf<String?>(null) }
    val products = state.sellerContent.products.ifEmpty { com.notwhat.shared.catalog.seedProducts() }
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
            onSave = { editingProductId = null },
            accent = accent,
            text = text,
            muted = muted,
            surface = surface,
        )
        return
    }

    val filteredProducts = products.filter { product ->
        val matchesFilter = filter == "All" || product.status == filter
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
                Text("Product Lifecycle", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text("Inventory", color = muted, style = MaterialTheme.typography.labelSmall)
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
                items(listOf("All", "Live", "Drafts", "Paused")) { chip ->
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
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    Text("Inventory summary", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Live items: 2 · Draft items: 1 · Needs attention: 1", color = muted)
                    Text("Tap a product row to jump into product editing context.", color = accent, style = MaterialTheme.typography.bodySmall)
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
                            Text(product.displayTitle, color = text, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Surface(color = accent.copy(alpha = 0.18f), shape = RoundedCornerShape(10.dp)) {
                                Text(
                                    product.status,
                                    color = accent,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 1,
                                )
                            }
                        }
                        Text(product.category, color = muted, style = MaterialTheme.typography.bodySmall)
                        Text("Stock ${product.stock} · ${product.displayPrice}", color = text)
                    }
                    Button(
                        onClick = { editingProductId = product.id },
                        shape = SellerUiTokens.radiusButton,
                        colors = ButtonDefaults.buttonColors(containerColor = accent),
                    ) {
                        Text("Edit", color = Color.White)
                    }
                }
            }
        }

        item {
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    Text("Editing surface", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("This screen gives sellers a working entry point for inventory, pricing, and draft/product state management.", color = muted)
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Campaign price", color = muted)
                        Text(
                            "Add pricing control",
                            color = accent,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { pricingControlOpen = true },
                        )
                    }
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
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val orderStatusById = remember { mutableStateMapOf<String, String>() }
    var selectedLane by remember { mutableStateOf("All") }
    var actionNote by remember { mutableStateOf<String?>(null) }

    val rawOrders = state.sellerContent.orders.ifEmpty { com.notwhat.shared.seller.seedSellerOrders() }

    val orders = rawOrders.filter { order ->
        val status = orderStatusById[order.id] ?: order.status
        selectedLane == "All" || status.contains(selectedLane, ignoreCase = true)
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
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
                        Text(note, color = text, style = MaterialTheme.typography.bodySmall)
                        Text("Dismiss", color = accent, modifier = Modifier.clickable { actionNote = null }, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(SellerUiTokens.chipGap)) {
                items(listOf("All", "New", "Packed", "Shipped", "Exception")) { lane ->
                    SellerFilterChip(
                        label = lane,
                        selected = selectedLane == lane,
                        onClick = { selectedLane = lane },
                        accent = accent,
                        surface = surface,
                        text = text,
                    )
                }
            }
        }

        item {
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    Text("Operational queue", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Track order processing from new order to exception handling.", color = muted)
                }
            }
        }

        items(orders) { order ->
            val status = orderStatusById[order.id] ?: order.status
            val firstItem = order.items.firstOrNull()
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(order.id, color = text, fontWeight = FontWeight.Bold)
                            Text(firstItem?.titleSnapshot ?: "", color = muted, style = MaterialTheme.typography.bodySmall)
                        }
                        Surface(color = surfaceHigh, shape = RoundedCornerShape(10.dp)) {
                            Text(
                                status,
                                color = text,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                style = MaterialTheme.typography.labelSmall,
                                maxLines = 1,
                            )
                        }
                    }
                    Text("₹${order.totalAmount.toInt()}", color = text, fontWeight = FontWeight.Bold)
                    val nextSt = when (status) {
                        "placed" -> "packed"
                        "packed" -> "shipped"
                        else -> null
                    }
                    if (nextSt != null) {
                        Button(
                            onClick = {
                                orderStatusById[order.id] = nextSt
                                actionNote = "${order.id} moved to $nextSt."
                            },
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("Mark ${nextSt.replaceFirstChar { it.uppercaseChar() }}", color = Color.White)
                        }
                    }
                }
            }
        }

        item {
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    Text("Operations notes", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Use the queue filters to isolate SLAs, exceptions, and courier lanes before opening related product or order contexts.", color = muted)
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
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) accent else Color.White.copy(alpha = 0.12f)),
    ) {
        Text(
            label,
            color = if (selected) accent else text,
            modifier = Modifier.padding(horizontal = SellerUiTokens.chipHorizontalPadding, vertical = SellerUiTokens.chipVerticalPadding),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun SellerEditProductScreen(
    modifier: Modifier,
    product: com.notwhat.shared.catalog.ProductDto,
    onBack: () -> Unit,
    onSave: () -> Unit,
    accent: Color,
    text: Color,
    muted: Color,
    surface: Color,
) {
    var name by remember(product.id) { mutableStateOf(product.title) }
    var category by remember(product.id) { mutableStateOf(product.category) }
    var price by remember(product.id) { mutableStateOf(product.price.toInt().toString()) }
    var stockText by remember(product.id) { mutableStateOf(product.stock.toString()) }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(Color(0xFF1F0F0B)),
        contentPadding = PaddingValues(SellerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(SellerUiTokens.sectionGap),
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Edit Product", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Box(modifier = Modifier.size(48.dp))
            }
        }
        item {
            Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Product Name") })
                    OutlinedTextField(value = category, onValueChange = { category = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Category") })
                    OutlinedTextField(value = price, onValueChange = { price = it }, modifier = Modifier.fillMaxWidth(), label = { Text("Price") })
                    OutlinedTextField(value = stockText, onValueChange = { stockText = it.filter { c -> c.isDigit() } }, modifier = Modifier.fillMaxWidth(), label = { Text("Stock") })
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(onClick = onBack, modifier = Modifier.weight(1f), shape = SellerUiTokens.radiusButton, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF44302A))) {
                            Text("Cancel", color = text)
                        }
                        Button(
                            onClick = { onSave() },
                            modifier = Modifier.weight(1f),
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("Save", color = Color.White)
                        }
                    }
                    Text("This is a mock edit flow and now updates seller list state.", color = muted, style = MaterialTheme.typography.bodySmall)
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
                    Text("Mock pricing flow is now available until backend pricing rules are wired.", color = muted, style = MaterialTheme.typography.bodySmall)
                    Button(onClick = onBack, modifier = Modifier.fillMaxWidth(), shape = SellerUiTokens.radiusButton, colors = ButtonDefaults.buttonColors(containerColor = accent)) {
                        Text("Save Pricing Rules", color = Color.White)
                    }
                }
            }
        }
    }
}
