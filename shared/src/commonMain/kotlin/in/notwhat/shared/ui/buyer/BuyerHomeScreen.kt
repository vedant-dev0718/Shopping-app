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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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

/** Navigation callbacks for HomeScreen — ISP: callers provide only what the screen needs. */
internal data class HomeScreenActions(
    val onSearchTap: () -> Unit,
    val onOpenProduct: (ProductDto) -> Unit,
    val onOpenStore: (StoreDto) -> Unit,
)

@Composable
internal fun HomeScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    actions: HomeScreenActions,
) {
    val homeBg = NotWhatColors.background
    val homeCard = NotWhatColors.surface
    val homeText = NotWhatColors.onSurface
    val homeMuted = NotWhatColors.onSurfaceVariant
    val homeAccent = NotWhatAuthTokens.accent

    LazyColumn(
        modifier = modifier.fillMaxSize().background(homeBg),
        contentPadding = PaddingValues(BuyerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(BuyerUiTokens.sectionGap),
    ) {
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(BuyerUiTokens.chipGap)) {
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(modifier = Modifier.size(68.dp), contentAlignment = Alignment.BottomEnd) {
                            DemoImage(
                                url =
                                    state.content.stores
                                        .firstOrNull()
                                        ?.displayImageUrl ?: seedStores().first().displayImageUrl,
                                contentDescription = "Your Story",
                                modifier = Modifier.size(68.dp),
                                shape = RoundedCornerShape(34.dp),
                            )
                            Box(
                                modifier = Modifier.size(22.dp).background(homeAccent, RoundedCornerShape(11.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("+", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                        Text("Your Story", color = homeMuted, style = MaterialTheme.typography.labelSmall)
                    }
                }
                items(state.content.stores.ifEmpty { seedStores() }) { story ->
                    Column(
                        modifier =
                            Modifier.clickable {
                                actions.onOpenStore(story)
                            },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        DemoImage(
                            url = story.displayImageUrl,
                            contentDescription = story.storeName,
                            modifier = Modifier.size(68.dp),
                            shape = RoundedCornerShape(34.dp),
                        )
                        Text(
                            story.storeName,
                            color = homeText,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        item {
            Surface(shape = RoundedCornerShape(16.dp), color = homeAccent) {
                Box(modifier = Modifier.fillMaxWidth().padding(BuyerUiTokens.cardPadding)) {
                    Column(verticalArrangement = Arrangement.spacedBy(BuyerUiTokens.cardGap), modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "BARGAIN DAYS ACTIVE",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelMedium,
                        )
                        Text(
                            state.currentSession?.headline ?: "Unlock exclusive street prices by bidding now.",
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(end = 84.dp),
                        )
                        Button(
                            onClick = actions.onSearchTap,
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Text("Bid Now", color = homeAccent)
                        }
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Trending Reels", style = MaterialTheme.typography.titleMedium, color = homeText)
                TextButton(onClick = { state.selectTab(NotWhatTab.Bargains) }) { Text("View All", color = homeAccent) }
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.content.reels.ifEmpty { seedReels() }) { reel ->
                    ElevatedCard(
                        modifier =
                            Modifier
                                .size(
                                    width = 172.dp,
                                    height = 268.dp,
                                ).clickable { actions.onOpenProduct(reel.toProductDtoStub()) },
                        colors = CardDefaults.elevatedCardColors(containerColor = homeCard),
                    ) {
                        Box(modifier = Modifier.fillMaxSize()) {
                            DemoImage(
                                url = reel.thumbnailUrl,
                                contentDescription = reel.displayCreator,
                                modifier = Modifier.fillMaxSize(),
                                shape = RoundedCornerShape(16.dp),
                            )
                            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)))
                            Text(
                                reel.displayLabel.uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                modifier =
                                    Modifier
                                        .align(
                                            Alignment.TopStart,
                                        ).padding(
                                            12.dp,
                                        ).background(homeAccent, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                            Column(
                                modifier = Modifier.align(Alignment.BottomStart).padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(reel.displayCreator, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Deals Near You", style = MaterialTheme.typography.titleMedium, color = homeText)
                TextButton(onClick = actions.onSearchTap) { Text("See More", color = homeAccent) }
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.content.products.ifEmpty { seedProducts() }.chunked(2).forEach { rowProducts ->
                    Row(horizontalArrangement = Arrangement.spacedBy(BuyerUiTokens.cardGap), modifier = Modifier.fillMaxWidth()) {
                        rowProducts.forEach { product ->
                            ElevatedCard(
                                modifier =
                                    Modifier.weight(1f).clickable {
                                        actions.onOpenProduct(product)
                                    },
                                colors = CardDefaults.elevatedCardColors(containerColor = homeCard),
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    DemoImage(
                                        url = product.displayImageUrl,
                                        contentDescription = product.displayTitle,
                                        modifier = Modifier.fillMaxWidth().height(150.dp),
                                        shape = RoundedCornerShape(16.dp),
                                    )
                                    Column(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Text(
                                            product.displayTitle,
                                            color = homeText,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                        Text(product.displayPrice, color = homeAccent, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("Shop by Category", style = MaterialTheme.typography.titleMedium, color = homeText)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.content.categories.ifEmpty { PreviewContent.categories }.chunked(2).forEach { rowCategories ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        rowCategories.forEach { category ->
                            Surface(
                                modifier =
                                    Modifier.weight(1f).clickable {
                                        state.selectCategory(category.name)
                                    },
                                color = homeCard,
                                shape = RoundedCornerShape(16.dp),
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    DemoImage(
                                        url = category.imageUrl,
                                        contentDescription = category.name,
                                        modifier = Modifier.size(46.dp),
                                        shape = RoundedCornerShape(23.dp),
                                    )
                                    Text(category.name, color = homeText)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
