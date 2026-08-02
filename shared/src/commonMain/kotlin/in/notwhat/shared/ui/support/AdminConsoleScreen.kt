package com.notwhat.shared.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable

@Composable
internal fun AdminConsoleScreen(
    modifier: Modifier,
    state: NotWhatAppState,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surfaceContainer
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val healthCards = listOf(
        "New Sellers Review" to "12 stores pending compliance checks",
        "Payment Exceptions" to "3 refunds need manual verification",
        "Reel Moderation" to "9 reels flagged by auto-review",
        "Support SLA" to "94% tickets handled within 4 hours",
    )

    LazyColumn(
        modifier = modifier
            .fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Surface(
                color = bg,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        "Admin Operations Center",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = text,
                    )
                    Text(
                        state.currentSession?.headline ?: "Marketplace quality, support, and seller operations visibility.",
                        color = muted,
                    )
                }
            }
        }

        items(healthCards) { card ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(card.first, color = text, fontWeight = FontWeight.SemiBold)
                        Text("LIVE", color = accent, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                    Text(card.second, color = muted)
                }
            }
        }

        item {
            Surface(
                color = surface,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text("Variant Lock", color = text, fontWeight = FontWeight.Bold)
                    Text(
                        "This Admin APK is role-locked. Buyer and Seller experiences live in their own dedicated app variants.",
                        color = muted,
                    )
                }
            }
        }
    }
}
