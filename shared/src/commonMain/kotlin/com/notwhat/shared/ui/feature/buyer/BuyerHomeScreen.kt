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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto

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

    LazyColumn(
        modifier = modifier.fillMaxSize().background(homeBg),
        contentPadding = PaddingValues(BuyerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(BuyerUiTokens.sectionGap),
    ) {
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
                                shape = RoundedCornerShape(16.dp),
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp, horizontal = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    DemoImage(
                                        url = category.imageUrl,
                                        contentDescription = category.name,
                                        modifier = Modifier.size(52.dp),
                                        shape = RoundedCornerShape(26.dp),
                                    )
                                    Text(
                                        category.name,
                                        color = homeText,
                                        style = MaterialTheme.typography.labelSmall,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                        // fill empty cells in last row so grid stays aligned
                        repeat(3 - rowCategories.size) { Box(modifier = Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}
