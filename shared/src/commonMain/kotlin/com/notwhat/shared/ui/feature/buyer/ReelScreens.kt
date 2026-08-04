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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.catalog.seedStores
import kotlinx.coroutines.launch

@Composable
internal fun BargainsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onOpenReel: (com.notwhat.shared.catalog.ReelDto) -> Unit,
    onOpenStore: (StoreDto) -> Unit,
) {
    val reelsBg = NotWhatColors.background
    val reelsAccent = NotWhatAuthTokens.accent
    var reelTab by remember { mutableStateOf("Following") }
    val activeReels = state.content.reels.ifEmpty { seedReels() }

    fun findStoreForReel(reel: com.notwhat.shared.catalog.ReelDto): StoreDto? =
        state.content.stores.firstOrNull { it.storeName == reel.displayCreator }
            ?: state.content.stores.firstOrNull()
            ?: seedStores().firstOrNull()

    LazyColumn(
        modifier = modifier.fillMaxSize().background(reelsBg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(color = Color.White.copy(alpha = 0.12f), shape = RoundedCornerShape(16.dp)) {
                    Text(
                        "Camera",
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
                Text("REELS", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Surface(color = Color.White.copy(alpha = 0.12f), shape = RoundedCornerShape(16.dp)) {
                    Text(
                        "Search",
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("For You", "Following", "Near Me").forEach { label ->
                        val selected = reelTab == label
                        Surface(
                            modifier = Modifier.clickable { reelTab = label },
                            color = if (selected) Color.White.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Text(
                                label,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                style = MaterialTheme.typography.labelMedium,
                            )
                        }
                    }
                }
            }
        }

        items(activeReels) { reel ->
            val store: StoreDto? = findStoreForReel(reel)
            ElevatedCard(
                modifier = Modifier.fillMaxWidth().height(620.dp).clickable { onOpenReel(reel) },
                colors = CardDefaults.elevatedCardColors(containerColor = Color.Black),
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    DemoImage(
                        url = reel.thumbnailUrl,
                        contentDescription = reel.displayLabel,
                        modifier = Modifier.fillMaxSize(),
                        shape = RoundedCornerShape(16.dp),
                    )
                    Box(
                        modifier =
                            Modifier.fillMaxSize().background(
                                androidx.compose.ui.graphics.Brush.verticalGradient(
                                    colors =
                                        listOf(
                                            Color.Black.copy(alpha = 0.55f),
                                            Color.Transparent,
                                            Color.Transparent,
                                            Color.Black.copy(alpha = 0.70f),
                                        ),
                                ),
                            ),
                    )

                    Row(
                        modifier = Modifier.align(Alignment.TopStart).padding(16.dp).clickable { store?.let { onOpenStore(it) } },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DemoImage(
                            url = store?.displayImageUrl ?: "",
                            contentDescription = store?.storeName ?: reel.displayCreator,
                            modifier = Modifier.size(44.dp).border(2.dp, Color.White, RoundedCornerShape(22.dp)),
                            shape = RoundedCornerShape(22.dp),
                        )
                        Column {
                            Text(
                                store?.displayHandle ?: "@${reel.displayCreator.lowercase().replace(" ","")}",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                store?.storeName ?: reel.displayCreator,
                                color = Color.White.copy(alpha = 0.85f),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.align(Alignment.CenterEnd).padding(end = 12.dp, bottom = 108.dp),
                        verticalArrangement = Arrangement.spacedBy(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        ActionStatPill(label = "12.4K", icon = "Like")
                        ActionStatPill(label = "842", icon = "Comments")
                    }

                    Column(
                        modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                store?.displayHandle ?: "@${reel.displayCreator.lowercase().replace(" ","")}",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                            )
                            if (store?.verified ==
                                true
                            ) {
                                Text("Verified", color = Color(0xFF8EC6FF), style = MaterialTheme.typography.labelSmall)
                            }
                        }
                        Text(
                            reel.displayCreator,
                            color = reelsAccent,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            reel.caption ?: "Discover this drop — live bargain is active! #notwhat",
                            color = Color.White,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Surface(color = Color.Black.copy(alpha = 0.35f), shape = RoundedCornerShape(16.dp)) {
                            Text(
                                "Original Audio - ${store?.storeName ?: reel.displayCreator}",
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            )
                        }
                    }
                }
            }
        }
    }
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
        state.content.stores.firstOrNull { it.storeName == reel.displayCreator }
            ?: state.content.stores.firstOrNull()
    val taggedProducts =
        reel.taggedProducts
            .ifEmpty {
                state.content.products
                    .take(3)
                    .ifEmpty { seedProducts().take(3) }
            }

    LaunchedEffect(reel.id) {
        state.content.recordReelView(reel.id, state.currentSession?.authToken)
    }

    val openTrackedProduct: (ProductDto) -> Unit = { product ->
        scope.launch {
            state.content.recordProductClick(product.id, state.currentSession?.authToken)
        }
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
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                }
            }

            item {
                Box(modifier = Modifier.fillMaxWidth().height(300.dp)) {
                    DemoImage(
                        url = reel.thumbnailUrl,
                        contentDescription = reel.displayLabel,
                        modifier = Modifier.fillMaxSize(),
                        shape = RoundedCornerShape(16.dp),
                    )
                    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.25f)))
                    Text(
                        reel.displayLabel,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        modifier =
                            Modifier
                                .align(
                                    Alignment.TopStart,
                                ).padding(12.dp)
                                .background(accent, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { store?.let { onOpenStore(it) } },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    DemoImage(
                        url = store?.displayImageUrl ?: "",
                        contentDescription = store?.storeName ?: reel.displayCreator,
                        modifier = Modifier.size(44.dp),
                        shape = RoundedCornerShape(22.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(store?.storeName ?: reel.displayCreator, color = text, fontWeight = FontWeight.Bold)
                        Text(
                            reel.caption ?: "",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            if (taggedProducts.isNotEmpty()) {
                item {
                    Text("Products in this Reel", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                items(taggedProducts) { item ->
                    Surface(
                        color = surface,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth().clickable { openTrackedProduct(item) },
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
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
                                Text(item.displayTitle, color = text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(item.displayPrice, color = accent, fontWeight = FontWeight.Bold)
                            }
                            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(
                                    color = if (item.isSaved) accent.copy(alpha = 0.2f) else surface,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.clickable { toggleSavedProduct(item) },
                                ) {
                                    Text(
                                        if (item.isSaved) "Saved" else "Save",
                                        color = if (item.isSaved) accent else text,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                    )
                                }
                                Surface(
                                    color = accent,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.clickable { openTrackedProduct(item) },
                                ) {
                                    Text("View", color = Color.White, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionStatPill(
    label: String,
    icon: String,
) {
    Surface(color = Color.Black.copy(alpha = 0.35f), shape = RoundedCornerShape(16.dp)) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(icon, color = Color.White, style = MaterialTheme.typography.labelSmall)
            Text(label, color = Color.White, style = MaterialTheme.typography.labelSmall)
        }
    }
}
