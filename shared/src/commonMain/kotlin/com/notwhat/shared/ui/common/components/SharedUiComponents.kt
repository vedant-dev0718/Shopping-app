package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.network.defaultApiBaseUrl
import io.ktor.http.encodeURLQueryComponent

/** Shared image primitive used across all buyer and seller screens. */
@Composable
internal fun DemoImage(
    url: String,
    contentDescription: String,
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(18.dp),
) {
    val modelUrl = url.trim()

    fun telemetryPrefix(candidateUrl: String): String {
        val host = candidateUrl.substringAfter("//", missingDelimiterValue = "").substringBefore('/').substringBefore(':')
        val scheme = candidateUrl.substringBefore(":", missingDelimiterValue = "")
        val shortPath = candidateUrl.substringAfter(host, missingDelimiterValue = candidateUrl).take(80)
        return "[ImageTelemetry] scheme=$scheme host=${if (host.isBlank()) "n/a" else host} path=$shortPath"
    }

    fun shouldRetryViaProxy(candidateUrl: String): Boolean {
        if (!candidateUrl.startsWith("https://")) return false
        val host =
            candidateUrl
                .substringAfter("https://", missingDelimiterValue = "")
                .substringBefore('/')
                .substringBefore(':')
                .lowercase()
        return host == "images.unsplash.com" || host == "plus.unsplash.com"
    }

    fun toRemoteImageProxyUrl(candidateUrl: String): String {
        val apiBase = defaultApiBaseUrl().trimEnd('/')
        val serverBase = apiBase.removeSuffix("/api")
        return "$serverBase/api/uploads/remote-image?url=${candidateUrl.encodeURLQueryComponent()}"
    }

    val useProxyOnFirstAttempt = remember(modelUrl) { preferProxyImageLoad() && shouldRetryViaProxy(modelUrl) }
    var activeUrl by remember(modelUrl) {
        mutableStateOf(
            if (useProxyOnFirstAttempt) {
                toRemoteImageProxyUrl(modelUrl)
            } else {
                modelUrl
            },
        )
    }
    var hasRetriedByProxy by remember(modelUrl) { mutableStateOf(useProxyOnFirstAttempt) }

    Box(
        modifier =
            modifier
                .clip(shape)
                .background(NotWhatColors.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        PlatformNetworkImage(
            url = activeUrl,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            onSuccess = {
                println("${telemetryPrefix(activeUrl)} status=success")
            },
            onError = { errorMessage ->
                println("${telemetryPrefix(activeUrl)} status=error reason=$errorMessage")

                if (!hasRetriedByProxy && shouldRetryViaProxy(activeUrl)) {
                    hasRetriedByProxy = true
                    activeUrl = toRemoteImageProxyUrl(activeUrl)
                    println("${telemetryPrefix(activeUrl)} status=retry_via_proxy")
                }
            },
        )
    }
}

@Composable
internal fun HeroPreviewTile(
    title: String,
    imageUrl: String,
) {
    Box(
        modifier =
            Modifier
                .size(width = 76.dp, height = 96.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(NotWhatColors.surfaceContainer),
    ) {
        DemoImage(
            url = imageUrl,
            contentDescription = title,
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(18.dp),
        )
        Box(
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.28f))
                    .padding(horizontal = 6.dp, vertical = 4.dp),
        ) {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
