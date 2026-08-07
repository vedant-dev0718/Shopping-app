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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto

@Composable
internal fun BargainProductsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onOpenProduct: (ProductDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val bargainProducts = state.content.products.filter { it.bargainEnabled }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Bargain Deals",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = text,
                )
                Surface(color = accent.copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp)) {
                    Text(
                        "${bargainProducts.size} Active",
                        color = accent,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
            }
        }

        if (bargainProducts.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("No bargain products yet", style = MaterialTheme.typography.titleMedium, color = muted)
                        Text("Sellers can enable bargain on individual products", color = muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        } else {
            items(bargainProducts.chunked(2)) { rowProducts ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    rowProducts.forEach { product ->
                        ElevatedCard(
                            modifier = Modifier.weight(1f).clickable { onOpenProduct(product) },
                            colors = CardDefaults.elevatedCardColors(containerColor = surface),
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Box {
                                    DemoImage(
                                        url = product.displayImageUrl,
                                        contentDescription = product.displayTitle,
                                        modifier = Modifier.fillMaxWidth().height(180.dp),
                                        shape = RoundedCornerShape(14.dp),
                                    )
                                    // Bargain badge
                                    Text(
                                        "BARGAIN",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier =
                                            Modifier
                                                .align(Alignment.TopStart)
                                                .padding(8.dp)
                                                .background(accent, RoundedCornerShape(8.dp))
                                                .padding(horizontal = 8.dp, vertical = 4.dp),
                                    )
                                }
                                Column(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(product.displayStoreName, color = muted, style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        product.displayTitle,
                                        color = text,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(product.displayPrice, color = accent, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    if (rowProducts.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
