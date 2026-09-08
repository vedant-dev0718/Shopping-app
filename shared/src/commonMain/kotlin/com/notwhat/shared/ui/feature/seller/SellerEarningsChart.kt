package com.notwhat.shared.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.notwhat.shared.analytics.SalesTrendPointDto
import com.patrykandpatrick.vico.multiplatform.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.multiplatform.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.multiplatform.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.multiplatform.cartesian.axis.rememberAxisLabelComponent
import com.patrykandpatrick.vico.multiplatform.cartesian.axis.rememberAxisLineComponent
import com.patrykandpatrick.vico.multiplatform.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.multiplatform.cartesian.data.columnSeries
import com.patrykandpatrick.vico.multiplatform.cartesian.layer.ColumnCartesianLayer
import com.patrykandpatrick.vico.multiplatform.cartesian.layer.rememberColumnCartesianLayer
import com.patrykandpatrick.vico.multiplatform.cartesian.marker.DefaultCartesianMarker
import com.patrykandpatrick.vico.multiplatform.cartesian.marker.rememberDefaultCartesianMarker
import com.patrykandpatrick.vico.multiplatform.cartesian.Zoom
import com.patrykandpatrick.vico.multiplatform.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.multiplatform.cartesian.rememberVicoScrollState
import com.patrykandpatrick.vico.multiplatform.cartesian.rememberVicoZoomState
import com.patrykandpatrick.vico.multiplatform.common.component.LineComponent
import com.patrykandpatrick.vico.multiplatform.common.component.rememberTextComponent
import com.patrykandpatrick.vico.multiplatform.common.fill
import com.patrykandpatrick.vico.multiplatform.common.shape.CorneredShape
import kotlinx.datetime.LocalDate

private const val EARNINGS_AXIS_LABEL_SPACING = 30

/** Compact `d MMM` label for an ISO `yyyy-MM-dd` bucket key. */
private fun formatTrendDayLabel(period: String): String {
    val date = runCatching { LocalDate.parse(period) }.getOrNull() ?: return period
    val month =
        listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
            .getOrNull(date.monthNumber - 1) ?: return period

    return "${date.dayOfMonth} $month"
}

private fun formatCompactRupees(value: Double): String =
    when {
        value >= 10_000_000 -> "₹${(value / 10_000_000).toInt()}Cr"
        value >= 100_000 -> "₹${(value / 100_000).toInt()}L"
        value >= 1_000 -> "₹${(value / 1_000).toInt()}k"
        else -> "₹${value.toInt()}"
    }

/**
 * Gross-sales line chart over the trailing 90 days.
 *
 * [points] must already be zero-filled and oldest-first so the x index maps to a calendar day.
 */
@Composable
internal fun SellerEarningsTrendChart(
    points: List<SalesTrendPointDto>,
    isLoading: Boolean,
    errorMessage: String?,
    modifier: Modifier = Modifier,
) {
    val accent = NotWhatAuthTokens.accent
    val muted = NotWhatColors.onSurfaceVariant
    val axisLabelStyle = MaterialTheme.typography.labelSmall.copy(color = muted)

    if (isLoading && points.isEmpty()) {
        Box(modifier = modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = accent)
        }
        return
    }

    if (errorMessage != null && points.isEmpty()) {
        Box(modifier = modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
            Text(errorMessage, color = muted, style = MaterialTheme.typography.bodySmall)
        }
        return
    }

    if (points.none { it.grossSales > 0.0 }) {
        Box(modifier = modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    "No earnings yet",
                    color = NotWhatColors.onSurface,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Your last 90 days of sales will appear here.",
                    color = muted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
        return
    }

    val modelProducer = remember { CartesianChartModelProducer() }
    LaunchedEffect(points) {
        modelProducer.runTransaction {
            columnSeries { series(points.map { it.grossSales }) }
        }
    }

    CartesianChartHost(
        chart =
            rememberCartesianChart(
                rememberColumnCartesianLayer(
                    columnProvider =
                        ColumnCartesianLayer.ColumnProvider.series(
                            LineComponent(
                                fill = fill(accent),
                                thickness = 6.dp,
                                shape = CorneredShape.rounded(allPercent = 40),
                            ),
                        ),
                ),
                startAxis =
                    VerticalAxis.rememberStart(
                        line = rememberAxisLineComponent(fill = fill(muted.copy(alpha = 0.3f))),
                        label = rememberAxisLabelComponent(style = axisLabelStyle),
                        valueFormatter = { _, value, _ -> formatCompactRupees(value) },
                        itemPlacer = remember { VerticalAxis.ItemPlacer.count({ 4 }) },
                    ),
                bottomAxis =
                    HorizontalAxis.rememberBottom(
                        line = rememberAxisLineComponent(fill = fill(muted.copy(alpha = 0.3f))),
                        label = rememberAxisLabelComponent(style = axisLabelStyle),
                        valueFormatter = { _, value, _ -> value.toInt().toString() },
                        itemPlacer = remember { HorizontalAxis.ItemPlacer.aligned({ EARNINGS_AXIS_LABEL_SPACING }) },
                    ),
                marker =
                    rememberDefaultCartesianMarker(
                        label = rememberTextComponent(style = axisLabelStyle.copy(color = NotWhatColors.onSurface)),
                        valueFormatter = { _, targets ->
                            val index = targets.firstOrNull()?.x?.toInt()
                            val point = index?.let { points.getOrNull(it) }
                            if (point == null) "" else "${formatTrendDayLabel(point.period)} · ₹${point.grossSales.toInt()}"
                        },
                        labelPosition = DefaultCartesianMarker.LabelPosition.AbovePoint,
                    ),
            ),
        modelProducer = modelProducer,
        modifier = modifier.fillMaxWidth().height(180.dp),
        // Scroll and zoom off so all 90 days are fitted to the card width. Zoom.Content is required:
        // with zoom disabled Vico otherwise stays at 1x and pushes most of the series off-screen.
        scrollState = rememberVicoScrollState(scrollEnabled = false),
        zoomState = rememberVicoZoomState(zoomEnabled = false, initialZoom = Zoom.Content),
    )
}
