package com.notwhat.shared.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.search.SearchFilterKind

private val trendingSearchTerms = listOf(
    "Block Print Kurta", "Banarasi Saree", "Jaipur Crafts", "Kalamkari Tote", "Silk Dupatta",
)

/** Navigation callbacks for SearchScreen. */
internal data class SearchScreenActions(
    val onOpenProduct: (ProductDto) -> Unit,
    val onOpenStore: (StoreDto) -> Unit,
)

@Composable
@OptIn(ExperimentalLayoutApi::class)
internal fun SearchScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    actions: SearchScreenActions,
) {
    val searchBg = NotWhatColors.background
    val searchSurface = NotWhatColors.surface
    val searchSurface2 = NotWhatColors.surfaceContainerHigh
    val searchText = NotWhatColors.onSurface
    val searchMuted = NotWhatColors.onSurfaceVariant
    val searchOutline = NotWhatColors.outline
    val searchAccent = NotWhatAuthTokens.accent
    val searchChipSurface = NotWhatColors.surfaceContainer

    var resultTab by remember { mutableStateOf("All") }
    var exploreChip by remember { mutableStateOf("Trending") }

    val normalizedQuery = state.query.trim().lowercase()
    val categoryFilter = state.selectedCategory?.trim()?.lowercase()

    val searchHit = state.searchResults?.takeIf { it.query.lowercase() == normalizedQuery }

    val filteredProducts: List<ProductDto> = searchHit?.products
        ?: state.content.products.filter { product ->
            val categoryMatch = categoryFilter == null || product.category.lowercase() == categoryFilter
            val queryMatch = normalizedQuery.isBlank() ||
                product.title.lowercase().contains(normalizedQuery) ||
                (product.storeId?.storeName?.lowercase()?.contains(normalizedQuery) == true) ||
                product.category.lowercase().contains(normalizedQuery)
            categoryMatch && queryMatch
        }
    val filteredStores: List<StoreDto> = searchHit?.stores
        ?: state.content.stores.filter { store ->
            normalizedQuery.isBlank() || store.storeName.lowercase().contains(normalizedQuery)
        }
    val filteredReels = state.content.reels.filter { reel ->
        normalizedQuery.isBlank() ||
            reel.displayCreator.lowercase().contains(normalizedQuery) ||
            reel.displayLabel.lowercase().contains(normalizedQuery)
    }

    val isResultsMode = normalizedQuery.isNotBlank() || state.filters.hasActiveFilters()
    val exploreProducts = (state.content.products + state.content.products).take(6)
    val nearbyStores = state.content.stores.take(2)
    val nearbyShops = listOf(
        Triple("The Hype Studio", "Streetwear • Bandra West", "0.8 km"),
        Triple("Curated Co.", "Lifestyle • Colaba", "1.2 km"),
    )

    LazyColumn(
        modifier = modifier.fillMaxSize().background(searchBg),
        contentPadding = PaddingValues(BuyerUiTokens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(BuyerUiTokens.sectionGap),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = state::updateQuery,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Search for drops, stores, or vibes...", color = searchMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = searchSurface, unfocusedContainerColor = searchSurface, focusedBorderColor = searchAccent, unfocusedBorderColor = searchOutline, focusedTextColor = searchText, unfocusedTextColor = searchText),
                    shape = RoundedCornerShape(28.dp),
                )
                Button(onClick = { state.submitSearch() }, colors = ButtonDefaults.buttonColors(containerColor = searchAccent), shape = RoundedCornerShape(16.dp)) {
                    Text("Go", color = Color.White)
                }
            }
        }

        if (!isResultsMode) {
            item {
                Text("Trending Searches", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    trendingSearchTerms.forEach { term ->
                        Surface(modifier = Modifier.clickable { state.updateQuery(term); state.submitSearch() }, color = searchSurface, shape = BuyerUiTokens.radiusChip, tonalElevation = 0.dp, border = BorderStroke(1.dp, searchOutline)) {
                            Text(term, color = searchText, modifier = Modifier.padding(horizontal = BuyerUiTokens.chipHorizontalPadding, vertical = BuyerUiTokens.chipVerticalPadding))
                        }
                    }
                }
            }

            item {
                Text("Browse Categories", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    state.content.categories.chunked(4).forEach { categoryRow ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                            categoryRow.forEach { category ->
                                Surface(modifier = Modifier.weight(1f).clickable { state.selectCategory(category.name); state.submitSearch() }, color = searchSurface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, searchOutline)) {
                                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        DemoImage(url = category.imageUrl, contentDescription = category.name, modifier = Modifier.size(44.dp), shape = RoundedCornerShape(12.dp))
                                        Text(category.name, color = searchMuted, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Nearby Vibes", color = searchAccent, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            Text("Explore Mumbai", color = searchText, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        }
                        TextButton(onClick = { state.updateQuery("Mumbai") }) { Text("Change", color = searchAccent) }
                    }
                    ElevatedCard(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                        Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
                            DemoImage(url = state.content.stores.getOrNull(2)?.displayImageUrl.orEmpty(), contentDescription = "Mumbai map preview", modifier = Modifier.fillMaxSize(), shape = RoundedCornerShape(16.dp))
                            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.45f)))
                        }
                    }
                    if (nearbyStores.isEmpty()) {
                        Text("No nearby stores available yet.", color = searchMuted)
                    } else {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(nearbyShops.indices.toList()) { idx ->
                            val (name, subtitle, distance) = nearbyShops[idx]
                                val store = nearbyStores[idx % nearbyStores.size]
                                ElevatedCard(modifier = Modifier.width(240.dp).clickable { actions.onOpenStore(store) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Box {
                                            DemoImage(url = store.displayImageUrl, contentDescription = name, modifier = Modifier.fillMaxWidth().height(112.dp), shape = RoundedCornerShape(12.dp))
                                            Text(distance, color = Color.White, style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).background(searchAccent, RoundedCornerShape(10.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                                        }
                                        Text(name, color = searchText, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text(subtitle, color = searchMuted, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(22.dp)).background(searchAccent), contentAlignment = Alignment.Center) {
                            Text("A", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Text("Browse Apparel", style = MaterialTheme.typography.titleLarge, color = searchText, fontWeight = FontWeight.Bold)
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(listOf("Trending", "New Arrivals", "Price", "Discount", "More")) { chip ->
                            val active = exploreChip == chip
                            Surface(modifier = Modifier.clickable { exploreChip = chip }, color = if (active) searchAccent else searchChipSurface, shape = BuyerUiTokens.radiusChip) {
                                Text(chip, color = if (active) Color.White else searchMuted, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = BuyerUiTokens.chipHorizontalPadding, vertical = BuyerUiTokens.chipVerticalPadding))
                            }
                        }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        exploreProducts.chunked(2).forEach { rowProducts ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                rowProducts.forEach { product ->
                                    ElevatedCard(modifier = Modifier.weight(1f).clickable { actions.onOpenProduct(product) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Box {
                                                DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.fillMaxWidth().height(180.dp), shape = RoundedCornerShape(14.dp))
                                                Text(if (product.displayTitle.contains("Tee", ignoreCase = true)) "Ending Soon" else "Best Seller", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).background(Color(0xFF2492FF), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                                            }
                                            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(product.displayTitle, color = searchText, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                Text(product.displayPrice, color = searchAccent, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Live Bargains", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { state.selectTab(NotWhatTab.Bargains) }) { Text("View All", color = searchAccent) }
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.content.reels) { reel ->
                        ElevatedCard(modifier = Modifier.size(width = 132.dp, height = 228.dp).clickable { actions.onOpenProduct(reel.toProductDtoStub()) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                            Box(modifier = Modifier.fillMaxSize()) {
                                DemoImage(url = reel.thumbnailUrl, contentDescription = reel.displayLabel, modifier = Modifier.fillMaxSize(), shape = RoundedCornerShape(12.dp))
                                Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)))
                                Text(reel.displayLabel, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).background(searchAccent, RoundedCornerShape(9.dp)).padding(horizontal = 8.dp, vertical = 4.dp))
                                Text(reel.displayCreator, color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp))
                            }
                        }
                    }
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Hot Drops", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { state.updateQuery("Streetwear Drops"); state.submitSearch() }) { Text("See More", color = searchAccent) }
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.content.products) { product ->
                        ElevatedCard(modifier = Modifier.width(188.dp).clickable { actions.onOpenProduct(product) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.fillMaxWidth().height(190.dp), shape = RoundedCornerShape(16.dp))
                                Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(product.displayTitle, color = searchText, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                                    Text(product.displayPrice, color = searchAccent, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            item {
                Text("Trending Stores", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.content.stores) { story ->
                        Column(modifier = Modifier.clickable { actions.onOpenStore(story) }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DemoImage(url = story.displayImageUrl, contentDescription = story.storeName, modifier = Modifier.size(76.dp).border(2.dp, searchAccent, RoundedCornerShape(38.dp)).clip(RoundedCornerShape(38.dp)), shape = RoundedCornerShape(38.dp))
                            Text(story.storeName, color = searchMuted, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }

            item {
                Text("Recent Searches", style = MaterialTheme.typography.titleMedium, color = searchText, fontWeight = FontWeight.Bold)
                if (state.recentSearches.isEmpty()) {
                    Text("No recent searches", color = searchMuted)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.recentSearches.forEach { recent ->
                            Surface(modifier = Modifier.clickable { state.updateQuery(recent); state.submitSearch() }, color = searchSurface, shape = RoundedCornerShape(14.dp)) {
                                Text(recent, color = searchText, modifier = Modifier.padding(12.dp))
                            }
                        }
                    }
                }
            }
        } else {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("All", "Products", "Stores", "Reels").forEach { tab ->
                        val selected = resultTab == tab
                        Text(tab, color = if (selected) searchAccent else searchMuted, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.clip(BuyerUiTokens.radiusChip).background(if (selected) searchSurface2 else searchSurface).clickable { resultTab = tab }.padding(horizontal = BuyerUiTokens.chipHorizontalPadding, vertical = BuyerUiTokens.chipVerticalPadding))
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(modifier = Modifier.clickable { if (state.filters.hasActiveFilters()) state.clearFilters() else state.selectCategory("Apparel") }, color = searchSurface2, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, searchOutline)) {
                        Text(if (state.filters.hasActiveFilters()) "Filters Active" else "Filters", color = searchText, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                    }
                    Surface(color = searchSurface, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, searchOutline)) { Text("Sort", color = searchMuted, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) }
                    Surface(color = searchSurface, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, searchOutline)) { Text("Price", color = searchMuted, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) }
                }
            }

            if ((resultTab == "All" || resultTab == "Stores") && filteredStores.isNotEmpty()) {
                item {
                    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = searchSurface), modifier = Modifier.fillMaxWidth().clickable { actions.onOpenStore(filteredStores.first()) }) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                DemoImage(url = filteredStores.first().displayImageUrl, contentDescription = filteredStores.first().storeName, modifier = Modifier.size(54.dp), shape = RoundedCornerShape(27.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(filteredStores.first().storeName, color = searchText, fontWeight = FontWeight.Bold)
                                    Text("Top Rated Store", color = searchMuted, style = MaterialTheme.typography.bodySmall)
                                }
                                Button(onClick = { state.updateQuery(filteredStores.first().storeName); state.submitSearch() }, shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = searchAccent)) {
                                    Text("Follow", color = Color.White)
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                                state.content.products.take(3).forEach { product ->
                                    DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.weight(1f).height(86.dp), shape = RoundedCornerShape(8.dp))
                                }
                            }
                        }
                    }
                }
            }

            if (resultTab == "All" || resultTab == "Products") {
                item {
                    Text("Products ${filteredProducts.size}", style = MaterialTheme.typography.titleMedium, color = searchText)
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        filteredProducts.chunked(2).forEach { rowProducts ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                rowProducts.forEach { product ->
                                    ElevatedCard(modifier = Modifier.weight(1f).clickable { actions.onOpenProduct(product) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.fillMaxWidth().height(170.dp), shape = RoundedCornerShape(14.dp))
                                            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(product.displayStoreName, color = searchMuted, style = MaterialTheme.typography.labelSmall)
                                                Text(product.displayTitle, color = searchText, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                Text(product.displayPrice, color = searchAccent, fontWeight = FontWeight.Bold)
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

            if ((resultTab == "All" || resultTab == "Reels") && filteredReels.isNotEmpty()) {
                item {
                    Text("Style Reels", style = MaterialTheme.typography.titleMedium, color = searchText)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        filteredReels.chunked(3).forEach { rowReels ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                rowReels.forEach { reel ->
                                    ElevatedCard(modifier = Modifier.weight(1f).height(170.dp).clickable { actions.onOpenProduct(reel.toProductDtoStub()) }, colors = CardDefaults.elevatedCardColors(containerColor = searchSurface)) {
                                        Box(modifier = Modifier.fillMaxSize()) {
                                            DemoImage(url = reel.thumbnailUrl, contentDescription = reel.displayCreator, modifier = Modifier.fillMaxSize(), shape = RoundedCornerShape(10.dp))
                                            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.32f)))
                                            Text(reel.displayLabel, color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).background(searchAccent, RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 3.dp))
                                            Text(reel.displayCreator, color = Color.White, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp))
                                        }
                                    }
                                }
                                if (rowReels.size < 3) repeat(3 - rowReels.size) { Spacer(modifier = Modifier.weight(1f)) }
                            }
                        }
                    }
                }
            }

            if (filteredProducts.isEmpty() && filteredStores.isEmpty() && filteredReels.isEmpty()) {
                item {
                    Surface(color = searchSurface, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 26.dp, horizontal = 16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("No results for \"${state.query}\"", color = searchText, style = MaterialTheme.typography.titleMedium)
                            Text("Try: Utility Vests, Graphic Tees, Street Accessories", color = searchMuted)
                            TextButton(onClick = { state.updateQuery(trendingSearchTerms.first()); state.submitSearch() }) { Text("Try Trending", color = searchAccent) }
                        }
                    }
                }
            }

            item {
                if (state.filters.hasActiveFilters()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Filters active", color = searchMuted)
                        TextButton(onClick = { state.removeFilter(SearchFilterKind.CATEGORY) }) { Text("Clear category", color = searchAccent) }
                        TextButton(onClick = state::clearFilters) { Text("Clear all", color = searchAccent) }
                    }
                }
            }
        }
    }
}
