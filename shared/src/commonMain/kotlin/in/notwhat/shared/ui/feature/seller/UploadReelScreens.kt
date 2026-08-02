package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay

@Composable
internal fun UploadReelScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val panel = NotWhatColors.surface
    val panelSoft = NotWhatColors.surfaceContainerHigh
    val field = NotWhatColors.surfaceContainer
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val accentSoft = NotWhatColors.primaryContainer
    val border = NotWhatColors.outline

    var videoUri by remember { mutableStateOf<String?>(null) }
    var isPickingVideo by remember { mutableStateOf(false) }
    var thumbnailUri by remember { mutableStateOf<String?>(null) }
    var isPickingThumbnail by remember { mutableStateOf(false) }
    var caption by remember { mutableStateOf("") }
    var allowBargaining by remember { mutableStateOf(true) }
    var isSharing by remember { mutableStateOf(false) }
    var shareStatus by remember { mutableStateOf<String?>(null) }
    var tagQuery by remember { mutableStateOf("") }
    var taggedProducts by remember { mutableStateOf(emptyList<String>()) }

    val suggestions = state.sellerContent.products
        .ifEmpty { com.notwhat.shared.catalog.seedProducts() }
        .map { it.displayTitle }
        .filter { it.contains(tagQuery, ignoreCase = true) && !taggedProducts.contains(it) }
        .take(5)

    LaunchedEffect(isSharing) {
        if (isSharing) {
            delay(1800)
            isSharing = false
            shareStatus = "Reel uploaded and queued for feed publishing."
        }
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
                TextButton(onClick = onBack) { Text("✕", color = text, fontWeight = FontWeight.SemiBold) }
                Text("UPLOAD REEL", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                TextButton(
                    onClick = { if (videoUri != null && !isSharing) isSharing = true },
                    enabled = videoUri != null && !isSharing,
                ) {
                    Text("Done", color = if (videoUri != null) accent else muted, fontWeight = FontWeight.Bold)
                }
            }
        }

        shareStatus?.let { message ->
            item {
                Surface(color = Color(0xFF1A3A2A), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(message, color = Color(0xFF6FCF97), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        Text("✓ Done", color = accent, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { shareStatus = null; onBack() })
                    }
                }
            }
        }

        // Video preview / picker card
        item {
            VideoPickerCard(
                videoUri = videoUri,
                isPickingVideo = isPickingVideo,
                isSharing = isSharing,
                text = text,
                muted = muted,
                accent = accent,
                panel = panel,
                panelSoft = panelSoft,
                onPickVideo = {
                    isPickingVideo = true
                    PlatformMediaPicker.launch { uri ->
                        isPickingVideo = false
                        if (uri != null) videoUri = uri
                    }
                },
                onShareReel = { if (!isSharing) isSharing = true },
            )
        }

        // Cover image / thumbnail picker
        item {
            ThumbnailPickerCard(
                thumbnailUri = thumbnailUri,
                isPicking = isPickingThumbnail,
                isSharing = isSharing,
                text = text,
                muted = muted,
                accent = accent,
                panel = panel,
                panelSoft = panelSoft,
                border = border,
                onPick = {
                    isPickingThumbnail = true
                    PlatformImagePicker.launch { uri ->
                        isPickingThumbnail = false
                        if (uri != null) thumbnailUri = uri
                    }
                },
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("CAPTION", color = text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Text("${caption.length}/2000", color = muted, style = MaterialTheme.typography.labelSmall)
                }
                Surface(color = panel, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = caption,
                        onValueChange = { if (it.length <= 2000) caption = it },
                        modifier = Modifier.fillMaxWidth().height(110.dp),
                        placeholder = { Text("Write a catchy bargain caption...") },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = text),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = border,
                            unfocusedBorderColor = border,
                            focusedContainerColor = field,
                            unfocusedContainerColor = field,
                            focusedTextColor = text,
                            unfocusedTextColor = text,
                            focusedPlaceholderColor = muted,
                            unfocusedPlaceholderColor = muted,
                        ),
                    )
                }
            }
        }

        item {
            BargainingToggle(
                allowBargaining = allowBargaining,
                accent = accent,
                text = text,
                muted = muted,
                panel = panel,
                onToggle = { allowBargaining = !allowBargaining },
            )
        }

        item {
            TagProductsCard(
                taggedProducts = taggedProducts,
                tagQuery = tagQuery,
                suggestions = suggestions,
                text = text,
                muted = muted,
                accentSoft = accentSoft,
                panel = panel,
                panelSoft = panelSoft,
                field = field,
                border = border,
                onTagQueryChange = { tagQuery = it },
                onAddProduct = { product ->
                    if (taggedProducts.size < 5) taggedProducts = taggedProducts + product
                    tagQuery = ""
                },
                onRemoveProduct = { product -> taggedProducts = taggedProducts.filterNot { it == product } },
            )
        }

        // Bottom spacer so CTA doesn't obscure last card
        item { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
private fun VideoPickerCard(
    videoUri: String?,
    isPickingVideo: Boolean,
    isSharing: Boolean,
    text: Color,
    muted: Color,
    accent: Color,
    panel: Color,
    panelSoft: Color,
    onPickVideo: () -> Unit,
    onShareReel: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(9f / 16f)
                .clip(RoundedCornerShape(24.dp))
                .background(panel),
            contentAlignment = Alignment.Center,
        ) {
            if (videoUri != null) {
                NativeVideoPlayer(
                    uri = videoUri,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(23.dp)),
                )
            } else {
                // Empty-state with "choose video" CTA
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.padding(32.dp),
                ) {
                    Surface(
                        color = panelSoft,
                        shape = RoundedCornerShape(32.dp),
                        modifier = Modifier.size(72.dp),
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Text("▶", color = accent, style = MaterialTheme.typography.headlineLarge)
                        }
                    }
                    Text(
                        "No video selected",
                        color = text,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        "Tap below to choose a video from your gallery",
                        color = muted,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                    Button(
                        onClick = onPickVideo,
                        enabled = !isPickingVideo,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accent),
                    ) {
                        if (isPickingVideo) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        Text("CHOOSE FROM GALLERY", color = Color.White, fontWeight = FontWeight.Black)
                    }
                }
            }
        }

        if (videoUri != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = onPickVideo,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, accent),
                    enabled = !isPickingVideo && !isSharing,
                ) {
                    Text("Change Video", color = accent, fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = onShareReel,
                    modifier = Modifier.weight(1f).height(48.dp),
                    enabled = !isSharing,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                ) {
                    if (isSharing) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(if (isSharing) "Uploading…" else "Share Reel", color = Color.White, fontWeight = FontWeight.Black)
                }
            }
        }

        Text(
            "By posting, you agree to our Content Guidelines.",
            color = muted,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun BargainingToggle(
    allowBargaining: Boolean,
    accent: Color,
    text: Color,
    muted: Color,
    panel: Color,
    onToggle: () -> Unit,
) {
    Surface(color = panel, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = SellerUiTokens.cardPadding, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Allow Bargaining", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text("Let users negotiate the price", color = muted, style = MaterialTheme.typography.bodySmall)
            }
            Surface(
                color = if (allowBargaining) accent else Color(0xFFCCBB88),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.clickable { onToggle() },
            ) {
                Row(
                    modifier = Modifier.width(52.dp).padding(horizontal = 6.dp, vertical = 6.dp),
                    horizontalArrangement = if (allowBargaining) Arrangement.End else Arrangement.Start,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(color = Color.White, shape = RoundedCornerShape(8.dp), modifier = Modifier.size(16.dp)) {}
                }
            }
        }
    }
}

