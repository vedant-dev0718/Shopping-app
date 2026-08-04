package com.notwhat.shared.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.session.UserRole

@Composable
internal fun AccountScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onOpenProduct: (com.notwhat.shared.catalog.ProductDto) -> Unit,
    onOpenSellerDashboard: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenCart: () -> Unit,
    onOpenBuyerReturns: () -> Unit,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(shape = RoundedCornerShape(20.dp), color = NotWhatColors.surfaceContainer) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(state.currentSession?.name ?: "NotWhat", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    state.currentSession?.headline ?: "Buy, bid, and browse regional fashion in one place.",
                    color = NotWhatColors.onSurfaceVariant,
                )
                AccountImage(
                    url =
                        state.content.stores
                            .firstOrNull()
                            ?.displayImageUrl ?: "",
                    contentDescription = state.currentSession?.name ?: "NotWhat profile",
                    modifier = Modifier.fillMaxWidth().height(140.dp),
                    shape = RoundedCornerShape(16.dp),
                )
                HorizontalDivider(color = NotWhatColors.outline)
                Text(
                    text =
                        when (state.uiRole) {
                            UserRole.Seller -> "Seller operations are now routed through a dedicated dashboard shell for sprint 6 expansion."
                            UserRole.Admin -> "Admin checks stay mocked so navigation and hierarchy can be reviewed without backend dependencies."
                            else -> "Buyer discovery stays mocked so product, reel, and bargain browsing can be reviewed end-to-end."
                        },
                    color = NotWhatColors.onSurface,
                )
            }
        }

        if (state.uiRole == UserRole.Seller) {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onOpenSellerDashboard() },
                shape = RoundedCornerShape(16.dp),
                color = NotWhatColors.surfaceContainerHigh,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Seller Dashboard & Insights", fontWeight = FontWeight.Bold, color = NotWhatColors.onSurface)
                        Text("Track performance, operations, and next sprint stubs", color = NotWhatColors.onSurfaceVariant)
                    }
                    Text("Open", color = NotWhatColors.primary, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onOpenProfile() },
                shape = RoundedCornerShape(16.dp),
                color = NotWhatColors.surfaceContainerHigh,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("Profile & Addresses", fontWeight = FontWeight.Bold, color = NotWhatColors.onSurface)
                        Text("Manage identity, stats and shipping addresses", color = NotWhatColors.onSurfaceVariant)
                    }
                    Text("Open", color = NotWhatColors.primary, fontWeight = FontWeight.Bold)
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth().clickable { onOpenCart() },
            shape = RoundedCornerShape(16.dp),
            color = NotWhatColors.primaryContainer,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Cart & Saved Payments", fontWeight = FontWeight.Bold, color = NotWhatColors.onPrimaryContainer)
                    Text("Start Sprint 4 checkout journey", color = NotWhatColors.onPrimaryContainer)
                }
                Text("Open", color = NotWhatColors.onPrimaryContainer, fontWeight = FontWeight.Bold)
            }
        }

        if (state.uiRole == UserRole.Buyer) {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onOpenBuyerReturns() },
                shape = RoundedCornerShape(16.dp),
                color = NotWhatColors.surfaceContainerHigh,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("My Returns", fontWeight = FontWeight.Bold, color = NotWhatColors.onSurface)
                        Text("Track requests, seller decisions, and closure", color = NotWhatColors.onSurfaceVariant)
                    }
                    Text("Open", color = NotWhatColors.primary, fontWeight = FontWeight.Bold)
                }
            }
        }

        state.content.products
            .take(2)
            .ifEmpty {
                com.notwhat.shared.catalog
                    .seedProducts()
                    .take(2)
            }.forEach { product ->
                Card(
                    modifier = Modifier.clickable { onOpenProduct(product) },
                    colors = CardDefaults.cardColors(containerColor = NotWhatColors.surfaceContainer),
                ) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        AccountImage(
                            url = product.displayImageUrl,
                            contentDescription = product.displayTitle,
                            modifier = Modifier.size(72.dp),
                            shape = RoundedCornerShape(12.dp),
                        )
                        Column {
                            Text(product.displayTitle, fontWeight = FontWeight.SemiBold)
                            Text(product.displayStoreName, color = NotWhatColors.onSurfaceVariant)
                        }
                    }
                }
            }
    }
}

@Composable
private fun AccountImage(
    url: String,
    contentDescription: String,
    modifier: Modifier,
    shape: RoundedCornerShape,
) {
    AsyncImage(
        model = url,
        contentDescription = contentDescription,
        modifier = modifier.clip(shape),
        contentScale = ContentScale.Crop,
    )
}
