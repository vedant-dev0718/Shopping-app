package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto
import kotlinx.coroutines.launch

@Composable
internal fun BargainsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onOpenReel: (com.notwhat.shared.catalog.ReelDto) -> Unit,
    onOpenStore: (StoreDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val accent = NotWhatAuthTokens.accent
    val activeReels = state.content.reels
    val scope = rememberCoroutineScope()
    var isRefreshing by remember { mutableStateOf(false) }

    fun findStore(reel: com.notwhat.shared.catalog.ReelDto): StoreDto? =
        state.content.stores.firstOrNull { it.id == reel.storeId?.id }
            ?: state.content.stores.firstOrNull { it.storeName == reel.displayCreator }

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().background(bg),
            contentPadding = PaddingValues(0.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            if (activeReels.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.fillParentMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(
                                "No reels yet",
                                color = Color.White,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "Sellers haven't uploaded any reels yet.\nCheck back soon!",
                                color = Color.White.copy(alpha = 0.6f),
                                style = MaterialTheme.typography.bodySmall,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            }

            items(activeReels, key = { it.id }) { reel ->
                val store = findStore(reel)
                val storeName = store?.storeName ?: reel.displayCreator

                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .fillParentMaxHeight()
                            .clickable { onOpenReel(reel) },
                ) {
                    // Thumbnail as background (video plays on detail screen)
                    DemoImage(
                        url = reel.thumbnailUrl,
                        contentDescription = storeName,
                        modifier = Modifier.fillMaxSize(),
                        shape = RoundedCornerShape(0.dp),
                    )

                    // Gradient overlay
                    Box(
                        modifier =
                            Modifier.fillMaxSize().background(
                                Brush.verticalGradient(
                                    listOf(
                                        Color.Black.copy(alpha = 0.3f),
                                        Color.Transparent,
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.75f),
                                    ),
                                ),
                            ),
                    )

                    // Store name top-left
                    Row(
                        modifier = Modifier.align(Alignment.TopStart).padding(16.dp).clickable { store?.let { onOpenStore(it) } },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DemoImage(
                            url = store?.displayImageUrl ?: "",
                            contentDescription = storeName,
                            modifier = Modifier.size(40.dp).border(2.dp, Color.White, RoundedCornerShape(20.dp)),
                            shape = RoundedCornerShape(20.dp),
                        )
                        Text(storeName, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                    }

                    // Caption + tap hint bottom
                    Column(
                        modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            storeName,
                            color = accent,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        if (!reel.caption.isNullOrBlank()) {
                            Text(
                                reel.caption,
                                color = Color.White,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        if (reel.taggedProducts.isNotEmpty()) {
                            Surface(color = Color.Black.copy(alpha = 0.5f), shape = RoundedCornerShape(12.dp)) {
                                Text(
                                    "${reel.taggedProducts.size} product${if (reel.taggedProducts.size > 1) "s" else ""} tagged — tap to view",
                                    color = Color.White,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                )
                            }
                        }
                    }
                }
            }

            // Refresh button at the bottom of the list
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    if (isRefreshing) {
                        CircularProgressIndicator(color = accent, strokeWidth = 2.dp)
                    } else {
                        Surface(
                            color = accent.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(20.dp),
                            modifier =
                                Modifier.clickable {
                                    scope.launch {
                                        isRefreshing = true
                                        state.content.load(state.currentSession?.authToken)
                                        isRefreshing = false
                                    }
                                },
                        ) {
                            Text(
                                "↻  Refresh",
                                color = accent,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                            )
                        }
                    }
                }
            }
        }
    } // end Box
}