@Composable
private fun TagProductsCard(
    taggedProducts: List<String>,
    tagQuery: String,
    suggestions: List<String>,
    text: Color,
    muted: Color,
    accentSoft: Color,
    panel: Color,
    panelSoft: Color,
    field: Color,
    border: Color,
    onTagQueryChange: (String) -> Unit,
    onAddProduct: (String) -> Unit,
    onRemoveProduct: (String) -> Unit,
) {
    Surface(color = panel, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("TAG PRODUCTS", color = text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text("${taggedProducts.size}/5", color = accentSoft, style = MaterialTheme.typography.labelSmall)
            }

            if (taggedProducts.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    items(taggedProducts) { product ->
                        Surface(
                            color = accentSoft,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.clickable { onRemoveProduct(product) },
                        ) {
                            Text(
                                "$product ✕",
                                color = text,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            OutlinedTextField(
                value = tagQuery,
                onValueChange = onTagQueryChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search products to tag…", style = MaterialTheme.typography.bodySmall) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = border,
                    unfocusedBorderColor = border,
                    focusedContainerColor = field,
                    unfocusedContainerColor = field,
                    focusedTextColor = text,
                    unfocusedTextColor = text,
                    focusedPlaceholderColor = muted,
                    unfocusedPlaceholderColor = muted,
                ),
                shape = RoundedCornerShape(24.dp),
                singleLine = true,
            )

            if (suggestions.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    items(suggestions) { option ->
                        Surface(
                            color = panelSoft,
                            shape = SellerUiTokens.radiusChip,
                            modifier = Modifier.clickable { onAddProduct(option) },
                        ) {
                            Text(option, color = text, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ThumbnailPickerCard(
    thumbnailUri: String?,
    isPicking: Boolean,
    isSharing: Boolean,
    text: Color,
    muted: Color,
    accent: Color,
    panel: Color,
    panelSoft: Color,
    border: Color,
    onPick: () -> Unit,
) {
    Surface(color = panel, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(SellerUiTokens.cardPadding), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("COVER IMAGE", color = text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Text("Optional – auto-generated if skipped", color = muted, style = MaterialTheme.typography.labelSmall)
                }
                if (thumbnailUri != null) {
                    OutlinedButton(
                        onClick = onPick,
                        enabled = !isPicking && !isSharing,
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, border),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text("Change", color = accent, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            HorizontalDivider(color = border.copy(alpha = 0.4f))

            if (thumbnailUri != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(panelSoft),
                ) {
                    AsyncImage(
                        model = thumbnailUri,
                        contentDescription = "Cover image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                }
            } else {
                // Empty-state CTA
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(panelSoft)
                        .clickable(enabled = !isPicking && !isSharing, onClick = onPick),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (isPicking) {
                            CircularProgressIndicator(color = accent, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        } else {
                            Text("🖼", style = MaterialTheme.typography.headlineMedium)
                            Text("Tap to choose cover photo", color = muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}


