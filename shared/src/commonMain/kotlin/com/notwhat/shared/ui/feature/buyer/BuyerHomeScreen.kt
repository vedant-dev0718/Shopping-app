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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto
import kotlinx.coroutines.launch

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
    val homeAccent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    LazyColumn(
        modifier = modifier.fillMaxSize().background(homeBg),
        contentPadding = PaddingValues(BuyerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(BuyerUiTokens.sectionGap),
    ) {
        item {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable(onClick = actions.onSearchTap),
                color = homeCard,
                shape = RoundedCornerShape(18.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 15.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text("Search drops, stores, vibes...", color = homeText, modifier = Modifier.weight(1f))
                    Text("Search", color = homeAccent, fontWeight = FontWeight.Bold)
                }
            }
        }
        if (state.content.isLoading && state.content.categories.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator(color = homeAccent, modifier = Modifier.size(28.dp), strokeWidth = 2.dp)
                        Text("Loading your storefront...", color = homeText, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        } else if (state.content.loadErrorMessage != null && state.content.categories.isEmpty()) {
            item {
                StatusMessage(
                    title = "Your storefront is getting ready",
                    message = "New categories and products will appear here soon.",
                    accent = homeAccent,
                    text = homeText,
                    muted = NotWhatColors.onSurfaceVariant,
                    surface = homeCard,
                )
            }
        } else if (state.content.categories.isEmpty()) {
            item {
                StatusMessage(
                    title = "No categories available",
                    message = "Seller categories will appear here as products are added.",
                    actionLabel = "Refresh",
                    onAction = { scope.launch { state.content.load(state.currentSession?.authToken) } },
                    accent = homeAccent,
                    text = homeText,
                    muted = NotWhatColors.onSurfaceVariant,
                    surface = homeCard,
                )
            }
        }
        if (state.content.categories.isNotEmpty()) {
            item {
                Text("Shop by Category", style = MaterialTheme.typography.titleMedium, color = homeText, fontWeight = FontWeight.Bold)
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    state.content.categories.chunked(3).forEach { rowCategories ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                            rowCategories.forEach { category ->
                                Surface(
                                    modifier = Modifier.weight(1f).clickable { state.selectCategory(category.name) },
                                    color = homeCard,
                                    shape = RoundedCornerShape(18.dp),
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp, horizontal = 10.dp),
                                        horizontalAlignment = Alignment.Start,
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        DemoImage(
                                            url = category.imageUrl,
                                            contentDescription = category.name,
                                            modifier = Modifier.fillMaxWidth().height(96.dp),
                                            shape = RoundedCornerShape(14.dp),
                                        )
                                        Text(
                                            category.name,
                                            color = homeText,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                }
                            }
                            repeat(3 - rowCategories.size) { Box(modifier = Modifier.weight(1f)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun StatusMessage(
    title: String,
    message: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    accent: androidx.compose.ui.graphics.Color,
    text: androidx.compose.ui.graphics.Color,
    muted: androidx.compose.ui.graphics.Color,
    surface: androidx.compose.ui.graphics.Color,
) {
    Surface(color = surface, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(title, color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(message, color = muted, style = MaterialTheme.typography.bodySmall, maxLines = 3, overflow = TextOverflow.Ellipsis)
            if (actionLabel != null && onAction != null) TextButton(onClick = onAction) { Text(actionLabel, color = accent) }
        }
    }
}