@Composable
internal fun ReelDetailScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    reel: com.notwhat.shared.catalog.ReelDto,
    onBack: () -> Unit,
    onOpenProduct: (ProductDto) -> Unit,
    onOpenStore: (StoreDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    val store: StoreDto? =
        state.content.stores.firstOrNull { it.id == reel.storeId?.id }
            ?: state.content.stores.firstOrNull { it.storeName == reel.displayCreator }
    val storeName = store?.storeName ?: reel.displayCreator

    val taggedProducts =
        reel.taggedProducts
            .ifEmpty {
                state.content.products
                    .filter { it.storeId?.id == store?.id }
                    .take(3)
            }

    LaunchedEffect(reel.id) {
        state.content.recordReelView(reel.id, state.currentSession?.authToken)
    }

    val openTrackedProduct: (ProductDto) -> Unit = { product ->
        scope.launch { state.content.recordProductClick(product.id, state.currentSession?.authToken) }
        onOpenProduct(product)
    }

    val toggleSavedProduct: (ProductDto) -> Unit = { product ->
        val token = state.currentSession?.authToken
        if (!token.isNullOrBlank()) {
            scope.launch {
                if (product.isSaved) {
                    state.content.unsaveProduct(product.id, token)
                } else {
                    state.content.saveProduct(product.id, token)
                }
            }
        }
    }

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Fullscreen video player — falls back to thumbnail for seed/fake URLs
            item {
                val isPlayable =
                    reel.videoUrl.isNotBlank() &&
                        !reel.videoUrl.contains("example.com") &&
                        reel.videoUrl.startsWith("http")

                Box(modifier = Modifier.fillMaxWidth().height(620.dp).background(Color.Black)) {
                    if (isPlayable) {
                        NativeVideoPlayer(
                            uri = reel.videoUrl,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        DemoImage(
                            url = reel.thumbnailUrl,
                            contentDescription = storeName,
                            modifier = Modifier.fillMaxSize(),
                            shape = RoundedCornerShape(0.dp),
                        )
                        Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
                        Surface(
                            color = Color.Black.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.align(Alignment.Center),
                        ) {
                            Text(
                                "▶  Preview unavailable",
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                    // Back button overlay
                    TextButton(
                        onClick = onBack,
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text("Back", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    // Store name overlay
                    Row(
                        modifier =
                            Modifier
                                .align(Alignment.BottomStart)
                                .padding(16.dp)
                                .clickable { store?.let { onOpenStore(it) } },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DemoImage(
                            url = store?.displayImageUrl ?: "",
                            contentDescription = storeName,
                            modifier = Modifier.size(36.dp).border(2.dp, Color.White, RoundedCornerShape(18.dp)),
                            shape = RoundedCornerShape(18.dp),
                        )
                        Column {
                            Text(storeName, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            if (!reel.caption.isNullOrBlank()) {
                                Text(
                                    reel.caption,
                                    color = Color.White.copy(alpha = 0.8f),
                                    style = MaterialTheme.typography.labelSmall,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
            }

            // Store row (tappable)
            item {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .background(surface)
                            .clickable { store?.let { onOpenStore(it) } }
                            .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    DemoImage(
                        url = store?.displayImageUrl ?: "",
                        contentDescription = storeName,
                        modifier = Modifier.size(48.dp),
                        shape = RoundedCornerShape(24.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(storeName, color = text, fontWeight = FontWeight.Bold)
                        Text("Visit Store →", color = accent, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }

            // Tagged products header
            if (taggedProducts.isNotEmpty()) {
                item {
                    Text(
                        "Products in this Reel",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
                items(taggedProducts) { item ->
                    Surface(
                        color = surface,
                        shape = RoundedCornerShape(0.dp),
                        modifier = Modifier.fillMaxWidth().clickable { openTrackedProduct(item) },
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            DemoImage(
                                url = item.displayImageUrl,
                                contentDescription = item.displayTitle,
                                modifier = Modifier.size(72.dp),
                                shape = RoundedCornerShape(12.dp),
                            )
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    item.displayTitle,
                                    color = text,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(item.displayPrice, color = accent, fontWeight = FontWeight.Bold)
                                Text(item.category, color = muted, style = MaterialTheme.typography.labelSmall)
                            }
                            Text(
                                "→",
                                color = accent,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(start = 8.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}
