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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

@Composable
internal fun StoreProfileScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    store: StoreDto,
    onBack: () -> Unit,
    onOpenProduct: (ProductDto) -> Unit,
    onOpenReel: (ReelDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    var tab by remember { mutableStateOf("Products") }

    val storeProductCount = state.content.products.count { it.storeId?.id == store.id }
    val storeReelCount = state.content.reels.count { it.displayCreator == store.storeName }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            // Back button without banner image
            Row(modifier = Modifier.fillMaxWidth().padding(start = 4.dp, top = 8.dp)) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
            }
        }

        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Bottom) {
                    DemoImage(
                        url = store.displayImageUrl,
                        contentDescription = store.storeName,
                        modifier = Modifier.size(92.dp).border(3.dp, bg, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                    )
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(store.storeName, style = MaterialTheme.typography.headlineSmall, color = text, fontWeight = FontWeight.Bold)
                        Text("${store.city ?: ""}, ${store.state ?: ""}".trim().trimEnd(','), color = muted)
                    }
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(
                        listOf("$storeProductCount Products", "$storeReelCount Reels"),
                    ) { stat ->
                        Surface(color = surfaceHigh, shape = RoundedCornerShape(16.dp)) {
                            Text(stat, color = text, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("Products", "Reels", "About", "Reviews").forEach { label ->
                        val selected = tab == label
                        Text(
                            text = label,
                            color = if (selected) accent else muted,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            modifier =
                                Modifier
                                    .background(if (selected) surfaceHigh else surface, RoundedCornerShape(16.dp))
                                    .clickable { tab = label }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
                }
            }
        }

        if (tab == "Products") {
            item {
                val storeProducts =
                    state.content.products
                        .filter { it.storeId?.id == store.id }
                        .ifEmpty { state.content.products }
                        .take(6)
                val rows = storeProducts.chunked(2)
                Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    rows.forEach { rowProducts ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                            rowProducts.forEach { product ->
                                ElevatedCard(
                                    modifier = Modifier.weight(1f).clickable { onOpenProduct(product) },
                                    colors = CardDefaults.elevatedCardColors(containerColor = surface),
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        DemoImage(
                                            url = product.displayImageUrl,
                                            contentDescription = product.displayTitle,
                                            modifier = Modifier.fillMaxWidth().height(176.dp),
                                            shape = RoundedCornerShape(14.dp),
                                        )
                                        Column(
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            Text(product.displayTitle, color = text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            Text(product.displayPrice, color = accent, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (tab == "Reels") {
            item {
                val storeReels =
                    state.content.reels
                        .filter { it.displayCreator == store.storeName }
                        .ifEmpty { state.content.reels }
                val rows = storeReels.chunked(3)
                Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    rows.forEach { rowReels ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            rowReels.forEach { reel ->
                                ElevatedCard(
                                    modifier = Modifier.weight(1f).height(160.dp).clickable { onOpenReel(reel) },
                                    colors = CardDefaults.elevatedCardColors(containerColor = surface),
                                ) {
                                    Box(modifier = Modifier.fillMaxSize()) {
                                        DemoImage(
                                            url = reel.thumbnailUrl,
                                            contentDescription = reel.displayCreator,
                                            modifier = Modifier.fillMaxSize(),
                                            shape = RoundedCornerShape(10.dp),
                                        )
                                        Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)))
                                        Text(
                                            reel.displayLabel,
                                            color = Color.White,
                                            modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                                        )
                                        Text(
                                            reel.displayCreator,
                                            color = Color.White,
                                            modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (tab == "About") {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    color = surface,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            "About ${store.storeName}",
                            color = text,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(store.description ?: "A curated regional fashion store.", color = muted)
                    }
                }
            }
        }

        if (tab == "Reviews") {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    color = surface,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Buyer Reviews", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("4.8 average rating from 1.1k buyers", color = accent)
                        Text("\"Fast shipping and great quality fits.\"", color = muted)
                    }
                }
            }
        }
    }
}
