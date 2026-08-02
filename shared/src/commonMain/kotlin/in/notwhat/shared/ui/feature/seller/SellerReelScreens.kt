package com.notwhat.shared.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

@Composable
internal fun SellerReelListScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onUploadReel: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val danger = Color(0xFFE53935)
    val border = NotWhatColors.outline

    var reels by remember(state.sellerContent.reels) {
        mutableStateOf(
            state.sellerContent.reels
                .map { it.toDemoSellerReel() }
                .ifEmpty { PreviewContent.sellerReels },
        )
    }
    var pendingDeleteId by remember { mutableStateOf<String?>(null) }
    var tagPickerReelId by remember { mutableStateOf<String?>(null) }

    // Product tag picker overlay
    tagPickerReelId?.let { reelId ->
        val reel = reels.firstOrNull { it.id == reelId } ?: return@let
        ReelProductTagSheet(
            modifier = modifier,
            reel = reel,
            allProducts =
                state.sellerContent.products.ifEmpty {
                    com.notwhat.shared.catalog
                        .seedProducts()
                },
            bg = bg,
            surface = surface,
            surfaceHigh = surfaceHigh,
            text = text,
            muted = muted,
            accent = accent,
            border = border,
            onDismiss = { tagPickerReelId = null },
            onSave = { _ ->
                tagPickerReelId = null
            },
        )
        return
    }

    // Delete confirmation overlay
    pendingDeleteId?.let { reelId ->
        val reel = reels.firstOrNull { it.id == reelId }
        Box(
            modifier = modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.72f)),
            contentAlignment = Alignment.Center,
        ) {
            Surface(
                color = surface,
                shape = RoundedCornerShape(20.dp),
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 32.dp),
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        "Delete Reel",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "\"${reel?.title ?: "this reel"}\" will be permanently removed from your storefront and the buyer feed.",
                        color = muted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedButton(
                            onClick = { pendingDeleteId = null },
                            modifier = Modifier.weight(1f),
                            shape = SellerUiTokens.radiusButton,
                            border = BorderStroke(1.dp, border),
                        ) {
                            Text("Cancel", color = muted, fontWeight = FontWeight.SemiBold)
                        }
                        Button(
                            onClick = {
                                reels = reels.filterNot { it.id == reelId }
                                pendingDeleteId = null
                            },
                            modifier = Modifier.weight(1f),
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = danger),
                        ) {
                            Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
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
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = onBack) {
                        Text("←", color = muted, fontWeight = FontWeight.SemiBold)
                    }
                    Column {
                        Text("MY REELS", color = muted, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        Text(
                            "${reels.size} reels",
                            color = text,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                Button(
                    onClick = onUploadReel,
                    shape = SellerUiTokens.radiusButton,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                ) {
                    Text("+ Upload", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        if (reels.isEmpty()) {
            item {
                Surface(
                    color = surface,
                    shape = SellerUiTokens.radiusCard,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text("No reels yet", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            "Upload your first reel to start showcasing products on the buyer feed.",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Button(
                            onClick = onUploadReel,
                            shape = SellerUiTokens.radiusButton,
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("Upload Reel", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        items(reels, key = { it.id }) { reel ->
            SellerReelCard(
                reel = reel,
                surface = surface,
                surfaceHigh = surfaceHigh,
                text = text,
                muted = muted,
                accent = accent,
                danger = danger,
                border = border,
                onDelete = { pendingDeleteId = reel.id },
                onTagProducts = { tagPickerReelId = reel.id },
                onEditCaption = { newCaption ->
                    reels = reels.map { if (it.id == reel.id) it.copy(caption = newCaption) else it }
                },
            )
        }
    }
}

@Composable
private fun SellerReelCard(
    reel: DemoSellerReel,
    surface: Color,
    surfaceHigh: Color,
    text: Color,
    muted: Color,
    accent: Color,
    danger: Color,
    border: Color,
    onDelete: () -> Unit,
    onTagProducts: () -> Unit,
    onEditCaption: (String) -> Unit,
) {
    var isEditingCaption by remember { mutableStateOf(false) }
    var draftCaption by remember(reel.caption) { mutableStateOf(reel.caption) }
    Surface(
        color = surface,
        shape = SellerUiTokens.radiusCard,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
        ) {
            // Thumbnail + meta row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    modifier =
                        Modifier
                            .width(80.dp)
                            .aspectRatio(9f / 16f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(surfaceHigh),
                ) {
                    AsyncImage(
                        model = reel.thumbnailUrl,
                        contentDescription = reel.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    // Duration badge
                    Surface(
                        color = Color.Black.copy(alpha = 0.62f),
                        shape = RoundedCornerShape(6.dp),
                        modifier =
                            Modifier
                                .align(Alignment.BottomEnd)
                                .padding(4.dp),
                    ) {
                        Text(
                            reel.duration,
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                        )
                    }
                }

                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        reel.title,
                        color = text,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        reel.caption,
                        color = muted,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            color = if (reel.isShared) Color(0xFF1A3A28) else surfaceHigh,
                            shape = RoundedCornerShape(8.dp),
                        ) {
                            Text(
                                if (reel.isShared) "LIVE" else "DRAFT",
                                color = if (reel.isShared) Color(0xFF4CAF50) else muted,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            )
                        }
                        Text(
                            "${reel.viewCount} views",
                            color = muted,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            "${reel.taggedProducts.size} products",
                            color = accent,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }

            HorizontalDivider(color = border.copy(alpha = 0.4f))

            // Inline caption editor – shown when Edit Caption is active
            if (isEditingCaption) {
                OutlinedTextField(
                    value = draftCaption,
                    onValueChange = { if (it.length <= 2000) draftCaption = it },
                    modifier = Modifier.fillMaxWidth().height(90.dp),
                    placeholder = { Text("Edit caption…", style = MaterialTheme.typography.bodySmall) },
                    textStyle = MaterialTheme.typography.bodySmall.copy(color = text),
                    colors =
                        OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = accent,
                            unfocusedBorderColor = border,
                            focusedContainerColor = surfaceHigh,
                            unfocusedContainerColor = surfaceHigh,
                            focusedTextColor = text,
                            unfocusedTextColor = text,
                            focusedPlaceholderColor = muted,
                            unfocusedPlaceholderColor = muted,
                        ),
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            isEditingCaption = false
                            draftCaption = reel.caption
                        },
                        modifier = Modifier.weight(1f),
                        shape = SellerUiTokens.radiusButton,
                        border = BorderStroke(1.dp, border),
                    ) {
                        Text("Cancel", color = muted, style = MaterialTheme.typography.labelMedium)
                    }
                    Button(
                        onClick = {
                            onEditCaption(draftCaption)
                            isEditingCaption = false
                        },
                        modifier = Modifier.weight(1f),
                        shape = SellerUiTokens.radiusButton,
                        colors = ButtonDefaults.buttonColors(containerColor = accent),
                    ) {
                        Text("Save", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    }
                }
                HorizontalDivider(color = border.copy(alpha = 0.4f))
            }

            // Action row: Edit Caption | Edit/Tag Products
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        isEditingCaption = !isEditingCaption
                        draftCaption = reel.caption
                    },
                    modifier = Modifier.weight(1f),
                    shape = SellerUiTokens.radiusButton,
                    border = BorderStroke(1.dp, if (isEditingCaption) accent else border),
                ) {
                    Text(
                        "Edit Caption",
                        color = if (isEditingCaption) accent else text,
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
                OutlinedButton(
                    onClick = onTagProducts,
                    modifier = Modifier.weight(1f),
                    shape = SellerUiTokens.radiusButton,
                    border = BorderStroke(1.dp, accent.copy(alpha = 0.6f)),
                ) {
                    Text(
                        if (reel.taggedProducts.isEmpty()) "Tag Products" else "Edit Products",
                        color = accent,
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
            OutlinedButton(
                onClick = onDelete,
                modifier = Modifier.fillMaxWidth(),
                shape = SellerUiTokens.radiusButton,
                border = BorderStroke(1.dp, danger.copy(alpha = 0.5f)),
            ) {
                Text(
                    "Delete",
                    color = danger,
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

@Composable
internal fun ReelProductTagSheet(
    modifier: Modifier,
    reel: DemoSellerReel,
    allProducts: List<com.notwhat.shared.catalog.ProductDto>,
    bg: Color,
    surface: Color,
    surfaceHigh: Color,
    text: Color,
    muted: Color,
    accent: Color,
    border: Color,
    onDismiss: () -> Unit,
    onSave: (List<com.notwhat.shared.catalog.ProductDto>) -> Unit,
) {
    val selectedIds =
        remember {
            mutableStateListOf<String>()
        }

    Column(
        modifier =
            modifier
                .fillMaxSize()
                .background(bg),
    ) {
        // Header
        Surface(color = surface, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel", color = muted, fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "TAG PRODUCTS",
                        color = text,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        reel.title,
                        color = muted,
                        style = MaterialTheme.typography.labelSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Button(
                    onClick = {
                        val picked = allProducts.filter { selectedIds.contains(it.id) }
                        onSave(picked)
                    },
                    shape = SellerUiTokens.radiusButton,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                    enabled = selectedIds.size <= 5,
                ) {
                    Text(
                        "Save (${selectedIds.size}/5)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }

        HorizontalDivider(color = border.copy(alpha = 0.4f))

        // Max-count helper
        Surface(
            color = Color(0xFF1A1A0A),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                "Select up to 5 products. Selected products will appear in the buyer feed when this reel is shared.",
                color = muted,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(allProducts, key = { it.id }) { product ->
                val isSelected = selectedIds.contains(product.id)
                val atLimit = selectedIds.size >= 5 && !isSelected

                Surface(
                    color = if (isSelected) Color(0xFF2C1F0A) else surface,
                    shape = SellerUiTokens.radiusInnerCard,
                    border =
                        BorderStroke(
                            1.dp,
                            if (isSelected) accent else border.copy(alpha = 0.5f),
                        ),
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !atLimit) {
                                if (isSelected) {
                                    selectedIds.remove(product.id)
                                } else {
                                    selectedIds.add(product.id)
                                }
                            },
                ) {
                    Row(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AsyncImage(
                            model = product.displayImageUrl,
                            contentDescription = product.displayTitle,
                            modifier =
                                Modifier
                                    .size(52.dp)
                                    .clip(RoundedCornerShape(10.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(
                                product.displayTitle,
                                color = if (atLimit) muted.copy(alpha = 0.5f) else text,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    product.displayPrice,
                                    color = if (atLimit) accent.copy(alpha = 0.4f) else accent,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    product.category,
                                    color = muted.copy(alpha = if (atLimit) 0.4f else 1f),
                                    style = MaterialTheme.typography.labelSmall,
                                )
                                Text(
                                    if (product.stock == 0) "Out of stock" else "${product.stock} in stock",
                                    color = if (product.stock == 0) Color(0xFFE53935) else muted.copy(alpha = if (atLimit) 0.4f else 0.8f),
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            }
                        }
                        // Checkbox indicator
                        Surface(
                            color = if (isSelected) accent else surfaceHigh,
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.size(24.dp),
                        ) {
                            if (isSelected) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Text(
                                        "✓",
                                        color = Color.White,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Black,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
