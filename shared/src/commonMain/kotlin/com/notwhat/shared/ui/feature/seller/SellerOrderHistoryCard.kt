package com.notwhat.shared.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
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
import com.notwhat.shared.order.OrderDto
import kotlinx.datetime.LocalDate

private const val SELLER_LEDGER_MAX_ENTRIES = 12

private val creditColor = Color(0xFF0B8A7A)
private val debitColor = Color(0xFF7A251C)

/** A single money movement: a completed sale credits the seller, a refund debits them. */
internal data class SellerLedgerEntry(
    val title: String,
    val subtitle: String,
    val amount: Double,
    val isCredit: Boolean,
    val sortKey: String,
)

private fun formatLedgerDate(timestamp: String?): String {
    val date = timestamp?.take(10)?.let { day -> runCatching { LocalDate.parse(day) }.getOrNull() } ?: return "—"
    val month =
        listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
            .getOrNull(date.monthNumber - 1) ?: return "—"

    return "${date.dayOfMonth} $month ${date.year}"
}

/**
 * Flattens orders into a ledger. An order can produce both a credit and a debit when it was
 * delivered and later partially refunded.
 */
internal fun buildSellerLedger(orders: List<OrderDto>): List<SellerLedgerEntry> =
    orders
        .flatMap { order ->
            val reference = order.orderNumber?.takeIf { it.isNotBlank() } ?: "#${order.id.takeLast(6)}"
            val placedOn = formatLedgerDate(order.createdAt)
            val entries = mutableListOf<SellerLedgerEntry>()

            if (order.status.lowercase() in setOf("delivered", "completed", "return_approved", "returned", "refunded") && order.subtotal > 0.0) {
                entries +=
                    SellerLedgerEntry(
                        title = reference,
                        subtitle = "Order delivered · $placedOn",
                        amount = order.subtotal,
                        isCredit = true,
                        sortKey = order.updatedAt ?: order.createdAt.orEmpty(),
                    )
            }

            val refunded = order.refundAmount ?: 0.0
            if (refunded > 0.0) {
                val reason =
                    when {
                        order.returnInfo != null -> "Return refunded"
                        order.status.lowercase() == "cancelled" -> "Order cancelled"
                        else -> "Refunded"
                    }
                entries +=
                    SellerLedgerEntry(
                        title = reference,
                        subtitle = "$reason · $placedOn",
                        amount = refunded,
                        isCredit = false,
                        sortKey = order.updatedAt ?: order.createdAt.orEmpty(),
                    )
            }

            entries
        }
        .sortedByDescending { it.sortKey }
        .take(SELLER_LEDGER_MAX_ENTRIES)

@Composable
internal fun SellerOrderHistoryCard(
    orders: List<OrderDto>,
    modifier: Modifier = Modifier,
) {
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val entries = buildSellerLedger(orders)
    val net = entries.sumOf { if (it.isCredit) it.amount else -it.amount }

    Surface(color = surface, shape = SellerUiTokens.radiusInnerCard, modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(SellerUiTokens.cardGap),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Order history",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text("Credits and refunds", color = muted, style = MaterialTheme.typography.bodySmall)
                }
                if (entries.isNotEmpty()) {
                    Text(
                        "${if (net < 0) "-" else "+"}₹${net.toInt().let { if (it < 0) -it else it }}",
                        color = if (net < 0) debitColor else creditColor,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                    )
                }
            }

            if (entries.isEmpty()) {
                Text(
                    "No completed orders or refunds yet.",
                    color = muted,
                    style = MaterialTheme.typography.bodySmall,
                )
                return@Column
            }

            entries.forEachIndexed { index, entry ->
                if (index > 0) {
                    HorizontalDivider(color = muted.copy(alpha = 0.15f))
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            entry.title,
                            color = text,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            entry.subtitle,
                            color = muted,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Text(
                        "${if (entry.isCredit) "+" else "-"}₹${entry.amount.toInt()}",
                        color = if (entry.isCredit) creditColor else debitColor,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
    }
}
