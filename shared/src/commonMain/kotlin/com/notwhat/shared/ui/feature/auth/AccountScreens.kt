package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
    onOpenAddresses: () -> Unit,
    onOpenCart: () -> Unit,
    onOpenBuyerReturns: () -> Unit,
    onSignOut: () -> Unit = {},
) {
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Tapping the profile card opens address + profile management
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = NotWhatColors.surfaceContainer,
            modifier = Modifier.fillMaxWidth().clickable { onOpenProfile() },
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AccountImage(
                    url =
                        state.content.stores
                            .firstOrNull()
                            ?.profileImageUrl ?: "",
                    contentDescription = state.currentSession?.name ?: "Profile",
                    modifier = Modifier.size(64.dp),
                    shape = RoundedCornerShape(32.dp),
                )
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        state.currentSession?.name ?: "NotWhat User",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = NotWhatColors.onSurface,
                    )
                    Text(
                        "View profile",
                        style = MaterialTheme.typography.bodySmall,
                        color = NotWhatColors.onSurfaceVariant,
                    )
                }
                Text("›", style = MaterialTheme.typography.titleLarge, color = NotWhatColors.primary)
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
                    Text("Seller Dashboard", fontWeight = FontWeight.Bold, color = NotWhatColors.onSurface)
                    Text("Open", color = NotWhatColors.primary, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            // Buyer quick-action tiles
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = NotWhatColors.surfaceContainerHigh,
            ) {
                Column {
                    AccountTile(
                        label = "My Orders",
                        subtitle = "Track and manage your orders",
                        onClick = onOpenBuyerReturns,
                    )
                    HorizontalDivider(color = NotWhatColors.outline.copy(alpha = 0.3f))
                    AccountTile(
                        label = "Addresses",
                        subtitle = "Add or edit delivery addresses",
                        onClick = onOpenAddresses,
                    )
                    HorizontalDivider(color = NotWhatColors.outline.copy(alpha = 0.3f))
                    AccountTile(
                        label = "Sign Out",
                        subtitle = "Log out of your account",
                        onClick = onSignOut,
                    )
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
    if (url.isBlank()) {
        // Initials placeholder when no image URL
        val initials =
            contentDescription
                .split(" ")
                .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                .take(2)
                .joinToString("")
        Box(modifier = modifier.clip(shape).background(NotWhatColors.primaryContainer), contentAlignment = Alignment.Center) {
            Text(
                initials.ifEmpty {
                    "?"
                },
                fontWeight = FontWeight.Bold,
                color = NotWhatColors.onPrimaryContainer,
                style = MaterialTheme.typography.titleMedium,
            )
        }
    } else {
        AsyncImage(
            model = url,
            contentDescription = contentDescription,
            modifier = modifier.clip(shape),
            contentScale = ContentScale.Crop,
        )
    }
}

@Composable
private fun AccountTile(
    label: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, fontWeight = FontWeight.SemiBold, color = NotWhatColors.onSurface)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = NotWhatColors.onSurfaceVariant)
        }
        Text("›", style = MaterialTheme.typography.titleLarge, color = NotWhatColors.primary)
    }
}
