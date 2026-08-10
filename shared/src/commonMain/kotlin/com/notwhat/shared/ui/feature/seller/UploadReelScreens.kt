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
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.core.NetworkResult
import kotlinx.coroutines.launch

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
    var uploadStage by remember { mutableStateOf<String?>(null) }
    var tagQuery by remember { mutableStateOf("") }
    var selectedProductIds by remember { mutableStateOf(emptyList<String>()) }
    var isUploadSuccess by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Auto-redirect to reel list after successful upload
    if (isUploadSuccess) {
        scope.launch {
            kotlinx.coroutines.delay(2000)
            onBack()
        }
    }

    val sellerProducts =
        state.sellerContent.products

    val selectedProducts = sellerProducts.filter { selectedProductIds.contains(it.id) }

    val suggestions =
        sellerProducts
            .filter {
                it.displayTitle.contains(tagQuery, ignoreCase = true) &&
                    !selectedProductIds.contains(it.id)
            }.take(5)

    val shareReel = share@{
        if (isSharing) {
            return@share
        }

        val token = state.currentSession?.authToken
        if (token.isNullOrBlank()) {
            shareStatus = "Please sign in again to upload reels."
            return@share
        }

        val selectedVideoUri = videoUri
        if (selectedVideoUri.isNullOrBlank()) {
            shareStatus = "Please select a reel video first."
            return@share
        }

        if (selectedProductIds.size > 3) {
            shareStatus = "Tag at most 3 products before uploading."
            return@share
        }

        scope.launch {
            isSharing = true
            shareStatus = null
            uploadStage = "Preparing video…"

            val videoBytes = PlatformMediaFileReader.readBytes(selectedVideoUri)
            if (videoBytes == null) {
                isSharing = false
                shareStatus = "Could not read the selected video. Please try again."
                uploadStage = null
                return@launch
            }

            uploadStage = "Uploading video (${(videoBytes.size / 1024)} KB)…"
            val videoUploadResult =
                state.sellerContent.uploadVideo(
                    data = videoBytes,
                    fileName = PlatformMediaFileReader.fileName(selectedVideoUri, "reel.mp4"),
                    bearerToken = token,
                    mimeType = PlatformMediaFileReader.guessMimeType(selectedVideoUri, "video/mp4"),
                )

            val videoUpload =
                when (videoUploadResult) {
                    is NetworkResult.Success -> {
                        videoUploadResult.data
                    }

                    is NetworkResult.Failure -> {
                        isSharing = false
                        shareStatus = videoUploadResult.error.userMessage()
                        uploadStage = null
                        return@launch
                    }
                }

            val selectedThumbnailUri = thumbnailUri
            var finalThumbnailUrl = videoUpload.thumbnailUrl.ifBlank { videoUpload.videoUrl }

            if (!selectedThumbnailUri.isNullOrBlank()) {
                uploadStage = "Uploading thumbnail…"
                val thumbnailBytes = PlatformMediaFileReader.readBytes(selectedThumbnailUri)
                if (thumbnailBytes != null) {
                    val imageUploadResult =
                        state.sellerContent.uploadImage(
                            data = thumbnailBytes,
                            fileName = PlatformMediaFileReader.fileName(selectedThumbnailUri, "reel-thumb.jpg"),
                            bearerToken = token,
                            mimeType = PlatformMediaFileReader.guessMimeType(selectedThumbnailUri, "image/jpeg"),
                        )

                    if (imageUploadResult is NetworkResult.Success) {
                        finalThumbnailUrl = imageUploadResult.data.imageUrl
                    }
                }
            }

            val primaryProduct = selectedProducts.firstOrNull()
            val createRequest =
                CreateReelRequestDto(
                    videoUrl = videoUpload.videoUrl,
                    thumbnailUrl = finalThumbnailUrl,
                    caption = caption.trim().ifBlank { null },
                    hashtags = caption.split(' ').filter { it.startsWith("#") }.map { it.trim() },
                    region = primaryProduct?.region?.ifBlank { "India" } ?: "India",
                    category = primaryProduct?.category?.ifBlank { "Fashion" } ?: "Fashion",
                    subcategory = primaryProduct?.subcategory,
                    taggedProductIds = selectedProductIds,
                )

            uploadStage = "Publishing reel…"
            val createResult = state.sellerContent.createReel(createRequest, token)
            isSharing = false
            uploadStage = null

            if (createResult is NetworkResult.Success) {
                shareStatus = "Reel uploaded and published to buyer feed."
                isUploadSuccess = true
            } else if (createResult is NetworkResult.Failure) {
                shareStatus = createResult.error.userMessage()
            }
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
                    onClick = shareReel,
                    enabled = videoUri != null && !isSharing,
                ) {
                    Text("Done", color = if (videoUri != null) accent else muted, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Upload progress banner
        uploadStage?.let { stage ->
            item {
                Surface(
                    color = NotWhatColors.surfaceContainerHigh,
                    shape = SellerUiTokens.radiusInnerCard,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                stage,
                                color = NotWhatColors.onSurface,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.weight(1f),
                            )
                            CircularProgressIndicator(color = NotWhatAuthTokens.accent, modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                        }
                        androidx.compose.material3.LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = NotWhatAuthTokens.accent,
                            trackColor = NotWhatColors.surface,
                        )
                    }
                }
            }
        }

        shareStatus?.let { message ->
            item {
                Surface(
                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                    shape = SellerUiTokens.radiusInnerCard,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(message, color = Color(0xFF10B981), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        Text(
                            "✓ Done",
                            color = accent,
                            fontWeight = FontWeight.Bold,
                            modifier =
                                Modifier.clickable {
                                    shareStatus = null
                                    onBack()
                                },
                        )
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
                Surface(color = panel, shape = SellerUiTokens.radiusStatus, modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = caption,
                        onValueChange = { if (it.length <= 2000) caption = it },
                        modifier = Modifier.fillMaxWidth().height(110.dp),
                        placeholder = { Text("Write a catchy bargain caption...") },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = text),
                        colors =
                            OutlinedTextFieldDefaults.colors(
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
                taggedProducts = selectedProducts.map { it.displayTitle },
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
                    if (selectedProductIds.size < 3) {
                        selectedProductIds = selectedProductIds + product.id
                    }
                    tagQuery = ""
                },
                onRemoveProduct = { productName ->
                    val productId = selectedProducts.firstOrNull { it.displayTitle == productName }?.id
                    if (productId != null) {
                        selectedProductIds = selectedProductIds.filterNot { it == productId }
                    }
                },
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
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(9f / 16f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(panelSoft),
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
                        shape = SellerUiTokens.radiusButton,
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
            OutlinedButton(
                onClick = onPickVideo,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = SellerUiTokens.radiusButton,
                border = BorderStroke(1.dp, accent),
                enabled = !isPickingVideo && !isSharing,
            ) {
                Text("Change Video", color = accent, fontWeight = FontWeight.SemiBold)
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
                shape = SellerUiTokens.radiusChip,
                modifier = Modifier.clickable { onToggle() },
            ) {
                Row(
                    modifier = Modifier.width(52.dp).padding(horizontal = 6.dp, vertical = 6.dp),
                    horizontalArrangement = if (allowBargaining) Arrangement.End else Arrangement.Start,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(color = Color.White, shape = SellerUiTokens.radiusStatus, modifier = Modifier.size(16.dp)) {}
                }
            }
        }
    }
}

@Composable
private fun TagProductsCard(
    taggedProducts: List<String>,
    tagQuery: String,
    suggestions: List<ProductDto>,
    text: Color,
    muted: Color,
    accentSoft: Color,
    panel: Color,
    panelSoft: Color,
    field: Color,
    border: Color,
    onTagQueryChange: (String) -> Unit,
    onAddProduct: (ProductDto) -> Unit,
    onRemoveProduct: (String) -> Unit,
) {
    Surface(color = panel, shape = SellerUiTokens.radiusInnerCard, modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("TAG PRODUCTS", color = text, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text("${taggedProducts.size}/3", color = accentSoft, style = MaterialTheme.typography.labelSmall)
            }

            if (taggedProducts.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    items(taggedProducts) { product ->
                        Surface(
                            color = accentSoft,
                            shape = SellerUiTokens.radiusChip,
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
                colors =
                    OutlinedTextFieldDefaults.colors(
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
                            Text(
                                option.displayTitle,
                                color = text,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                style = MaterialTheme.typography.bodySmall,
                            )
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
                        shape = SellerUiTokens.radiusStatus,
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
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(SellerUiTokens.radiusButton)
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
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .clip(SellerUiTokens.radiusButton)
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
